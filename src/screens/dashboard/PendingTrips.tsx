import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { apiService } from '../../services/api/apiService';
import { logger } from '../../utils/loggerHelper';

interface Load {
  _id: string;
  internalId?: string;
  orderType?: string;
  status: string;
  route?: {
    multipleDropOffs?: boolean;
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
  payloads?: Array<{
    itemName?: string;
    description?: string;
    measurementAndWeight?: {
      weight?: number;
    };
  }>;
  customer?: {
    name?: string;
    email?: string;
  };
  notes?: string;
}

const PendingTrips = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPendingLoads();
  }, []);

  const fetchPendingLoads = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingLoads();
      
      if (response.success && response.data) {
        const loadsData = response.data.loads || response.data || [];
        setLoads(Array.isArray(loadsData) ? loadsData : []);
        logger.info('Pending loads fetched', { count: loadsData.length });
      } else {
        logger.warn('Failed to fetch pending loads', { error: response.error });
        setLoads([]);
      }
    } catch (error) {
      logger.error('Error fetching pending loads', error);
      setLoads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingLoads();
  };

  const handleStartLoad = async (loadId: string, currentStatus: string) => {
    Alert.alert(
      'Start Load',
      'Are you sure you want to start this load?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          style: 'default',
          onPress: async () => {
            try {
              // If status is "planned", first transition to "dispatched", then to "in-delivery"
              if (currentStatus === 'planned') {
                // First transition: planned → dispatched
                const dispatchedResponse = await apiService.updateLoadStatus(loadId, 'dispatched');
                if (!dispatchedResponse.success) {
                  Alert.alert('Error', dispatchedResponse.error || 'Failed to dispatch load');
                  return;
                }
                
                // Small delay to ensure backend processes the first transition
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              // Second transition: dispatched → in-delivery (or direct if already dispatched)
              const response = await apiService.updateLoadStatus(loadId, 'in-delivery');
              if (response.success) {
                Alert.alert('Success', 'Load started successfully');
                fetchPendingLoads(); // Refresh the list
              } else {
                Alert.alert('Error', response.error || 'Failed to start load');
              }
            } catch (error) {
              logger.error('Error starting load', error);
              Alert.alert('Error', 'Failed to start load. Please try again.');
            }
          },
        },
      ]
    );
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

  const getStatusDisplay = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'planned': return 'Planned';
      case 'dispatched': return 'Dispatched';
      default: return status || 'Pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "dispatched": return "#3498db";
      case "planned": return "#f39c12";
      default: return "#95a5a6";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Pending Loads</Text>
          <Text style={styles.headerSubtitle}>Loads waiting to be started</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{loads.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading pending loads...</Text>
        </View>
      ) : loads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No Pending Loads</Text>
          <Text style={styles.emptySubtext}>You don't have any pending loads at the moment</Text>
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
          {loads.map((load) => {
            const pickup = load.route?.selectPickup;
            const dropoff = load.route?.selectDropOff;
            const multipleDropOffs = load.route?.multipleDropOffs || false;
            const wayPoints = load.route?.wayPoints || [];
            
            // Format route text based on multipleDropOffs
            const formatRouteText = () => {
              const pickupText = formatAddress(pickup);
              
              if (multipleDropOffs && wayPoints.length > 0) {
                const waypointCount = wayPoints.length;
                const dropoffCount = wayPoints.filter(wp => wp.dropOff === true).length;
                return `${pickupText} → ${waypointCount} stop${waypointCount > 1 ? 's' : ''} (${dropoffCount} drop${dropoffCount > 1 ? 's' : ''})`;
              } else {
                return `${pickupText} → ${formatAddress(dropoff)}`;
              }
            };
            
            return (
              <View key={load._id} style={styles.loadCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerInfo}>
                    <Text style={styles.routeText}>
                      {formatRouteText()}
                    </Text>
                    {load.internalId && (
                      <Text style={styles.loadIdText}>Load ID: {load.internalId}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(load.status) }]}>
                    <Text style={styles.statusText}>{getStatusDisplay(load.status)}</Text>
                  </View>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailSection}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailIcon}>📦</Text>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailTitle}>{getLoadItemName(load)}</Text>
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

                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => handleStartLoad(load._id, load.status)}
                >
                  <Text style={styles.startButtonText}>Start Load</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default PendingTrips;

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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8
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
    alignItems: "center"
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff"
  },
  statLabel: {
    fontSize: 14,
    color: "#e8d8ff"
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
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  loadCard: {
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
  loadIdText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
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
    marginBottom: 16
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
  notesSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34495e",
    marginBottom: 4
  },
  notesText: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18
  },
  startButton: {
    backgroundColor: "#3498db",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center"
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  }
});
