import React, { useState, useEffect } from "react";
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons"
// Asset imports - using require for better compatibility with Expo Go
const activeTrip = require("../../../assets/icons/active trip.png");
const completeTrip = require("../../../assets/icons/complete trip.png");
const pendingTrip = require("../../../assets/icons/pending trip.png");

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { apiService } from '../../services/api/apiService';
import { authManager } from '../../types/AuthManager';
import { logger } from '../../utils/loggerHelper';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");

interface DriverProfile {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    profileImageUrl?: string;
    status?: string;
    details?: {
        internalId?: string;
        licenceNumber?: string;
    };
}

interface LoadStats {
    active: number;
    pending: number;
    completed: number;
    totalMiles: number;
}

export default function DashboardScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const [showAllWishList, setShowAllWishList] = useState(false);
    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const [stats, setStats] = useState<LoadStats>({
        active: 0,
        pending: 0,
        completed: 0,
        totalMiles: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const wishListItems = [
        // { id: 1, name: "Vehicle", icon: <Ionicons name="car-sport" size={28} color="#fff" />, color: "#906AD1", route: "Vehicle" },
        // { id: 2, name: "Trailer", icon: <FontAwesome5 name="truck-moving" size={28} color="#fff" />, color: "#FF9797", route: "Trailer" },
        // { id: 3, name: "HOS", icon: <MaterialIcons name="schedule" size={28} color="#fff" />, color: "#FFCC00", route: "HOS" },
        // { id: 4, name: "Asset Inspection", icon: <MaterialIcons name="report-problem" size={28} color="#fff" />, color: "#D74848", route: "AssetIncidents" },
        { id: 1, name: "Chat", icon: <Ionicons name="chatbubbles" size={28} color="#fff" />, color: "#00C2A6", route: "DriverChat" },
        { id: 2, name: "Settings", icon: <Ionicons name="settings" size={28} color="#fff" />, color: "#2CDBFA", route: "Settings" },
        { id: 3, name: "Load Map", icon: <Ionicons name="map" size={28} color="#fff" />, color: "#831775", route: "LoadMap" },
        { id: 4, name: "Verification", icon: <Ionicons name="shield-checkmark" size={28} color="#fff" />, color: "#0ea3d8", route: "OnboardingGuard" },
        { id: 5, name: "ELD Documents", icon: <Ionicons name="document-text" size={28} color="#fff" />, color: "#8B5CF6", route: "ELDDocuments" },
        // { id: 8, name: "Transfer", icon: <Ionicons name="swap-horizontal" size={28} color="#fff" />, color: "#E61DCC", route: "Transfer" },
        // { id: 9, name: "Fuel", icon: <FontAwesome5 name="gas-pump" size={28} color="#fff" />, color: "#04AA30", route: "Fuel" },
    ];

    // Fetch driver profile and statistics on mount
    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Track last refresh time to avoid duplicate calls
    const lastRefreshRef = React.useRef<number>(0);
    const REFRESH_DEBOUNCE_MS = 500; // Minimum time between refreshes

    const refreshDashboardIfNeeded = React.useCallback(() => {
        const now = Date.now();
        if (now - lastRefreshRef.current > REFRESH_DEBOUNCE_MS) {
            lastRefreshRef.current = now;
            logger.info('Dashboard refresh triggered');
            fetchDashboardData();
        } else {
            logger.info('Dashboard refresh skipped (too soon since last refresh)');
        }
    }, []);

    // Refresh dashboard data when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            refreshDashboardIfNeeded();
        }, [refreshDashboardIfNeeded])
    );

    // Also listen for navigation focus events as a backup to ensure refresh
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // Small delay to ensure any navigation transitions are complete
            setTimeout(() => {
                refreshDashboardIfNeeded();
            }, 200);
        });

        return unsubscribe;
    }, [navigation, refreshDashboardIfNeeded]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Fetch profile and trips in parallel
            const [profileRes, activeRes, pendingRes, completedRes] = await Promise.allSettled([
                apiService.getProfile(),
                apiService.getActiveTrips(),
                apiService.getPendingTrips(),
                apiService.getCompletedTrips(),
            ]);

            // Update profile
            if (profileRes.status === 'fulfilled' && profileRes.value.success && profileRes.value.data) {
                const driverData = profileRes.value.data;
                setProfile(driverData);
                
                // Also update authManager with latest profile
                const currentUser = authManager.getCurrentUser();
                if (currentUser) {
                    await authManager.updateUserData({
                        name: driverData.name || currentUser.name,
                        email: driverData.email || currentUser.email,
                    });
                }
            } else {
                // Fallback to authManager data
                const currentUser = authManager.getCurrentUser();
                if (currentUser) {
                    setProfile({
                        _id: currentUser.id,
                        name: currentUser.name,
                        email: currentUser.email,
                    });
                }
            }

            // Update statistics
            const newStats: LoadStats = {
                active: activeRes.status === 'fulfilled' && activeRes.value.success 
                    ? activeRes.value.data?.count || activeRes.value.data?.data?.length || 0 
                    : 0,
                pending: pendingRes.status === 'fulfilled' && pendingRes.value.success 
                    ? pendingRes.value.data?.count || pendingRes.value.data?.data?.length || 0 
                    : 0,
                completed: completedRes.status === 'fulfilled' && completedRes.value.success 
                    ? completedRes.value.data?.count || completedRes.value.data?.data?.length || 0 
                    : 0,
                totalMiles: 0, // Calculate from completed trips if needed
            };
            setStats(newStats);

            logger.info('Dashboard data loaded', {
                hasProfile: !!profile,
                stats: newStats
            });

        } catch (error) {
            logger.error('Failed to fetch dashboard data', error);
            // Use cached data from authManager as fallback
            const currentUser = authManager.getCurrentUser();
            if (currentUser) {
                setProfile({
                    _id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const handleWishItemPress = (item: any) => {
        if (item.route) {
            navigation.navigate(item.route);
        }
        // You can add other navigation logic here for other items
        // Example:
        // switch (item.name) {
        //     case "Trailer":
        //         navigation.navigate("Trailer");
        //         break;
        //     case "Settings":
        //         navigation.navigate("Settings");
        //         break;
        //     // Add more cases as needed
        // }
    };

    const renderWishItem = (item: any, isGrid: boolean = false) => (
        <TouchableOpacity
            key={item.id}
            style={[
                styles.wishItem,
                { backgroundColor: item.color },
                isGrid && styles.wishItemGrid
            ]}
            onPress={() => handleWishItemPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.iconWrapper}>
                {item.icon}
            </View>
            <Text 
                style={[
                    styles.wishText,
                    isGrid && styles.wishTextGrid
                ]}
                numberOfLines={2}
            >
                {item.name}
            </Text>
        </TouchableOpacity>
    );


    const renderHorizontalWishList = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
            bounces={false}
        >
            {wishListItems.map((item) => renderWishItem(item, false))}
        </ScrollView>
    );

    const renderGridWishList = () => {
        const itemsPerRow = 3;
        const rows = [];
        
        for (let i = 0; i < wishListItems.length; i += itemsPerRow) {
            const rowItems = wishListItems.slice(i, i + itemsPerRow);
            rows.push(
                <View key={i} style={styles.wishGrid}>
                    {rowItems.map((item) => renderWishItem(item, true))}
                    {/* Add empty spaces if row has less than 3 items */}
                    {rowItems.length < itemsPerRow && 
                        Array.from({ length: itemsPerRow - rowItems.length }).map((_, idx) => (
                            <View key={`empty-${idx}`} style={styles.wishItemGrid} />
                        ))
                    }
        </View>
    );
        }
        
        return <View style={styles.wishGridContainer}>{rows}</View>;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#8B5CF6']}
                        tintColor="#8B5CF6"
                    />
                }
            >
                <View style={styles.content}>
                    {loading && !profile ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#8B5CF6" />
                            <Text style={styles.loadingText}>Loading dashboard...</Text>
                        </View>
                    ) : (
                        <>
                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.profileContent}>
                            <View style={styles.profileInfo}>
                                <Text style={styles.driverLabel}>Driver</Text>
                                <View style={styles.nameRow}>
                                            <Text style={styles.driverName}>
                                                {profile?.name || authManager.getCurrentUser()?.name || 'Driver'}
                                            </Text>
                                    <View style={styles.statusBadge}>
                                                <Text style={styles.statusText}>
                                                    {profile?.status || 'Active'}
                                                </Text>
                                    </View>
                                </View>
                                        {profile?.details?.internalId && (
                                            <Text style={styles.internalIdLabel}>
                                                ID: {profile.details.internalId}
                                            </Text>
                                        )}
                                        <Text style={styles.tripLabel}>Total Trips</Text>
                                        <Text style={styles.miles}>
                                            {stats.active + stats.pending + stats.completed} Loads
                                        </Text>
                            </View>
                                    {profile?.profileImageUrl ? (
                            <Image
                                            source={{ uri: profile.profileImageUrl }}
                                style={styles.avatar}
                            />
                                    ) : (
                                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                            <Ionicons name="person" size={40} color="#fff" />
                                        </View>
                                    )}
                        </View>
                    </View>
                        </>
                    )}

                    {/* Daily Task Report */}
                    <View style={styles.section}>
                        {/* <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Daily task report</Text>
                            <TouchableOpacity onPress={() => navigation.navigate("NewTrip")}>
                                <Text style={styles.linkText}>+ New Trip</Text>
                            </TouchableOpacity>
                        </View> */}

                        <View style={styles.taskContainer}>
                            <TouchableOpacity
                                style={styles.taskCard}
                                onPress={() => navigation.navigate("ActiveTrips")}
                            >
                                <View style={styles.taskIconContainer}>
                                    <Image source={activeTrip} style={styles.taskIcon} />
                                </View>
                                <View style={styles.taskContent}>
                                    <Text style={styles.taskText}>Active Trips</Text>
                                    <Text style={styles.taskCount}>{stats.active}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.taskCard}
                                onPress={() => navigation.navigate("CompleteTrips")}
                            >
                                <View style={[styles.taskIconContainer, { backgroundColor: "#FF6B6B" }]}>
                                    <Image source={completeTrip} style={styles.taskIcon} />
                                </View>
                                <View style={styles.taskContent}>
                                    <Text style={styles.taskText}>Completed Trips</Text>
                                    <Text style={styles.taskCount}>{stats.completed}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.taskCard}
                                onPress={() => navigation.navigate("PendingTrips")}
                            >
                                <View style={[styles.taskIconContainer, { backgroundColor: "#8B4513" }]}>
                                    <Image source={pendingTrip} style={styles.taskIcon} />
                                </View>
                                <View style={styles.taskContent}>
                                    <Text style={styles.taskText}>Pending Trips</Text>
                                    <Text style={styles.taskCount}>{stats.pending}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Wish List */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Wish List</Text>
                            <TouchableOpacity onPress={() => setShowAllWishList(!showAllWishList)}>
                                <Text style={styles.linkText}>
                                    {showAllWishList ? "Hide" : "See All"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {showAllWishList ? renderGridWishList() : renderHorizontalWishList()}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 80, // Add padding to account for footer
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    profileCard: {
        backgroundColor: "#8B5CF6",
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    profileContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    profileInfo: {
        flex: 1,
    },
    driverLabel: {
        color: "#E1D5F7",
        fontSize: 14,
        marginBottom: 4,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    driverName: {
        fontSize: 20,
        color: "#fff",
        fontWeight: "bold",
        marginRight: 10,
    },
    statusBadge: {
        backgroundColor: "#10B981",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    tripLabel: {
        color: "#E1D5F7",
        fontSize: 14,
        marginBottom: 4,
    },
    miles: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600"
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: "#fff",
    },
    section: {
        marginBottom: 20
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1F2937"
    },
    linkText: {
        color: "#10B981",
        fontWeight: "600",
        fontSize: 14,
    },
    taskContainer: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    taskCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    taskIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#FFB3B3",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    taskText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1F2937",
        flex: 1,
    },
    horizontalScrollContent: {
        paddingRight: 20,
        paddingVertical: 8,
    },
    wishGridContainer: {
        paddingVertical: 8,
    },
    wishGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    wishItem: {
        width: (width - 60) / 3.5,
        minWidth: 90,
        aspectRatio: 1,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        marginRight: 12,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    wishItemGrid: {
        width: (width - 80) / 3,
        minWidth: 100,
        marginRight: 8,
        marginLeft: 0,
    },
    wishText: {
        color: "#fff",
        fontSize: 11,
        marginTop: 8,
        fontWeight: "600",
        textAlign: "center",
        paddingHorizontal: 4,
    },
    wishTextGrid: {
        fontSize: 12,
        marginTop: 10,
    },
    taskIcon: {
        width: 24,
        height: 24,
        tintColor: "#fff",
    },
    iconWrapper: {
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 4,
    },
    loadingContainer: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#6B7280",
    },
    internalIdLabel: {
        color: "#E1D5F7",
        fontSize: 12,
        marginBottom: 4,
    },
    avatarPlaceholder: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    taskContent: {
        flex: 1,
        marginLeft: 16,
    },
    taskCount: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1F2937",
        marginTop: 4,
    },
});