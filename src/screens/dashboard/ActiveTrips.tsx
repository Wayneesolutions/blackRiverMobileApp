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
import { apiService } from '../../services/api/apiService';
import { logger } from '../../utils/loggerHelper';
import MapViewWithLiveTracking from '../../components/MapViewWithLiveTracking';

const { width } = Dimensions.get('window');

interface Load {
  _id: string;
  internalId?: string;
  orderType?: string;
  status: string;
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
  payloads?: Array<{
    itemName?: string;
    description?: string;
    measurementAndWeight?: {
      weight?: number;
    };
    itemImageUrl?: string;
  }>;
  customer?: {
    name?: string;
    email?: string;
  };
  vehicle?: {
    _id: string;
    internalId: string;
    plateNumber?: string;
    make?: string;
    model?: string;
  };
  notes?: string;
}

interface LoadCardProps {
  load: Load;
}

const ActiveTrips = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLoadForMap, setSelectedLoadForMap] = useState<Load | null>(null);

  useEffect(() => {
    fetchActiveLoads();
  }, []);

  const fetchActiveLoads = async () => {
    try {
      setLoading(true);
      const response = await apiService.getActiveLoads();
      
      if (response.success && response.data) {
        const loadsData = response.data.loads || response.data || [];
        setLoads(Array.isArray(loadsData) ? loadsData : []);
        logger.info('Active loads fetched', { count: loadsData.length });
      } else {
        logger.warn('Failed to fetch active loads', { error: response.error });
        setLoads([]);
      }
    } catch (error) {
      logger.error('Error fetching active loads', error);
      setLoads([]);
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

  const handleCompleteLoad = async (loadId: string) => {
    Alert.alert(
      'Complete Load',
      'Are you sure you want to mark this load as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            try {
              const response = await apiService.updateLoadStatus(loadId, 'completed');
              if (response.success) {
                Alert.alert('Success', 'Load marked as completed');
                fetchActiveLoads(); // Refresh the list
              } else {
                Alert.alert('Error', response.error || 'Failed to update load status');
              }
            } catch (error) {
              logger.error('Error completing load', error);
              Alert.alert('Error', 'Failed to complete load. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "in-delivery": return "#27ae60";
      case "completed": return "#2ecc71";
      case "dispatched": return "#3498db";
      case "planned": return "#95a5a6";
      default: return "#95a5a6";
    }
  };

  const formatAddress = (location: any) => {
    if (!location) return 'N/A';
    if (location.place) return location.place;
    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    }
    return location.city || location.state || 'Unknown Location';
  };

  const getLoadWeight = (load: Load) => {
    if (load.payloads && load.payloads.length > 0) {
      const totalWeight = load.payloads.reduce((sum, payload) => {
        return sum + (payload.measurementAndWeight?.weight || 0);
      }, 0);
      return totalWeight > 0 ? `${totalWeight.toLocaleString()} lbs` : 'N/A';
    }
    return 'N/A';
  };

  const getLoadItemName = (load: Load) => {
    if (load.payloads && load.payloads.length > 0) {
      return load.payloads[0].itemName || 'Cargo';
    }
    return 'Cargo';
  };


  const LoadCard: React.FC<LoadCardProps> = ({ load }) => {
    const pickup = load.route?.selectPickup;
    const dropoff = load.route?.selectDropOff;
    
    return (
      <View style={styles.tripCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerInfo}>
            <Text style={styles.routeText}>
              {formatAddress(pickup)} → {formatAddress(dropoff)}
            </Text>
            {load.internalId && (
              <Text style={styles.loadIdText}>Load ID: {load.internalId}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(load.status) }]}>
            <Text style={styles.statusText}>{load.status || 'Active'}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailSection}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📦</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>{getLoadItemName(load)}</Text>
                {load.internalId && (
                  <Text style={styles.detailSubtext}>Load ID: {load.internalId}</Text>
                )}
                <Text style={styles.detailSubtext}>Weight: {getLoadWeight(load)}</Text>
              </View>
            </View>

            {load.customer && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>👤</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>{load.customer.name || 'Customer'}</Text>
                  {load.customer.email && (
                    <Text style={styles.detailSubtext}>{load.customer.email}</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📍</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>Pickup</Text>
                <Text style={styles.detailSubtext}>{formatAddress(pickup)}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🎯</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>Drop-off</Text>
                <Text style={styles.detailSubtext}>{formatAddress(dropoff)}</Text>
              </View>
            </View>
          </View>
        </View>

        {load.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{load.notes}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (load.route?.selectPickup?.latitude && load.route?.selectDropOff?.latitude) {
                setSelectedLoadForMap(load);
                setMapModalVisible(true);
              } else {
                Alert.alert('Route Information', 'Route coordinates are not available for this load.');
              }
            }}
          >
            <Text style={styles.primaryButtonText}>View Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleCompleteLoad(load._id)}
          >
            <Text style={styles.completeButtonText}>Complete Load</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>

            <Text style={styles.headerTitle}>Active Trips</Text>
          </View>
          <Text style={styles.headerSubtitle}>Monitor your ongoing shipments in real-time</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#27ae60' }]} />
              <Text style={styles.statText}>{loads.length} Active Loads</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#3498db' }]} />
              <Text style={styles.statText}>Real-time Tracking</Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading active loads...</Text>
        </View>
      ) : loads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚛</Text>
          <Text style={styles.emptyText}>No Active Loads</Text>
          <Text style={styles.emptySubtext}>You don't have any active loads at the moment</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B5CF6']}
              tintColor="#8B5CF6"
            />
          }
        >
          {loads.map(load => (
            <LoadCard
              key={load._id}
              load={load}
            />
          ))}
        </ScrollView>
      )}

      {/* Map Modal */}
      {selectedLoadForMap && (
        <MapViewWithLiveTracking
          visible={mapModalVisible}
          onClose={() => {
            setMapModalVisible(false);
            setSelectedLoadForMap(null);
          }}
          load={selectedLoadForMap}
        />
      )}
    </SafeAreaView>
  );
};

export default ActiveTrips;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa"
  },
  header: {
    backgroundColor: "#8B5CF6",
    paddingBottom: 20
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 20
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff"
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#e8d8ff",
    marginBottom: 16
  },
  statsContainer: {
    flexDirection: "row",
    gap: 24
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  statText: {
    fontSize: 14,
    color: "#e8d8ff"
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  tripCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f1f2f6"
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20
  },
  headerInfo: {
    flex: 1,
    marginRight: 12
  },
  routeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 6
  },
  currentLocationContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6
  },
  currentLocationText: {
    fontSize: 14,
    color: "#7f8c8d"
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff"
  },
  detailsGrid: {
    flexDirection: "row",
    marginBottom: 20
  },
  detailSection: {
    flex: 1,
    gap: 16
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2
  },
  detailContent: {
    flex: 1
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 2
  },
  detailSubtext: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18
  },
  progressSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34495e"
  },
  progressMiles: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50"
  },
  progressBar: {
    height: 8,
    backgroundColor: "#ecf0f1",
    borderRadius: 4,
    marginBottom: 8
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: 4
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3498db",
    textAlign: "center"
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#3498db",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  },
  completeButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 100
  },
  completeButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#f1f2f6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#2c3e50",
    fontSize: 14,
    fontWeight: "700"
  },
  mapContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginTop: 20
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  mapIcon: {
    fontSize: 20,
    marginRight: 8
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50"
  },
  routeContainer: {
    paddingLeft: 8
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12
  },
  routeInfo: {
    flex: 1,
    marginBottom: 8
  },
  routeLocationText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 2
  },
  routeAddressText: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#ddd",
    marginLeft: 5,
    marginVertical: 4
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
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
    fontSize: 20,
    fontWeight: 'bold',
    color: "#2c3e50",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: 'center',
  },
  loadIdText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
  },
  notesSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34495e",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18,
  },
});