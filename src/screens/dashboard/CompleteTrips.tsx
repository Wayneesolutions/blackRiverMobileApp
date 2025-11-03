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
} from "react-native";
import { apiService } from '../../services/api/apiService';
import { logger } from '../../utils/loggerHelper';

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
  }>;
  customer?: {
    name?: string;
    email?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

const CompleteTrips = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCompletedLoads();
  }, []);

  const fetchCompletedLoads = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCompletedLoads();
      
      if (response.success && response.data) {
        const loadsData = response.data.loads || response.data || [];
        setLoads(Array.isArray(loadsData) ? loadsData : []);
        logger.info('Completed loads fetched', { count: loadsData.length });
      } else {
        logger.warn('Failed to fetch completed loads', { error: response.error });
        setLoads([]);
      }
    } catch (error) {
      logger.error('Error fetching completed loads', error);
      setLoads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompletedLoads();
  };

  const formatAddress = (location: any) => {
    if (!location) return 'N/A';
    if (location.place) return location.place;
    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    }
    return location.city || location.state || 'Unknown Location';
  };

  const formatDate = (dateString?: string) => {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Completed Loads</Text>
          <Text style={styles.headerSubtitle}>View your delivery history</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{loads.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading completed loads...</Text>
        </View>
      ) : loads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>No Completed Loads</Text>
          <Text style={styles.emptySubtext}>You haven't completed any loads yet</Text>
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
            
            return (
              <View key={load._id} style={styles.loadCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerInfo}>
                    <Text style={styles.routeText}>
                      {formatAddress(pickup)} → {formatAddress(dropoff)}
                    </Text>
                    {load.internalId && (
                      <Text style={styles.loadIdText}>Load ID: {load.internalId}</Text>
                    )}
                  </View>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>✓ Completed</Text>
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

                {load.completedAt && (
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Completed on:</Text>
                    <Text style={styles.dateText}>{formatDate(load.completedAt)}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default CompleteTrips;

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
  completedBadge: {
    backgroundColor: "#2ecc71",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  completedText: {
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
  dateSection: {
    borderTopWidth: 1,
    borderTopColor: "#f1f2f6",
    paddingTop: 12,
    marginTop: 12
  },
  dateLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 4
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50"
  }
});
