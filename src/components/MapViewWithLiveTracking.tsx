import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { API_BASE_URL } from '../config/env';
import { apiService } from '../services/api/apiService';

// Conditionally import react-native-maps only on native platforms
let MapView: any = null;
let Marker: any = null;
let Callout: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

// Only import on native platforms - Metro will use web stub on web
try {
  const mapsModule = require('react-native-maps');
  if (mapsModule && mapsModule.default) {
    MapView = mapsModule.default;
    Marker = mapsModule.Marker;
    Callout = mapsModule.Callout;
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

const MapViewWithLiveTracking: React.FC<MapViewWithLiveTrackingProps> = ({
  visible,
  onClose,
  load,
}) => {
  const [vehicleLocation, setVehicleLocation] = useState<VehicleLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDistanceInfo, setShowDistanceInfo] = useState(true);
  const mapRef = useRef<any>(null);

  const pickup = load.route?.selectPickup;
  const dropoff = load.route?.selectDropOff;
  const vehicleId = load.vehicle?.internalId;
  const multipleDropOffs = load.route?.multipleDropOffs || false;
  const wayPoints = load.route?.wayPoints || [];

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setVehicleLocation(null);
      setError(null);
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

  // Calculate map region to fit all markers
  const calculateRegion = () => {
    const coordinates: Array<{ latitude: number; longitude: number }> = [];

    // Add pickup location
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
        const waypointLat = parseCoordinate(waypoint.address?.latitude);
        const waypointLng = parseCoordinate(waypoint.address?.longitude);
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

  // Build route coordinates based on multipleDropOffs flag
  const routeCoordinates: Array<{ latitude: number; longitude: number }> = [];

  // Always start with pickup
  if (pickupLat !== null && pickupLng !== null) {
    routeCoordinates.push({
      latitude: pickupLat,
      longitude: pickupLng,
    });
  }

  // If multiple drops, add waypoints; otherwise add single dropoff
  if (multipleDropOffs && wayPoints.length > 0) {
    wayPoints.forEach((waypoint) => {
      const waypointLat = parseCoordinate(waypoint.address?.latitude);
      const waypointLng = parseCoordinate(waypoint.address?.longitude);
      if (waypointLat !== null && waypointLng !== null) {
        routeCoordinates.push({
          latitude: waypointLat,
          longitude: waypointLng,
        });
      }
    });
  } else {
    // Single dropoff
    if (dropoffLat !== null && dropoffLng !== null) {
      routeCoordinates.push({
        latitude: dropoffLat,
        longitude: dropoffLng,
      });
    }
  }

  const vehicleLat = parseCoordinate(vehicleLocation?.currentLocation?.latitude);
  const vehicleLng = parseCoordinate(vehicleLocation?.currentLocation?.longitude);
  const vehicleCoordinates = vehicleLat !== null && vehicleLng !== null
    ? {
        latitude: vehicleLat,
        longitude: vehicleLng,
      }
    : null;

  // Prepare valid waypoints for rendering (filter out invalid coordinates)
  // Use useMemo to ensure stable array reference
  const validWaypoints = useMemo(() => {
    if (!multipleDropOffs || !wayPoints || wayPoints.length === 0) {
      return [];
    }

    return wayPoints
      .map((waypoint, originalIndex) => {
        const waypointLat = parseCoordinate(waypoint.address?.latitude);
        const waypointLng = parseCoordinate(waypoint.address?.longitude);
        
        if (waypointLat === null || waypointLng === null) {
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
  }, [multipleDropOffs, wayPoints]);

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
          {/* Distance Toggle Button */}
          {(distanceMetrics.total > 0 || distanceMetrics.traveled > 0 || distanceMetrics.remaining > 0) && (
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
          {showDistanceInfo && (distanceMetrics.total > 0 || distanceMetrics.traveled > 0 || distanceMetrics.remaining > 0) && (
            <View style={styles.mapDistanceOverlay}>
              <View style={styles.mapDistanceCard}>
                <View style={styles.mapDistanceHeader}>
                  <Text style={styles.mapDistanceTitle}>Distance Information</Text>
                  <TouchableOpacity
                    onPress={() => setShowDistanceInfo(false)}
                    style={styles.mapDistanceCloseButton}
                  >
                    <Ionicons name="close" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.mapDistanceRow}>
                  <View style={styles.mapDistanceItem}>
                    <Ionicons name="map-outline" size={20} color="#8B5CF6" />
                    <Text style={styles.mapDistanceLabel}>Total</Text>
                    <Text style={styles.mapDistanceValue}>
                      {distanceMetrics.total > 0 ? `${distanceMetrics.total.toFixed(1)} km` : 'N/A'}
                    </Text>
                  </View>
                  {vehicleCoordinates && (
                    <>
                      <View style={styles.mapDistanceDivider} />
                      <View style={styles.mapDistanceItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.mapDistanceLabel}>Traveled</Text>
                        <Text style={styles.mapDistanceValue}>
                          {distanceMetrics.traveled > 0 ? `${distanceMetrics.traveled.toFixed(1)} km` : '0.0 km'}
                        </Text>
                      </View>
                      <View style={styles.mapDistanceDivider} />
                      <View style={styles.mapDistanceItem}>
                        <Ionicons name="navigate-circle" size={20} color="#F59E0B" />
                        <Text style={styles.mapDistanceLabel}>Remaining</Text>
                        <Text style={styles.mapDistanceValue}>
                          {distanceMetrics.remaining > 0 ? `${distanceMetrics.remaining.toFixed(1)} km` : '0.0 km'}
                        </Text>
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

          {loading && (
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
              vehicleCoordinates={vehicleCoordinates}
              onOpenGoogleMaps={() => {
                // Open Google Maps with route if coordinates are available
                const coords = vehicleCoordinates || (pickupLat !== null && pickupLng !== null ? { latitude: pickupLat, longitude: pickupLng } : null);
                if (coords && coords.latitude !== null && coords.longitude !== null) {
                  const url = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
                  Linking.openURL(url);
                }
              }}
            />
          ) : MapView && PROVIDER_GOOGLE ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={calculateRegion()}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={true}
              toolbarEnabled={false}
            >
            {/* Pickup Marker - Green Circle with Location Icon */}
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
                <View style={styles.pickupMarkerContainer} collapsable={false} pointerEvents="none">
                  <View style={styles.pickupMarkerPulse} />
                  <View style={styles.pickupMarker}>
                    <Ionicons name="location" size={20} color="#fff" />
                  </View>
                </View>
                {Callout && (
                  <Callout>
                    <View style={styles.calloutContainer}>
                      <View style={[styles.calloutHeader, styles.pickupCalloutHeader]}>
                        <Ionicons name="location" size={20} color="#fff" />
                        <Text style={styles.calloutTitle}>Pickup Location</Text>
                      </View>
                      <Text style={styles.calloutText}>
                        {pickup?.place || `${pickup?.city || ''}, ${pickup?.state || ''}`}
                      </Text>
                    </View>
                  </Callout>
                )}
              </Marker>
            )}

            {/* Dropoff Marker - Red Square/Diamond with Flag Icon (only if not multiple drops) */}
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
                <View style={styles.dropoffMarkerContainer} collapsable={false} pointerEvents="none">
                  <View style={styles.dropoffMarker}>
                    <View style={styles.dropoffMarkerIcon}>
                      <Ionicons name="flag" size={18} color="#fff" />
                    </View>
                  </View>
                </View>
                {Callout && (
                  <Callout>
                    <View style={styles.calloutContainer}>
                      <View style={[styles.calloutHeader, styles.dropoffCalloutHeader]}>
                        <Ionicons name="flag" size={20} color="#fff" />
                        <Text style={styles.calloutTitle}>Drop-off Location</Text>
                      </View>
                      <Text style={styles.calloutText}>
                        {dropoff?.place || `${dropoff?.city || ''}, ${dropoff?.state || ''}`}
                      </Text>
                    </View>
                  </Callout>
                )}
              </Marker>
            )}

            {/* Waypoints Markers (only if multiple drops) */}
            {validWaypoints.map((item, displayIndex) => {
              const { waypoint, waypointLat, waypointLng, originalIndex, isDropoff, isPickup } = item;
              
              // Create unique key for each marker
              const markerKey = `waypoint-${load._id}-${originalIndex}-${Math.round(waypointLat * 10000)}-${Math.round(waypointLng * 10000)}`;
              
              // Render marker content - separate components for stability
              let markerContent;
              if (isDropoff) {
                // Dropoff waypoint - Red Diamond
                markerContent = (
                  <View style={styles.dropoffMarkerContainer} collapsable={false} pointerEvents="none">
                    <View style={styles.dropoffMarker}>
                      <View style={styles.dropoffMarkerIcon}>
                        <Ionicons name="flag" size={18} color="#fff" />
                      </View>
                    </View>
                  </View>
                );
              } else {
                // Pickup waypoint or other waypoint - Orange Circle
                markerContent = (
                  <View style={styles.waypointMarkerContainer} collapsable={false} pointerEvents="none">
                    <View style={styles.waypointMarker}>
                      <Text style={styles.waypointNumber}>{displayIndex + 1}</Text>
                    </View>
                  </View>
                );
              }

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
                  {markerContent}
                  {Callout && (
                    <Callout>
                      <View style={styles.calloutContainer}>
                        <View style={[styles.calloutHeader, isDropoff ? styles.dropoffCalloutHeader : styles.waypointCalloutHeader]}>
                          <Ionicons 
                            name={isDropoff ? "flag" : isPickup ? "location" : "navigate"} 
                            size={20} 
                            color="#fff" 
                          />
                          <Text style={styles.calloutTitle}>
                            {isDropoff ? "Drop-off" : isPickup ? "Pickup" : `Waypoint ${displayIndex + 1}`}
                          </Text>
                        </View>
                        <Text style={styles.calloutText}>
                          {waypoint.address?.place || `${waypoint.address?.city || ''}, ${waypoint.address?.state || ''}`}
                        </Text>
                      </View>
                    </Callout>
                  )}
                </Marker>
              );
            })}

            {/* Vehicle Live Location Marker - Updates in real-time from socket.io */}
            {vehicleCoordinates && (
              <Marker
                key={`vehicle-${load._id}-${vehicleLocation?._id || 'unknown'}-${Math.round(vehicleCoordinates.latitude * 10000)}-${Math.round(vehicleCoordinates.longitude * 10000)}`}
                coordinate={vehicleCoordinates}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={true}
                zIndex={3000}
              >
                <View style={[styles.simpleMarker, styles.vehicleMarker]} collapsable={false} pointerEvents="none">
                  <Ionicons name="car" size={16} color="#fff" />
                </View>
                {Callout && (
                  <Callout>
                    <View style={styles.calloutContainer}>
                      <View style={[styles.calloutHeader, styles.vehicleCalloutHeader]}>
                        <Ionicons name="car" size={20} color="#fff" />
                        <Text style={styles.calloutTitle}>Vehicle Location</Text>
                      </View>
                      {vehicleLocation?.plateNumber && (
                        <Text style={styles.calloutText}>
                          Vehicle: {vehicleLocation.plateNumber}
                        </Text>
                      )}
                      {vehicleLocation?.speed !== undefined && (
                        <Text style={styles.calloutText}>
                          Speed: {vehicleLocation.speed || 0} km/h
                        </Text>
                      )}
                      {vehicleLocation?.currentLocation?.address && (
                        <Text style={styles.calloutAddress} numberOfLines={2}>
                          {vehicleLocation.currentLocation.address}
                        </Text>
                      )}
                    </View>
                  </Callout>
                )}
              </Marker>
            )}

            {/* Route Polyline */}
            {routeCoordinates.length >= 2 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#8B5CF6"
                strokeWidth={4}
                lineDashPattern={multipleDropOffs ? undefined : [1]}
              />
            )}

            {/* Vehicle to Pickup/Dropoff line (if vehicle is moving) */}
            {vehicleCoordinates && routeCoordinates.length > 0 && (
              <Polyline
                coordinates={[vehicleCoordinates, routeCoordinates[routeCoordinates.length - 1]]}
                strokeColor="#10B981"
                strokeWidth={2}
                lineDashPattern={[5, 5]}
              />
            )}
            </MapView>
          ) : (
            <View style={styles.mapFallback}>
              <Ionicons name="map-outline" size={64} color="#8B5CF6" />
              <Text style={styles.fallbackText}>Maps Not Available in Expo Go</Text>
              <Text style={styles.fallbackSubtext}>
                For full map features, please build a development client or use the web version.
              </Text>
              {(pickup || dropoff) && (
                <View style={{ marginTop: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8, width: '90%' }}>
                  {pickup && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[styles.fallbackSubtext, { fontWeight: 'bold', color: '#27ae60' }]}>
                        📍 Pickup Location:
                      </Text>
                      <Text style={styles.fallbackSubtext}>
                        {pickup.place || `${pickup.city}, ${pickup.state}`}
                      </Text>
                      {pickupLat !== null && pickupLng !== null && (
                        <TouchableOpacity
                          style={[styles.openMapsButton, { marginTop: 8 }]}
                          onPress={() => {
                            const url = `https://www.google.com/maps?q=${pickupLat},${pickupLng}`;
                            Linking.openURL(url);
                          }}
                        >
                          <Ionicons name="navigate" size={16} color="#fff" />
                          <Text style={styles.openMapsButtonText}>Open in Google Maps</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  {dropoff && (
                    <View>
                      <Text style={[styles.fallbackSubtext, { fontWeight: 'bold', color: '#e74c3c' }]}>
                        🎯 Drop-off Location:
                      </Text>
                      <Text style={styles.fallbackSubtext}>
                        {dropoff.place || `${dropoff.city}, ${dropoff.state}`}
                      </Text>
                      {dropoffLat !== null && dropoffLng !== null && (
                        <TouchableOpacity
                          style={[styles.openMapsButton, { marginTop: 8 }]}
                          onPress={() => {
                            const url = `https://www.google.com/maps?q=${dropoffLat},${dropoffLng}`;
                            Linking.openURL(url);
                          }}
                        >
                          <Ionicons name="navigate" size={16} color="#fff" />
                          <Text style={styles.openMapsButtonText}>Open in Google Maps</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
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
              {vehicleLocation.speed !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.speedText}>
                    Speed: {vehicleLocation.speed || 0} km/h
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
    top: 16,
    left: 16,
    right: 80, // Leave space for toggle button
    zIndex: 1000,
    elevation: 10,
  },
  mapDistanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mapDistanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapDistanceTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  mapDistanceCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  mapDistanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  mapDistanceItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
  },
  mapDistanceDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
    alignSelf: 'center',
  },
  mapDistanceLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 4,
    textAlign: 'center',
  },
  mapDistanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
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
  vehicleMarker: {
    backgroundColor: '#3498db',
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
});

// Web-compatible map view component
interface WebMapViewProps {
  pickup?: any;
  dropoff?: any;
  vehicleLocation?: VehicleLocation | null;
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
  vehicleCoordinates: { latitude: number; longitude: number } | null;
  onOpenGoogleMaps: () => void;
}

const WebMapView: React.FC<WebMapViewProps> = ({
  pickup,
  dropoff,
  vehicleLocation,
  routeCoordinates,
  vehicleCoordinates,
  onOpenGoogleMaps,
}) => {
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const googleMapRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const vehicleMarkerRef = React.useRef<any>(null);
  const vehicleInfoWindowRef = React.useRef<any>(null);
  const directionsServiceRef = React.useRef<any>(null);
  const directionsRendererRef = React.useRef<any>(null);

  // Helper function to get config using apiService to ensure correct base URL
  const getConfig = React.useCallback(async () => {
    try {
      // Use apiService to get the config - it handles the base URL correctly
      console.log('🔍 Fetching Google Maps API key from config endpoint...');
      
      // Get base URL - try multiple sources
      let baseURL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:3000/api/v1';
      
      // On web, try to use window location origin first
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        // If we're not on expo.dev, use the origin
        if (origin && !origin.includes('expo.dev')) {
          baseURL = `${origin}/api/v1`;
        }
      }
      
      // Ensure baseURL ends with /api/v1
      if (!baseURL.endsWith('/api/v1')) {
        baseURL = baseURL.replace(/\/$/, '') + '/api/v1';
      }
      
      const configUrl = `${baseURL}/config`;
      
      console.log('   Using API base URL:', baseURL);
      console.log('   Config endpoint:', configUrl);
      
      // Use apiService's request method which handles auth and errors properly
      // But for public endpoint, we can use fetch directly with proper CORS headers
      const response = await fetch(configUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 seconds
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP error ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Config fetched successfully:', { 
        hasKey: !!data.data?.googleMapsApiKey,
        success: data.success 
      });
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response format from config endpoint');
      }
      
      return data.data || { googleMapsApiKey: '' };
    } catch (error: any) {
      console.error('❌ Error fetching config:', error);
      console.error('   Error type:', error.name);
      console.error('   Error message:', error.message);
      
      // Try fallback: direct fetch with known URL patterns
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        const fallbackUrls = [
          `${origin}/api/v1/config`,
          'http://localhost:3000/api/v1/config',
          'http://127.0.0.1:3000/api/v1/config',
        ];
        
        for (const url of fallbackUrls) {
          try {
            console.log(`🔄 Trying fallback URL: ${url}`);
            const response = await fetch(url, { 
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(3000),
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data?.googleMapsApiKey) {
                console.log('✅ Got API key from fallback URL:', url);
                return data.data;
              }
            }
          } catch (fallbackError) {
            // Continue to next fallback
            continue;
          }
        }
      }
      
      // Return empty object to trigger fallback message
      return { googleMapsApiKey: '' };
    }
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

        // Fetch API key from backend
        let apiKey: string | null = null;
        try {
          const config = await getConfig();
          apiKey = config.googleMapsApiKey || null;
        } catch (configError: any) {
          console.warn('⚠️ Could not fetch config, trying alternative methods...', configError);
          
          // Try to get API key from window location if we're on same origin
          if (typeof window !== 'undefined') {
            try {
              // Try fetching from the same origin
              const origin = window.location.origin;
              const altConfigUrl = `${origin}/api/v1/config`;
              console.log('🔄 Trying alternative config URL:', altConfigUrl);
              
              const response = await fetch(altConfigUrl);
              if (response.ok) {
                const data = await response.json();
                apiKey = data.data?.googleMapsApiKey || null;
                if (apiKey) {
                  console.log('✅ Got API key from alternative URL');
                }
              }
            } catch (altError) {
              console.warn('Alternative config fetch also failed:', altError);
            }
          }
        }

        if (!apiKey) {
          console.error('❌ Google Maps API key not found.');
          console.error('   Please ensure:');
          console.error('   1. Backend server is running');
          console.error('   2. Backend .env file has GOOGLE_MAPS_API_KEY set');
          console.error('   3. /api/v1/config endpoint is accessible');
          console.error('   4. CORS is properly configured on backend');
          console.error('   The map will still display route information without Google Maps.');
          
          // If no API key, set map as "loaded" but it will show a fallback message
          setMapLoaded(true);
          return;
        }

        console.log('✅ Google Maps API key retrieved successfully, loading map script...');

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
  }, [getConfig]);

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

    // Initialize directions service
    directionsServiceRef.current = new (window as any).google.maps.DirectionsService();
    directionsRendererRef.current = new (window as any).google.maps.DirectionsRenderer({
      map: googleMapRef.current,
      suppressMarkers: false,
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
        content: `<div><strong>Vehicle</strong><br/>${vehicleLocation?.plateNumber || 'Live Location'}<br/>Speed: ${vehicleLocation?.speed || 0} km/h</div>`,
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
    if (pickupLatForRoute !== null && pickupLngForRoute !== null && 
        dropoffLatForRoute !== null && dropoffLngForRoute !== null && 
        directionsServiceRef.current && directionsRendererRef.current) {
      directionsServiceRef.current.route(
        {
          origin: { lat: pickupLatForRoute, lng: pickupLngForRoute },
          destination: { lat: dropoffLatForRoute, lng: dropoffLngForRoute },
          travelMode: (window as any).google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === (window as any).google.maps.DirectionsStatus.OK && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
          } else {
            console.error('Directions request failed:', status);
          }
        }
      );
    }

    // Fit bounds to show all markers
    if (markersRef.current.length > 0 && googleMapRef.current) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        const pos = marker.getPosition();
        if (pos) bounds.extend(pos);
      });
      googleMapRef.current.fitBounds(bounds);
    }
  }, [mapLoaded, pickup, dropoff]);

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
        vehicleInfoWindowRef.current.setContent(
          `<div><strong>Vehicle</strong><br/>${vehicleLocation?.plateNumber || 'Live Location'}<br/>Speed: ${vehicleLocation?.speed || 0} km/h</div>`
        );
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
        content: `<div><strong>Vehicle</strong><br/>${vehicleLocation?.plateNumber || 'Live Location'}<br/>Speed: ${vehicleLocation?.speed || 0} km/h</div>`,
      });
      
      vehicleMarkerRef.current.addListener('click', () => {
        if (vehicleInfoWindowRef.current) {
          vehicleInfoWindowRef.current.open(googleMapRef.current, vehicleMarkerRef.current);
        }
      });
    }
  }, [mapLoaded, vehicleCoordinates, vehicleLocation]);


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
      
      {/* Vehicle info overlay */}
      {vehicleLocation && (
        <View style={[styles.webInfoContainer, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.95)' }]}>
          <View style={styles.webInfoRow}>
            <Text style={styles.webInfoLabel}>Vehicle:</Text>
            <Text style={styles.webInfoValue}>
              {vehicleLocation.plateNumber || vehicleLocation.internalId}
            </Text>
          </View>
          {vehicleLocation.speed !== undefined && (
            <View style={styles.webInfoRow}>
              <Text style={styles.webInfoLabel}>Speed:</Text>
              <Text style={styles.webInfoValue}>{vehicleLocation.speed || 0} km/h</Text>
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

