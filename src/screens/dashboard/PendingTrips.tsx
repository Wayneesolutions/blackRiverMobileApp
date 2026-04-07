import React, { useState, useCallback } from "react";
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
  Share,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { apiService } from '../../services/api/apiService';
import { logger } from '../../utils/loggerHelper';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PendingTripsRouteProp = RouteProp<RootStackParamList, 'PendingTrips'>;

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
    attachments?: Array<{
      id?: number;
      name: string;
      url: string;
      fileSize?: number;
      payable?: boolean;
      shareWithDriver?: boolean;
      uploadedAt?: string;
      uploadedBy?: any;
    }>;
  }>;
  plannedStartDate?: string;
  plannedEndDate?: string;
  notes?: string;
  driverAcceptanceStatus?: 'pending' | 'accepted' | 'rejected';
  driverRejectionReason?: string;
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

// ─── Tab type ────────────────────────────────────────────────────────────────
type TabType = 'requests' | 'accepted';

const PendingTrips = () => {
  const route = useRoute<PendingTripsRouteProp>();
  const lockedTab = route.params?.initialTab ?? null; // non-null = single-tab mode
  const [assignmentRequests, setAssignmentRequests] = useState<Trip[]>([]);
  const [acceptedTrips, setAcceptedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(lockedTab || 'requests');
  const navigation = useNavigation<NavigationProp>();

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [requestsRes, pendingRes] = await Promise.all([
        apiService.getAssignmentRequests(),
        apiService.getPendingTrips(),
      ]);

      if (requestsRes?.success) {
        const raw: any[] = requestsRes.data?.data || requestsRes.data || [];
        // Normalize standalone-order items so the card renderer works for both
        // Trip items and Order items. Order items have their details at the top
        // level; wrap them in orders:[self] so the existing renderer can show them.
        const normalized = (Array.isArray(raw) ? raw : []).map((item: any) => {
          if (item._isOrder) {
            return {
              ...item,
              orders: [item], // wrap self so order details render like a trip's orders
            };
          }
          return item;
        });
        setAssignmentRequests(normalized);
      } else {
        setAssignmentRequests([]);
      }

      if (pendingRes?.success) {
        const data = pendingRes.data?.data || pendingRes.data || [];
        setAcceptedTrips(Array.isArray(data) ? data : []);
      } else {
        setAcceptedTrips([]);
      }
    } catch (error) {
      console.error("❌ Error fetching trips:", error);
      setAssignmentRequests([]);
      setAcceptedTrips([]);
      Alert.alert('Error', 'Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-fetch every time the screen comes into focus, and re-sync the active tab
  // from route params (needed because React Navigation caches the screen instance)
  useFocusEffect(
    useCallback(() => {
      const tab = route.params?.initialTab ?? null;
      setActiveTab(tab || 'requests');
      fetchAll();
    }, [fetchAll, route.params?.initialTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const handleStartTrip = async (tripId: string) => {
    Alert.alert(
      'Start Trip',
      'Are you sure you want to start this trip? This will change all order statuses to in-delivery.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          style: 'default',
          onPress: async () => {
            try {
              const response = await apiService.startTrip(tripId);
              if (response.success) {
                Alert.alert('Success', 'Trip started successfully');
                fetchAll();
              } else {
                Alert.alert('Error', response.error || response.message || 'Failed to start trip');
              }
            } catch (error) {
              logger.error('Error starting trip', error);
              Alert.alert('Error', 'Failed to start trip. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAccept = async (item: Trip) => {
    Alert.alert(
      'Accept Assignment',
      `Accept ${(item as any)._isOrder ? 'order' : 'trip'} ${item.tripNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            try {
              const response = (item as any)._isOrder
                ? await apiService.acceptOrder(item._id)
                : await apiService.acceptTrip(item._id);
              if (response.success) {
                setAssignmentRequests(prev => prev.filter(t => t._id !== item._id));
                setAcceptedTrips(prev => [{ ...item, driverAcceptanceStatus: 'accepted' }, ...prev]);
                setActiveTab('accepted');
                Alert.alert('Accepted', 'You have accepted this assignment. The dispatcher has been notified.');
              } else {
                Alert.alert('Error', response.error || response.message || 'Failed to accept');
              }
            } catch (error) {
              logger.error('Error accepting assignment', error);
              Alert.alert('Error', 'Failed to accept. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleReject = (item: Trip) => {
    Alert.prompt(
      'Reject Assignment',
      'Please provide a reason (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason?: string) => {
            try {
              const response = (item as any)._isOrder
                ? await apiService.rejectOrder(item._id, reason)
                : await apiService.rejectTrip(item._id, reason);
              if (response.success) {
                setAssignmentRequests(prev => prev.filter(t => t._id !== item._id));
                Alert.alert(
                  'Rejected',
                  'You have rejected this assignment. The dispatcher has been notified and will assign another driver.'
                );
              } else {
                Alert.alert('Error', response.error || response.message || 'Failed to reject');
              }
            } catch (error) {
              logger.error('Error rejecting assignment', error);
              Alert.alert('Error', 'Failed to reject. Please try again.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayedTrips = activeTab === 'requests' ? assignmentRequests : acceptedTrips;


  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Bar — hidden when opened from dashboard with a locked tab */}
      {!lockedTab && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
            onPress={() => setActiveTab('requests')}
          >
            <Ionicons
              name="notifications-outline"
              size={16}
              color={activeTab === 'requests' ? '#2563eb' : '#9ca3af'}
            />
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
              Assignment Requests
            </Text>
            {assignmentRequests.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{assignmentRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'accepted' && styles.tabActive]}
            onPress={() => setActiveTab('accepted')}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={activeTab === 'accepted' ? '#2563eb' : '#9ca3af'}
            />
            <Text style={[styles.tabText, activeTab === 'accepted' && styles.tabTextActive]}>
              Accepted Trips
            </Text>
            {acceptedTrips.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: '#16a34a' }]}>
                <Text style={styles.tabBadgeText}>{acceptedTrips.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'requests' && assignmentRequests.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubtext}>New trip assignments will appear here.</Text>
          </View>
        )}
        {activeTab === 'accepted' && acceptedTrips.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No accepted trips</Text>
            <Text style={styles.emptySubtext}>Accept an assignment to see it here.</Text>
          </View>
        )}
        {displayedTrips.map((trip) => (
            <View key={trip._id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View>
                  <Text style={styles.tripNumber}>{trip.tripNumber}</Text>
                  <Text style={styles.tripDate}>
                    Start: {formatDate(trip.plannedStartDate)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
                  <Text style={styles.statusText}>{getStatusDisplay(trip.status)}</Text>
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
                      
                      {/* Documents from Order - Only show if shareWithDriver is true */}
                      {order.attachments && order.attachments.length > 0 && (() => {
                        const sharedDocuments = order.attachments.filter((att: any) => att.shareWithDriver === true);
                        if (sharedDocuments.length === 0) return null;
                        
                        return (
                          <View style={styles.documentsSection}>
                            <Text style={styles.documentsTitle}>
                              Documents ({sharedDocuments.length}):
                            </Text>
                            {sharedDocuments.map((doc: any, docIndex: number) => (
                              <TouchableOpacity
                                key={doc.id || docIndex}
                                style={styles.documentItem}
                                onPress={async () => {
                                  if (!doc.id || !order._id) {
                                    Alert.alert('Error', 'Document information is missing.');
                                    return;
                                  }

                                  try {
                                    // Fetch signed URL before opening
                                    const response = await apiService.getOrderAttachmentSignedUrl(order._id, doc.id.toString(), 'inline');
                                    if (response?.success && response?.data?.url) {
                                      await Linking.openURL(response.data.url);
                                    } else {
                                      // Fallback to original URL
                                      if (doc.url) {
                                        await Linking.openURL(doc.url);
                                      } else {
                                        Alert.alert('Error', 'Unable to get document URL.');
                                      }
                                    }
                                  } catch (error: any) {
                                    console.error('Error opening document:', error);
                                    // Fallback to original URL
                                    if (doc.url) {
                                      Linking.openURL(doc.url).catch(() => {
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
                                    {doc.name || 'Document'}
                                  </Text>
                                  <Text style={styles.documentMeta}>
                                    {doc.fileSize ? formatFileSize(doc.fileSize) : 'Unknown size'}
                                    {doc.uploadedAt && ` • ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                                  </Text>
                                </View>
                                <Ionicons name="download-outline" size={20} color="#2563eb" />
                              </TouchableOpacity>
                            ))}
                          </View>
                        );
                      })()}
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

              {/* Action area — depends on active tab */}
              {activeTab === 'requests' ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAccept(trip)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(trip)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#fff" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.acceptedBanner}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.acceptedBannerText}>You accepted this trip</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => handleStartTrip(trip._id)}
                  >
                    <Text style={styles.startButtonText}>Start Trip</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // ─── Tab Bar ───────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
  startButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    padding: 13,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    padding: 13,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  acceptedBannerText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  rejectedBannerText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

export default PendingTrips;
