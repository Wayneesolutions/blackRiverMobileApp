// src/screens/notifications/index.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock notification data
const mockNotifications = [
    {
        id: '1',
        type: 'task_assigned',
        title: 'New Trip Assigned',
        message: 'Trip #TR001 from Los Angeles to San Francisco has been assigned to you.',
        timestamp: '2 hours ago',
        isRead: false,
        priority: 'high',
        icon: 'car-outline',
        color: '#906AD1'
    },
    {
        id: '2',
        type: 'maintenance',
        title: 'Vehicle Maintenance Due',
        message: 'Vehicle #VH-2024 requires scheduled maintenance within 500 miles.',
        timestamp: '4 hours ago',
        isRead: false,
        priority: 'medium',
        icon: 'build-outline',
        color: '#F59E0B'
    },
    {
        id: '3',
        type: 'fuel',
        title: 'Low Fuel Alert',
        message: 'Vehicle #VH-2024 fuel level is below 25%. Consider refueling soon.',
        timestamp: '6 hours ago',
        isRead: true,
        priority: 'high',
        icon: 'flame-outline',
        color: '#EF4444'
    },
    {
        id: '4',
        type: 'document',
        title: 'Document Expiring',
        message: 'Your commercial driving license expires in 30 days.',
        timestamp: '1 day ago',
        isRead: true,
        priority: 'medium',
        icon: 'document-text-outline',
        color: '#10B981'
    },
    {
        id: '5',
        type: 'system',
        title: 'System Update',
        message: 'FleetGo app has been updated with new features and improvements.',
        timestamp: '2 days ago',
        isRead: true,
        priority: 'low',
        icon: 'information-circle-outline',
        color: '#6366F1'
    },
    {
        id: '6',
        type: 'hos',
        title: 'HOS Violation Warning',
        message: 'You are approaching your daily driving limit. 2 hours remaining.',
        timestamp: '3 days ago',
        isRead: true,
        priority: 'high',
        icon: 'time-outline',
        color: '#EF4444'
    }
];

export default function NotificationsScreen({ }) {
    const navigation = useNavigation<NavigationProp>();
    const [notifications, setNotifications] = useState(mockNotifications);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // all, unread, high

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Refresh notifications
    const onRefresh = async () => {
        setRefreshing(true);
        // Simulate API call
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    };

    // Mark notification as read
    const markAsRead = (id: any) => {
        setNotifications(prev =>
            prev.map(notification =>
                notification.id === id
                    ? { ...notification, isRead: true }
                    : notification
            )
        );
    };

    // Mark all as read
    const markAllAsRead = () => {
        Alert.alert(
            'Mark All as Read',
            'Are you sure you want to mark all notifications as read?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark All',
                    onPress: () => {
                        setNotifications(prev =>
                            prev.map(notification => ({ ...notification, isRead: true }))
                        );
                    }
                }
            ]
        );
    };

    // Delete notification
    const deleteNotification = (id: any) => {
        Alert.alert(
            'Delete Notification',
            'Are you sure you want to delete this notification?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setNotifications(prev => prev.filter(n => n.id !== id));
                    }
                }
            ]
        );
    };

    // Filter notifications
    const getFilteredNotifications = () => {
        switch (filter) {
            case 'unread':
                return notifications.filter(n => !n.isRead);
            case 'high':
                return notifications.filter(n => n.priority === 'high');
            default:
                return notifications;
        }
    };

    // Render notification item
    const renderNotificationItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                !item.isRead && styles.unreadNotification
            ]}
            onPress={() => markAsRead(item.id)}
            onLongPress={() => deleteNotification(item.id)}
        >
            <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                        <Ionicons name={item.icon} size={20} color={item.color} />
                    </View>
                    <View style={styles.notificationText}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.notificationTitle, !item.isRead && styles.unreadTitle]}>
                                {item.title}
                            </Text>
                            {!item.isRead && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.notificationMessage}>{item.message}</Text>
                        <Text style={styles.timestamp}>{item.timestamp}</Text>
                    </View>
                </View>
                {item.priority === 'high' && (
                    <View style={styles.priorityBadge}>
                        <Text style={styles.priorityText}>High</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const filteredNotifications = getFilteredNotifications();

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={filteredNotifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={
                    <>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Notifications</Text>
                            {unreadCount > 0 && (
                                <TouchableOpacity onPress={markAllAsRead}>
                                    <Text style={styles.markAllButton}>Mark All Read</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Filter Tabs */}
                        <View style={styles.filterContainer}>
                            <TouchableOpacity
                                style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
                                onPress={() => setFilter('all')}
                            >
                                <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
                                    All ({notifications.length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
                                onPress={() => setFilter('unread')}
                            >
                                <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
                                    Unread ({unreadCount})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterTab, filter === 'high' && styles.activeFilterTab]}
                                onPress={() => setFilter('high')}
                            >
                                <Text style={[styles.filterText, filter === 'high' && styles.activeFilterText]}>
                                    Priority
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
                        <Text style={styles.emptyTitle}>No Notifications</Text>
                        <Text style={styles.emptySubtitle}>
                            {filter === 'unread'
                                ? "You're all caught up!"
                                : "New notifications will appear here"}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40, // Add padding to account for footer
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },

    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
        textAlign: 'left',
        marginRight: 40, // Offset for back button
    },
    markAllButton: {
        fontSize: 14,
        color: '#906AD1',
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 12,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    activeFilterTab: {
        backgroundColor: '#906AD1',
    },
    filterText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    activeFilterText: {
        color: '#fff',
    },
    listContainer: {
        padding: 16,
    },
    notificationItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    unreadNotification: {
        borderLeftWidth: 4,
        borderLeftColor: '#906AD1',
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationText: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    unreadTitle: {
        color: '#111827',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#906AD1',
        marginLeft: 8,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 8,
    },
    timestamp: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    priorityBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityText: {
        fontSize: 10,
        color: '#DC2626',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
});