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
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { apiService } from '../../services/api/apiService';
import { logger } from '../../utils/loggerHelper';
import MapViewWithLiveTracking from '../../components/MapViewWithLiveTracking';

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
    pickupDate?: string;
    deliveryDate?: string;
  }>;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  notes?: string;
}

// Helper to convert trip to load-like structure for MapViewWithLiveTracking
const convertTripToLoadForMap = (trip: Trip) => {
  if (!trip.orders || trip.orders.length === 0) {
    return null;
  }

  // Get first order's pickup and last order's delivery
  const firstOrder = trip.orders[0];
  const lastOrder = trip.orders[trip.orders.length - 1];

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

  const pickup = firstOrder.pickupLocation;
  const dropoff = lastOrder.deliveryLocation;
  const pickupCoords = getLocationCoords(pickup);
  const dropoffCoords = getLocationCoords(dropoff);

  // Create waypoints for all orders (pickups and deliveries)
  const wayPoints: Array<{
    address: {
      place: string;
      latitude: number | string | null;
      longitude: number | string | null;
    };
    pickup?: boolean;
    dropOff?: boolean;
  }> = [];

  trip.orders.forEach((order, index) => {
    const pickupLoc = order.pickupLocation;
    const deliveryLoc = order.deliveryLocation;
    const pickupCoords = getLocationCoords(pickupLoc);
    const deliveryCoords = getLocationCoords(deliveryLoc);

    if (pickupCoords.lat !== null && pickupCoords.lng !== null) {
      wayPoints.push({
        address: {
          place: pickupLoc?.place || pickupLoc?.placeId?.name || `Pickup ${index + 1}`,
          latitude: pickupCoords.lat,
          longitude: pickupCoords.lng,
        },
        pickup: true,
      });
    }

    if (deliveryCoords.lat !== null && deliveryCoords.lng !== null) {
      wayPoints.push({
        address: {
          place: deliveryLoc?.place || deliveryLoc?.placeId?.name || `Delivery ${index + 1}`,
          latitude: deliveryCoords.lat,
          longitude: deliveryCoords.lng,
        },
        dropOff: true,
      });
    }
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
        wayPoints: wayPoints.filter(wp => wp.address.latitude !== null && wp.address.longitude !== null).map(wp => ({
          address: {
            place: wp.address.place,
            latitude: wp.address.latitude !== null ? wp.address.latitude : undefined,
            longitude: wp.address.longitude !== null ? wp.address.longitude : undefined,
          },
          pickup: wp.pickup,
          dropOff: wp.dropOff,
        })),
      },
    vehicle: trip.truck ? {
      _id: trip.truck._id,
      internalId: trip.truck.internalId || trip.truck.plateNumber || '',
      plateNumber: trip.truck.plateNumber,
    } : undefined,
  };
};

const ActiveTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedTripForMap, setSelectedTripForMap] = useState<Trip | null>(null);
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
    Alert.alert(
      'Complete Trip',
      'Are you sure you want to mark this trip as completed? This will mark all orders as completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            try {
              const response = await apiService.completeTrip(tripId);
              if (response.success) {
                Alert.alert(
                  'Success',
                  'Trip marked as completed',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.navigate('MainTabs', { screen: 'Dashboard' });
                      },
                    },
                  ]
                );
                fetchActiveTrips();
              } else {
                Alert.alert('Error', response.error || response.message || 'Failed to complete trip');
              }
            } catch (error) {
              logger.error('Error completing trip', error);
              Alert.alert('Error', 'Failed to complete trip. Please try again.');
            }
          },
        },
      ]
    );
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "in-progress": return "#27ae60";
      case "in-delivery": return "#3498db";
      case "completed": return "#2ecc71";
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
                    <Text style={styles.statusText}>{trip.status || 'Active'}</Text>
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
                        <View style={styles.locationRow}>
                          <Text style={styles.locationLabel}>Pickup: </Text>
                          <Text style={styles.locationValue}>
                            {formatAddress(order.pickupLocation)}
                          </Text>
                        </View>
                        <View style={styles.locationRow}>
                          <Text style={styles.locationLabel}>Delivery: </Text>
                          <Text style={styles.locationValue}>
                            {formatAddress(order.deliveryLocation)}
                          </Text>
                        </View>
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

                <View style={styles.buttonContainer}>
                  {hasMap && (
                    <TouchableOpacity
                      style={styles.mapButton}
                      onPress={() => {
                        setSelectedTripForMap(trip);
                        setMapModalVisible(true);
                      }}
                    >
                      <Text style={styles.mapButtonText}>View Map</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleCompleteTrip(trip._id)}
                  >
                    <Text style={styles.completeButtonText}>Complete Trip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

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
  mapButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#2ecc71',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ActiveTrips;
