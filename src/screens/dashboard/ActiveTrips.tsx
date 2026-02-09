import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { apiService } from '../../services/api/apiService';
import { logger } from '../../utils/loggerHelper';
import MapViewWithLiveTracking from '../../components/MapViewWithLiveTracking';

// Conditionally import DocumentPicker
let DocumentPicker: any = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch (e) {
  console.warn('expo-document-picker not available');
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface Trip {
  _id: string;
  tripNumber: string;
  status: string;
  driver?: {
    _id: string;
    name: string;
  };
  truck?: {
    _id: string;
    plateNumber?: string;
    internalId?: string;
    make?: string;
    model?: string;
    yard?: {
      yardName?: string;
      yardCode?: string;
      address?: string;
      city?: string;
      stateProvince?: string;
      coordinates?: {
        latitude?: number | string;
        longitude?: number | string;
      };
    };
  };
  yardLocation?: {
    yardName?: string;
    yardCode?: string;
    address?: string;
    city?: string;
    stateProvince?: string;
    coordinates?: {
      latitude?: number | string;
      longitude?: number | string;
    };
  };
  trailer?: {
    _id: string;
    plateNumber?: string;
    trailerNumber?: string;
  };
  orders?: Array<{
    _id: string;
    orderNumber: string;
    customerOrderNo?: string;
    status?: string;
    customer?: {
      name?: string;
      email?: string;
    };
    pickupLocation?: {
        place?: string;
      latitude?: string | number;
      longitude?: string | number;
      placeId?: {
        name?: string;
        currentLocation?: {
          address?: string;
          latitude?: string | number;
          longitude?: string | number;
        };
      };
    };
    deliveryLocation?: {
      place?: string;
      latitude?: string | number;
      longitude?: string | number;
      placeId?: {
    name?: string;
        currentLocation?: {
          address?: string;
          latitude?: string | number;
          longitude?: string | number;
        };
      };
    };
    shipper?: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      unit?: string;
      country?: string;
      province?: string;
      city?: string;
      postalCode?: string;
      primaryPhone?: string;
      secondaryPhone?: string;
      contact?: string;
      store?: string;
      type?: string;
    };
    receiver?: {
      name?: string;
      phone?: string;
      address?: string;
      contact?: string;
    };
    stops?: Array<{
      stop?: number;
      shipper?: string;
      date?: string;
      endDate?: string;
      appointment?: string;
      pickUpNumber?: string;
      contact?: string;
      skids?: string;
      cases?: string;
      weight?: string;
      uom?: string;
      temperature?: string;
      address?: string;
      ltl?: boolean;
    }>;
    receiverStops?: Array<{
      stop?: number;
      receiver?: string;
      date?: string;
      endDate?: string;
      appointment?: string;
      dropOffNumber?: string;
      contact?: string;
      skids?: string;
      cases?: string;
      weight?: string;
      uom?: string;
      temperature?: string;
      address?: string;
      ltl?: boolean;
    }>;
    pickupDate?: string;
    deliveryDate?: string;
    pickupAppointment?: {
      type?: string;
      date?: string;
      time?: string;
    };
    deliveryAppointment?: {
      date?: string;
      time?: string;
    };
    pickupAppointmentDetails?: {
      type?: string;
      date?: string;
      time?: string;
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
      specialInstructions?: string;
      gatePass?: string;
    };
    deliveryAppointmentDetails?: {
      type?: string;
      date?: string;
      time?: string;
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
      unloadingInstructions?: string;
    };
  }>;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  notes?: string;
  documents?: Array<{
    _id?: string;
    fileUrl: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    type?: string;
    uploadedBy?: any;
    uploadedAt?: string;
    description?: string;
  }>;
  route?: {
    totalDistance?: number;
    estimatedDuration?: number;
    waypoints?: Array<{
      place: string;
      latitude: string | number;
      longitude: string | number;
      order?: string;
      type: 'pickup' | 'delivery' | 'stop';
    }>;
  };
}

// Helper to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper to convert trip to load-like structure for MapViewWithLiveTracking
const convertTripToLoadForMap = (trip: Trip) => {
  if (!trip.orders || trip.orders.length === 0) {
    return null;
  }

  const parseCoord = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  const getLocationCoords = (location: any) => {
    if (!location) return { lat: null, lng: null };
    
    let lat = parseCoord(location.latitude);
    let lng = parseCoord(location.longitude);
    
    if ((lat === null || lng === null) && location.placeId?.currentLocation) {
      lat = parseCoord(location.placeId.currentLocation.latitude);
      lng = parseCoord(location.placeId.currentLocation.longitude);
    }
    
    return { lat, lng };
  };

  // Check if trip has optimized route waypoints from backend
  if ((trip as any).route?.waypoints && Array.isArray((trip as any).route.waypoints) && (trip as any).route.waypoints.length > 0) {
    // Use backend-optimized waypoints
    const optimizedWaypoints = (trip as any).route.waypoints.map((wp: any) => {
      const lat = parseCoord(wp.latitude);
      const lng = parseCoord(wp.longitude);
      
      if (lat === null || lng === null) return null;
      
      return {
        address: {
          place: wp.place || 'Waypoint',
          latitude: lat,
          longitude: lng,
        },
        pickup: wp.type === 'pickup',
        dropOff: wp.type === 'delivery',
      };
    }).filter((wp: any) => wp !== null);

    const firstOrder = trip.orders[0];
    const lastOrder = trip.orders[trip.orders.length - 1];
    const pickup = firstOrder.pickupLocation;
    const dropoff = lastOrder.deliveryLocation;
    const pickupCoords = getLocationCoords(pickup);
    const dropoffCoords = getLocationCoords(dropoff);

    return {
      _id: trip._id,
      internalId: trip.tripNumber,
      route: {
        multipleDropOffs: trip.orders.length > 1,
        selectPickup: {
          place: pickup?.place || pickup?.placeId?.name || 'Pickup',
          latitude: pickupCoords.lat !== null ? pickupCoords.lat : undefined,
          longitude: pickupCoords.lng !== null ? pickupCoords.lng : undefined,
        },
        selectDropOff: {
          place: dropoff?.place || dropoff?.placeId?.name || 'Delivery',
          latitude: dropoffCoords.lat !== null ? dropoffCoords.lat : undefined,
          longitude: dropoffCoords.lng !== null ? dropoffCoords.lng : undefined,
        },
        wayPoints: optimizedWaypoints,
      },
      vehicle: trip.truck ? {
        _id: trip.truck._id,
        internalId: trip.truck.internalId || trip.truck.plateNumber || '',
        plateNumber: trip.truck.plateNumber,
        trackingKey: (trip.truck as any).trackingKey, // Include trackingKey for vehicle tracking
      } : undefined,
    };
  }

  // Build optimized waypoints from orders including multiple stops
  // For multiple orders: All Pickups (main + stops) -> All Deliveries (main + receiverStops)
  const wayPoints: Array<{
    address: {
      place: string;
      latitude: number | string | null;
      longitude: number | string | null;
    };
    pickup?: boolean;
    dropOff?: boolean;
    orderId?: string;
    orderNumber?: string;
    stopNumber?: number;
    stopType?: 'main' | 'additional';
  }> = [];

  // Helper to parse coordinates from stop address
  const getStopCoords = (stop: any, order: any) => {
    if (!stop) return { lat: null, lng: null };
    
    // Try address field first (if address is an object with lat/lng)
    if (stop.address && typeof stop.address === 'object') {
      const lat = parseCoord(stop.address.latitude || stop.address.lat);
      const lng = parseCoord(stop.address.longitude || stop.address.lng);
      if (lat !== null && lng !== null) return { lat, lng };
    }
    
    // Try latitude/longitude directly on stop
    const lat = parseCoord(stop.latitude || stop.lat);
    const lng = parseCoord(stop.longitude || stop.lng);
    if (lat !== null && lng !== null) return { lat, lng };
    
    // If no coordinates, try to use main pickup/delivery location as fallback
    // For pickup stops, use main pickup location
    // For delivery stops, use main delivery location
    if (stop.address && typeof stop.address === 'string') {
      // Try to match with main locations
      if (order.pickupLocation) {
        const pickupCoords = getLocationCoords(order.pickupLocation);
        if (pickupCoords.lat !== null && pickupCoords.lng !== null) {
          console.warn(`⚠️ Stop "${stop.address}" missing coordinates, using main pickup location as fallback`);
          return pickupCoords;
        }
      }
      if (order.deliveryLocation) {
        const deliveryCoords = getLocationCoords(order.deliveryLocation);
        if (deliveryCoords.lat !== null && deliveryCoords.lng !== null) {
          console.warn(`⚠️ Stop "${stop.address}" missing coordinates, using main delivery location as fallback`);
          return deliveryCoords;
        }
      }
    }
    
    return { lat: null, lng: null };
  };

  // First, collect all pickups and deliveries with their order info
  const allLocations: Array<{
    address: {
      place: string;
      latitude: number;
      longitude: number;
    };
    pickup: boolean;
    dropOff: boolean;
    orderId: string;
    orderNumber: string;
    index: number;
    stopNumber?: number;
    stopType: 'main' | 'additional';
  }> = [];

  trip.orders.forEach((order, orderIndex) => {
    // Main pickup location
    const pickupLoc = order.pickupLocation;
    const pickupCoords = getLocationCoords(pickupLoc);

    if (pickupCoords.lat !== null && pickupCoords.lng !== null) {
      allLocations.push({
        address: {
          place: pickupLoc?.place || pickupLoc?.placeId?.name || order.shipper?.address || `Pickup ${orderIndex + 1}`,
          latitude: pickupCoords.lat,
          longitude: pickupCoords.lng,
        },
        pickup: true,
        dropOff: false,
        orderId: order._id,
        orderNumber: order.orderNumber || `Order ${orderIndex + 1}`,
        index: orderIndex,
        stopType: 'main',
      });
    }

    // Additional pickup stops
    if (order.stops && Array.isArray(order.stops) && order.stops.length > 0) {
      console.log(`📍 Order ${order.orderNumber || orderIndex + 1} - Found ${order.stops.length} pickup stops:`, order.stops);
      order.stops.forEach((stop: any, stopIndex: number) => {
        const stopCoords = getStopCoords(stop, order);
        console.log(`  🛑 Pickup Stop ${stopIndex + 1}:`, {
          stop: stop.stop,
          address: stop.address,
          shipper: stop.shipper,
          coords: stopCoords,
          stopData: stop
        });
        if (stopCoords.lat !== null && stopCoords.lng !== null) {
          allLocations.push({
            address: {
              place: stop.address || stop.shipper || `Pickup Stop ${stop.stop || stopIndex + 1}`,
              latitude: stopCoords.lat,
              longitude: stopCoords.lng,
            },
            pickup: true,
            dropOff: false,
            orderId: order._id,
            orderNumber: order.orderNumber || `Order ${orderIndex + 1}`,
            index: orderIndex,
            stopNumber: stop.stop || stopIndex + 1,
            stopType: 'additional',
          });
          console.log(`  ✅ Added pickup stop ${stop.stop || stopIndex + 1} to waypoints`);
        } else {
          console.warn(`  ⚠️ Pickup stop ${stopIndex + 1} missing coordinates - address: "${stop.address}"`);
          // Still add the stop with a warning, but use main pickup location as fallback
          const fallbackCoords = getLocationCoords(order.pickupLocation);
          if (fallbackCoords.lat !== null && fallbackCoords.lng !== null) {
            console.log(`  📍 Using main pickup location as fallback for stop ${stopIndex + 1}`);
            allLocations.push({
              address: {
                place: stop.address || stop.shipper || `Pickup Stop ${stop.stop || stopIndex + 1}`,
                latitude: fallbackCoords.lat,
                longitude: fallbackCoords.lng,
              },
              pickup: true,
              dropOff: false,
              orderId: order._id,
              orderNumber: order.orderNumber || `Order ${orderIndex + 1}`,
              index: orderIndex,
              stopNumber: stop.stop || stopIndex + 1,
              stopType: 'additional',
            });
          }
        }
      });
    }

    // Main delivery location
    const deliveryLoc = order.deliveryLocation;
    const deliveryCoords = getLocationCoords(deliveryLoc);

    if (deliveryCoords.lat !== null && deliveryCoords.lng !== null) {
      allLocations.push({
        address: {
          place: deliveryLoc?.place || deliveryLoc?.placeId?.name || order.receiver?.address || `Delivery ${orderIndex + 1}`,
          latitude: deliveryCoords.lat,
          longitude: deliveryCoords.lng,
        },
        pickup: false,
        dropOff: true,
        orderId: order._id,
        orderNumber: order.orderNumber || `Order ${orderIndex + 1}`,
        index: orderIndex,
        stopType: 'main',
      });
    }

    // Additional delivery stops (receiverStops)
    if (order.receiverStops && Array.isArray(order.receiverStops) && order.receiverStops.length > 0) {
      console.log(`📍 Order ${order.orderNumber || orderIndex + 1} - Found ${order.receiverStops.length} delivery stops:`, order.receiverStops);
      order.receiverStops.forEach((stop: any, stopIndex: number) => {
        const stopCoords = getStopCoords(stop, order);
        console.log(`  🛑 Delivery Stop ${stopIndex + 1}:`, {
          stop: stop.stop,
          address: stop.address,
          receiver: stop.receiver,
          coords: stopCoords,
          stopData: stop
        });
        if (stopCoords.lat !== null && stopCoords.lng !== null) {
          allLocations.push({
            address: {
              place: stop.address || stop.receiver || `Delivery Stop ${stop.stop || stopIndex + 1}`,
              latitude: stopCoords.lat,
              longitude: stopCoords.lng,
            },
            pickup: false,
            dropOff: true,
            orderId: order._id,
            orderNumber: order.orderNumber || `Order ${orderIndex + 1}`,
            index: orderIndex,
            stopNumber: stop.stop || stopIndex + 1,
            stopType: 'additional',
          });
          console.log(`  ✅ Added delivery stop ${stop.stop || stopIndex + 1} to waypoints`);
        } else {
          console.warn(`  ⚠️ Delivery stop ${stopIndex + 1} missing coordinates - address: "${stop.address}"`);
          // Still add the stop with a warning, but use main delivery location as fallback
          const fallbackCoords = getLocationCoords(order.deliveryLocation);
          if (fallbackCoords.lat !== null && fallbackCoords.lng !== null) {
            console.log(`  📍 Using main delivery location as fallback for stop ${stopIndex + 1}`);
            allLocations.push({
              address: {
                place: stop.address || stop.receiver || `Delivery Stop ${stop.stop || stopIndex + 1}`,
                latitude: fallbackCoords.lat,
                longitude: fallbackCoords.lng,
              },
              pickup: false,
              dropOff: true,
              orderId: order._id,
              orderNumber: order.orderNumber || `Order ${orderIndex + 1}`,
              index: orderIndex,
              stopNumber: stop.stop || stopIndex + 1,
              stopType: 'additional',
            });
          }
        }
      });
    }
  });

  // Sort locations: all pickups first (maintaining order), then all deliveries (maintaining order)
  // This ensures we pick up all orders before delivering any
  const sortedLocations = [
    ...allLocations.filter(loc => loc.pickup).sort((a, b) => a.index - b.index),
    ...allLocations.filter(loc => loc.dropOff).sort((a, b) => a.index - b.index),
  ];

  sortedLocations.forEach((loc) => {
    const waypoint = {
      address: {
        place: loc.address.place,
        latitude: loc.address.latitude,
        longitude: loc.address.longitude,
      },
      pickup: loc.pickup,
      dropOff: loc.dropOff,
      orderId: loc.orderId,
      orderNumber: loc.orderNumber,
      stopNumber: loc.stopNumber,
      stopType: loc.stopType,
    };
    console.log('📌 Adding waypoint to array:', {
      place: waypoint.address.place,
      latitude: waypoint.address.latitude,
      longitude: waypoint.address.longitude,
      stopNumber: waypoint.stopNumber,
      stopType: waypoint.stopType,
      isPickup: waypoint.pickup,
      isDropoff: waypoint.dropOff,
    });
    wayPoints.push(waypoint);
  });
  
  console.log('📋 Final wayPoints array:', {
    total: wayPoints.length,
    waypoints: wayPoints.map(wp => ({
      place: wp.address.place,
      lat: wp.address.latitude,
      lng: wp.address.longitude,
      stopNumber: wp.stopNumber,
      stopType: wp.stopType,
    }))
  });

  // Log final waypoints with stops
  const stopsCount = wayPoints.filter(wp => wp.stopType === 'additional').length;
  console.log('🗺️ Final waypoints summary:', {
    total: wayPoints.length,
    main: wayPoints.filter(wp => wp.stopType === 'main').length,
    additional: stopsCount,
    pickupStops: wayPoints.filter(wp => wp.pickup && wp.stopType === 'additional').length,
    deliveryStops: wayPoints.filter(wp => wp.dropOff && wp.stopType === 'additional').length,
    waypoints: wayPoints.map(wp => ({
      place: wp.address.place,
      stopNumber: wp.stopNumber,
      stopType: wp.stopType,
      pickup: wp.pickup,
      dropOff: wp.dropOff
    }))
  });

  // Get first pickup and last delivery for selectPickup/selectDropOff
  const firstPickup = sortedLocations.find(loc => loc.pickup);
  const lastDelivery = sortedLocations.filter(loc => loc.dropOff).pop();

  const pickup = firstPickup ? trip.orders.find(o => o._id === firstPickup.orderId)?.pickupLocation : trip.orders[0]?.pickupLocation;
  const dropoff = lastDelivery ? trip.orders.find(o => o._id === lastDelivery.orderId)?.deliveryLocation : trip.orders[trip.orders.length - 1]?.deliveryLocation;
  const pickupCoords = getLocationCoords(pickup);
  const dropoffCoords = getLocationCoords(dropoff);

  // Get yard location from trip (either from yardLocation or truck.yard)
  let yardLocation = trip.yardLocation;
  if (!yardLocation && trip.truck?.yard?.coordinates) {
    const yard = trip.truck.yard;
    if (yard.coordinates?.latitude && yard.coordinates?.longitude) {
      yardLocation = {
        yardName: yard.yardName || 'Yard',
        yardCode: yard.yardCode || '',
        address: yard.address || '',
        city: yard.city || '',
        stateProvince: yard.stateProvince || '',
        coordinates: {
          latitude: parseFloat(String(yard.coordinates.latitude)) || null,
          longitude: parseFloat(String(yard.coordinates.longitude)) || null,
        }
      };
    }
  }

  console.log('🏭 Yard location for trip:', {
    hasYardLocation: !!yardLocation,
    yardName: yardLocation?.yardName,
    coordinates: yardLocation?.coordinates
  });

  return {
    _id: trip._id,
    internalId: trip.tripNumber,
    route: {
      multipleDropOffs: trip.orders.length > 1,
      selectPickup: {
        place: pickup?.place || pickup?.placeId?.name || 'Pickup',
        latitude: pickupCoords.lat !== null ? pickupCoords.lat : undefined,
        longitude: pickupCoords.lng !== null ? pickupCoords.lng : undefined,
      },
      selectDropOff: {
        place: dropoff?.place || dropoff?.placeId?.name || 'Delivery',
        latitude: dropoffCoords.lat !== null ? dropoffCoords.lat : undefined,
        longitude: dropoffCoords.lng !== null ? dropoffCoords.lng : undefined,
      },
      wayPoints: (() => {
        const filtered = wayPoints.filter(wp => {
          const hasValidCoords = wp.address.latitude !== null && wp.address.longitude !== null;
          if (!hasValidCoords) {
            console.warn('⚠️ Filtering out waypoint with invalid coordinates:', {
              place: wp.address.place,
              latitude: wp.address.latitude,
              longitude: wp.address.longitude,
              stopNumber: wp.stopNumber,
              stopType: wp.stopType,
            });
          }
          return hasValidCoords;
        });
        
        const mapped = filtered.map(wp => {
          const result = {
            address: {
              place: wp.address.place,
              latitude: wp.address.latitude !== null ? wp.address.latitude : undefined,
              longitude: wp.address.longitude !== null ? wp.address.longitude : undefined,
            },
            pickup: wp.pickup,
            dropOff: wp.dropOff,
            stopNumber: wp.stopNumber,
            stopType: wp.stopType,
          };
          console.log('✅ Mapped waypoint for map:', {
            place: result.address.place,
            lat: result.address.latitude,
            lng: result.address.longitude,
            stopNumber: result.stopNumber,
            stopType: result.stopType,
            isPickup: result.pickup,
            isDropoff: result.dropOff,
          });
          return result;
        });
        
        console.log('📤 Returning waypoints to map component:', {
          total: wayPoints.length,
          filtered: filtered.length,
          mapped: mapped.length,
          waypoints: mapped.map(wp => ({
            place: wp.address.place,
            lat: wp.address.latitude,
            lng: wp.address.longitude,
            stopNumber: wp.stopNumber,
            stopType: wp.stopType,
          }))
        });
        
        return mapped;
      })(),
    },
    vehicle: trip.truck ? {
      _id: trip.truck._id,
      internalId: trip.truck.internalId || trip.truck.plateNumber || '',
      plateNumber: trip.truck.plateNumber,
      trackingKey: (trip.truck as any).trackingKey, // Include trackingKey for vehicle tracking
    } : undefined,
    yardLocation: yardLocation, // Include yard location for starting point
  };
};

const ActiveTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedTripForMap, setSelectedTripForMap] = useState<Trip | null>(null);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [selectedTripForCompletion, setSelectedTripForCompletion] = useState<Trip | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    fetchActiveTrips();
  }, []);

  const fetchActiveTrips = async () => {
    try {
      setLoading(true);
      const response = await apiService.getActiveTrips();
      
      if (response.success && response.data) {
        const tripsData = response.data.data || response.data || [];
        setTrips(Array.isArray(tripsData) ? tripsData : []);
        logger.info('Active trips fetched', { count: tripsData.length });
      } else {
        logger.warn('Failed to fetch active trips', { error: response.error });
        setTrips([]);
      }
    } catch (error) {
      logger.error('Error fetching active trips', error);
      setTrips([]);
      Alert.alert('Error', 'Failed to load active trips. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveTrips();
  };

  const handleCompleteTrip = async (tripId: string) => {
    // Find the trip to check documents
    const trip = trips.find(t => t._id === tripId);
    
    if (!trip) {
      Alert.alert('Error', 'Trip not found');
      return;
    }

    // Open completion modal
    setSelectedTripForCompletion(trip);
    setCompletionModalVisible(true);
  };

  const handleSelectFile = async (documentType: string) => {
    if (!DocumentPicker || !DocumentPicker.getDocumentAsync) {
      Alert.alert(
        'Feature Not Available',
        'Document picker requires a custom development build. Please build the app using "npx expo run:android" or "npx expo run:ios" for full functionality.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name || 'document.pdf',
          type: asset.mimeType || 'application/pdf',
          size: asset.size,
        });
        setSelectedDocumentType(documentType);
        logger.info('File selected for trip document', { name: asset.name, type: documentType });
      }
    } catch (error: any) {
      logger.error('Error selecting file', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const handleUploadDocument = async (tripId: string, documentType: string) => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    try {
      setUploadingDocument(true);
      const response = await apiService.uploadTripDocument(tripId, selectedFile, documentType);
      
      if (response.success) {
        Alert.alert('Success', 'Document uploaded successfully');
        setSelectedFile(null);
        setSelectedDocumentType('');
        // Refresh trip data
        fetchActiveTrips();
      } else {
        Alert.alert('Error', response.error || 'Failed to upload document');
      }
    } catch (error) {
      logger.error('Error uploading trip document', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleSubmitCompletion = async () => {
    if (!selectedTripForCompletion) return;

    const trip = selectedTripForCompletion;
    const documents = trip.documents || [];
    const hasPOD = documents.some((doc: any) => 
      doc.type === 'pod' || doc.type === 'proof_of_delivery'
    );

    // Check if trip is going to Canada
    let isCanadaTrip = false;
    if (trip.orders && trip.orders.length > 0) {
      for (const order of trip.orders) {
        const deliveryLocation = order.deliveryLocation;
        if (deliveryLocation?.placeId?.country) {
          const country = deliveryLocation.placeId.country.toLowerCase();
          if (country === 'canada' || country === 'ca') {
            isCanadaTrip = true;
            break;
          }
        } else if (deliveryLocation?.place) {
          const placeStr = deliveryLocation.place.toLowerCase();
          if (placeStr.includes('canada') || placeStr.includes('ca ')) {
            isCanadaTrip = true;
            break;
          }
        }
      }
    }

    const hasBorderManifest = documents.some((doc: any) => 
      doc.type === 'stamped_manifest' || doc.type === 'manifest'
    );

    // Validate required documents
    let missingDocs: string[] = [];
    if (!hasPOD) {
      missingDocs.push('Proof of Delivery (POD)');
    }
    if (isCanadaTrip && !hasBorderManifest) {
      missingDocs.push('Border Manifest');
    }

    if (missingDocs.length > 0) {
      Alert.alert(
        'Missing Required Documents',
        `Please upload the following required documents before completing the trip:\n\n${missingDocs.map(doc => `• ${doc}`).join('\n')}`
      );
      return;
    }

    // Submit for completion
    try {
      const response = await apiService.completeTrip(trip._id);
      if (response.success) {
        setCompletionModalVisible(false);
        setSelectedTripForCompletion(null);
        fetchActiveTrips();
        
        setTimeout(() => {
          Alert.alert(
            'Success',
            'Trip completion request submitted. Waiting for dispatcher approval.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.navigate('MainTabs', { screen: 'Dashboard' });
                },
              },
            ]
          );
        }, 800);
      } else {
        Alert.alert('Error', response.error || response.message || 'Failed to complete trip');
      }
    } catch (error) {
      logger.error('Error completing trip', error);
      Alert.alert('Error', 'Failed to complete trip. Please try again.');
    }
  };

  const formatAddress = (location: any) => {
    if (!location) return 'N/A';
    if (location.place) return location.place;
    if (location.placeId?.name) return location.placeId.name;
    if (location.placeId?.currentLocation?.address) return location.placeId.currentLocation.address;
    return 'Unknown Location';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateOnly = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "in-progress": return "#27ae60";
      case "in-delivery": return "#3498db";
      case "completed": return "#2ecc71";
      case "pending_completion":
      case "pending-completion": return "#f59e0b"; // Amber - waiting for approval
      case "planned": return "#95a5a6";
      default: return "#95a5a6";
    }
  };

  const canShowMap = (trip: Trip) => {
    if (!trip.orders || trip.orders.length === 0) return false;
    
    const firstOrder = trip.orders[0];
    const pickup = firstOrder.pickupLocation;
    
    const parseCoord = (val: any): number | null => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'number') return isNaN(val) ? null : val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const getLat = (loc: any) => {
      if (!loc) return null;
      return parseCoord(loc.latitude) || parseCoord(loc.placeId?.currentLocation?.latitude);
    };

    const getLng = (loc: any) => {
      if (!loc) return null;
      return parseCoord(loc.longitude) || parseCoord(loc.placeId?.currentLocation?.longitude);
    };

    const pickupLat = getLat(pickup);
    const pickupLng = getLng(pickup);

    if (pickupLat === null || pickupLng === null) return false;

    // Check if at least one order has delivery location
    return trip.orders.some(order => {
      const deliveryLat = getLat(order.deliveryLocation);
      const deliveryLng = getLng(order.deliveryLocation);
      return deliveryLat !== null && deliveryLng !== null;
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading active trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Active Trips</Text>
          <Text style={styles.headerSubtitle}>Monitor your ongoing trips in real-time</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{trips.length}</Text>
              <Text style={styles.statLabel}>Active Trips</Text>
            </View>
          </View>
        </View>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚛</Text>
          <Text style={styles.emptyText}>No Active Trips</Text>
          <Text style={styles.emptySubtext}>You don't have any active trips at the moment</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {trips.map((trip) => {
            const loadForMap = convertTripToLoadForMap(trip);
            const hasMap = loadForMap !== null && canShowMap(trip);
    
    return (
              <View key={trip._id} style={styles.tripCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerInfo}>
                    <Text style={styles.tripNumber}>{trip.tripNumber}</Text>
                    <Text style={styles.tripDate}>
                      Started: {formatDate(trip.actualStartDate || trip.plannedStartDate)}
            </Text>
          </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
                    <Text style={styles.statusText}>
                      {trip.status === 'pending_completion' || trip.status === 'pending-completion' 
                        ? 'Pending Approval' 
                        : trip.status || 'Active'}
                    </Text>
          </View>
        </View>

                {trip.truck && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Truck:</Text>
                    <Text style={styles.infoValue}>
                      {trip.truck.plateNumber || trip.truck.internalId || 'N/A'}
                    </Text>
                  </View>
                )}

                {trip.trailer && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Trailer:</Text>
                    <Text style={styles.infoValue}>
                      {trip.trailer.plateNumber || trip.trailer.trailerNumber || 'N/A'}
                    </Text>
              </View>
                )}

                {trip.orders && trip.orders.length > 0 && (
                  <View style={styles.ordersSection}>
                    <Text style={styles.ordersTitle}>
                      Orders ({trip.orders.length}):
                    </Text>
                    {trip.orders.map((order, index) => (
                      <View key={order._id || index} style={styles.orderItem}>
                        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                        {order.customerOrderNo && (
                          <Text style={styles.customerOrderNo}>
                            Customer Order: {order.customerOrderNo}
                          </Text>
                        )}
                        {order.customer?.name && (
                          <Text style={styles.customerName}>Customer: {order.customer.name}</Text>
                        )}
                        
                        {/* Shipper Information */}
                        <View style={styles.sectionDivider}>
                          <Text style={styles.sectionTitle}>Shipper Information</Text>
                        </View>
                        {order.shipper?.name && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Name:</Text>
                            <Text style={styles.infoValue}>{order.shipper.name}</Text>
                          </View>
                        )}
                        {order.shipper?.phone && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Phone:</Text>
                            <Text style={styles.infoValue}>{order.shipper.phone}</Text>
                          </View>
                        )}
                        {order.shipper?.contact && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Contact:</Text>
                            <Text style={styles.infoValue}>{order.shipper.contact}</Text>
                          </View>
                        )}
                        <View style={styles.locationRow}>
                          <Text style={styles.locationLabel}>Address: </Text>
                          <Text style={styles.locationValue}>
                            {order.shipper?.address || formatAddress(order.pickupLocation) || 'N/A'}
                          </Text>
                        </View>
                        {order.shipper?.city && order.shipper?.province && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>City/Province:</Text>
                            <Text style={styles.infoValue}>
                              {order.shipper.city}, {order.shipper.province}
                            </Text>
                          </View>
                        )}
                        {order.shipper?.postalCode && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Postal Code:</Text>
                            <Text style={styles.infoValue}>{order.shipper.postalCode}</Text>
                          </View>
                        )}
                        
                        {/* Multiple Pickup Stops */}
                        {order.stops && order.stops.length > 0 && (
                          <View style={styles.stopsSection}>
                            <Text style={styles.stopsTitle}>Additional Pickup Stops ({order.stops.length}):</Text>
                            {order.stops.map((stop: any, stopIndex: number) => (
                              <View key={stopIndex} style={styles.stopItem}>
                                <Text style={styles.stopNumber}>Stop {stop.stop || stopIndex + 1}</Text>
                                {stop.shipper && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Shipper:</Text>
                                    <Text style={styles.infoValue}>{stop.shipper}</Text>
                                  </View>
                                )}
                                {stop.address && (
                                  <View style={styles.locationRow}>
                                    <Text style={styles.locationLabel}>Address:</Text>
                                    <Text style={styles.locationValue}>{stop.address}</Text>
                                  </View>
                                )}
                                {stop.contact && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Contact:</Text>
                                    <Text style={styles.infoValue}>{stop.contact}</Text>
                                  </View>
                                )}
                                {stop.date && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Date:</Text>
                                    <Text style={styles.infoValue}>{stop.date}</Text>
                                  </View>
                                )}
                                {stop.appointment && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Appointment:</Text>
                                    <Text style={styles.infoValue}>{stop.appointment}</Text>
                                  </View>
                                )}
                                {stop.pickUpNumber && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Pickup #:</Text>
                                    <Text style={styles.infoValue}>{stop.pickUpNumber}</Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>
                        )}
                        
                        {/* Pickup Appointment Details */}
                        {(order.pickupAppointment || order.pickupDate) && (
                          <View style={styles.appointmentSection}>
                            <Text style={styles.appointmentTitle}>Pickup Appointment Details</Text>
                            {order.pickupAppointment?.type && (
                              <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Type:</Text>
                                <Text style={styles.infoValue}>{order.pickupAppointment.type}</Text>
                              </View>
                            )}
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Date:</Text>
                              <Text style={styles.infoValue}>
                                {order.pickupAppointment?.date 
                                  ? formatDateOnly(order.pickupAppointment.date)
                                  : order.pickupDate 
                                  ? formatDateOnly(order.pickupDate)
                                  : 'N/A'}
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Time:</Text>
                              <Text style={styles.infoValue}>
                                {order.pickupAppointment?.time 
                                  ? order.pickupAppointment.time
                                  : order.pickupDate 
                                  ? formatTime(order.pickupDate)
                                  : 'N/A'}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Receiver Information */}
                        <View style={styles.sectionDivider}>
                          <Text style={styles.sectionTitle}>Receiver Information</Text>
                        </View>
                        {order.receiver?.name && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Name:</Text>
                            <Text style={styles.infoValue}>{order.receiver.name}</Text>
                          </View>
                        )}
                        {order.receiver?.phone && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Phone:</Text>
                            <Text style={styles.infoValue}>{order.receiver.phone}</Text>
                          </View>
                        )}
                        {order.receiver?.contact && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Contact:</Text>
                            <Text style={styles.infoValue}>{order.receiver.contact}</Text>
                          </View>
                        )}
                        <View style={styles.locationRow}>
                          <Text style={styles.locationLabel}>Address: </Text>
                          <Text style={styles.locationValue}>
                            {order.receiver?.address || formatAddress(order.deliveryLocation) || 'N/A'}
                          </Text>
                        </View>
                        
                        {/* Multiple Delivery Stops */}
                        {order.receiverStops && order.receiverStops.length > 0 && (
                          <View style={styles.stopsSection}>
                            <Text style={styles.stopsTitle}>Additional Delivery Stops ({order.receiverStops.length}):</Text>
                            {order.receiverStops.map((stop: any, stopIndex: number) => (
                              <View key={stopIndex} style={styles.stopItem}>
                                <Text style={styles.stopNumber}>Stop {stop.stop || stopIndex + 1}</Text>
                                {stop.receiver && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Receiver:</Text>
                                    <Text style={styles.infoValue}>{stop.receiver}</Text>
                                  </View>
                                )}
                                {stop.address && (
                                  <View style={styles.locationRow}>
                                    <Text style={styles.locationLabel}>Address:</Text>
                                    <Text style={styles.locationValue}>{stop.address}</Text>
                                  </View>
                                )}
                                {stop.contact && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Contact:</Text>
                                    <Text style={styles.infoValue}>{stop.contact}</Text>
                                  </View>
                                )}
                                {stop.date && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Date:</Text>
                                    <Text style={styles.infoValue}>{stop.date}</Text>
                                  </View>
                                )}
                                {stop.appointment && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Appointment:</Text>
                                    <Text style={styles.infoValue}>{stop.appointment}</Text>
                                  </View>
                                )}
                                {stop.dropOffNumber && (
                                  <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Drop-off #:</Text>
                                    <Text style={styles.infoValue}>{stop.dropOffNumber}</Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>
                        )}
                        
                        {/* Delivery Appointment Details */}
                        {(order.deliveryAppointment || order.deliveryDate) && (
                          <View style={styles.appointmentSection}>
                            <Text style={styles.appointmentTitle}>Delivery Appointment Details</Text>
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Date:</Text>
                              <Text style={styles.infoValue}>
                                {order.deliveryAppointment?.date 
                                  ? formatDateOnly(order.deliveryAppointment.date)
                                  : order.deliveryDate 
                                  ? formatDateOnly(order.deliveryDate)
                                  : 'N/A'}
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Time:</Text>
                              <Text style={styles.infoValue}>
                                {order.deliveryAppointment?.time 
                                  ? order.deliveryAppointment.time
                                  : order.deliveryDate 
                                  ? formatTime(order.deliveryDate)
                                  : 'N/A'}
                              </Text>
                            </View>
                          </View>
                        )}

                        {order.status && (
                          <View style={styles.orderStatusRow}>
                            <Text style={styles.orderStatusLabel}>Status: </Text>
                            <Text style={[styles.orderStatusValue, {
                              color: order.status === 'in-delivery' ? '#3498db' :
                                     order.status === 'completed' ? '#2ecc71' :
                                     '#95a5a6'
                            }]}>
                              {order.status}
                            </Text>
            </View>
                        )}
              </View>
                    ))}
            </View>
                )}

                {trip.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        )}

                {/* Documents */}
                {trip.documents && trip.documents.length > 0 && (
                  <View style={styles.documentsSection}>
                    <Text style={styles.documentsTitle}>
                      Documents ({trip.documents.length}):
                    </Text>
                    {trip.documents.map((doc, index) => (
                      <TouchableOpacity
                        key={doc._id || index}
                        style={styles.documentItem}
                        onPress={async () => {
                          if (!doc._id || !trip._id) {
                            Alert.alert('Error', 'Document information is missing.');
                            return;
                          }

                          try {
                            // Fetch signed URL before opening
                            const response = await apiService.getTripDocumentSignedUrl(trip._id, doc._id, 'inline');
                            if (response?.success && response?.data?.url) {
                              await Linking.openURL(response.data.url);
                            } else {
                              // Fallback to original URL
                              if (doc.fileUrl) {
                                await Linking.openURL(doc.fileUrl);
                              } else {
                                Alert.alert('Error', 'Unable to get document URL.');
                              }
                            }
                          } catch (error: any) {
                            console.error('Error opening document:', error);
                            // Fallback to original URL
                            if (doc.fileUrl) {
                              Linking.openURL(doc.fileUrl).catch(() => {
                                Alert.alert('Error', 'Unable to open document. Please try again.');
                              });
                            } else {
                              Alert.alert('Error', 'Unable to open document. Please try again.');
                            }
                          }
                        }}
                      >
                        <Ionicons name="document-text" size={20} color="#2563eb" />
                        <View style={styles.documentInfo}>
                          <Text style={styles.documentName} numberOfLines={1}>
                            {doc.fileName}
                          </Text>
                          {doc.description && (
                            <Text style={styles.documentDescription} numberOfLines={1}>
                              {doc.description}
                            </Text>
                          )}
                          <Text style={styles.documentMeta}>
                            {doc.fileSize ? formatFileSize(doc.fileSize) : 'Unknown size'}
                            {doc.uploadedAt && ` • ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                          </Text>
                        </View>
                        <Ionicons name="download-outline" size={20} color="#2563eb" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

        <View style={styles.buttonContainer}>
          {hasMap && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => {
                setSelectedTripForMap(trip);
                setMapModalVisible(true);
              }}
            >
              <Text style={styles.mapButtonText} numberOfLines={1}>View Map</Text>
            </TouchableOpacity>
          )}
          {trip.status === 'pending_completion' || trip.status === 'pending-completion' ? (
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: '#f59e0b', opacity: 0.7 }]}
              disabled={true}
            >
              <Text style={styles.completeButtonText} numberOfLines={1}>Pending Approval</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleCompleteTrip(trip._id)}
            >
              <Text style={styles.completeButtonText} numberOfLines={1}>Complete Trip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
          })}
        </ScrollView>
      )}

      {/* Trip Completion Modal */}
      <Modal
        visible={completionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setCompletionModalVisible(false);
          setSelectedTripForCompletion(null);
          setSelectedFile(null);
          setSelectedDocumentType('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Trip</Text>
              <TouchableOpacity
                onPress={() => {
                  setCompletionModalVisible(false);
                  setSelectedTripForCompletion(null);
                  setSelectedFile(null);
                  setSelectedDocumentType('');
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedTripForCompletion && (
              <ScrollView style={styles.modalScrollView}>
                <Text style={styles.modalSubtitle}>
                  Trip: {selectedTripForCompletion.tripNumber}
                </Text>
                <Text style={styles.modalDescription}>
                  Please upload required documents before completing the trip. The dispatcher will review your documents before final approval.
                </Text>

                {/* Check if Canada trip */}
                {(() => {
                  const trip = selectedTripForCompletion;
                  let isCanadaTrip = false;
                  if (trip.orders && trip.orders.length > 0) {
                    for (const order of trip.orders) {
                      const deliveryLocation = order.deliveryLocation;
                      if (deliveryLocation?.placeId?.country) {
                        const country = deliveryLocation.placeId.country.toLowerCase();
                        if (country === 'canada' || country === 'ca') {
                          isCanadaTrip = true;
                          break;
                        }
                      } else if (deliveryLocation?.place) {
                        const placeStr = deliveryLocation.place.toLowerCase();
                        if (placeStr.includes('canada') || placeStr.includes('ca ')) {
                          isCanadaTrip = true;
                          break;
                        }
                      }
                    }
                  }
                  
                  const documents = trip.documents || [];
                  const hasPOD = documents.some((doc: any) => 
                    doc.type === 'pod' || doc.type === 'proof_of_delivery'
                  );
                  const hasBorderManifest = documents.some((doc: any) => 
                    doc.type === 'stamped_manifest' || doc.type === 'manifest'
                  );

                  return (
                    <>
                      {/* POD Upload Section */}
                      <View style={styles.documentUploadSection}>
                        <View style={styles.documentHeader}>
                          <Text style={styles.documentTitle}>
                            Proof of Delivery (POD) *
                          </Text>
                          {hasPOD ? (
                            <View style={styles.statusBadge}>
                              <Ionicons name="checkmark-circle" size={16} color="#2ecc71" />
                              <Text style={styles.statusText}>Uploaded</Text>
                            </View>
                          ) : (
                            <Text style={styles.requiredText}>Required</Text>
                          )}
                        </View>
                        {!hasPOD && (
                          <>
                            <TouchableOpacity
                              style={styles.uploadButton}
                              onPress={() => handleSelectFile('pod')}
                              disabled={uploadingDocument}
                            >
                              <Ionicons name="cloud-upload-outline" size={20} color="#2563eb" />
                              <Text style={styles.uploadButtonText}>Select File</Text>
                            </TouchableOpacity>
                            {selectedFile && selectedDocumentType === 'pod' && (
                              <View style={styles.selectedFileContainer}>
                                <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                                <TouchableOpacity
                                  style={styles.uploadSubmitButton}
                                  onPress={() => handleUploadDocument(trip._id, 'pod')}
                                  disabled={uploadingDocument}
                                >
                                  {uploadingDocument ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.uploadSubmitText}>Upload</Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            )}
                          </>
                        )}
                        {hasPOD && (
                          <View style={styles.uploadedDocumentList}>
                            {documents
                              .filter((doc: any) => doc.type === 'pod' || doc.type === 'proof_of_delivery')
                              .map((doc: any, index: number) => (
                                <View key={doc._id || index} style={styles.uploadedDocumentItem}>
                                  <Ionicons name="document-text" size={20} color="#2ecc71" />
                                  <Text style={styles.uploadedDocumentName}>{doc.fileName}</Text>
                                </View>
                              ))}
                          </View>
                        )}
                      </View>

                      {/* Border Manifest Upload Section (for Canada trips) */}
                      {isCanadaTrip && (
                        <View style={styles.documentUploadSection}>
                          <View style={styles.documentHeader}>
                            <Text style={styles.documentTitle}>
                              Border Manifest *
                            </Text>
                            {hasBorderManifest ? (
                              <View style={styles.statusBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#2ecc71" />
                                <Text style={styles.statusText}>Uploaded</Text>
                              </View>
                            ) : (
                              <Text style={styles.requiredText}>Required</Text>
                            )}
                          </View>
                          {!hasBorderManifest && (
                            <>
                              <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={() => handleSelectFile('stamped_manifest')}
                                disabled={uploadingDocument}
                              >
                                <Ionicons name="cloud-upload-outline" size={20} color="#2563eb" />
                                <Text style={styles.uploadButtonText}>Select File</Text>
                              </TouchableOpacity>
                              {selectedFile && selectedDocumentType === 'stamped_manifest' && (
                                <View style={styles.selectedFileContainer}>
                                  <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                                  <TouchableOpacity
                                    style={styles.uploadSubmitButton}
                                    onPress={() => handleUploadDocument(trip._id, 'stamped_manifest')}
                                    disabled={uploadingDocument}
                                  >
                                    {uploadingDocument ? (
                                      <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                      <Text style={styles.uploadSubmitText}>Upload</Text>
                                    )}
                                  </TouchableOpacity>
                                </View>
                              )}
                            </>
                          )}
                          {hasBorderManifest && (
                            <View style={styles.uploadedDocumentList}>
                              {documents
                                .filter((doc: any) => doc.type === 'stamped_manifest' || doc.type === 'manifest')
                                .map((doc: any, index: number) => (
                                  <View key={doc._id || index} style={styles.uploadedDocumentItem}>
                                    <Ionicons name="document-text" size={20} color="#2ecc71" />
                                    <Text style={styles.uploadedDocumentName}>{doc.fileName}</Text>
                                  </View>
                                ))}
                            </View>
                          )}
                        </View>
                      )}

                      {/* All Uploaded Documents */}
                      {documents.length > 0 && (
                        <View style={styles.allDocumentsSection}>
                          <Text style={styles.allDocumentsTitle}>All Uploaded Documents</Text>
                          {documents.map((doc: any, index: number) => (
                            <TouchableOpacity
                              key={doc._id || index}
                              style={styles.documentItem}
                              onPress={async () => {
                                if (!doc._id || !trip._id) return;
                                try {
                                  const response = await apiService.getTripDocumentSignedUrl(trip._id, doc._id, 'inline');
                                  if (response?.success && response?.data?.url) {
                                    await Linking.openURL(response.data.url);
                                  } else if (doc.fileUrl) {
                                    await Linking.openURL(doc.fileUrl);
                                  }
                                } catch (error) {
                                  console.error('Error opening document:', error);
                                }
                              }}
                            >
                              <Ionicons name="document-text" size={20} color="#2563eb" />
                              <View style={styles.documentInfo}>
                                <Text style={styles.documentName}>{doc.fileName}</Text>
                                <Text style={styles.documentType}>{doc.type || 'Other'}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={20} color="#999" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Submit Button */}
                      <TouchableOpacity
                        style={[
                          styles.submitButton,
                          (!hasPOD || (isCanadaTrip && !hasBorderManifest)) && styles.submitButtonDisabled
                        ]}
                        onPress={handleSubmitCompletion}
                        disabled={!hasPOD || (isCanadaTrip && !hasBorderManifest)}
                      >
                        <Text style={styles.submitButtonText}>Submit for Review</Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
      {selectedTripForMap && (() => {
        const loadForMap = convertTripToLoadForMap(selectedTripForMap);
        if (!loadForMap) return null;
        
        return (
        <MapViewWithLiveTracking
          visible={mapModalVisible}
          onClose={() => {
            setMapModalVisible(false);
              setSelectedTripForMap(null);
          }}
            load={loadForMap}
        />
        );
      })()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  tripCard: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  tripNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  ordersSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  ordersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  orderItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  customerOrderNo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  locationValue: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  orderStatusRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  orderStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  orderStatusValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  chatButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 44,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  mapButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#2ecc71',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  documentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  documentInfo: {
    flex: 1,
    minWidth: 0,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 11,
    color: '#999',
  },
  // Completion Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  completionModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScrollView: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  documentUploadSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  selectedFileContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  selectedFileName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  uploadSubmitButton: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadSubmitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  uploadedDocumentList: {
    marginTop: 12,
  },
  uploadedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  uploadedDocumentName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  allDocumentsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  allDocumentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  documentType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2ecc71',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionDivider: {
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 8,
  },
  appointmentSection: {
    backgroundColor: '#f0f7ff',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  appointmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  stopsSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stopItem: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  stopNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 6,
  },
});

export default ActiveTrips;
