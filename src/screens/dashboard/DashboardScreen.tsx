import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons"
import activeTrip from "../../../assets/icons/active trip.png";
import completeTrip from "../../../assets/icons/complete trip.png";
import pendingTrip from "../../../assets/icons/pending trip.png";

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [showAllWishList, setShowAllWishList] = useState(false);

    const wishListItems = [
        { id: 1, name: "Vehicle", icon: <Ionicons name="car-sport" size={24} color="#fff" />, color: "#906AD1", route: "Vehicle" },
        { id: 2, name: "Trailer", icon: <FontAwesome5 name="truck-moving" size={24} color="#fff" />, color: "#FF9797", route: "Trailer" },
        { id: 3, name: "HOS", icon: <MaterialIcons name="schedule" size={24} color="#fff" />, color: "#FFCC00", route: "HOS" },
        { id: 4, name: "Asset Inspection", icon: <MaterialIcons name="report-problem" size={24} color="#fff" />, color: "#D74848", route: "AssetIncidents" },
        { id: 5, name: "Settings", icon: <Ionicons name="settings" size={24} color="#fff" />, color: "#2CDBFA", route: "Settings" },
        { id: 6, name: "Document", icon: <Ionicons name="document-text" size={24} color="#fff" />, color: "#C79EFF", route: "Documents" },
        { id: 7, name: "Load Map", icon: <Ionicons name="map" size={24} color="#fff" />, color: "#831775", route: "LoadMap" },
        { id: 8, name: "Transfer", icon: <Ionicons name="swap-horizontal" size={24} color="#fff" />, color: "#E61DCC", route: "Transfer" },
        { id: 9, name: "Fuel", icon: <FontAwesome5 name="gas-pump" size={24} color="#fff" />, color: "#04AA30", route: "Fuel" },
    ];

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

    const renderWishItem = (item: any) => (
        <TouchableOpacity
            key={item.id}
            style={[styles.wishItem, { backgroundColor: item.color }]}
            onPress={() => handleWishItemPress(item)}
        >
            <View style={styles.iconWrapper}>
                {item.icon}
            </View>
            <Text style={styles.wishText}>{item.name}</Text>
        </TouchableOpacity>
    );


    const renderHorizontalWishList = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
        >
            {wishListItems.map(renderWishItem)}
        </ScrollView>
    );

    const renderGridWishList = () => (
        <View>
            {/* First Row */}
            <View style={styles.wishGrid}>
                {wishListItems.slice(0, 4).map(renderWishItem)}
            </View>
            {/* Second Row */}
            <View style={styles.wishGrid}>
                {wishListItems.slice(4, 8).map(renderWishItem)}
            </View>
            {/* Third Row (if more items) */}
            {wishListItems.length > 8 && (
                <View style={styles.wishGrid}>
                    {wishListItems.slice(8).map(renderWishItem)}
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.profileContent}>
                            <View style={styles.profileInfo}>
                                <Text style={styles.driverLabel}>Driver</Text>
                                <View style={styles.nameRow}>
                                    <Text style={styles.driverName}>Rajvinder</Text>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>Active</Text>
                                    </View>
                                </View>
                                <Text style={styles.tripLabel}>Total Trip</Text>
                                <Text style={styles.miles}>600 Miles</Text>
                            </View>
                            <Image
                                source={{ uri: "https://randomuser.me/api/portraits/men/75.jpg" }}
                                style={styles.avatar}
                            />
                        </View>
                    </View>

                    {/* Daily Task Report */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Daily task report</Text>
                            <TouchableOpacity onPress={() => navigation.navigate("NewTrip")}>
                                <Text style={styles.linkText}>+ New Trip</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.taskContainer}>
                            <TouchableOpacity
                                style={styles.taskCard}
                                onPress={() => navigation.navigate("ActiveTrips")}
                            >
                                <View style={styles.taskIconContainer}>
                                    <Image source={activeTrip} style={styles.taskIcon} />
                                </View>
                                <Text style={styles.taskText}>Active Trips</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.taskCard}
                                onPress={() => navigation.navigate("CompleteTrips")}
                            >
                                <View style={[styles.taskIconContainer, { backgroundColor: "#FF6B6B" }]}>
                                    <Image source={completeTrip} style={styles.taskIcon} />
                                </View>
                                <Text style={styles.taskText}>Complete Trips</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.taskCard}
                                onPress={() => navigation.navigate("PendingTrips")}
                            >
                                <View style={[styles.taskIconContainer, { backgroundColor: "#8B4513" }]}>
                                    <Image source={pendingTrip} style={styles.taskIcon} />
                                </View>
                                <Text style={styles.taskText}>Pending Trips</Text>
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
    },
    wishGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12
    },
    wishItem: {
        width: (width - 60) / 4,
        aspectRatio: 1,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 2,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    wishText: {
        color: "#fff",
        fontSize: 12,
        marginTop: 8,
        fontWeight: "600",
        textAlign: "center",
    },
    taskIcon: {
        width: 24,
        height: 24,
        tintColor: "#fff",
    },
    iconWrapper: {
        justifyContent: "center",
        alignItems: "center",
        color: "white"
    },
});