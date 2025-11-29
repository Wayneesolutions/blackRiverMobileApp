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
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api/apiService';
import { logger } from '../../utils/loggerHelper';

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
      placeId?: {
        name?: string;
        currentLocation?: {
          address?: string;
        };
      };
    };
    deliveryLocation?: {
      place?: string;
      placeId?: {
        name?: string;
        currentLocation?: {
          address?: string;
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
  documents?: Array<{
    _id?: string;
    fileUrl: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    uploadedBy?: any;
    uploadedAt?: string;
    description?: string;
  }>;
}

const CompleteTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCompletedTrips();
  }, []);

  const fetchCompletedTrips = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCompletedTrips();
      
      if (response.success && response.data) {
        const tripsData = response.data.data || response.data || [];
        setTrips(Array.isArray(tripsData) ? tripsData : []);
        logger.info('Completed trips fetched', { count: tripsData.length });
      } else {
        logger.warn('Failed to fetch completed trips', { error: response.error });
        setTrips([]);
      }
    } catch (error) {
      logger.error('Error fetching completed trips', error);
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompletedTrips();
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

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading completed trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {trips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No completed trips</Text>
            <Text style={styles.emptySubtext}>You don't have any completed trips yet.</Text>
          </View>
        ) : (
          trips.map((trip) => (
            <View key={trip._id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View>
                  <Text style={styles.tripNumber}>{trip.tripNumber}</Text>
                  <Text style={styles.tripDate}>
                    Completed: {formatDate(trip.actualEndDate || trip.plannedEndDate)}
                    </Text>
                  </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Completed</Text>
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

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Started:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(trip.actualStartDate || trip.plannedStartDate)}
                </Text>
                    </View>

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
              </View>
          ))
        )}
        </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
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
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    backgroundColor: '#2ecc71',
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
});

export default CompleteTrips;
