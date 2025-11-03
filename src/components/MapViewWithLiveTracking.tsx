import React, { useState, useEffect, useRef } from 'react';
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

interface MapViewWithLiveTrackingProps {
  visible: boolean;
  onClose: () => void;
  load: {
    _id: string;
    internalId?: string;
    route?: {
      selectPickup?: {
        place?: string;
        city?: string;
        state?: string;
        latitude?: number;
        longitude?: number;
      };
      selectDropOff?: {
        place?: string;
        city?: string;
        state?: string;
        latitude?: number;
        longitude?: number;
      };
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
  const mapRef = useRef<any>(null);

  const pickup = load.route?.selectPickup;
  const dropoff = load.route?.selectDropOff;
  const vehicleId = load.vehicle?.internalId;

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
        if (typeof window !== 'undefined') {
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
          const timeoutId = setTimeout(() => {
            if (!locationReceived) {
              setLoading(false);
              setError('No location data received. The vehicle may be offline.');
            }
          }, 10000);
          
          // Set up vehicle location listener
          socketService.onVehicleLocation((vehicle: VehicleLocation) => {
            locationReceived = true;
            setVehicleLocation(vehicle);
            setLoading(false);
            
            // Update map camera to show vehicle
            if (vehicle.currentLocation?.latitude && vehicle.currentLocation?.longitude && mapRef.current) {
              const lat = parseFloat(String(vehicle.currentLocation.latitude));
              const lng = parseFloat(String(vehicle.currentLocation.longitude));
              
              if (!isNaN(lat) && !isNaN(lng)) {
                mapRef.current.animateToRegion({
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }, 1000);
              }
            }
          });
          
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
    if (pickup?.latitude && pickup?.longitude) {
      coordinates.push({
        latitude: pickup.latitude,
        longitude: pickup.longitude,
      });
    }

    // Add dropoff location
    if (dropoff?.latitude && dropoff?.longitude) {
      coordinates.push({
        latitude: dropoff.latitude,
        longitude: dropoff.longitude,
      });
    }

    // Add vehicle location if available
    if (vehicleLocation?.currentLocation?.latitude && vehicleLocation?.currentLocation?.longitude) {
      const lat = parseFloat(String(vehicleLocation.currentLocation.latitude));
      const lng = parseFloat(String(vehicleLocation.currentLocation.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates.push({ latitude: lat, longitude: lng });
      }
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

  const routeCoordinates: Array<{ latitude: number; longitude: number }> = [];

  if (pickup?.latitude && pickup?.longitude) {
    routeCoordinates.push({
      latitude: pickup.latitude,
      longitude: pickup.longitude,
    });
  }

  if (dropoff?.latitude && dropoff?.longitude) {
    routeCoordinates.push({
      latitude: dropoff.latitude,
      longitude: dropoff.longitude,
    });
  }

  const vehicleCoordinates = vehicleLocation?.currentLocation?.latitude && 
    vehicleLocation?.currentLocation?.longitude
    ? {
        latitude: parseFloat(String(vehicleLocation.currentLocation.latitude)),
        longitude: parseFloat(String(vehicleLocation.currentLocation.longitude)),
      }
    : null;

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
                const coords = vehicleCoordinates || pickup;
                if (coords) {
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
            {/* Pickup Marker */}
            {pickup?.latitude && pickup?.longitude && (
              <Marker
                coordinate={{
                  latitude: pickup.latitude,
                  longitude: pickup.longitude,
                }}
                title="Pickup Location"
                description={pickup.place || `${pickup.city}, ${pickup.state}`}
              >
                <View style={[styles.markerContainer, styles.pickupMarker]}>
                  <Ionicons name="location" size={24} color="#fff" />
                </View>
              </Marker>
            )}

            {/* Dropoff Marker */}
            {dropoff?.latitude && dropoff?.longitude && (
              <Marker
                coordinate={{
                  latitude: dropoff.latitude,
                  longitude: dropoff.longitude,
                }}
                title="Drop-off Location"
                description={dropoff.place || `${dropoff.city}, ${dropoff.state}`}
              >
                <View style={[styles.markerContainer, styles.dropoffMarker]}>
                  <Ionicons name="flag" size={24} color="#fff" />
                </View>
              </Marker>
            )}

            {/* Vehicle Live Location Marker */}
            {vehicleCoordinates && (
              <Marker
                coordinate={vehicleCoordinates}
                title="Vehicle Location"
                description={
                  vehicleLocation?.plateNumber 
                    ? `Vehicle: ${vehicleLocation.plateNumber}`
                    : `Speed: ${vehicleLocation?.speed || 0} km/h`
                }
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[styles.markerContainer, styles.vehicleMarker]}>
                  <Ionicons name="car" size={24} color="#fff" />
                </View>
              </Marker>
            )}

            {/* Route Polyline */}
            {routeCoordinates.length >= 2 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#8B5CF6"
                strokeWidth={4}
                lineDashPattern={[1]}
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
                      {pickup.latitude && pickup.longitude && (
                        <TouchableOpacity
                          style={[styles.openMapsButton, { marginTop: 8 }]}
                          onPress={() => {
                            const url = `https://www.google.com/maps?q=${pickup.latitude},${pickup.longitude}`;
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
                      {dropoff.latitude && dropoff.longitude && (
                        <TouchableOpacity
                          style={[styles.openMapsButton, { marginTop: 8 }]}
                          onPress={() => {
                            const url = `https://www.google.com/maps?q=${dropoff.latitude},${dropoff.longitude}`;
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
            <Text style={styles.legendText}>Drop-off</Text>
          </View>
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
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pickupMarker: {
    backgroundColor: '#27ae60',
    borderColor: '#fff',
  },
  dropoffMarker: {
    backgroundColor: '#e74c3c',
    borderColor: '#fff',
  },
  vehicleMarker: {
    backgroundColor: '#3498db',
    borderColor: '#fff',
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

    const center = pickup
      ? { lat: parseFloat(String(pickup.latitude)), lng: parseFloat(String(pickup.longitude)) }
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

    // Add pickup marker
    if (pickup?.latitude && pickup?.longitude) {
      const pickupMarker = new (window as any).google.maps.Marker({
        position: { lat: parseFloat(String(pickup.latitude)), lng: parseFloat(String(pickup.longitude)) },
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
    if (dropoff?.latitude && dropoff?.longitude) {
      const dropoffMarker = new (window as any).google.maps.Marker({
        position: { lat: parseFloat(String(dropoff.latitude)), lng: parseFloat(String(dropoff.longitude)) },
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

    // Add vehicle marker if available
    if (vehicleCoordinates?.latitude && vehicleCoordinates?.longitude) {
      const vehicleMarker = new (window as any).google.maps.Marker({
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
      });
      markersRef.current.push(vehicleMarker);

      const vehicleInfo = new (window as any).google.maps.InfoWindow({
        content: `<div><strong>Vehicle</strong><br/>${vehicleLocation?.plateNumber || 'Live Location'}<br/>Speed: ${vehicleLocation?.speed || 0} km/h</div>`,
      });
      vehicleMarker.addListener('click', () => vehicleInfo.open(googleMapRef.current, vehicleMarker));
    }

    // Draw route if we have both pickup and dropoff
    if (pickup?.latitude && dropoff?.latitude && directionsServiceRef.current && directionsRendererRef.current) {
      directionsServiceRef.current.route(
        {
          origin: { lat: parseFloat(String(pickup.latitude)), lng: parseFloat(String(pickup.longitude)) },
          destination: { lat: parseFloat(String(dropoff.latitude)), lng: parseFloat(String(dropoff.longitude)) },
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
  }, [mapLoaded, pickup, dropoff, vehicleCoordinates, vehicleLocation]);


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

