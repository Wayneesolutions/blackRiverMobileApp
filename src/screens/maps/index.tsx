import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MapViewWithLiveTracking from '../../components/MapViewWithLiveTracking';
import { apiService } from '../../services/api/apiService';
import { logger } from '../../utils/loggerHelper';

interface LoadWaypoint {
  address?: {
    place?: string;
    city?: string;
    state?: string;
    latitude?: number | string;
    longitude?: number | string;
  };
  dropOff?: boolean;
  pickup?: boolean;
}

interface LoadLocation {
  place?: string;
  city?: string;
  state?: string;
  latitude?: number | string;
  longitude?: number | string;
}

interface Load {
  _id: string;
  internalId?: string;
  orderType?: string;
  status: string;
  route?: {
    multipleDropOffs?: boolean;
    selectPickup?: LoadLocation;
    selectDropOff?: LoadLocation;
    wayPoints?: LoadWaypoint[];
  };
  vehicle?: {
    _id: string;
    internalId: string;
    plateNumber?: string;
    make?: string;
    model?: string;
  };
  customer?: {
    name?: string;
    email?: string;
  };
  payloads?: Array<{
    itemName?: string;
    description?: string;
    measurementAndWeight?: {
      weight?: number;
    };
  }>;
  eta?: string;
  updatedAt?: string;
  notes?: string;
}

const parseCoordinate = (value: number | string | undefined | null): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasValidCoordinates = (load: Load): boolean => {
  const pickup = load.route?.selectPickup;
  const dropoff = load.route?.selectDropOff;

  const pickupLat = parseCoordinate(pickup?.latitude);
  const pickupLng = parseCoordinate(pickup?.longitude);
  const dropLat = parseCoordinate(dropoff?.latitude);
  const dropLng = parseCoordinate(dropoff?.longitude);

  return pickupLat !== null && pickupLng !== null && dropLat !== null && dropLng !== null;
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'in-delivery':
    case 'in transit':
    case 'started':
      return '#2563eb';
    case 'assigned':
    case 'pending':
      return '#f59e0b';
    case 'completed':
    case 'delivered':
      return '#16a34a';
    case 'cancelled':
      return '#dc2626';
    default:
      return '#4b5563';
  }
};

const LoadMapScreen: React.FC = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    fetchActiveLoads();
  }, []);

  const fetchActiveLoads = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      const response = await apiService.getActiveLoads();

      if (response.success && response.data) {
        const loadsData = Array.isArray(response.data.loads)
          ? response.data.loads
          : Array.isArray(response.data)
          ? response.data
          : [];

        setLoads(loadsData);

        if (loadsData.length > 0) {
          setSelectedLoad((current) => current ?? loadsData[0]);
        } else {
          setSelectedLoad(null);
          setMapVisible(false);
        }

        logger.info('Active loads fetched for LoadMap', { count: loadsData.length });
      } else {
        logger.warn('Failed to fetch active loads for LoadMap', { error: response.error });
        setLoads([]);
        setSelectedLoad(null);
        setMapVisible(false);
      }
    } catch (error) {
      logger.error('Error fetching active loads for LoadMap', error);
      setLoads([]);
      setSelectedLoad(null);
      setMapVisible(false);
      Alert.alert('Error', 'Failed to load active loads. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveLoads();
  };

  const handleViewOnMap = (load: Load) => {
    if (!hasValidCoordinates(load)) {
      Alert.alert(
        'Missing Location Data',
        'This load does not include valid pickup and drop-off coordinates. Please contact your dispatcher.'
      );
      return;
    }

    setSelectedLoad(load);
    setMapVisible(true);
  };

  const activeLoadsCount = useMemo(() => loads.length, [loads]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Load Map</Text>
            <Text style={styles.headerSubtitle}>Track your active assignments on the map</Text>
          </View>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{activeLoadsCount}</Text>
            <Text style={styles.counterLabel}>Active</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading active loads...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#8B5CF6']}
                tintColor="#8B5CF6"
              />
            }
          >
            {loads.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="map-outline" size={64} color="#cbd5f5" />
                <Text style={styles.emptyTitle}>No Active Loads</Text>
                <Text style={styles.emptySubtitle}>
                  You don’t have any active trips assigned yet. Pull down to refresh.
                </Text>
              </View>
            ) : (
              loads.map((load) => (
                <View key={load._id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.loadIdContainer}>
                      <Text style={styles.loadId}>{load.internalId || 'Unassigned ID'}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(load.status) },
                        ]}
                      >
                        <Text style={styles.statusText}>{load.status?.toUpperCase() || 'UNKNOWN'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.mapButton}
                      onPress={() => handleViewOnMap(load)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="map" size={18} color="#fff" />
                      <Text style={styles.mapButtonText}>View on Map</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.routeRow}>
                    <View style={styles.routeMarker}>
                      <View style={[styles.markerDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.markerLabel}>Pickup</Text>
                    </View>
                    <View style={styles.routeDetails}>
                      <Text style={styles.routeLocation}>
                        {load.route?.selectPickup?.place || 'Location not provided'}
                      </Text>
                      <Text style={styles.routeAddress}>
                        {load.route?.selectPickup?.city || '-'}
                        {load.route?.selectPickup?.state ? `, ${load.route?.selectPickup?.state}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeConnector} />

                  <View style={styles.routeRow}>
                    <View style={styles.routeMarker}>
                      <View style={[styles.markerDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.markerLabel}>Drop-off</Text>
                    </View>
                    <View style={styles.routeDetails}>
                      <Text style={styles.routeLocation}>
                        {load.route?.selectDropOff?.place || 'Location not provided'}
                      </Text>
                      <Text style={styles.routeAddress}>
                        {load.route?.selectDropOff?.city || '-'}
                        {load.route?.selectDropOff?.state ? `, ${load.route?.selectDropOff?.state}` : ''}
                      </Text>
                    </View>
                  </View>

                  {load.vehicle?.internalId && (
                    <View style={styles.metaRow}>
                      <Ionicons name="car-outline" size={16} color="#4B5563" />
                      <Text style={styles.metaLabel}>Vehicle</Text>
                      <Text style={styles.metaValue}>{load.vehicle.internalId}</Text>
                    </View>
                  )}

                  {load.customer?.name && (
                    <View style={styles.metaRow}>
                      <Ionicons name="business-outline" size={16} color="#4B5563" />
                      <Text style={styles.metaLabel}>Customer</Text>
                      <Text style={styles.metaValue}>{load.customer.name}</Text>
                    </View>
                  )}

                  {Array.isArray(load.payloads) && load.payloads.length > 0 && (
                    <View style={styles.metaRow}>
                      <Ionicons name="cube-outline" size={16} color="#4B5563" />
                      <Text style={styles.metaLabel}>Payload</Text>
                      <Text style={styles.metaValue}>
                        {load.payloads[0].itemName || 'Cargo'}
                        {load.payloads[0].measurementAndWeight?.weight
                          ? ` • ${load.payloads[0].measurementAndWeight.weight} lbs`
                          : ''}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {selectedLoad && (
        <MapViewWithLiveTracking
          visible={mapVisible}
          onClose={() => setMapVisible(false)}
          load={selectedLoad}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  counterBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  counterText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  counterLabel: {
    color: '#ede9fe',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  loadId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  mapButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeMarker: {
    width: 70,
    alignItems: 'center',
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  markerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeDetails: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  routeLocation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 13,
    color: '#6B7280',
  },
  routeConnector: {
    height: 20,
    marginLeft: 70,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  metaValue: {
    fontSize: 13,
    color: '#1F2937',
  },
});

export default LoadMapScreen;