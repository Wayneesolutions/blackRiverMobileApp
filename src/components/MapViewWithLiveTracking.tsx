import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { socketService, VehicleLocation } from '../services/socket/socketService';
import { logger } from '../utils/loggerHelper';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config/env';
import { apiService } from '../services/api/apiService';

// Conditionally import react-native-maps only on native platforms
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

// Only import on native platforms - Metro will use web stub on web
try {
  const mapsModule = require('react-native-maps');
  if (mapsModule && mapsModule.default) {
    MapView = mapsModule.default;
    Marker = mapsModule.Marker;
    Polyline = mapsModule.Polyline;
    PROVIDER_GOOGLE = mapsModule.PROVIDER_GOOGLE;
  }
} catch (error) {
  // Silently handle - web stub will be used instead
  if (Platform.OS !== 'web') {
    console.warn('react-native-maps not available:', error);
  }
}

const { width, height } = Dimensions.get('window');
const SPEED_WARNING_THRESHOLD_KMH = 105;
const FUEL_WARNING_THRESHOLD_PERCENT = 10;
const FUEL_WARNING_THRESHOLD_LITERS = 40;
const ENABLE_SPEED_WARNING_DEMO =
  typeof process !== 'undefined' &&
  process?.env?.EXPO_PUBLIC_ENABLE_SPEED_WARNING_DEMO === 'true'
    ? true
    : __DEV__;

// Helper function to safely convert latitude/longitude to numbers
const parseCoordinate = (value: string | number | undefined | null): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

const parseNumericValue = (value: number | string | undefined | null): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};
const parseSpeed = (value: number | string | undefined | null): number | null =>
  parseNumericValue(value);
const parseFuelValue = (value: number | string | undefined | null): number | null =>
  parseNumericValue(value);

const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
};

// Calculate distance between two coordinates using Haversine formula (in kilometers)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 0;
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface MapViewWithLiveTrackingProps {
  visible: boolean;
  onClose: () => void;
  load: {
    _id: string;
    internalId?: string;
    route?: {
      multipleDropOffs?: boolean;
      selectPickup?: {
        place?: string;
        city?: string;
        state?: string;
        latitude?: number | string;
        longitude?: number | string;
      };
      selectDropOff?: {
        place?: string;
        city?: string;
        state?: string;
        latitude?: number | string;
        longitude?: number | string;
      };
      wayPoints?: Array<{
        address?: {
          place?: string;
          city?: string;
          state?: string;
          latitude?: number | string;
          longitude?: number | string;
        };
        dropOff?: boolean;
        pickup?: boolean;
      }>;
    };
    vehicle?: {
      _id: string;
      internalId: string;
      plateNumber?: string;
    };
  };
}

type WarningBannerType = 'speed' | 'fuel';

interface WarningBannerConfig {
  id: string;
  type: WarningBannerType;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  note?: string;
}

const MapViewWithLiveTracking: React.FC<MapViewWithLiveTrackingProps> = ({
  visible,
  onClose,
  load,
}) => {
  const [vehicleLocation, setVehicleLocation] = useState<VehicleLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showDistanceInfo, setShowDistanceInfo] = useState(true);
  const [forceWarningDemo, setForceWarningDemo] = useState(false);
  const mapRef = useRef<any>(null);
  const [routePath, setRoutePath] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const googleMapsApiKeyRef = useRef<string | null | undefined>(undefined);

  // Validate load data early
  if (!load) {
  return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Map View</Text>
          </View>
          <View style={styles.mapFallback}>
            <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
            <Text style={styles.fallbackText}>Invalid Load Data</Text>
            <Text style={styles.fallbackSubtext}>Load information is not available.</Text>
            <TouchableOpacity style={styles.errorButton} onPress={onClose}>
              <Text style={styles.errorButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Validate route data
  if (!load.route) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Map View</Text>
          </View>
          <View style={styles.mapFallback}>
            <Ionicons name="map-outline" size={64} color="#8B5CF6" />
            <Text style={styles.fallbackText}>Route Not Available</Text>
            <Text style={styles.fallbackSubtext}>Route information is not available for this load.</Text>
            <TouchableOpacity style={styles.errorButton} onPress={onClose}>
              <Text style={styles.errorButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const multipleDropOffs = load.route?.multipleDropOffs || false;
  const wayPoints = load.route?.wayPoints || [];
  
  // For multiple dropoffs, pickup might be in wayPoints instead of selectPickup
  // Find pickup waypoint if multipleDropOffs is true and selectPickup doesn't exist
  let pickup = load.route?.selectPickup;
  if (multipleDropOffs && !pickup && wayPoints.length > 0) {
    const pickupWaypoint = wayPoints.find(wp => wp.pickup === true);
    if (pickupWaypoint && pickupWaypoint.address) {
      pickup = pickupWaypoint.address;
      logger.info('Pickup found in waypoints', {
        waypointIndex: wayPoints.indexOf(pickupWaypoint),
        place: pickupWaypoint.address.place,
        hasCoordinates: !!(pickupWaypoint.address.latitude && pickupWaypoint.address.longitude)
      });
    }
  }
  
  const dropoff = load.route?.selectDropOff;
  const vehicleId = load.vehicle?.internalId;

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setVehicleLocation(null);
      setError(null);
      if (ENABLE_SPEED_WARNING_DEMO) {
        setForceWarningDemo(false);
      }
      socketService.leaveVehicle();
      socketService.offVehicleLocation();
      return;
    }

    // Initialize socket and join vehicle room
    const initializeTracking = async () => {
      try {
        setLoading(true);
        setError(null);

        // On web platform, skip socket connection entirely - we only use Google Maps
        if (Platform.OS === 'web') {
          logger.info('Web platform detected - skipping socket connection, using Google Maps only');
          setLoading(false);
          // Don't set error - map will show route with Google Maps
          return; // Exit early - Google Maps will handle the display
        }

        // Initialize socket connection (native platforms only)
        // Use shorter timeout and don't block map rendering
        if (!socketService.isSocketConnected()) {
          try {
            // Use 5 second timeout for faster failure
            await Promise.race([
              socketService.initialize(5000),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 5000)
              )
            ]);
            logger.info('Socket connection established');
          } catch (connError: any) {
            logger.error('Failed to connect to socket', connError);
            const errorMessage = connError.message || 'Unknown connection error';
            
            // Provide more helpful error messages but don't throw - allow map to render
            let userFriendlyError = 'Live tracking unavailable';
            if (errorMessage.includes('timeout') || errorMessage.includes('Connection timeout')) {
              userFriendlyError = 'Live tracking unavailable: Connection timeout. The map will still show the route.';
            } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
              userFriendlyError = 'Live tracking unavailable: Cannot reach server. The map will still show the route.';
            } else {
              userFriendlyError = `Live tracking unavailable: ${errorMessage.split('\n')[0]}. The map will still show the route.`;
            }
            
            // Don't throw - just set error and continue
            setError(userFriendlyError);
            setLoading(false);
            
            // Exit early - map will still render with route
            return;
          }
        }

        // Verify connection is actually established
        if (!socketService.isSocketConnected()) {
          setError('Socket connection not established. Map will show route only.');
          setLoading(false);
          return; // Exit early - map will still render with route
        }

        // Join vehicle room if vehicle ID is available
        if (vehicleId) {
          logger.info('Joining vehicle for live tracking', { vehicleId });
          
          let locationReceived = false;
          let isFirstLocationUpdate = true;
          const timeoutId = setTimeout(() => {
            if (!locationReceived) {
              setLoading(false);
              setError('No location data received. The vehicle may be offline.');
              console.warn('⚠️ Socket: No location data received within 10 seconds');
            }
          }, 10000);
          
          // IMPORTANT: Set up listener BEFORE joining the vehicle room
          // This ensures we catch the initial location update
          socketService.onVehicleLocation((vehicle: VehicleLocation) => {
            if (!locationReceived) {
              console.log('✅ Socket: Vehicle location updates working');
              locationReceived = true;
            }
            setVehicleLocation(vehicle);
            setLoading(false);
            clearTimeout(timeoutId);
            
            logger.debug('Vehicle location update received', {
              vehicleId: vehicle._id,
              internalId: vehicle.internalId,
              plateNumber: vehicle.plateNumber,
              latitude: vehicle.currentLocation?.latitude,
              longitude: vehicle.currentLocation?.longitude,
              speed: vehicle.speed,
            }, 'MapViewWithLiveTracking');

            const numericSpeed = parseSpeed(vehicle.speed ?? null);
            if (numericSpeed !== null && numericSpeed > SPEED_WARNING_THRESHOLD_KMH) {
              logger.warn('Vehicle speed exceeded threshold', {
                vehicleId: vehicle._id,
                internalId: vehicle.internalId,
                plateNumber: vehicle.plateNumber,
                speedKmh: numericSpeed,
                thresholdKmh: SPEED_WARNING_THRESHOLD_KMH,
              }, 'MapViewWithLiveTracking');
            }

            const numericFuelPercent = parseFuelValue(
              vehicle.fuel?.percentage ??
              vehicle.fuelLevelPercentage ??
              (vehicle as any)?.fuelPercentage ??
              null
            );
            let numericFuelLiters = parseFuelValue(
              vehicle.fuel?.liters ??
              vehicle.fuel?.litres ??
              vehicle.fuelLevelLitres ??
              vehicle.fuelLevelLiters ??
              (vehicle as any)?.fuelLiters ??
              null
            );
            if (numericFuelLiters === null) {
              const gallonsValue = parseFuelValue(
                vehicle.fuel?.gallons ?? (vehicle as any)?.fuelGallons ?? null
              );
              if (gallonsValue !== null) {
                numericFuelLiters = gallonsValue * 3.78541;
              }
            }
            if (
              (numericFuelPercent !== null && numericFuelPercent <= FUEL_WARNING_THRESHOLD_PERCENT) ||
              (numericFuelPercent === null &&
                numericFuelLiters !== null &&
                numericFuelLiters <= FUEL_WARNING_THRESHOLD_LITERS)
            ) {
              logger.warn('Vehicle fuel below threshold', {
                vehicleId: vehicle._id,
                internalId: vehicle.internalId,
                plateNumber: vehicle.plateNumber,
                fuelPercentage: numericFuelPercent,
                fuelLiters: numericFuelLiters,
                thresholdPercent: FUEL_WARNING_THRESHOLD_PERCENT,
                thresholdLiters: FUEL_WARNING_THRESHOLD_LITERS,
              }, 'MapViewWithLiveTracking');
            }
            
            // Update map camera to show vehicle (only on first update to avoid constant movement)
            const vehicleLat = parseCoordinate(vehicle.currentLocation?.latitude);
            const vehicleLng = parseCoordinate(vehicle.currentLocation?.longitude);
            if (vehicleLat !== null && vehicleLng !== null && mapRef.current) {
              if (isFirstLocationUpdate) {
                // Animate to vehicle location on first update
                mapRef.current.animateToRegion({
                  latitude: vehicleLat,
                  longitude: vehicleLng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }, 1000);
                isFirstLocationUpdate = false;
              }
              // Subsequent updates will just move the marker, camera stays stable
            }
          });
          
          // Now join the vehicle room - this will trigger the backend to start sending updates
          socketService.joinVehicle(vehicleId);
          
          // Clear timeout on cleanup
          return () => {
            clearTimeout(timeoutId);
            socketService.offVehicleLocation();
          };
        } else {
          setLoading(false);
          setError('No vehicle assigned to this load.');
        }

      } catch (err: any) {
        logger.error('Error initializing live tracking', err);
        const errorMsg = err.message || 'Failed to initialize live tracking';
        setError(errorMsg);
        setLoading(false);
        
        // Even if socket fails, we can still show the route map
        // The error will be displayed but map will be usable
        console.warn('⚠️ Socket connection failed, but map can still display route information');
      }
    };

    initializeTracking();

    // Cleanup on unmount
    return () => {
      socketService.leaveVehicle();
      socketService.offVehicleLocation();
    };
  }, [visible, vehicleId]);

  // Ensure map region is set when modal becomes visible
  useEffect(() => {
    if (visible && mapRef.current) {
      const region = calculateRegion();
      console.log('🔄 Modal visible, setting map region:', region);
      if (region && !isNaN(region.latitude) && !isNaN(region.longitude)) {
        // Small delay to ensure MapView is fully mounted
        setTimeout(() => {
          if (mapRef.current) {
            console.log('📍 Animating map to region:', region);
            mapRef.current.animateToRegion(region, 500);
          }
        }, 100);
      } else {
        console.error('❌ Cannot set map region - invalid coordinates:', region);
      }
    }
  }, [visible, load?._id]);

  // Add timeout for map loading
  useEffect(() => {
    if (visible && mapLoading) {
      const timeout = setTimeout(() => {
        if (mapLoading) {
          console.warn('⚠️ Map loading timeout - map may not be initializing');
          setMapError('Map is taking too long to load. Please check your internet connection and API key.');
          setMapLoading(false);
        }
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [visible, mapLoading]);

  // Calculate map region to fit all markers
  const calculateRegion = () => {
    const coordinates: Array<{ latitude: number; longitude: number }> = [];

    // Add pickup location (either from selectPickup or from waypoint with pickup: true)
    const pickupLat = parseCoordinate(pickup?.latitude);
    const pickupLng = parseCoordinate(pickup?.longitude);
    if (pickupLat !== null && pickupLng !== null) {
      coordinates.push({
        latitude: pickupLat,
        longitude: pickupLng,
      });
    }

    // Add waypoints if multipleDropOffs is true
    if (multipleDropOffs && wayPoints.length > 0) {
      wayPoints.forEach((waypoint) => {
        // Skip if this waypoint is the pickup (already added above)
        if (waypoint.pickup === true && pickup) {
          return;
        }
        
        // Try multiple ways to get coordinates
        let waypointLat = parseCoordinate(waypoint.address?.latitude);
        let waypointLng = parseCoordinate(waypoint.address?.longitude);
        
        // If not found in address, try direct on waypoint
        if (waypointLat === null || waypointLng === null) {
          waypointLat = parseCoordinate((waypoint as any)?.latitude);
          waypointLng = parseCoordinate((waypoint as any)?.longitude);
        }
        
        // If still not found, try coordinates array
        if ((waypointLat === null || waypointLng === null) && (waypoint.address as any)?.coordinates) {
          const coords = (waypoint.address as any).coordinates;
          if (Array.isArray(coords) && coords.length >= 2) {
            waypointLng = parseCoordinate(coords[0]); // longitude first in GeoJSON
            waypointLat = parseCoordinate(coords[1]); // latitude second in GeoJSON
          }
        }
        
        if (waypointLat !== null && waypointLng !== null) {
          coordinates.push({
            latitude: waypointLat,
            longitude: waypointLng,
          });
        }
      });
    } else {
      // Add dropoff location only if not multiple drops
      const dropoffLat = parseCoordinate(dropoff?.latitude);
      const dropoffLng = parseCoordinate(dropoff?.longitude);
      if (dropoffLat !== null && dropoffLng !== null) {
        coordinates.push({
          latitude: dropoffLat,
          longitude: dropoffLng,
        });
      }
    }

    // Add vehicle location if available
    const vehicleLat = parseCoordinate(vehicleLocation?.currentLocation?.latitude);
    const vehicleLng = parseCoordinate(vehicleLocation?.currentLocation?.longitude);
    if (vehicleLat !== null && vehicleLng !== null) {
      coordinates.push({ latitude: vehicleLat, longitude: vehicleLng });
    }

    if (coordinates.length === 0) {
      // Default to a reasonable location (e.g., center of US)
      return {
        latitude: 39.8283,
        longitude: -98.5795,
        latitudeDelta: 10,
        longitudeDelta: 10,
      };
    }

    // Calculate bounds
    const minLat = Math.min(...coordinates.map(c => c.latitude));
    const maxLat = Math.max(...coordinates.map(c => c.latitude));
    const minLng = Math.min(...coordinates.map(c => c.longitude));
    const maxLng = Math.max(...coordinates.map(c => c.longitude));

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = Math.max((maxLat - minLat) * 1.5, 0.05);
    const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.05);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  // Parse coordinates first
  const pickupLat = parseCoordinate(pickup?.latitude);
  const pickupLng = parseCoordinate(pickup?.longitude);
  const dropoffLat = parseCoordinate(dropoff?.latitude);
  const dropoffLng = parseCoordinate(dropoff?.longitude);

  // Validate that we have at least pickup coordinates before rendering map
  if (pickupLat === null || pickupLng === null) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Map View</Text>
          </View>
          <View style={styles.mapFallback}>
            <Ionicons name="map-outline" size={64} color="#8B5CF6" />
            <Text style={styles.fallbackText}>Route Coordinates Missing</Text>
            <Text style={styles.fallbackSubtext}>
              Pickup location coordinates are not available for this load. Please contact support.
            </Text>
            <TouchableOpacity style={styles.errorButton} onPress={onClose}>
              <Text style={styles.errorButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Build route coordinates based on multipleDropOffs flag
  const routeCoordinates: Array<{ latitude: number; longitude: number }> = useMemo(() => {
    const coords: Array<{ latitude: number; longitude: number }> = [];

    // Add pickup first (either from selectPickup or from waypoint with pickup: true)
    if (pickupLat !== null && pickupLng !== null) {
      coords.push({
        latitude: pickupLat,
        longitude: pickupLng,
      });
    }

    if (multipleDropOffs && wayPoints.length > 0) {
      // Use waypoints in the order they were provided (already optimized by convertTripToLoadForMap)
      // Order: All pickups first, then all deliveries (maintaining order within each group)
      wayPoints.forEach((waypoint) => {
        // Skip if this waypoint is the pickup and we already added it
        if (waypoint.pickup === true && pickup && 
            parseCoordinate(waypoint.address?.latitude) === pickupLat &&
            parseCoordinate(waypoint.address?.longitude) === pickupLng) {
          return;
        }
        
        // Try multiple ways to get coordinates
        let waypointLat = parseCoordinate(waypoint.address?.latitude);
        let waypointLng = parseCoordinate(waypoint.address?.longitude);
        
        // If not found in address, try direct on waypoint
        if (waypointLat === null || waypointLng === null) {
          waypointLat = parseCoordinate((waypoint as any)?.latitude);
          waypointLng = parseCoordinate((waypoint as any)?.longitude);
        }
        
        // If still not found, try coordinates array
        if ((waypointLat === null || waypointLng === null) && (waypoint.address as any)?.coordinates) {
          const coords = (waypoint.address as any).coordinates;
          if (Array.isArray(coords) && coords.length >= 2) {
            waypointLng = parseCoordinate(coords[0]); // longitude first in GeoJSON
            waypointLat = parseCoordinate(coords[1]); // latitude second in GeoJSON
          }
        }
        
        if (waypointLat !== null && waypointLng !== null) {
          coords.push({
            latitude: waypointLat,
            longitude: waypointLng,
          });
        }
      });
    } else if (dropoffLat !== null && dropoffLng !== null) {
      coords.push({
        latitude: dropoffLat,
        longitude: dropoffLng,
      });
    }

    return coords;
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, multipleDropOffs, wayPoints, pickup]);

  // Prepare valid waypoints for rendering (filter out invalid coordinates)
  // Use useMemo to ensure stable array reference - defined early so it can be used in useEffect
  const validWaypoints = useMemo(() => {
    if (!multipleDropOffs || !wayPoints || wayPoints.length === 0) {
      return [];
    }

    const valid = wayPoints
      .map((waypoint, originalIndex) => {
        // Try multiple ways to get coordinates
        // 1. From waypoint.address.latitude/longitude (most common)
        // 2. From waypoint.latitude/longitude (direct on waypoint)
        // 3. From waypoint.address.coordinates (if stored as array)
        let waypointLat = parseCoordinate(waypoint.address?.latitude);
        let waypointLng = parseCoordinate(waypoint.address?.longitude);
        
        // If not found in address, try direct on waypoint
        if (waypointLat === null || waypointLng === null) {
          waypointLat = parseCoordinate((waypoint as any)?.latitude);
          waypointLng = parseCoordinate((waypoint as any)?.longitude);
        }
        
        // If still not found, try coordinates array
        if ((waypointLat === null || waypointLng === null) && (waypoint.address as any)?.coordinates) {
          const coords = (waypoint.address as any).coordinates;
          if (Array.isArray(coords) && coords.length >= 2) {
            waypointLng = parseCoordinate(coords[0]); // longitude first in GeoJSON
            waypointLat = parseCoordinate(coords[1]); // latitude second in GeoJSON
          }
        }
        
        // Log warning if coordinates are missing
        if (waypointLat === null || waypointLng === null) {
          logger.warn('Waypoint missing coordinates', {
            waypointIndex: originalIndex,
            hasAddress: !!waypoint.address,
            addressKeys: waypoint.address ? Object.keys(waypoint.address) : [],
            waypointKeys: Object.keys(waypoint),
            place: waypoint.address?.place,
          });
          return null;
        }

        return {
          waypoint,
          waypointLat,
          waypointLng,
          originalIndex,
          isDropoff: waypoint.dropOff === true,
          isPickup: waypoint.pickup === true,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    
    logger.info('Valid waypoints prepared', {
      totalWaypoints: wayPoints.length,
      validWaypoints: valid.length,
      multipleDropOffs,
    });
    
    return valid;
  }, [multipleDropOffs, wayPoints]);

  const vehicleLat = parseCoordinate(vehicleLocation?.currentLocation?.latitude);
  const vehicleLng = parseCoordinate(vehicleLocation?.currentLocation?.longitude);
  const vehicleLocationLabel = useMemo(() => {
    if (vehicleLocation?.currentLocation?.address) {
      return vehicleLocation.currentLocation.address;
    }
    const lat = parseCoordinate(vehicleLocation?.currentLocation?.latitude);
    const lng = parseCoordinate(vehicleLocation?.currentLocation?.longitude);
    if (lat !== null && lng !== null) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    if (vehicleLocation?.plateNumber) {
      return vehicleLocation.plateNumber;
    }
    return 'Location unavailable';
  }, [vehicleLocation]);

  const vehicleCoordinates = vehicleLat !== null && vehicleLng !== null
    ? {
        latitude: vehicleLat,
        longitude: vehicleLng,
      }
    : null;

  const currentSpeedKmh = useMemo(() => parseSpeed(vehicleLocation?.speed ?? null), [vehicleLocation?.speed]);
  const isSpeedDemoActive = ENABLE_SPEED_WARNING_DEMO && forceWarningDemo;
  const isFuelDemoActive = isSpeedDemoActive;
  const effectiveSpeedKmh = useMemo(() => {
    if (isSpeedDemoActive) {
      return SPEED_WARNING_THRESHOLD_KMH + 5;
    }
    return currentSpeedKmh;
  }, [isSpeedDemoActive, currentSpeedKmh]);
  const speedDisplayText = effectiveSpeedKmh !== null ? effectiveSpeedKmh.toFixed(1) : '0.0';
  const speedDisplayWithUnit = `${speedDisplayText} km/h`;
  const isSpeedWarningActive = effectiveSpeedKmh !== null && effectiveSpeedKmh > SPEED_WARNING_THRESHOLD_KMH;
  const speedWarningExcessValue = isSpeedWarningActive && effectiveSpeedKmh !== null
    ? Math.max(0, Math.ceil(effectiveSpeedKmh - SPEED_WARNING_THRESHOLD_KMH))
    : null;
  const speedLimitWithUnit = `${SPEED_WARNING_THRESHOLD_KMH} km/h`;
  const rawFuelPercentage = useMemo(() => {
    const sources: Array<number | string | null | undefined> = [
      vehicleLocation?.fuel?.percentage,
      vehicleLocation?.fuelLevelPercentage,
      (vehicleLocation as any)?.fuelPercentage,
      vehicleLocation?.fuelLevel,
      vehicleLocation?.fuel?.level,
    ];
    for (const source of sources) {
      const parsed = parseFuelValue(source ?? null);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  }, [vehicleLocation]);
  const rawFuelLiters = useMemo(() => {
    const literSources: Array<number | string | null | undefined> = [
      vehicleLocation?.fuel?.liters,
      vehicleLocation?.fuel?.litres,
      vehicleLocation?.fuelLevelLitres,
      vehicleLocation?.fuelLevelLiters,
      (vehicleLocation as any)?.fuelLiters,
    ];
    for (const source of literSources) {
      const parsed = parseFuelValue(source ?? null);
      if (parsed !== null) {
        return parsed;
      }
    }

    const gallonSources: Array<number | string | null | undefined> = [
      vehicleLocation?.fuel?.gallons,
      (vehicleLocation as any)?.fuelGallons,
    ];
    for (const source of gallonSources) {
      const parsedGallons = parseFuelValue(source ?? null);
      if (parsedGallons !== null) {
        return parsedGallons * 3.78541; // convert to litres
      }
    }

    return null;
  }, [vehicleLocation]);
  const fuelPercentage = useMemo(() => {
    if (rawFuelPercentage === null) {
      return null;
    }
    return Math.min(100, Math.max(0, rawFuelPercentage));
  }, [rawFuelPercentage]);
  const fuelLiters = useMemo(() => {
    if (rawFuelLiters === null) {
      return null;
    }
    return Math.max(0, rawFuelLiters);
  }, [rawFuelLiters]);
  const baseFuelWarningActive =
    (fuelPercentage !== null && fuelPercentage <= FUEL_WARNING_THRESHOLD_PERCENT) ||
    (fuelPercentage === null && fuelLiters !== null && fuelLiters <= FUEL_WARNING_THRESHOLD_LITERS);
  const isFuelWarningActive = baseFuelWarningActive || isFuelDemoActive;
  const fuelDisplayPercentage = useMemo(() => {
    if (fuelPercentage === null) {
      return null;
    }
    return `${fuelPercentage.toFixed(1)}%`;
  }, [fuelPercentage]);
  const fuelDisplayLiters = useMemo(() => {
    if (fuelLiters === null) {
      return null;
    }
    return `${fuelLiters.toFixed(1)} L`;
  }, [fuelLiters]);
  const fuelDisplayText = useMemo(() => {
    const parts: string[] = [];
    if (fuelDisplayPercentage) {
      parts.push(fuelDisplayPercentage);
    }
    if (fuelDisplayLiters) {
      parts.push(fuelDisplayLiters);
    }
    if (parts.length === 0) {
      return null;
    }
    return parts.join(' · ');
  }, [fuelDisplayPercentage, fuelDisplayLiters]);
  const fuelThresholdDescription = `${FUEL_WARNING_THRESHOLD_PERCENT}% or ${FUEL_WARNING_THRESHOLD_LITERS} L`;
  const fuelDisplayTextForUi = useMemo(() => {
    if (isFuelDemoActive) {
      if (fuelDisplayText) {
        return fuelDisplayText.includes('demo') ? fuelDisplayText : `${fuelDisplayText} (demo)`;
      }
      return `${Math.max(0, FUEL_WARNING_THRESHOLD_PERCENT - 2).toFixed(1)}% · ${(FUEL_WARNING_THRESHOLD_LITERS - 5).toFixed(1)} L (demo)`;
    }
    return fuelDisplayText;
  }, [isFuelDemoActive, fuelDisplayText]);
  const fuelWarningTitle = useMemo(() => {
    if (isFuelDemoActive && !baseFuelWarningActive) {
      return 'Low Fuel Warning (Demo)';
    }
    return 'Low Fuel Warning';
  }, [isFuelDemoActive, baseFuelWarningActive]);
  const warningBanners = useMemo<WarningBannerConfig[]>(() => {
    const banners: WarningBannerConfig[] = [];
    if (isSpeedWarningActive || isSpeedDemoActive) {
      banners.push({
        id: 'speed-warning',
        type: 'speed',
        icon: 'speedometer',
        title: isSpeedDemoActive ? 'Speed Warning (Demo)' : 'Speed Warning',
        message: `Current speed ${speedDisplayWithUnit}${
          speedWarningExcessValue !== null ? ` (+${speedWarningExcessValue} km/h)` : ''
        }. Slow down to ${speedLimitWithUnit} or below.`,
        note: isSpeedDemoActive
          ? 'Demo override active – showing example alert until GeoTab speed is available.'
          : undefined,
      });
    }
    if (isFuelWarningActive) {
      const displayFuelText = fuelDisplayTextForUi ?? 'unknown';
      const fuelMessage = `Fuel level ${displayFuelText} is below the recommended minimum (${fuelThresholdDescription}). Plan to refuel soon.`;
      banners.push({
        id: 'fuel-warning',
        type: 'fuel',
        icon: 'alert-circle',
        title: fuelWarningTitle,
        message: fuelMessage,
        note:
          fuelDisplayTextForUi === null
            ? `Thresholds: ${fuelThresholdDescription}.`
            : isFuelDemoActive && !baseFuelWarningActive
              ? 'Demo override active – showing example alert until fuel telemetry is available.'
              : undefined,
      });
    }
    return banners;
  }, [
    isSpeedWarningActive,
    isSpeedDemoActive,
    speedDisplayWithUnit,
    speedWarningExcessValue,
    speedLimitWithUnit,
    isFuelWarningActive,
    fuelThresholdDescription,
    fuelDisplayTextForUi,
    fuelWarningTitle,
    isFuelDemoActive,
    baseFuelWarningActive,
  ]);
  const vehicleInfoContentHtml = useMemo(() => {
    const name = vehicleLocation?.plateNumber || 'Live Location';
    const speedLine = effectiveSpeedKmh !== null
      ? `Speed: ${speedDisplayWithUnit}${isSpeedWarningActive ? ' (over limit)' : ''}${isSpeedDemoActive ? ' (demo)' : ''}`
      : 'Speed: N/A';
    const thresholdLine = `Warning threshold: ${speedLimitWithUnit}`;
    const excessLine = speedWarningExcessValue !== null ? `<br/>Over by ${speedWarningExcessValue} km/h` : '';
    const demoLine = isSpeedDemoActive ? '<br/><em>Demo warning override active</em>' : '';
    const fuelLine = fuelDisplayTextForUi ? `<br/>Fuel: ${fuelDisplayTextForUi}` : '';
    const fuelWarningLine = isFuelWarningActive
      ? `<br/><strong>Fuel alert:</strong> Below minimum (${fuelThresholdDescription}).`
      : '';
    return `<div><strong>Vehicle</strong><br/>${name}<br/>${speedLine}<br/>${thresholdLine}${excessLine}${demoLine}${fuelLine}${fuelWarningLine}</div>`;
  }, [
    vehicleLocation?.plateNumber,
    effectiveSpeedKmh,
    speedDisplayWithUnit,
    isSpeedWarningActive,
    speedLimitWithUnit,
    speedWarningExcessValue,
    isSpeedDemoActive,
    fuelDisplayTextForUi,
    isFuelWarningActive,
    fuelThresholdDescription,
  ]);

  const fetchGoogleMapsApiKey = useCallback(async (): Promise<string | null> => {
    if (googleMapsApiKeyRef.current !== undefined) {
      return googleMapsApiKeyRef.current ?? null;
    }

    // Use frontend Google Maps API key from config/env.ts
    const frontendApiKey = GOOGLE_MAPS_API_KEY;
    
    if (frontendApiKey && typeof frontendApiKey === 'string' && frontendApiKey.length > 0) {
      console.log('✅ Using frontend Google Maps API key');
      googleMapsApiKeyRef.current = frontendApiKey;
      return frontendApiKey;
    }

    console.warn('⚠️ Frontend Google Maps API key not found in config');
    googleMapsApiKeyRef.current = null;
    return null;
  }, []);

  const fetchRoutePolyline = useCallback(async () => {
    // For multiple dropoffs, we don't need dropoffLat/dropoffLng
    if (pickupLat === null || pickupLng === null) {
      setRoutePath([]);
      return;
    }

    // For single dropoff, we need dropoff coordinates
    if (!multipleDropOffs && (dropoffLat === null || dropoffLng === null)) {
      setRoutePath([]);
      return;
    }

    try {
      const apiKey = await fetchGoogleMapsApiKey();
      if (!apiKey) {
        setRoutePath(routeCoordinates.slice());
        return;
      }

      // For multiple dropoffs, use waypoints in order
      // Otherwise use the single dropoff location
      let destinationLat: number;
      let destinationLng: number;
      let waypointParams: string[] = [];
      
      if (multipleDropOffs && wayPoints.length > 0) {
        // Process waypoints in array order (preserving sequence)
        const waypointCoords: Array<{ lat: number; lng: number; coord: string }> = [];
        
        wayPoints.forEach((waypoint) => {
          // Skip pickup waypoint if it's being used as origin
          if (waypoint.pickup === true && pickup && 
              parseCoordinate(waypoint.address?.latitude) === pickupLat &&
              parseCoordinate(waypoint.address?.longitude) === pickupLng) {
            return;
          }
          
          // Try multiple ways to get coordinates
          let lat = parseCoordinate(waypoint.address?.latitude);
          let lng = parseCoordinate(waypoint.address?.longitude);
          
          // If not found in address, try direct on waypoint
          if (lat === null || lng === null) {
            lat = parseCoordinate((waypoint as any)?.latitude);
            lng = parseCoordinate((waypoint as any)?.longitude);
          }
          
          // If still not found, try coordinates array
          if ((lat === null || lng === null) && (waypoint.address as any)?.coordinates) {
            const coords = (waypoint.address as any).coordinates;
            if (Array.isArray(coords) && coords.length >= 2) {
              lng = parseCoordinate(coords[0]); // longitude first in GeoJSON
              lat = parseCoordinate(coords[1]); // latitude second in GeoJSON
            }
          }
          
          if (lat !== null && lng !== null) {
            waypointCoords.push({
              lat,
              lng,
              coord: `${lat},${lng}`
            });
          }
        });

        if (waypointCoords.length > 0) {
          // Use the last waypoint coordinate as destination
          const lastWaypoint = waypointCoords[waypointCoords.length - 1];
          destinationLat = lastWaypoint.lat;
          destinationLng = lastWaypoint.lng;
          
          // Use all waypoints except the last one as intermediate stops
          // This preserves the order from the array
          const intermediateWaypoints = waypointCoords.slice(0, -1);
          if (intermediateWaypoints.length > 0) {
            waypointParams.push(`waypoints=${encodeURIComponent(intermediateWaypoints.map(w => w.coord).join('|'))}`);
          }
        } else {
          // If no valid waypoints, use pickup as both origin and destination
          destinationLat = pickupLat;
          destinationLng = pickupLng;
        }
      } else {
        // Single dropoff - use dropoff as destination
        destinationLat = dropoffLat!;
        destinationLng = dropoffLng!;
      }
      
      // Call Directions API through backend to avoid API key restriction issues
      const origin = `${pickupLat},${pickupLng}`;
      const destination = `${destinationLat},${destinationLng}`;
      const waypointsParam = waypointParams.length > 0 
        ? waypointParams.map(p => p.replace('waypoints=', '')).join('|')
        : undefined;

      console.log('🛣️ Fetching route from Directions API via backend...');
      console.log('📍 Origin:', origin);
      console.log('📍 Destination:', destination);
      
      // Build query parameters - include frontend API key
      const queryParams = new URLSearchParams({
        origin: origin,
        destination: destination,
        mode: 'driving',
        apiKey: GOOGLE_MAPS_API_KEY || '' // Pass frontend API key to backend
      });
      
      if (waypointsParam) {
        queryParams.append('waypoints', waypointsParam);
      }
      
      // Call backend endpoint
      const endpoint = `/driver/directions?${queryParams.toString()}`;
      console.log('🛣️ Calling backend directions endpoint:', endpoint);
      
      const response = await apiService.get<any>(endpoint, true);
      
      console.log('📦 Backend response structure:', {
        success: response?.success,
        hasData: !!response?.data,
        responseKeys: response ? Object.keys(response) : [],
        dataKeys: response?.data ? Object.keys(response.data) : [],
        nestedDataKeys: response?.data?.data ? Object.keys(response.data.data) : []
      });
      
      if (!response || !response.success) {
        const errorMsg = response?.error_message || response?.message || response?.error || 'Directions request failed';
        console.error('❌ Directions API error:', errorMsg);
        throw new Error(`Directions request failed: ${errorMsg}`);
      }

      if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Directions API returned no data');
      }

      // Backend returns: { success: true, data: { status: 'OK', routes: [...] } }
      // apiService wraps it: { success: true, data: { success: true, data: { status: 'OK', routes: [...] } } }
      // So we need to check if there's nested data
      const googleResponse = response.data.data || response.data;
      
      console.log('📦 Google Directions response:', {
        hasStatus: 'status' in googleResponse,
        status: googleResponse.status,
        hasRoutes: 'routes' in googleResponse,
        routesLength: googleResponse.routes?.length
      });
      
      // Check for API errors in the Google response
      if (googleResponse.status && googleResponse.status !== 'OK') {
        console.error('❌ Directions API returned error:', googleResponse.status, googleResponse.error_message);
        throw new Error(`Directions API error: ${googleResponse.status} - ${googleResponse.error_message || 'Unknown error'}`);
      }

      // Extract polyline from Google Directions API response
      const polyline = googleResponse?.routes?.[0]?.overview_polyline?.points;
      
      console.log('📍 Polyline extracted:', {
        hasPolyline: !!polyline,
        polylineLength: polyline?.length,
        routesCount: googleResponse?.routes?.length,
        firstRoute: googleResponse?.routes?.[0] ? Object.keys(googleResponse.routes[0]) : []
      });

      if (polyline) {
        console.log('✅ Route polyline received, decoding...');
        const decoded = decodePolyline(polyline);
        if (decoded.length > 1) {
          console.log(`✅ Route decoded successfully: ${decoded.length} points`);
          setRoutePath(decoded);
          return;
        } else {
          console.warn('⚠️ Decoded polyline has less than 2 points');
        }
      } else {
        console.warn('⚠️ No polyline found in Directions API response');
      }

      // Fallback to straight line if Directions API fails
      console.warn('⚠️ Falling back to straight line route');
      setRoutePath(routeCoordinates.slice());
    } catch (directionsError: any) {
      console.error('❌ Failed to load driving route:', directionsError);
      logger.warn('Failed to load driving route', directionsError);
      // Fallback to straight line
      setRoutePath(routeCoordinates.slice());
    }
  }, [
    fetchGoogleMapsApiKey,
    multipleDropOffs,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    wayPoints,
    routeCoordinates,
    pickup,
  ]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    // For multiple dropoffs, we only need pickup and waypoints
    // For single dropoff, we need both pickup and dropoff
    if (pickupLat === null || pickupLng === null) {
      console.warn('⚠️ No pickup coordinates, using straight line');
      setRoutePath(routeCoordinates.slice());
      return;
    }

    if (!multipleDropOffs && (dropoffLat === null || dropoffLng === null)) {
      console.warn('⚠️ No dropoff coordinates, using straight line');
      setRoutePath(routeCoordinates.slice());
      return;
    }

    // Fetch actual route from Directions API
    console.log('🛣️ Fetching route with Directions API...');
    fetchRoutePolyline();
  }, [
    visible,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    multipleDropOffs,
    wayPoints,
    fetchRoutePolyline,
    routeCoordinates,
  ]);

  // Ensure native map view fits all key coordinates whenever they change
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    if (!visible) {
      return;
    }
    if (!mapRef.current) {
      return;
    }

    const points: Array<{ latitude: number; longitude: number }> = [];
    if (pickupLat !== null && pickupLng !== null) {
      points.push({ latitude: pickupLat, longitude: pickupLng });
    }
    
    // Add waypoints if multipleDropOffs is true
    if (multipleDropOffs && validWaypoints.length > 0) {
      validWaypoints.forEach((item) => {
        // Skip pickup waypoint if it's already added
        if (item.isPickup && pickup && 
            item.waypointLat === pickupLat && 
            item.waypointLng === pickupLng) {
          return;
        }
        points.push({ latitude: item.waypointLat, longitude: item.waypointLng });
      });
    } else if (dropoffLat !== null && dropoffLng !== null) {
      // Only add dropoff if not multiple dropoffs
      points.push({ latitude: dropoffLat, longitude: dropoffLng });
    }
    
    if (vehicleCoordinates) {
      points.push(vehicleCoordinates);
    }
    if (routePath.length > 0) {
      // include start/end of route path for better padding
      points.push(routePath[0], routePath[routePath.length - 1]);
    }

    if (points.length === 0) {
      return;
    }

    try {
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 120, right: 80, bottom: 220, left: 80 },
        animated: true,
      });
    } catch (fitError) {
      logger.warn('Failed to fit map to coordinates', fitError);
    }
  }, [
    visible,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    vehicleCoordinates?.latitude,
    vehicleCoordinates?.longitude,
    routePath,
    multipleDropOffs,
    validWaypoints,
  ]);

  // Calculate distance metrics
  const distanceMetrics = useMemo(() => {
    let totalDistance = 0;
    let distanceTraveled = 0;
    let distanceRemaining = 0;

    // Calculate total route distance
    if (multipleDropOffs && validWaypoints.length > 0) {
      // Multiple drops: Calculate distance from pickup through all waypoints
      if (pickupLat !== null && pickupLng !== null && validWaypoints.length > 0) {
        // Distance from pickup to first waypoint
        const firstWaypoint = validWaypoints[0];
        totalDistance += calculateDistance(
          pickupLat,
          pickupLng,
          firstWaypoint.waypointLat,
          firstWaypoint.waypointLng
        );

        // Distance between waypoints
        for (let i = 0; i < validWaypoints.length - 1; i++) {
          totalDistance += calculateDistance(
            validWaypoints[i].waypointLat,
            validWaypoints[i].waypointLng,
            validWaypoints[i + 1].waypointLat,
            validWaypoints[i + 1].waypointLng
          );
        }
      }
    } else {
      // Single drop: Calculate distance from pickup to dropoff
      if (pickupLat !== null && pickupLng !== null && dropoffLat !== null && dropoffLng !== null) {
        totalDistance = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
      }
    }

    // Calculate distance traveled (from pickup to current vehicle position)
    if (vehicleCoordinates && pickupLat !== null && pickupLng !== null) {
      distanceTraveled = calculateDistance(
        pickupLat,
        pickupLng,
        vehicleCoordinates.latitude,
        vehicleCoordinates.longitude
      );
    }

    // Calculate distance remaining (from vehicle to next destination)
    if (vehicleCoordinates) {
      if (multipleDropOffs && validWaypoints.length > 0) {
        // For multiple drops, calculate distance from vehicle to nearest waypoint
        // and then add remaining waypoints distance
        let nearestWaypointIndex = 0;
        let nearestDistance = Infinity;
        
        // Find the nearest waypoint to the vehicle
        validWaypoints.forEach((waypoint, index) => {
          const dist = calculateDistance(
            vehicleCoordinates.latitude,
            vehicleCoordinates.longitude,
            waypoint.waypointLat,
            waypoint.waypointLng
          );
          if (dist < nearestDistance) {
            nearestDistance = dist;
            nearestWaypointIndex = index;
          }
        });
        
        // Calculate distance from vehicle to nearest waypoint
        const nearestWaypoint = validWaypoints[nearestWaypointIndex];
        distanceRemaining = calculateDistance(
          vehicleCoordinates.latitude,
          vehicleCoordinates.longitude,
          nearestWaypoint.waypointLat,
          nearestWaypoint.waypointLng
        );
        
        // Add distance from nearest waypoint through remaining waypoints
        for (let i = nearestWaypointIndex; i < validWaypoints.length - 1; i++) {
          distanceRemaining += calculateDistance(
            validWaypoints[i].waypointLat,
            validWaypoints[i].waypointLng,
            validWaypoints[i + 1].waypointLat,
            validWaypoints[i + 1].waypointLng
          );
        }
      } else if (dropoffLat !== null && dropoffLng !== null) {
        // Single drop: Distance from vehicle to dropoff
        distanceRemaining = calculateDistance(
          vehicleCoordinates.latitude,
          vehicleCoordinates.longitude,
          dropoffLat,
          dropoffLng
        );
      }
    } else {
      // If no vehicle location, remaining = total
      distanceRemaining = totalDistance;
    }

    return {
      total: totalDistance,
      traveled: distanceTraveled,
      remaining: distanceRemaining,
    };
  }, [
    multipleDropOffs,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    validWaypoints,
    vehicleCoordinates,
  ]);
  const hasDistanceMetrics =
    distanceMetrics.total > 0 ||
    distanceMetrics.traveled > 0 ||
    distanceMetrics.remaining > 0;
  const shouldShowDistanceOverlay = hasDistanceMetrics;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Route Map</Text>
            {load.internalId && (
              <Text style={styles.headerSubtitle}>Load: {load.internalId}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          {ENABLE_SPEED_WARNING_DEMO && (
            <TouchableOpacity
              onPress={() => setForceWarningDemo((prev) => !prev)}
              style={[
                styles.demoToggleFloating,
                isSpeedDemoActive && styles.demoToggleFloatingActive,
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSpeedDemoActive ? 'play-back' : 'flash'}
                size={18}
                color="#fff"
              />
              <Text style={styles.demoToggleFloatingText}>
                {isSpeedDemoActive ? 'Hide Demo' : 'Demo Speed Warning'}
              </Text>
            </TouchableOpacity>
          )}

          {warningBanners.length > 0 && (
            <View style={styles.warningStack}>
              {warningBanners.map((banner, index) => (
                <View
                  key={banner.id}
                  style={[
                    styles.warningBanner,
                    banner.type === 'speed'
                      ? styles.warningBannerSpeed
                      : styles.warningBannerFuel,
                    index > 0 && styles.warningBannerSpacing,
                  ]}
                >
                  <Ionicons
                    name={banner.icon}
                    size={22}
                    color="#fff"
                    style={styles.warningBannerIcon}
                  />
                  <View style={styles.warningBannerContent}>
                    <Text style={styles.warningBannerTitle}>{banner.title}</Text>
                    <Text style={styles.warningBannerMessage}>{banner.message}</Text>
                    {banner.note && (
                      <Text style={styles.warningBannerNote}>{banner.note}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Distance Toggle Button */}
          {shouldShowDistanceOverlay && (
            <TouchableOpacity
              style={styles.distanceToggleButton}
              onPress={() => setShowDistanceInfo(!showDistanceInfo)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showDistanceInfo ? "eye-off" : "eye"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          )}

          {/* Distance Info Overlay - Floating on Map */}
          {showDistanceInfo && shouldShowDistanceOverlay && (
            <View style={styles.mapDistanceOverlay}>
              <View style={styles.mapDistanceCard}>
                <View style={styles.mapDistanceHeader}>
                  <TouchableOpacity
                    onPress={() => setShowDistanceInfo(false)}
                    style={styles.mapDistanceCloseButton}
                  >
                    <Ionicons name="close" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.mapDistanceList}>
                  <View style={styles.mapDistanceListItem}>
                    <Ionicons name="map-outline" size={16} color="#6366F1" style={styles.mapDistanceListIcon} />
                    <View style={styles.mapDistanceItemContent}>
                      <Text style={styles.mapDistanceLabel}>Total Distance</Text>
                      <Text style={styles.mapDistanceValue}>
                        {distanceMetrics.total > 0 ? `${distanceMetrics.total.toFixed(1)} km` : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.mapDistanceSeparator} />
                  <View style={styles.mapDistanceListItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" style={styles.mapDistanceListIcon} />
                    <View style={styles.mapDistanceItemContent}>
                      <Text style={styles.mapDistanceLabel}>Distance Traveled</Text>
                      <Text style={styles.mapDistanceValue}>
                        {distanceMetrics.traveled > 0 ? `${distanceMetrics.traveled.toFixed(1)} km` : '0.0 km'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.mapDistanceSeparator} />
                  <View style={styles.mapDistanceListItem}>
                    <Ionicons name="navigate-circle" size={16} color="#F59E0B" style={styles.mapDistanceListIcon} />
                    <View style={styles.mapDistanceItemContent}>
                      <Text style={styles.mapDistanceLabel}>Distance Remaining</Text>
                      <Text style={styles.mapDistanceValue}>
                        {distanceMetrics.remaining > 0 ? `${distanceMetrics.remaining.toFixed(1)} km` : '0.0 km'}
                      </Text>
                    </View>
                  </View>
                  {fuelDisplayTextForUi && (
                    <>
                      <View style={styles.mapDistanceSeparator} />
                      <View style={styles.mapDistanceListItem}>
                        <Ionicons name="water" size={16} color="#0EA5E9" style={styles.mapDistanceListIcon} />
                        <View style={styles.mapDistanceItemContent}>
                          <Text style={styles.mapDistanceLabel}>Current Fuel Level</Text>
                          <Text style={[styles.mapDistanceValue, isFuelWarningActive ? styles.mapDistanceValueWarning : undefined]}>
                            {fuelDisplayTextForUi}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
                {multipleDropOffs && validWaypoints.length > 0 && (
                  <View style={styles.mapDistanceWaypointContainer}>
                    <Text style={styles.mapDistanceWaypointInfo}>
                      {validWaypoints.length} stop{validWaypoints.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {mapLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
          
          {mapError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
              <Text style={styles.errorBannerText}>
                Map Error: {mapError}
              </Text>
              <TouchableOpacity 
                style={styles.errorButton} 
                onPress={() => {
                  console.log('🔄 Retrying map load...');
                  setMapError(null);
                  setMapLoading(true);
                  if (mapRef.current) {
                    const region = calculateRegion();
                    mapRef.current.animateToRegion(region, 500);
                  }
                }}
              >
                <Text style={styles.errorButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && !mapLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Connecting to live tracking...</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={20} color="#FF6B6B" />
              <Text style={styles.errorBannerText}>
                Live tracking unavailable: {error.includes('\n') ? error.split('\n')[0] : error}
              </Text>
            </View>
          )}

          {Platform.OS === 'web' ? (
            <WebMapView
              pickup={pickup}
              dropoff={dropoff}
              vehicleLocation={vehicleLocation}
              routeCoordinates={routeCoordinates}
            routePath={routePath.length >= 2 ? routePath : routeCoordinates}
              vehicleCoordinates={vehicleCoordinates}
              speedDisplayWithUnit={speedDisplayWithUnit}
              speedWarningExcessValue={speedWarningExcessValue}
              speedLimitWithUnit={speedLimitWithUnit}
              isSpeedWarningActive={isSpeedWarningActive}
              isSpeedDemoActive={isSpeedDemoActive}
              fuelDisplayText={fuelDisplayTextForUi}
              isFuelWarningActive={isFuelWarningActive}
              vehicleInfoContentHtml={vehicleInfoContentHtml}
              warningBanners={warningBanners}
              enableSpeedWarningDemo={ENABLE_SPEED_WARNING_DEMO}
              onToggleSpeedDemo={() => setForceWarningDemo((prev) => !prev)}
              onOpenGoogleMaps={() => {
                // Open Google Maps with route if coordinates are available
                const coords = vehicleCoordinates || (pickupLat !== null && pickupLng !== null ? { latitude: pickupLat, longitude: pickupLng } : null);
                if (coords && coords.latitude !== null && coords.longitude !== null) {
                  const url = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
                  Linking.openURL(url);
                }
              }}
            />
          ) : MapView && PROVIDER_GOOGLE ? (() => {
            try {
              const region = calculateRegion();
              console.log('🗺️ Calculated region:', region);
              
              // Validate region coordinates
              if (!region || isNaN(region.latitude) || isNaN(region.longitude) || 
                  !isFinite(region.latitude) || !isFinite(region.longitude)) {
                console.error('❌ Invalid region:', region);
                throw new Error(`Invalid map region coordinates: ${JSON.stringify(region)}`);
              }
              
              // Validate delta values
              if (!region.latitudeDelta || !region.longitudeDelta || 
                  region.latitudeDelta <= 0 || region.longitudeDelta <= 0) {
                console.warn('⚠️ Invalid delta values, using defaults');
                region.latitudeDelta = region.latitudeDelta || 0.05;
                region.longitudeDelta = region.longitudeDelta || 0.05;
              }
              
              console.log('✅ Valid region, rendering map:', {
                lat: region.latitude,
                lng: region.longitude,
                latDelta: region.latitudeDelta,
                lngDelta: region.longitudeDelta
              });
              
              return (
                <MapView
                  ref={mapRef}
        style={styles.map}
                  provider={PROVIDER_GOOGLE}
                  region={region}
                  initialRegion={region}
                  mapType="standard"
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                  showsCompass={true}
                  showsScale={true}
                  toolbarEnabled={false}
                  loadingEnabled={true}
                  loadingIndicatorColor="#666666"
                  loadingBackgroundColor="#ffffff"
                  onMapReady={() => {
                    console.log('✅ Map is ready and loaded');
                    console.log('📍 Map region:', region);
                    logger.info('Map ready', { region });
                    setMapLoading(false);
                    setMapError(null);
                    // Don't set loading=false here, let socket connection handle that
                  }}
                  onError={(error: any) => {
                    console.error('❌ Map error:', error);
                    console.error('❌ Error details:', JSON.stringify(error, null, 2));
                    logger.error('Map error', error);
                    const errorMessage = error?.message || error?.nativeEvent?.message || 'Map failed to load. Please check your Google Maps API key configuration.';
                    setMapError(errorMessage);
                    setMapLoading(false);
                    // Show error but don't block the UI
                  }}
                  onLoadStart={() => {
                    console.log('🔄 Map loading started...');
                    console.log('📍 Initial region:', region);
                    setMapLoading(true);
                  }}
                  onLoadEnd={() => {
                    console.log('✅ Map load ended');
                  }}
                >
            {/* Pickup Marker with Label */}
            {pickupLat !== null && pickupLng !== null && (
              <Marker
                key={`pickup-${load._id}-${pickupLat.toFixed(4)}-${pickupLng.toFixed(4)}`}
                coordinate={{
                  latitude: pickupLat,
                  longitude: pickupLng,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                zIndex={2000}
              >
                <View style={styles.markerWrapper} collapsable={false} pointerEvents="none">
                  <View style={[styles.markerCard, styles.pickupCard]}>
                    <Text style={styles.markerCardTitle}>Pickup</Text>
                    <Text style={styles.markerCardSubtitle} numberOfLines={1}>
                      {pickup?.place || pickup?.city || 'Location'}
                    </Text>
                  </View>
                  <View style={[styles.markerPointer, styles.pickupPointer]} />
                  <View style={[styles.markerPointerShadow, styles.pickupPointerShadow]} />
                </View>
              </Marker>
            )}

            {/* Dropoff Marker with Label */}
            {!multipleDropOffs && dropoffLat !== null && dropoffLng !== null && (
              <Marker
                key={`dropoff-${load._id}-${dropoffLat.toFixed(4)}-${dropoffLng.toFixed(4)}`}
                coordinate={{
                  latitude: dropoffLat,
                  longitude: dropoffLng,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                zIndex={1500}
              >
                <View style={styles.markerWrapper} collapsable={false} pointerEvents="none">
                  <View style={[styles.markerCard, styles.dropoffCard]}>
                    <Text style={styles.markerCardTitle}>Drop-off</Text>
                    <Text style={styles.markerCardSubtitle} numberOfLines={1}>
                      {dropoff?.place || dropoff?.city || 'Location'}
                    </Text>
                  </View>
                  <View style={[styles.markerPointer, styles.dropoffPointer]} />
                  <View style={[styles.markerPointerShadow, styles.dropoffPointerShadow]} />
                </View>
              </Marker>
            )}

            {/* Waypoint Markers with Labels */}
            {validWaypoints.map((item, displayIndex) => {
              const { waypoint, waypointLat, waypointLng, originalIndex, isDropoff, isPickup } = item;
              
              // Skip rendering pickup waypoint if it's already shown as pickup marker
              // Only skip if pickup exists and coordinates match
              if (isPickup && pickup && 
                  parseCoordinate(pickup?.latitude) === waypointLat &&
                  parseCoordinate(pickup?.longitude) === waypointLng) {
                return null;
              }
              
              // Create unique key for each marker
              const markerKey = `waypoint-${load._id}-${originalIndex}-${Math.round(waypointLat * 10000)}-${Math.round(waypointLng * 10000)}`;

              return (
                <Marker
                  key={markerKey}
                  coordinate={{
                    latitude: waypointLat,
                    longitude: waypointLng,
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                  zIndex={1000 + originalIndex}
                >
                  <View style={styles.markerWrapper} collapsable={false} pointerEvents="none">
                    <View
                      style={[
                        styles.markerCard,
                        isDropoff
                          ? styles.dropoffCard
                          : isPickup
                          ? styles.pickupCard
                          : styles.waypointCard,
                      ]}
                    >
                      <Text style={styles.markerCardTitle}>
                        {isDropoff ? 'Drop-off' : isPickup ? 'Pickup' : `Stop ${displayIndex + 1}`}
                      </Text>
                      <Text style={styles.markerCardSubtitle} numberOfLines={1}>
                        {waypoint.address?.place || waypoint.address?.city || 'Waypoint'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.markerPointer,
                        isDropoff
                          ? styles.dropoffPointer
                          : isPickup
                          ? styles.pickupPointer
                          : styles.waypointPointer,
                      ]}
                    />
                    <View
                      style={[
                        styles.markerPointerShadow,
                        isDropoff
                          ? styles.dropoffPointerShadow
                          : isPickup
                          ? styles.pickupPointerShadow
                          : styles.waypointPointerShadow,
                      ]}
                    />
    </View>
                </Marker>
              );
            })}

            {/* Vehicle Location with Label */}
            {vehicleCoordinates && (
              <Marker
                key={`vehicle-${load._id}-${vehicleLocation?._id || 'unknown'}-${Math.round(vehicleCoordinates.latitude * 10000)}-${Math.round(vehicleCoordinates.longitude * 10000)}`}
                coordinate={vehicleCoordinates}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                zIndex={3000}
                pinColor="#1d4ed8"
              />
            )}

            {Polyline && routePath.length >= 2 && (
              <Polyline
                coordinates={routePath}
                strokeColor="#3b82f6"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
                miterLimit={1}
              />
            )}
            
            {/* Fallback: Show straight line if route path is not available */}
            {Polyline && routePath.length < 2 && routeCoordinates.length >= 2 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#9ca3af"
                strokeWidth={3}
                lineDashPattern={[5, 5]}
              />
            )}

                </MapView>
              );
            } catch (mapError: any) {
              logger.error('Error rendering map', mapError);
              return (
                <View style={styles.mapFallback}>
                  <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
                  <Text style={styles.fallbackText}>Map Error</Text>
                  <Text style={styles.fallbackSubtext}>
                    {mapError?.message || 'Failed to render map. Please try again.'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.errorButton} 
                    onPress={() => {
                      const pickupLat = parseCoordinate(pickup?.latitude);
                      const pickupLng = parseCoordinate(pickup?.longitude);
                      if (pickupLat !== null && pickupLng !== null) {
                        const url = `https://www.google.com/maps?q=${pickupLat},${pickupLng}`;
                        Linking.openURL(url);
                      }
                    }}
                  >
                    <Text style={styles.errorButtonText}>Open in Google Maps</Text>
                  </TouchableOpacity>
                </View>
              );
            }
          })() : (
            <View style={styles.mapFallback}>
              <Ionicons name="map-outline" size={64} color="#8B5CF6" />
              <Text style={styles.fallbackText}>Maps Not Available</Text>
              <Text style={styles.fallbackSubtext}>
                {!MapView ? 'react-native-maps is not installed. Please rebuild the app with EAS Build.' : 'Map provider is not available. Please check your configuration.'}
              </Text>
              <TouchableOpacity 
                style={styles.errorButton} 
                onPress={() => {
                  if (pickupLat !== null && pickupLng !== null) {
                    const url = `https://www.google.com/maps?q=${pickupLat},${pickupLng}`;
                    Linking.openURL(url);
                  }
                }}
              >
                <Text style={styles.errorButtonText}>Open in Google Maps</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Panel */}
        <View style={styles.infoPanel}>
          <View style={styles.infoRow}>
            <View style={[styles.legendItem, styles.pickupLegend]} />
            <Text style={styles.legendText}>Pickup</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.legendItem, styles.dropoffLegend]} />
            <Text style={styles.legendText}>
              {multipleDropOffs ? 'Drop-offs' : 'Drop-off'}
            </Text>
          </View>
          {multipleDropOffs && wayPoints.length > 0 && (
            <View style={styles.infoRow}>
              <View style={[styles.legendItem, styles.waypointLegend]} />
              <Text style={styles.legendText}>
                Waypoints ({wayPoints.filter(wp => wp.dropOff !== true && wp.pickup !== true).length})
              </Text>
            </View>
          )}
          {vehicleLocation && (
            <>
              <View style={styles.infoRow}>
                <View style={[styles.legendItem, styles.vehicleLegend]} />
                <Text style={styles.legendText}>Vehicle (Live)</Text>
              </View>
              {(vehicleLocation.speed !== undefined && vehicleLocation.speed !== null) || isSpeedDemoActive ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={[styles.speedText, isSpeedWarningActive ? styles.speedTextWarning : undefined]}>
                      Speed: {speedDisplayWithUnit}
                      {isSpeedDemoActive ? ' (demo)' : ''}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.speedLimitText}>
                      Warning threshold {speedLimitWithUnit}
                    </Text>
                  </View>
                </>
              ) : null}
              {fuelDisplayTextForUi && (
                <View style={styles.infoRow}>
                  <Text style={[styles.fuelText, isFuelWarningActive ? styles.fuelTextWarning : undefined]}>
                    Fuel: {fuelDisplayTextForUi}
                  </Text>
                </View>
              )}
              {vehicleLocation.currentLocation?.address && (
                <Text style={styles.addressText} numberOfLines={1}>
                  {vehicleLocation.currentLocation.address}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#8B5CF6',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e8d8ff',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  warningStack: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 1100,
  },
  warningStackWeb: {
    bottom: 140,
    left: 20,
    right: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 12,
  },
  warningBannerSpeed: {
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
  },
  warningBannerFuel: {
    backgroundColor: 'rgba(234, 179, 8, 0.95)',
  },
  warningBannerSpacing: {
    marginTop: 12,
  },
  warningBannerIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  warningBannerContent: {
    flex: 1,
  },
  warningBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  warningBannerMessage: {
    fontSize: 13,
    color: '#F9FAFB',
    lineHeight: 18,
  },
  warningBannerNote: {
    marginTop: 6,
    fontSize: 12,
    color: '#FDE68A',
    lineHeight: 16,
  },
  distanceToggleButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1001,
    elevation: 11,
    backgroundColor: '#8B5CF6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mapDistanceOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 72, // Leave space for toggle button
    zIndex: 1000,
    elevation: 10,
  },
  mapDistanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 120,
    maxWidth: 160,
  },
  mapDistanceHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  mapDistanceCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  mapDistanceList: {
    marginTop: 2,
  },
  mapDistanceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  mapDistanceListIcon: {
    marginRight: 6,
    width: 16,
    textAlign: 'center',
  },
  mapDistanceItemContent: {
    flex: 1,
  },
  mapDistanceSeparator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 3,
  },
  mapDistanceLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  mapDistanceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 0,
  },
  mapDistanceValueWarning: {
    color: '#DC2626',
  },
  mapDistanceWaypointContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  mapDistanceWaypointInfo: {
    fontSize: 11,
    color: '#8B5CF6',
    textAlign: 'center',
    fontWeight: '600',
  },
  demoToggleFloating: {
    position: 'absolute',
    top: 80,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.95)',
    zIndex: 1100,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  demoToggleFloatingActive: {
    backgroundColor: 'rgba(234, 88, 12, 0.95)',
  },
  demoToggleFloatingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  demoToggleFloatingWeb: {
    top: 100,
    right: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorHelpText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  errorBanner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    marginLeft: 8,
    fontWeight: '500',
  },
  // Pickup Marker - Green Circle with Pulse Effect
  pickupMarkerContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pickupMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 7,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    zIndex: 2,
  },
  pickupMarkerPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#27ae60',
    opacity: 0.3,
    zIndex: 1,
  },
  // Dropoff Marker - Red Diamond/Square Shape
  dropoffMarkerContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropoffMarker: {
    width: 44,
    height: 44,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 7,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    // Create diamond shape using transform
    transform: [{ rotate: '45deg' }],
  },
  dropoffMarkerIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  // Vehicle Marker - Blue Circle (keep simple)
  simpleMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  // Waypoint Marker - Orange Circle with Number
  waypointMarkerContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waypointMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f39c12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 6,
    shadowColor: '#f39c12',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  waypointNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  markerCard: {
    minWidth: 150,
    maxWidth: 220,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    elevation: 8,
  },
  pickupCard: {
    backgroundColor: '#047857',
  },
  dropoffCard: {
    backgroundColor: '#b91c1c',
  },
  waypointCard: {
    backgroundColor: '#c2410c',
  },
  markerCardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  markerCardSubtitle: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '500',
  },
  markerCardMeta: {
    marginTop: 6,
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '600',
  },
  markerPointer: {
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
    borderRadius: 3,
    backgroundColor: '#111827',
  },
  markerPointerShadow: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginTop: 4,
  },
  pickupPointer: {
    backgroundColor: '#047857',
  },
  dropoffPointer: {
    backgroundColor: '#b91c1c',
  },
  waypointPointer: {
    backgroundColor: '#c2410c',
  },
  pickupPointerShadow: {
    backgroundColor: 'rgba(4, 120, 87, 0.25)',
  },
  dropoffPointerShadow: {
    backgroundColor: 'rgba(185, 28, 28, 0.25)',
  },
  waypointPointerShadow: {
    backgroundColor: 'rgba(194, 65, 12, 0.25)',
  },
  waypointLegend: {
    backgroundColor: '#f39c12',
  },
  waypointCalloutHeader: {
    backgroundColor: '#f39c12',
  },
  calloutContainer: {
    width: 200,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  pickupCalloutHeader: {
    backgroundColor: '#27ae60',
  },
  dropoffCalloutHeader: {
    backgroundColor: '#e74c3c',
  },
  vehicleCalloutHeader: {
    backgroundColor: '#3498db',
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  calloutText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  infoPanel: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  legendItem: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  pickupLegend: {
    backgroundColor: '#27ae60',
  },
  dropoffLegend: {
    backgroundColor: '#e74c3c',
  },
  vehicleLegend: {
    backgroundColor: '#3498db',
  },
  legendText: {
    fontSize: 14,
    color: '#333',
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 8,
  },
  speedTextWarning: {
    color: '#F97316',
  },
  speedLimitText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  fuelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  fuelTextWarning: {
    color: '#DC2626',
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    flex: 1,
  },
  mapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  webInfoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  webInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  webInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  webInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  webInfoValueWarning: {
    color: '#DC2626',
    fontWeight: '700',
  },
  webInfoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  webInfoAlertIcon: {
    marginRight: 8,
  },
  webInfoAlertText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  webInfoDemoNote: {
    marginTop: 6,
    fontSize: 12,
    color: '#B45309',
    fontWeight: '500',
  },
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  openMapsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  routeInfoContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeDotWeb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  routeInfoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  errorButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Web-compatible map view component
interface WebMapViewProps {
  pickup?: any;
  dropoff?: any;
  vehicleLocation?: VehicleLocation | null;
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
  routePath: Array<{ latitude: number; longitude: number }>;
  vehicleCoordinates: { latitude: number; longitude: number } | null;
  speedDisplayWithUnit: string;
  speedWarningExcessValue: number | null;
  speedLimitWithUnit: string;
  isSpeedWarningActive: boolean;
  isSpeedDemoActive: boolean;
  fuelDisplayText: string | null;
  isFuelWarningActive: boolean;
  vehicleInfoContentHtml: string;
  warningBanners: WarningBannerConfig[];
  enableSpeedWarningDemo: boolean;
  onToggleSpeedDemo: () => void;
  onOpenGoogleMaps: () => void;
}

const WebMapView: React.FC<WebMapViewProps> = ({
  pickup,
  dropoff,
  vehicleLocation,
  routeCoordinates,
  routePath,
  vehicleCoordinates,
  speedDisplayWithUnit,
  speedWarningExcessValue,
  speedLimitWithUnit,
  isSpeedWarningActive,
  isSpeedDemoActive,
  fuelDisplayText,
  isFuelWarningActive,
  vehicleInfoContentHtml,
  warningBanners,
  enableSpeedWarningDemo,
  onToggleSpeedDemo,
  onOpenGoogleMaps,
}) => {
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const googleMapRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const vehicleMarkerRef = React.useRef<any>(null);
  const vehicleInfoWindowRef = React.useRef<any>(null);
  const routePolylineRef = React.useRef<any>(null);

  // Helper function to get config using apiService to ensure correct base URL
  const getConfig = React.useCallback(async () => {
    // Use frontend Google Maps API key from config/env.ts
    const frontendApiKey = GOOGLE_MAPS_API_KEY;
    
    if (frontendApiKey && typeof frontendApiKey === 'string' && frontendApiKey.length > 0) {
      console.log('✅ Using frontend Google Maps API key');
      return { googleMapsApiKey: frontendApiKey };
    }
    
    console.warn('⚠️ Frontend Google Maps API key not found in config');
    return { googleMapsApiKey: '' };
  }, []);

  // Fetch Google Maps API key and load script
  React.useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // Check if Google Maps is already loaded
        if ((window as any).google?.maps) {
          setMapLoaded(true);
          return;
        }

        // Use frontend Google Maps API key from config/env.ts
        const apiKey = GOOGLE_MAPS_API_KEY;

        if (!apiKey || typeof apiKey !== 'string' || apiKey.length === 0) {
          console.error('❌ Frontend Google Maps API key not found.');
          console.error('   Please ensure:');
          console.error('   1. GOOGLE_MAPS_API_KEY is set in .env file');
          console.error('   2. Or googleMapsApiKey is set in app.json extra config');
          console.error('   The map will still display route information without Google Maps.');
          
          // If no API key, set map as "loaded" but it will show a fallback message
          setMapLoaded(true);
          return;
        }
        
        console.log('✅ Using frontend Google Maps API key');

        console.log('✅ Google Maps API key ready, loading map script...');

        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,directions&callback=initMap`;
        script.async = true;
        script.defer = true;

        // Set up callback
        (window as any).initMap = () => {
          console.log('✅ Google Maps script loaded and initialized');
          setMapLoaded(true);
        };

        // Handle script load errors
        script.onerror = (error) => {
          console.error('❌ Failed to load Google Maps script:', error);
          setMapLoaded(true); // Still mark as loaded to show fallback
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('❌ Error loading Google Maps:', error);
        setMapLoaded(true); // Mark as loaded to show fallback UI
      }
    };

    // Only load on web platform
    if (typeof window !== 'undefined') {
      loadGoogleMaps();
    }
  }, []); // Removed getConfig dependency since we're using frontend key

  // Initialize map when loaded
  React.useEffect(() => {
    if (!mapLoaded || !mapRef.current || !(window as any).google?.maps) return;

    const pickupLatNum = parseCoordinate(pickup?.latitude);
    const pickupLngNum = parseCoordinate(pickup?.longitude);
    const center = pickupLatNum !== null && pickupLngNum !== null
      ? { lat: pickupLatNum, lng: pickupLngNum }
      : { lat: 43.6532, lng: -79.3832 }; // Default to Toronto

    // Create map
    googleMapRef.current = new (window as any).google.maps.Map(mapRef.current, {
      zoom: 10,
      center: center,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add pickup marker (reuse already parsed coordinates)
    if (pickupLatNum !== null && pickupLngNum !== null) {
      const pickupMarker = new (window as any).google.maps.Marker({
        position: { lat: pickupLatNum, lng: pickupLngNum },
        map: googleMapRef.current,
        title: 'Pickup Location',
        label: {
          text: 'P',
          color: '#fff',
          fontWeight: 'bold',
        },
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#27ae60',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
      });
      markersRef.current.push(pickupMarker);

      // Add info window
      const pickupInfo = new (window as any).google.maps.InfoWindow({
        content: `<div><strong>Pickup</strong><br/>${pickup.place || `${pickup.city}, ${pickup.state}`}</div>`,
      });
      pickupMarker.addListener('click', () => pickupInfo.open(googleMapRef.current, pickupMarker));
    }

    // Add dropoff marker
    const dropoffLatNum = parseCoordinate(dropoff?.latitude);
    const dropoffLngNum = parseCoordinate(dropoff?.longitude);
    if (dropoffLatNum !== null && dropoffLngNum !== null) {
      const dropoffMarker = new (window as any).google.maps.Marker({
        position: { lat: dropoffLatNum, lng: dropoffLngNum },
        map: googleMapRef.current,
        title: 'Drop-off Location',
        label: {
          text: 'D',
          color: '#fff',
          fontWeight: 'bold',
        },
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#e74c3c',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
      });
      markersRef.current.push(dropoffMarker);

      const dropoffInfo = new (window as any).google.maps.InfoWindow({
        content: `<div><strong>Drop-off</strong><br/>${dropoff.place || `${dropoff.city}, ${dropoff.state}`}</div>`,
      });
      dropoffMarker.addListener('click', () => dropoffInfo.open(googleMapRef.current, dropoffMarker));
    }

    // Add vehicle marker if available (will be updated in separate useEffect)
    if (vehicleCoordinates?.latitude && vehicleCoordinates?.longitude) {
      // Remove old vehicle marker if it exists
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setMap(null);
        vehicleMarkerRef.current = null;
      }

      vehicleMarkerRef.current = new (window as any).google.maps.Marker({
        position: { lat: vehicleCoordinates.latitude, lng: vehicleCoordinates.longitude },
        map: googleMapRef.current,
        title: 'Vehicle Location',
        label: {
          text: 'V',
          color: '#fff',
          fontWeight: 'bold',
        },
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3498db',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        animation: (window as any).google.maps.Animation.DROP,
      });
      markersRef.current.push(vehicleMarkerRef.current);

      vehicleInfoWindowRef.current = new (window as any).google.maps.InfoWindow({
        content: vehicleInfoContentHtml,
      });
      vehicleMarkerRef.current.addListener('click', () => {
        vehicleInfoWindowRef.current.open(googleMapRef.current, vehicleMarkerRef.current);
      });
    }

    // Draw route if we have both pickup and dropoff
    const pickupLatForRoute = parseCoordinate(pickup?.latitude);
    const pickupLngForRoute = parseCoordinate(pickup?.longitude);
    const dropoffLatForRoute = parseCoordinate(dropoff?.latitude);
    const dropoffLngForRoute = parseCoordinate(dropoff?.longitude);
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    const polylineSource = (routePath && routePath.length >= 2 ? routePath : routeCoordinates)
      .map(point => ({ lat: point.latitude, lng: point.longitude }));
    if (polylineSource.length >= 2 && googleMapRef.current) {
      routePolylineRef.current = new (window as any).google.maps.Polyline({
        path: polylineSource,
        geodesic: true,
        strokeColor: '#8B5CF6',
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
      routePolylineRef.current.setMap(googleMapRef.current);
    }

    // Fit bounds to show all markers
    if (googleMapRef.current) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        const pos = marker.getPosition();
        if (pos) bounds.extend(pos);
      });
      const polylineSource = (routePath && routePath.length >= 2 ? routePath : routeCoordinates);
      polylineSource.forEach(point => {
        bounds.extend({ lat: point.latitude, lng: point.longitude });
      });
      if (!bounds.isEmpty()) {
        googleMapRef.current.fitBounds(bounds);
      }
    }
  }, [mapLoaded, pickup, dropoff, routeCoordinates, routePath]);

  // Update vehicle marker position in real-time when location changes
  React.useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !(window as any).google?.maps) return;
    if (!vehicleCoordinates?.latitude || !vehicleCoordinates?.longitude) return;

    const vehicleLat = vehicleCoordinates.latitude;
    const vehicleLng = vehicleCoordinates.longitude;

    // Update existing vehicle marker position
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setPosition({ lat: vehicleLat, lng: vehicleLng });
      
      // Update info window content with latest vehicle data
      if (vehicleInfoWindowRef.current && vehicleLocation) {
        vehicleInfoWindowRef.current.setContent(vehicleInfoContentHtml);
      }
    } else {
      // Create vehicle marker if it doesn't exist
      vehicleMarkerRef.current = new (window as any).google.maps.Marker({
        position: { lat: vehicleLat, lng: vehicleLng },
        map: googleMapRef.current,
        title: 'Vehicle Location',
        label: {
          text: 'V',
          color: '#fff',
          fontWeight: 'bold',
        },
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3498db',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        animation: (window as any).google.maps.Animation.DROP,
      });
      
      if (!markersRef.current.includes(vehicleMarkerRef.current)) {
        markersRef.current.push(vehicleMarkerRef.current);
      }

      vehicleInfoWindowRef.current = new (window as any).google.maps.InfoWindow({
        content: vehicleInfoContentHtml,
      });
      
      vehicleMarkerRef.current.addListener('click', () => {
        if (vehicleInfoWindowRef.current) {
          vehicleInfoWindowRef.current.open(googleMapRef.current, vehicleMarkerRef.current);
        }
      });
    }

    // Refit map bounds to include pickup, drop-off, and vehicle
    const pickupLatNum = parseCoordinate(pickup?.latitude);
    const pickupLngNum = parseCoordinate(pickup?.longitude);
    const dropoffLatNum = parseCoordinate(dropoff?.latitude);
    const dropoffLngNum = parseCoordinate(dropoff?.longitude);

    const bounds = new (window as any).google.maps.LatLngBounds();
    if (pickupLatNum !== null && pickupLngNum !== null) {
      bounds.extend({ lat: pickupLatNum, lng: pickupLngNum });
    }
    if (dropoffLatNum !== null && dropoffLngNum !== null) {
      bounds.extend({ lat: dropoffLatNum, lng: dropoffLngNum });
    }
    bounds.extend({ lat: vehicleLat, lng: vehicleLng });

    if (!bounds.isEmpty()) {
      googleMapRef.current.fitBounds(bounds);
    }
  }, [mapLoaded, vehicleCoordinates, vehicleLocation, vehicleInfoContentHtml]);

  React.useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !(window as any).google?.maps) {
      return;
    }
    if (!routePolylineRef.current) {
      return;
    }
    const polylineSource = (routePath && routePath.length >= 2 ? routePath : routeCoordinates)
      .map(point => ({ lat: point.latitude, lng: point.longitude }));
    if (polylineSource.length >= 2) {
      routePolylineRef.current.setPath(polylineSource);
    }
  }, [mapLoaded, routePath, routeCoordinates]);


  if (!mapLoaded) {
    return (
      <View style={styles.mapFallback}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.fallbackText}>Loading Google Maps...</Text>
        <Text style={styles.fallbackSubtext}>Fetching API key from backend...</Text>
      </View>
    );
  }
  
  // Check if Google Maps is actually available (might have failed to load)
  const isGoogleMapsAvailable = typeof window !== 'undefined' && (window as any).google?.maps;
  
  if (!isGoogleMapsAvailable) {
    // Show fallback UI with route info
    return (
      <View style={styles.mapFallback}>
        <Ionicons name="map-outline" size={64} color="#8B5CF6" />
        <Text style={styles.fallbackText}>Google Maps Not Available</Text>
        <Text style={styles.fallbackSubtext}>
          Please ensure the backend has GOOGLE_MAPS_API_KEY configured.
        </Text>
        {pickup && dropoff && (
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={styles.routeInfoText}>
              📍 Pickup: {pickup.place || `${pickup.city}, ${pickup.state}`}
            </Text>
            <Text style={styles.routeInfoText}>
              🎯 Drop-off: {dropoff.place || `${dropoff.city}, ${dropoff.state}`}
            </Text>
            <TouchableOpacity
              style={styles.openMapsButton}
              onPress={onOpenGoogleMaps}
            >
              <Ionicons name="navigate" size={20} color="#fff" />
              <Text style={styles.openMapsButtonText}>Open in Google Maps</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Google Maps container */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      {enableSpeedWarningDemo && (
        <TouchableOpacity
          onPress={onToggleSpeedDemo}
          style={[
            styles.demoToggleFloating,
            isSpeedDemoActive && styles.demoToggleFloatingActive,
            styles.demoToggleFloatingWeb,
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSpeedDemoActive ? 'play-back' : 'flash'}
            size={18}
            color="#fff"
          />
          <Text style={styles.demoToggleFloatingText}>
            {isSpeedDemoActive ? 'Hide Demo' : 'Demo Speed Warning'}
          </Text>
        </TouchableOpacity>
      )}

      {warningBanners.length > 0 && (
        <View style={[styles.warningStack, styles.warningStackWeb]}>
          {warningBanners.map((banner, index) => (
            <View
              key={banner.id}
              style={[
                styles.warningBanner,
                banner.type === 'speed'
                  ? styles.warningBannerSpeed
                  : styles.warningBannerFuel,
                index > 0 && styles.warningBannerSpacing,
              ]}
            >
              <Ionicons
                name={banner.icon}
                size={22}
                color="#fff"
                style={styles.warningBannerIcon}
              />
              <View style={styles.warningBannerContent}>
                <Text style={styles.warningBannerTitle}>{banner.title}</Text>
                <Text style={styles.warningBannerMessage}>{banner.message}</Text>
                {banner.note && (
                  <Text style={styles.warningBannerNote}>{banner.note}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Vehicle info overlay */}
      {vehicleLocation && (
        <View style={[styles.webInfoContainer, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.95)' }]}>
          <View style={styles.webInfoRow}>
            <Text style={styles.webInfoLabel}>Vehicle:</Text>
            <Text style={styles.webInfoValue}>
              {vehicleLocation.plateNumber || vehicleLocation.internalId}
            </Text>
          </View>
          {((vehicleLocation.speed !== undefined && vehicleLocation.speed !== null) || isSpeedDemoActive) && (
            <>
              <View style={styles.webInfoRow}>
                <Text style={styles.webInfoLabel}>Speed:</Text>
                <Text style={[styles.webInfoValue, isSpeedWarningActive ? styles.webInfoValueWarning : undefined]}>
                  {speedDisplayWithUnit}
                  {isSpeedDemoActive ? ' (demo)' : ''}
                </Text>
              </View>
              <View style={styles.webInfoRow}>
                <Text style={styles.webInfoLabel}>Threshold:</Text>
                <Text style={styles.webInfoValue}>{speedLimitWithUnit}</Text>
              </View>
              {isSpeedWarningActive && (
                <View style={styles.webInfoAlert}>
                  <Ionicons name="warning" size={16} color="#fff" style={styles.webInfoAlertIcon} />
                  <Text style={styles.webInfoAlertText}>
                    {isSpeedDemoActive
                      ? `Demo override: showing ${speedWarningExcessValue ?? 0} km/h over the limit.`
                      : `Over by ${speedWarningExcessValue ?? 0} km/h. Reduce speed immediately.`}
                  </Text>
                </View>
              )}
              {isSpeedDemoActive && (
                <Text style={styles.webInfoDemoNote}>
                  Demo mode is active to preview the speed warning while GeoTab data is offline.
                </Text>
              )}
            </>
          )}
          {fuelDisplayText && (
            <View style={styles.webInfoRow}>
              <Text style={styles.webInfoLabel}>Fuel:</Text>
              <Text style={[styles.webInfoValue, isFuelWarningActive ? styles.webInfoValueWarning : undefined]}>
                {fuelDisplayText}
              </Text>
            </View>
          )}
          {vehicleCoordinates && (
            <TouchableOpacity
              style={styles.openMapsButton}
              onPress={onOpenGoogleMaps}
            >
              <Ionicons name="navigate" size={20} color="#fff" />
              <Text style={styles.openMapsButtonText}>Open in Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Route info overlay */}
      {(pickup || dropoff) && (
        <View style={[styles.routeInfoContainer, { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 8, padding: 12 }]}>
          {pickup && (
            <View style={styles.routeInfoItem}>
              <View style={[styles.routeDotWeb, { backgroundColor: '#27ae60' }]} />
              <Text style={styles.routeInfoText}>
                Pickup: {pickup.place || `${pickup.city}, ${pickup.state}`}
              </Text>
            </View>
          )}
          {dropoff && (
            <View style={styles.routeInfoItem}>
              <View style={[styles.routeDotWeb, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.routeInfoText}>
                Drop-off: {dropoff.place || `${dropoff.city}, ${dropoff.state}`}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default MapViewWithLiveTracking;