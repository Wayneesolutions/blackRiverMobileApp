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
  Linking,
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
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  notes?: string;
  documents?: Array<{
    _id: string;
    documentUrl: string;
  }>;
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

  const getDocumentName = (url: string) => {
    try {
      // Handle both forward slashes and backslashes
      const normalizedUrl = url.replace(/\\/g, '/');
      const parts = normalizedUrl.split('/');
      const fileName = parts[parts.length - 1];
      
      // Remove timestamp prefix (e.g., "1762586107913-")
      const match = fileName.match(/^\d+-(.+)$/);
      return match ? decodeURIComponent(match[1]) : decodeURIComponent(fileName);
    } catch (error) {
      console.error('Error parsing document name:', error);
      return 'Document';
    }
  };

  const getDocumentIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'txt': return '📃';
      case 'zip':
      case 'rar': return '📦';
      default: return '📎';
    }
  };

  const normalizeDocumentUrl = (url: string) => {
    try {
      // Replace backslashes with forward slashes
      let normalizedUrl = url.replace(/\\/g, '/');
      
      // If it's a localhost URL, you need to replace it with your actual server URL
      // For development, you might use your computer's IP address
      // For production, use your production server URL
      
      // Example replacements (uncomment and modify as needed):
      // normalizedUrl = normalizedUrl.replace('http://localhost:3000', 'http://192.168.1.100:3000');
      // normalizedUrl = normalizedUrl.replace('http://localhost:3000', 'https://your-production-server.com');
      
      return normalizedUrl;
    } catch (error) {
      console.error('Error normalizing URL:', error);
      return url;
    }
  };

  const handleDocumentPress = async (documentUrl: string, documentName: string) => {
    const normalizedUrl = normalizeDocumentUrl(documentUrl);
    
    Alert.alert(
      'Document',
      documentName,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: async () => {
            try {
              console.log('Opening document:', normalizedUrl);
              
              const supported = await Linking.canOpenURL(normalizedUrl);
              
              if (supported) {
                await Linking.openURL(normalizedUrl);
              } else {
                Alert.alert(
                  'Cannot Open Document',
                  'Unable to open this document. The URL format may not be supported.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error opening document:', error);
              Alert.alert(
                'Error',
                'Failed to open document. Please check your network connection.',
                [{ text: 'OK' }]
              );
            }
          },
        },
        {
          text: 'Copy URL',
          onPress: () => {
            // You can implement clipboard copy here if needed
            console.log('URL to copy:', normalizedUrl);
            Alert.alert('Info', 'URL: ' + normalizedUrl);
          },
        },
      ]
    );
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

                {load.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{load.notes}</Text>
                  </View>
                )}

                {load.documents && load.documents.length > 0 && (
                  <View style={styles.documentsSection}>
                    <View style={styles.documentsSectionHeader}>
                      <Text style={styles.documentsLabel}>📋 Documents</Text>
                      <View style={styles.documentsBadge}>
                        <Text style={styles.documentsBadgeText}>{load.documents.length}</Text>
                      </View>
                    </View>
                    <View style={styles.documentsGrid}>
                      {load.documents.map((doc) => {
                        const docName = getDocumentName(doc.documentUrl);
                        return (
                          <TouchableOpacity
                            key={doc._id}
                            style={styles.documentCard}
                            onPress={() => handleDocumentPress(doc.documentUrl, docName)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.documentIcon}>
                              {getDocumentIcon(docName)}
                            </Text>
                            <Text style={styles.documentName} numberOfLines={2}>
                              {docName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

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
  documentsSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef"
  },
  documentsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  documentsLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2c3e50"
  },
  documentsBadge: {
    backgroundColor: "#2ecc71",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: "center"
  },
  documentsBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff"
  },
  documentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  documentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    width: "48%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dee2e6",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  documentIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  documentName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
    textAlign: "center",
    lineHeight: 16
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