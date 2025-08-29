import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView,
    Alert,
    Animated,
    Modal,
    StatusBar,
    FlatList,
    RefreshControl,
    Platform,
    SafeAreaView,
    ActivityIndicator
} from "react-native";
// CRITICAL CHANGE: Replace WebView with react-native-maps
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";

const { width, height } = Dimensions.get("window");

interface Location {
    lat: number;
    lng: number;
}

interface LocationDetails {
    location: string;
    address: string;
    lat: number;
    lng: number;
    time: string;
}

interface RouteStep {
    lat: number;
    lng: number;
    instruction: string;
    distance: string;
    type: 'start' | 'highway' | 'merge' | 'destination';
}

interface Trip {
    id: string;
    status: 'active' | 'scheduled' | 'completed';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    pickup: LocationDetails;
    delivery: LocationDetails;
    distance: string;
    duration: string;
    cargo: string;
    cargoWeight: string;
    driverProgress: number;
    currentLocation: string;
    estimatedArrival: string;
    startedAt: string | null;
    completedAt?: string;
    routeSteps: RouteStep[];
}

// Sample trips data - same as your original
const SAMPLE_TRIPS: Trip[] = [
    {
        id: "TRP001",
        status: "active",
        priority: "high",
        pickup: {
            location: "Manhattan Financial District",
            address: "120 Wall Street, New York, NY 10005",
            lat: 40.7074,
            lng: -74.0113,
            time: "09:30 AM"
        },
        delivery: {
            location: "Boston Downtown",
            address: "1 State Street, Boston, MA 02109",
            lat: 42.3601,
            lng: -71.0589,
            time: "02:30 PM"
        },
        distance: "240 km",
        duration: "4h 30m",
        cargo: "Electronics Equipment",
        cargoWeight: "1,200 kg",
        driverProgress: 35,
        currentLocation: "New Haven, CT",
        estimatedArrival: "2:45 PM",
        startedAt: "09:45 AM",
        routeSteps: [
            { lat: 40.7074, lng: -74.0113, instruction: "Start from Manhattan Financial District", distance: "0 km", type: "start" },
            { lat: 40.8176, lng: -73.7781, instruction: "Take I-95 N toward Bronx", distance: "25 km", type: "highway" },
            { lat: 41.0534, lng: -73.5387, instruction: "Continue on I-95 N through Connecticut", distance: "45 km", type: "highway" },
            { lat: 41.2033, lng: -73.2094, instruction: "Merge onto I-91 N toward Springfield", distance: "35 km", type: "merge" },
            { lat: 41.7658, lng: -72.6851, instruction: "Take I-90 E (Mass Pike) toward Boston", distance: "65 km", type: "highway" },
            { lat: 42.0629, lng: -71.7611, instruction: "Continue on I-90 E through Worcester", distance: "40 km", type: "highway" },
            { lat: 42.3601, lng: -71.0589, instruction: "Exit to downtown Boston - Destination reached", distance: "30 km", type: "destination" }
        ]
    },
    // ... your other sample trips
];

export default function DriverTrackingScreen() {
    const [currentView, setCurrentView] = useState<'tripsList' | 'navigation'>('tripsList');
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [trips, setTrips] = useState<Trip[]>(SAMPLE_TRIPS);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [fullScreenMap, setFullScreenMap] = useState<boolean>(false);
    const [tripStarted, setTripStarted] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [distanceCovered, setDistanceCovered] = useState<number>(0);

    // NEW: Add real location tracking states
    const [driverLocation, setDriverLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [locationHistory, setLocationHistory] = useState<{ latitude: number, longitude: number }[]>([]);
    const [locationPermission, setLocationPermission] = useState<boolean>(false);
    const [mapLoading, setMapLoading] = useState<boolean>(true);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const locationInterval = useRef<NodeJS.Timeout | null>(null);

    // Filter trips by status
    const activeTrips = trips.filter(trip => trip.status === 'active');
    const scheduledTrips = trips.filter(trip => trip.status === 'scheduled');
    const completedTrips = trips.filter(trip => trip.status === 'completed');

    // NEW: Request location permissions and start tracking
    useEffect(() => {
        requestLocationPermission();
    }, []);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location access to use navigation features.',
                    [{ text: 'OK' }]
                );
                setLocationPermission(false);
                return;
            }
            setLocationPermission(true);
            getCurrentLocation();
        } catch (error) {
            console.error('Location permission error:', error);
            setLocationPermission(false);
        }
    };


    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const getCurrentLocation = async () => {
        if (!locationPermission) {
            console.log("No location permission");
            return;
        }

        try {
            console.log("Getting location...");
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,

            });

            const newLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            console.log("Got location:", newLocation);
            setDriverLocation(newLocation);

            if (tripStarted && selectedTrip) {
                setLocationHistory(prev => {
                    const newHistory = [...prev, newLocation];

                    let totalDistance = 0;
                    for (let i = 1; i < newHistory.length; i++) {
                        totalDistance += calculateDistance(
                            newHistory[i - 1].latitude, newHistory[i - 1].longitude,
                            newHistory[i].latitude, newHistory[i].longitude
                        );
                    }

                    setDistanceCovered(totalDistance);
                    console.log("Distance covered:", totalDistance);
                    return newHistory;
                });
            }
        } catch (error) {
            console.error('Location error:', error);
        }
    };

    // Start location tracking when trip starts
    useEffect(() => {
        if (tripStarted && locationPermission) {
            locationInterval.current = setInterval(() => {
                getCurrentLocation();
            }, 5000); // Update every 5 seconds like the example
        } else if (locationInterval.current) {
            clearInterval(locationInterval.current);
            locationInterval.current = null;
        }

        return () => {
            if (locationInterval.current) {
                clearInterval(locationInterval.current);
            }
        };
    }, [tripStarted, locationPermission]);

    useEffect(() => {
        if (tripStarted) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [tripStarted]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    };

    const handleTripSelect = useCallback((trip: Trip) => {
        console.log("Trip selected:", trip.id);
        setSelectedTrip(trip);
        setCurrentView('navigation');
        setMapLoading(true); // Start with loading

        // Reset states
        setTripStarted(false);
        setCurrentStep(0);
        setDistanceCovered(0);
        setLocationHistory([]);

        // Get location
        if (locationPermission) {
            getCurrentLocation();
        }
    }, [locationPermission]);

    const handleStartTrip = async () => {
        if (!locationPermission) {
            await requestLocationPermission();
            return;
        }

        // Get current location first
        await getCurrentLocation();

        setTripStarted(true);

        if (driverLocation) {
            setLocationHistory([driverLocation]);

            // If user is not at pickup location, create route from current location to pickup
            if (selectedTrip) {
                const distanceToPickup = calculateDistance(
                    driverLocation.latitude, driverLocation.longitude,
                    selectedTrip.pickup.lat, selectedTrip.pickup.lng
                );

                if (distanceToPickup > 0.5) { // More than 500m from pickup
                    Alert.alert(
                        "Trip Started",
                        `You are ${distanceToPickup.toFixed(1)}km from the pickup location. Navigate there first.`,
                        [{ text: "Got it!" }]
                    );
                }
            }
        }

        Alert.alert(
            "Trip Started",
            "GPS tracking activated. Your location will be tracked every 5 seconds.",
            [{ text: "Got it!" }]
        );
    };

    const handleStopTrip = () => {
        Alert.alert(
            "Stop Trip",
            "Are you sure you want to stop the current trip?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Stop",
                    style: "destructive",
                    onPress: () => {
                        setTripStarted(false);
                        setCurrentStep(0);
                        setDistanceCovered(0);
                        setLocationHistory([]);

                        if (locationInterval.current) {
                            clearInterval(locationInterval.current);
                            locationInterval.current = null;
                        }
                    }
                }
            ]
        );
    };

    const handleBackToList = () => {
        setCurrentView('tripsList');
        setSelectedTrip(null);
        setTripStarted(false);
        setCurrentStep(0);
        setDistanceCovered(0);
        setLocationHistory([]);

        if (locationInterval.current) {
            clearInterval(locationInterval.current);
            locationInterval.current = null;
        }
    };

    const getPriorityColor = (priority: Trip['priority']) => {
        switch (priority) {
            case 'urgent': return '#DC2626';
            case 'high': return '#EA580C';
            case 'medium': return '#CA8A04';
            case 'low': return '#16A34A';
            default: return '#6B7280';
        }
    };

    const getStatusColor = (status: Trip['status']) => {
        switch (status) {
            case 'active': return '#1a73e8';
            case 'scheduled': return '#CA8A04';
            case 'completed': return '#16A34A';
            default: return '#6B7280';
        }
    };

    const renderTripCard = ({ item }: { item: Trip }) => (
        <TouchableOpacity
            style={styles.tripCard}
            onPress={() => handleTripSelect(item)}
            activeOpacity={0.8}
        >
            <View style={styles.tripHeader}>
                <View>
                    <Text style={styles.tripId}>{item.id}</Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                            <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.tripMeta}>
                    <Text style={styles.distanceText}>{item.distance}</Text>
                    <Text style={styles.durationText}>{item.duration}</Text>
                </View>
            </View>

            <View style={styles.routeInfo}>
                <View style={styles.locationRow}>
                    <View style={[styles.locationDot, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.locationIcon}>📦</Text>
                    </View>
                    <View style={styles.locationDetails}>
                        <Text style={styles.locationName}>{item.pickup.location}</Text>
                        <Text style={styles.locationAddress}>{item.pickup.address}</Text>
                        <Text style={styles.locationTime}>Pickup: {item.pickup.time}</Text>
                    </View>
                </View>

                <View style={styles.routeLine} />

                <View style={styles.locationRow}>
                    <View style={[styles.locationDot, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.locationIcon}>🏁</Text>
                    </View>
                    <View style={styles.locationDetails}>
                        <Text style={styles.locationName}>{item.delivery.location}</Text>
                        <Text style={styles.locationAddress}>{item.delivery.address}</Text>
                        <Text style={styles.locationTime}>Delivery: {item.delivery.time}</Text>
                    </View>
                </View>
            </View>

            {item.status === 'active' && (
                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Current Location: {item.currentLocation}</Text>
                        <Text style={styles.progressPercent}>{item.driverProgress}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${item.driverProgress}%` }]} />
                    </View>
                    <Text style={styles.etaText}>ETA: {item.estimatedArrival}</Text>
                </View>
            )}

            <View style={styles.cargoInfo}>
                <Text style={styles.cargoLabel}>Cargo: {item.cargo}</Text>
                <Text style={styles.cargoWeight}>Weight: {item.cargoWeight}</Text>
            </View>

            <TouchableOpacity style={styles.viewDetailsButton}>
                <Text style={styles.viewDetailsText}>View Route & Navigate →</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderTripsListView = () => (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Driver Operations</Text>
                <View style={styles.statsRow}>
                    <Text style={styles.statItem}>{activeTrips.length} Active</Text>
                    <Text style={styles.statItem}>{scheduledTrips.length} Scheduled</Text>
                    <Text style={styles.statItem}>{completedTrips.length} Completed</Text>
                </View>
            </View>

            {activeTrips.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🔴 Active Trips</Text>
                        <Text style={styles.sectionCount}>{activeTrips.length}</Text>
                    </View>
                    <FlatList
                        data={activeTrips}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTripCard}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            )}

            {scheduledTrips.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📅 Scheduled Trips</Text>
                        <Text style={styles.sectionCount}>{scheduledTrips.length}</Text>
                    </View>
                    <FlatList
                        data={scheduledTrips}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTripCard}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            )}

            {completedTrips.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>✅ Recently Completed</Text>
                        <Text style={styles.sectionCount}>{completedTrips.length}</Text>
                    </View>
                    <FlatList
                        data={completedTrips}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTripCard}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            )}

            {trips.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyTitle}>No Trips Found</Text>
                    <Text style={styles.emptyText}>Pull down to refresh and check for new assignments</Text>
                </View>
            )}
        </ScrollView>
    );

    const renderMapView = useCallback((isFullScreen = false) => {
        if (!selectedTrip) return null;
        const mapRef = useRef<MapView>(null);
        const pickup = { latitude: selectedTrip.pickup.lat, longitude: selectedTrip.pickup.lng };
        const delivery = { latitude: selectedTrip.delivery.lat, longitude: selectedTrip.delivery.lng };

        // Calculate region
        const allPoints = [pickup, delivery];
        if (driverLocation) {
            allPoints.push(driverLocation);
        }

        const latitudes = allPoints.map(p => p.latitude);
        const longitudes = allPoints.map(p => p.longitude);

        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);

        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;

        const latPadding = Math.max((maxLat - minLat) * 0.3, 0.005);
        const lngPadding = Math.max((maxLng - minLng) * 0.3, 0.005);

        const region = {
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: (maxLat - minLat) + latPadding,
            longitudeDelta: (maxLng - minLng) + lngPadding,
        };

        useEffect(() => {
            if (mapRef.current && selectedTrip) {
                const pickup = { latitude: selectedTrip.pickup.lat, longitude: selectedTrip.pickup.lng };
                const delivery = { latitude: selectedTrip.delivery.lat, longitude: selectedTrip.delivery.lng };

                const points = [pickup, delivery];
                if (driverLocation) points.push(driverLocation);

                mapRef.current.fitToCoordinates(points, {
                    edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                    animated: true,
                });
            }
        }, [selectedTrip, driverLocation]);
        // Validate route coordinates
        const routeCoordinates = selectedTrip.routeSteps
            .filter(step =>
                typeof step.lat === 'number' &&
                typeof step.lng === 'number' &&
                !isNaN(step.lat) &&
                !isNaN(step.lng) &&
                Math.abs(step.lat) <= 90 &&
                Math.abs(step.lng) <= 180
            )
            .map(step => ({
                latitude: step.lat,
                longitude: step.lng
            }));

        console.log("Route coordinates count:", routeCoordinates.length);

        return (
            <View style={isFullScreen ? styles.fullScreenMapContainer : styles.mapContainer}>
                <MapView
                    {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                    style={styles.map}
                    region={region}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    showsCompass={true}
                    showsScale={true}
                    loadingEnabled={true}
                    loadingIndicatorColor="#1a73e8"
                    onMapReady={() => {
                        console.log("Map ready - setting loading to false");
                        // FIXED: Use setTimeout to ensure state update happens
                        setTimeout(() => {
                            setMapLoading(false);
                        }, 100);
                    }}
                >
                    {/* Pickup Marker */}
                    <Marker
                        coordinate={pickup}
                        title="PICKUP"
                        description={selectedTrip.pickup.location}
                        identifier="pickup"
                    >
                        <View style={[styles.customMarker, { backgroundColor: '#10B981' }]}>
                            <Text style={styles.markerText}>P</Text>
                        </View>
                    </Marker>

                    {/* Delivery Marker */}
                    <Marker
                        coordinate={delivery}
                        title="DELIVERY"
                        description={selectedTrip.delivery.location}
                        identifier="delivery"
                    >
                        <View style={[styles.customMarker, { backgroundColor: '#EF4444' }]}>
                            <Text style={styles.markerText}>D</Text>
                        </View>
                    </Marker>

                    {/* Driver Location */}
                    {driverLocation && (
                        <Marker
                            coordinate={driverLocation}
                            title="YOU ARE HERE"
                            description="Current Driver Position"
                            identifier="driver"
                        >
                            <Animated.View
                                style={[
                                    styles.customMarker,
                                    {
                                        backgroundColor: '#1a73e8',
                                        transform: [{ scale: tripStarted ? pulseAnim : 1 }]
                                    }
                                ]}
                            >
                                <Text style={styles.markerText}>🚛</Text>
                            </Animated.View>
                        </Marker>
                    )}

                    {/* Route Line */}
                    {routeCoordinates.length >= 2 && (
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeColor="#1a73e8"
                            strokeWidth={4}
                            geodesic={true}
                        />
                    )}

                    {/* Driver's Path */}
                    {locationHistory.length > 1 && tripStarted && (
                        <Polyline
                            coordinates={locationHistory}
                            strokeColor="#10B981"
                            strokeWidth={6}
                            geodesic={true}
                        />
                    )}
                </MapView>

                {/* Loading Overlay */}
                {mapLoading && (
                    <View style={styles.mapLoadingOverlay}>
                        <ActivityIndicator size="large" color="#1a73e8" />
                        <Text style={styles.loadingText}>Loading Map...</Text>
                    </View>
                )}

                {/* Expand Button */}
                {!isFullScreen && (
                    <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => setFullScreenMap(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.expandButtonText}>⛶</Text>
                    </TouchableOpacity>
                )}

                {/* Route Overlay */}
                {!isFullScreen && !mapLoading && (
                    <View style={styles.mapOverlay}>
                        <Text style={styles.overlayText}>
                            {selectedTrip.pickup.location} → {selectedTrip.delivery.location}
                        </Text>
                        <Text style={styles.overlaySubtext}>
                            {selectedTrip.distance} • {selectedTrip.duration}
                        </Text>
                        {routeCoordinates.length >= 2 && (
                            <Text style={styles.overlaySubtext}>
                                Route: {routeCoordinates.length} waypoints
                            </Text>
                        )}
                    </View>
                )}
            </View>
        );
    }, [selectedTrip, driverLocation, mapLoading, tripStarted, pulseAnim, locationHistory]);


    const renderStatsSection = () => {
        if (!selectedTrip) return null;

        const totalTripDistance = parseInt(selectedTrip.distance.replace(' km', ''));
        const remainingDistance = Math.max(0, totalTripDistance - distanceCovered);
        const progressPercent = totalTripDistance > 0 ? (distanceCovered / totalTripDistance) * 100 : 0;

        // Calculate distance to destination if we have driver location
        const distanceToDestination = driverLocation ?
            calculateDistance(
                driverLocation.latitude,
                driverLocation.longitude,
                selectedTrip.delivery.lat,
                selectedTrip.delivery.lng
            ) : 0;

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Traveled</Text>
                    <Text style={styles.statValue}>{distanceCovered.toFixed(1)} KM</Text>
                    <Text style={styles.statSubtext}>
                        {progressPercent.toFixed(1)}% of route
                    </Text>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Remaining</Text>
                    <Text style={styles.statValue}>{remainingDistance.toFixed(1)} KM</Text>
                    <Text style={styles.statSubtext}>
                        {Math.round(remainingDistance / 80)} hrs left
                    </Text>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>To Destination</Text>
                    <Text style={styles.statValue}>
                        {distanceToDestination > 0 ? `${distanceToDestination.toFixed(1)} KM` : "Calculating..."}
                    </Text>
                    <Text style={styles.statSubtext}>Direct distance</Text>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>GPS Points</Text>
                    <Text style={styles.statValue}>{locationHistory.length}</Text>
                    <Text style={styles.statSubtext}>
                        {tripStarted ? "Tracking active" : "Not tracking"}
                    </Text>
                </View>
            </View>
        );
    };

    const renderNavigationView = () => {
        if (!selectedTrip) return null;

        return (
            <>
                <StatusBar barStyle={fullScreenMap ? "light-content" : "dark-content"} />

                <Modal
                    visible={fullScreenMap}
                    animationType="slide"
                    statusBarTranslucent={true}
                    onRequestClose={() => setFullScreenMap(false)}
                >
                    <SafeAreaView style={styles.fullScreenMapContainer}>
                        {renderMapView(true)}
                        <TouchableOpacity
                            style={styles.exitFullScreenButton}
                            onPress={() => setFullScreenMap(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.exitButtonText}>✕</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                </Modal>

                <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                    <View style={styles.navigationHeader}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleBackToList}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.backButtonText}>← Back to Trips</Text>
                        </TouchableOpacity>
                        <Animated.View style={[styles.liveIndicator, { transform: [{ scale: pulseAnim }] }]}>
                            <Text style={styles.liveText}>
                                {tripStarted ? "LIVE" : "OFFLINE"}
                            </Text>
                        </Animated.View>
                    </View>

                    <View style={styles.tripDetailsCard}>
                        <View style={styles.tripDetailHeader}>
                            <Text style={styles.tripDetailTitle}>Trip {selectedTrip.id}</Text>
                            <View style={styles.tripDetailBadges}>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTrip.status) }]}>
                                    <Text style={styles.statusText}>{selectedTrip.status.toUpperCase()}</Text>
                                </View>
                                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedTrip.priority) }]}>
                                    <Text style={styles.priorityText}>{selectedTrip.priority.toUpperCase()}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.routeSection}>
                            <View style={styles.locationRow}>
                                <View style={[styles.locationDot, { backgroundColor: '#10B981' }]}>
                                    <Text style={styles.locationIcon}>📦</Text>
                                </View>
                                <View style={styles.locationDetails}>
                                    <Text style={styles.locationName}>{selectedTrip.pickup.location}</Text>
                                    <Text style={styles.locationAddress}>{selectedTrip.pickup.address}</Text>
                                    <Text style={styles.locationTime}>Pickup: {selectedTrip.pickup.time}</Text>
                                </View>
                            </View>

                            <View style={styles.routeLine} />

                            <View style={styles.locationRow}>
                                <View style={[styles.locationDot, { backgroundColor: '#EF4444' }]}>
                                    <Text style={styles.locationIcon}>🏁</Text>
                                </View>
                                <View style={styles.locationDetails}>
                                    <Text style={styles.locationName}>{selectedTrip.delivery.location}</Text>
                                    <Text style={styles.locationAddress}>{selectedTrip.delivery.address}</Text>
                                    <Text style={styles.locationTime}>Delivery: {selectedTrip.delivery.time}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.cargoSection}>
                            <Text style={styles.cargoLabel}>Cargo: {selectedTrip.cargo}</Text>
                            <Text style={styles.cargoWeight}>Weight: {selectedTrip.cargoWeight}</Text>
                            <Text style={styles.tripDistance}>Distance: {selectedTrip.distance} • Duration: {selectedTrip.duration}</Text>
                        </View>
                    </View>

                    {/* Location Permission Status */}
                    {!locationPermission && (
                        <View style={styles.permissionCard}>
                            <Text style={styles.permissionTitle}>Location Access Required</Text>
                            <Text style={styles.permissionText}>Enable location access for navigation features</Text>
                            <TouchableOpacity
                                style={styles.permissionButton}
                                onPress={requestLocationPermission}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.permissionButtonText}>Enable Location</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Current Navigation Step */}
                    {tripStarted && selectedTrip.routeSteps[currentStep] && (
                        <View style={styles.navigationCard}>
                            <Text style={styles.navigationTitle}>Current Navigation</Text>
                            <View style={styles.stepContainer}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepText}>{currentStep + 1}</Text>
                                </View>
                                <View style={styles.stepInfo}>
                                    <Text style={styles.stepInstruction}>
                                        {selectedTrip.routeSteps[currentStep].instruction}
                                    </Text>
                                    <Text style={styles.stepDistance}>
                                        Distance: {selectedTrip.routeSteps[currentStep].distance}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Map View - Using React Native Maps */}
                    {renderMapView(false)}

                    {/* Navigation Controls */}
                    <View style={styles.controlsContainer}>
                        {!tripStarted ? (
                            <TouchableOpacity
                                style={[
                                    styles.startButton,
                                    !locationPermission && styles.disabledButton
                                ]}
                                onPress={handleStartTrip}
                                activeOpacity={0.8}
                                disabled={!locationPermission}
                            >
                                <Text style={styles.startButtonText}>
                                    {locationPermission ? "Start Navigation" : "Location Access Required"}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.tripControls}>
                                <TouchableOpacity
                                    style={styles.pauseButton}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.pauseButtonText}>Pause</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.stopButton}
                                    onPress={handleStopTrip}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.stopButtonText}>Stop Trip</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>


                    {renderStatsSection()}
                </ScrollView>
            </>
        );
    };

    return currentView === 'tripsList' ? renderTripsListView() : renderNavigationView();
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f7fa",
    },

    // Trips List Styles
    headerContainer: {
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 16,
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: "row",
        gap: 16,
    },
    statItem: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },

    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1a1a1a",
    },
    sectionCount: {
        backgroundColor: "#1a73e8",
        color: "white",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: "bold",
        minWidth: 24,
        textAlign: "center",
    },

    // Trip Card Styles
    tripCard: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#1a73e8",
    },

    tripHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    tripId: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    statusRow: {
        flexDirection: "row",
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },

    tripMeta: {
        alignItems: "flex-end",
    },
    distanceText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1a73e8",
        marginBottom: 4,
    },
    durationText: {
        fontSize: 14,
        color: "#6B7280",
    },

    // Location Styles
    routeInfo: {
        marginBottom: 16,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    locationDot: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    locationIcon: {
        fontSize: 20,
    },
    locationDetails: {
        flex: 1,
    },
    locationName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginBottom: 2,
    },
    locationAddress: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 2,
    },
    locationTime: {
        fontSize: 12,
        color: "#1a73e8",
        fontWeight: "500",
    },
    routeLine: {
        width: 3,
        height: 24,
        backgroundColor: "#E5E7EB",
        marginLeft: 20,
        marginVertical: -8,
    },

    // Progress Styles
    progressSection: {
        backgroundColor: "#F8FAFC",
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: "#374151",
        fontWeight: "500",
        flex: 1,
    },
    progressPercent: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#1a73e8",
    },
    progressBar: {
        height: 6,
        backgroundColor: "#E5E7EB",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#1a73e8",
        borderRadius: 3,
    },
    etaText: {
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
    },

    // Cargo Info
    cargoInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    cargoLabel: {
        fontSize: 14,
        color: "#374151",
        fontWeight: "500",
    },
    cargoWeight: {
        fontSize: 14,
        color: "#6B7280",
    },

    viewDetailsButton: {
        backgroundColor: "#1a73e8",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    viewDetailsText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14,
    },

    // Empty State
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginBottom: 8,
        textAlign: "center",
    },
    emptyText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 20,
    },

    // Navigation View Styles
    navigationHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 16,
    },
    backButton: {
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backButtonText: {
        color: "#1a73e8",
        fontWeight: "600",
        fontSize: 14,
    },
    liveIndicator: {
        backgroundColor: "#1a1a1a",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    liveText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },

    // Trip Details Card
    tripDetailsCard: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#1a73e8",
    },
    tripDetailHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
    },
    tripDetailTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1a1a1a",
    },
    tripDetailBadges: {
        flexDirection: "row",
        gap: 8,
    },

    routeSection: {
        marginBottom: 20,
    },
    cargoSection: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    tripDistance: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
    },

    // NEW: Location Permission Styles
    permissionCard: {
        backgroundColor: "#FEF3C7",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#F59E0B",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    permissionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#92400E",
        marginBottom: 8,
    },
    permissionText: {
        fontSize: 14,
        color: "#92400E",
        marginBottom: 12,
        lineHeight: 20,
    },
    permissionButton: {
        backgroundColor: "#F59E0B",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    permissionButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14,
    },

    // Navigation Card
    navigationCard: {
        backgroundColor: "#1F2937",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    navigationTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 12,
    },
    stepContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    stepNumber: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#1a73e8",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    stepText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
    stepInfo: {
        flex: 1,
    },
    stepInstruction: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 4,
    },
    stepDistance: {
        fontSize: 14,
        color: "#9CA3AF",
    },

    // NEW: React Native MapView Styles
    mapContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        overflow: "hidden",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        position: "relative",
        height: 400,
    },
    map: {
        width: "100%",
        height: "100%"
    },
    pickupMarker: {
        backgroundColor: '#10B981',
        borderRadius: 25,
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: 'white',
        elevation: 8,
    },
    deliveryMarker: {
        backgroundColor: '#EF4444',
        borderRadius: 25,
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: 'white',
        elevation: 8,
    },
    driverMarker: {
        backgroundColor: '#1a73e8',
        borderRadius: 25,
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: 'white',
        elevation: 8,
    },
    markerEmoji: {
        fontSize: 24,
    },

    fullScreenMapContainer: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },

    fullScreenMap: {
        flex: 1,
        width: "100%",
        height: "100%",
    },

    // NEW: Map Loading Overlay
    mapLoadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(245, 247, 250, 0.95)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        borderRadius: 12,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#1a73e8",
        fontWeight: "500",
    },

    // Map Controls
    expandButton: {
        position: "absolute",
        top: 12,
        right: 12,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 8,
        padding: 8,
        zIndex: 1000,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    expandButtonText: {
        fontSize: 20,
        color: "#1a73e8",
        fontWeight: "bold",
    },
    exitFullScreenButton: {
        position: "absolute",
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 16,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderRadius: 22,
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1002,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    customMarker: {
        backgroundColor: '#10B981',
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    markerText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    exitButtonText: {
        color: "white",
        fontSize: 24,
        fontWeight: "bold",
    },

    // Navigation Controls
    controlsContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    startButton: {
        backgroundColor: "#1a73e8",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    startButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },

    // NEW: Disabled Button Style
    disabledButton: {
        backgroundColor: "#9CA3AF",
        elevation: 0,
        shadowOpacity: 0,
    },

    tripControls: {
        flexDirection: "row",
        gap: 12,
    },
    pauseButton: {
        flex: 1,
        backgroundColor: "#F59E0B",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        backgroundColor: 'rgba(26, 115, 232, 0.9)',
        padding: 12,
        borderRadius: 8,
        elevation: 5,
    },
    overlayText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    overlaySubtext: {
        color: 'white',
        fontSize: 12,
        textAlign: 'center',
        opacity: 0.8,
        marginTop: 2,
    },
    pauseButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    stopButton: {
        flex: 1,
        backgroundColor: "#DC2626",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    stopButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },

    // Stats Container - Updated for new functionality
    statsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: 16,
        marginBottom: 20,
        gap: 12,
    },
    statBox: {
        flex: 1,
        minWidth: (width - 56) / 2,
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderLeftWidth: 4,
        borderLeftColor: "#1a73e8",
    },
    statLabel: {
        fontSize: 12,
        color: "#666",
        fontWeight: "500",
        marginBottom: 4,
        textAlign: "center",
    },
    statValue: {
        fontSize: 18,
        color: "#1a1a1a",
        fontWeight: "bold",
        marginBottom: 2,
        textAlign: "center",
    },
    statSubtext: {
        fontSize: 10,
        color: "#9CA3AF",
        textAlign: "center",
    },
});

