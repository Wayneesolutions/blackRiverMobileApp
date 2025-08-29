import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { WebView } from "react-native-webview";

const { width, height } = Dimensions.get("window");

// Sample trips data - replace with API call
const SAMPLE_TRIPS = [
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
    {
        id: "TRP002",
        status: "scheduled",
        priority: "medium",
        pickup: {
            location: "Brooklyn Warehouse",
            address: "500 Hamilton Avenue, Brooklyn, NY 11232",
            lat: 40.6782,
            lng: -74.0151,
            time: "11:00 AM"
        },
        delivery: {
            location: "Philadelphia Center",
            address: "1600 Market Street, Philadelphia, PA 19103",
            lat: 39.9526,
            lng: -75.1652,
            time: "03:00 PM"
        },
        distance: "160 km",
        duration: "3h 15m",
        cargo: "Medical Supplies",
        cargoWeight: "800 kg",
        driverProgress: 0,
        currentLocation: "Brooklyn Warehouse",
        estimatedArrival: "3:15 PM",
        startedAt: null,
        routeSteps: [
            { lat: 40.6782, lng: -74.0151, instruction: "Start from Brooklyn Warehouse", distance: "0 km", type: "start" },
            { lat: 40.6892, lng: -74.0445, instruction: "Take I-278 W toward Staten Island", distance: "15 km", type: "highway" },
            { lat: 40.5795, lng: -74.1502, instruction: "Continue on I-95 S toward New Jersey", distance: "35 km", type: "highway" },
            { lat: 40.0583, lng: -74.4057, instruction: "Take I-195 W toward Trenton", distance: "45 km", type: "highway" },
            { lat: 39.9526, lng: -75.1652, instruction: "Exit to downtown Philadelphia", distance: "65 km", type: "destination" }
        ]
    },
    {
        id: "TRP003",
        status: "active",
        priority: "urgent",
        pickup: {
            location: "Newark Industrial",
            address: "200 Industrial Way, Newark, NJ 07114",
            lat: 40.7357,
            lng: -74.1724,
            time: "08:15 AM"
        },
        delivery: {
            location: "Washington DC Metro",
            address: "1000 Constitution Ave, Washington, DC 20001",
            lat: 38.8951,
            lng: -77.0364,
            time: "01:00 PM"
        },
        distance: "320 km",
        duration: "5h 45m",
        cargo: "Government Documents",
        cargoWeight: "200 kg",
        driverProgress: 60,
        currentLocation: "Baltimore, MD",
        estimatedArrival: "1:15 PM",
        startedAt: "08:30 AM",
        routeSteps: [
            { lat: 40.7357, lng: -74.1724, instruction: "Start from Newark Industrial", distance: "0 km", type: "start" },
            { lat: 40.7282, lng: -74.0776, instruction: "Take I-78 W toward Manhattan", distance: "25 km", type: "highway" },
            { lat: 40.7589, lng: -73.9851, instruction: "Continue on I-95 S toward New Jersey", distance: "45 km", type: "highway" },
            { lat: 39.2904, lng: -76.6122, instruction: "Take I-95 S through Baltimore", distance: "180 km", type: "highway" },
            { lat: 38.8951, lng: -77.0364, instruction: "Exit to Washington DC downtown", distance: "70 km", type: "destination" }
        ]
    },
    {
        id: "TRP004",
        status: "completed",
        priority: "low",
        pickup: {
            location: "Queens Distribution",
            address: "45-10 Court Square, Long Island City, NY 11101",
            lat: 40.7505,
            lng: -73.9426,
            time: "07:00 AM"
        },
        delivery: {
            location: "Hartford Office",
            address: "280 Trumbull Street, Hartford, CT 06103",
            lat: 41.7658,
            lng: -72.6851,
            time: "11:30 AM"
        },
        distance: "180 km",
        duration: "3h 00m",
        cargo: "Office Furniture",
        cargoWeight: "1,500 kg",
        driverProgress: 100,
        currentLocation: "Hartford Office - Delivered",
        estimatedArrival: "11:30 AM",
        startedAt: "07:15 AM",
        completedAt: "11:25 AM"
    }
];

export default function DriverTrackingScreen() {
    const [currentView, setCurrentView] = useState('tripsList'); // 'tripsList' or 'navigation'
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [trips, setTrips] = useState(SAMPLE_TRIPS);
    const [refreshing, setRefreshing] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [fullScreenMap, setFullScreenMap] = useState(false);
    const [tripStarted, setTripStarted] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [distanceCovered, setDistanceCovered] = useState(0);
    const [currentLocation, setCurrentLocation] = useState(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Filter trips by status
    const activeTrips = trips.filter(trip => trip.status === 'active');
    const scheduledTrips = trips.filter(trip => trip.status === 'scheduled');
    const completedTrips = trips.filter(trip => trip.status === 'completed');

    useEffect(() => {
        if (tripStarted && selectedTrip) {
            const interval = setInterval(() => {
                setCurrentStep(prev => {
                    const next = prev + 1;
                    if (next < selectedTrip.routeSteps.length) {
                        setDistanceCovered(prev => prev + 5);
                        setCurrentLocation(selectedTrip.routeSteps[next]);
                        return next;
                    }
                    return prev;
                });
            }, 8000);

            return () => clearInterval(interval);
        }
    }, [tripStarted, selectedTrip]);

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
        // Simulate API call
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    };

    const handleTripSelect = (trip: any) => {
        setSelectedTrip(trip);
        setCurrentView('navigation');

        // If trip is already active, set initial progress
        if (trip.status === 'active') {
            const initialStep = Math.floor((trip.driverProgress / 100) * trip.routeSteps.length);
            setCurrentStep(initialStep);
            setCurrentLocation(trip.routeSteps[initialStep]);
            setDistanceCovered(trip.driverProgress * 2.4); // 240km * progress
        }
    };

    const handleStartTrip = () => {
        setTripStarted(true);
        if (selectedTrip && selectedTrip.routeSteps.length > 0) {
            setCurrentLocation(selectedTrip.routeSteps[0]);
        }
        Alert.alert(
            "Trip Started",
            "GPS tracking activated. Follow the route instructions for safe navigation.",
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
                        setCurrentLocation(null);
                    }
                }
            ]
        );
    };

    const handleBackToList = () => {
        setCurrentView('tripsList');
        setSelectedTrip(null);
        setTripStarted(false);
        setShowMap(false);
        setCurrentStep(0);
        setDistanceCovered(0);
        setCurrentLocation(null);
    };

    const getPriorityColor = (priority: any) => {
        switch (priority) {
            case 'urgent': return '#DC2626';
            case 'high': return '#EA580C';
            case 'medium': return '#CA8A04';
            case 'low': return '#16A34A';
            default: return '#6B7280';
        }
    };

    const getStatusColor = (status: any) => {
        switch (status) {
            case 'active': return '#1a73e8';
            case 'scheduled': return '#CA8A04';
            case 'completed': return '#16A34A';
            default: return '#6B7280';
        }
    };

    const renderTripCard = ({ item: trip }) => (
        <TouchableOpacity
            style={styles.tripCard}
            onPress={() => handleTripSelect(trip)}
            activeOpacity={0.8}
        >
            <View style={styles.tripHeader}>
                <View>
                    <Text style={styles.tripId}>{trip.id}</Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
                            <Text style={styles.statusText}>{trip.status.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(trip.priority) }]}>
                            <Text style={styles.priorityText}>{trip.priority.toUpperCase()}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.tripMeta}>
                    <Text style={styles.distanceText}>{trip.distance}</Text>
                    <Text style={styles.durationText}>{trip.duration}</Text>
                </View>
            </View>

            <View style={styles.routeInfo}>
                <View style={styles.locationRow}>
                    <View style={[styles.locationDot, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.locationIcon}>📦</Text>
                    </View>
                    <View style={styles.locationDetails}>
                        <Text style={styles.locationName}>{trip.pickup.location}</Text>
                        <Text style={styles.locationAddress}>{trip.pickup.address}</Text>
                        <Text style={styles.locationTime}>Pickup: {trip.pickup.time}</Text>
                    </View>
                </View>

                <View style={styles.routeLine} />

                <View style={styles.locationRow}>
                    <View style={[styles.locationDot, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.locationIcon}>🏁</Text>
                    </View>
                    <View style={styles.locationDetails}>
                        <Text style={styles.locationName}>{trip.delivery.location}</Text>
                        <Text style={styles.locationAddress}>{trip.delivery.address}</Text>
                        <Text style={styles.locationTime}>Delivery: {trip.delivery.time}</Text>
                    </View>
                </View>
            </View>

            {trip.status === 'active' && (
                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Current Location: {trip.currentLocation}</Text>
                        <Text style={styles.progressPercent}>{trip.driverProgress}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${trip.driverProgress}%` }]} />
                    </View>
                    <Text style={styles.etaText}>ETA: {trip.estimatedArrival}</Text>
                </View>
            )}

            <View style={styles.cargoInfo}>
                <Text style={styles.cargoLabel}>Cargo: {trip.cargo}</Text>
                <Text style={styles.cargoWeight}>Weight: {trip.cargoWeight}</Text>
            </View>

            <TouchableOpacity style={styles.viewDetailsButton}
                onPress={() => handleTripSelect(trip)}>
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
            {/* Header */}
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Driver Operations</Text>
                <View style={styles.statsRow}>
                    <Text style={styles.statItem}>{activeTrips.length} Active</Text>
                    <Text style={styles.statItem}>{scheduledTrips.length} Scheduled</Text>
                    <Text style={styles.statItem}>{completedTrips.length} Completed</Text>
                </View>
            </View>

            {/* Active Trips Section */}
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

            {/* Scheduled Trips Section */}
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

            {/* Completed Trips Section */}
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

    const generateMapHtml = (trip: any) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                font-family: 'Roboto', Arial, sans-serif;
                background: #f8f9fa;
            }
            
            #map { 
                height: 100vh; 
                width: 100%; 
                border-radius: 0;
            }
            
            .control-panel {
                position: absolute;
                top: 15px;
                left: 15px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 15px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                max-width: 320px;
                z-index: 1000;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .route-header {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                font-weight: 600;
                color: #1a73e8;
                font-size: 16px;
            }
            
            .trip-info {
                font-size: 12px;
                color: #5f6368;
                line-height: 1.4;
                margin-bottom: 10px;
            }
            
            .route-stats {
                display: flex;
                justify-content: space-between;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #e8eaed;
            }
            
            .stat-item {
                text-align: center;
            }
            
            .stat-value {
                font-weight: 600;
                color: #1a73e8;
                font-size: 14px;
            }
            
            .stat-label {
                font-size: 10px;
                color: #5f6368;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .speed-indicator {
                position: absolute;
                top: 15px;
                right: 15px;
                background: linear-gradient(135deg, #1a73e8, #4285f4);
                color: white;
                padding: 12px 16px;
                border-radius: 25px;
                font-weight: 600;
                font-size: 14px;
                box-shadow: 0 4px 20px rgba(26, 115, 232, 0.3);
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .custom-zoom-controls {
                position: absolute;
                bottom: 120px;
                right: 15px;
                display: flex;
                flex-direction: column;
                gap: 2px;
                z-index: 1000;
            }
            
            .zoom-btn {
                width: 40px;
                height: 40px;
                background: white;
                border: 2px solid #dadce0;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                color: #3c4043;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                transition: all 0.2s ease;
                user-select: none;
            }
            
            .zoom-btn:hover {
                background: #f8f9fa;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            }
            
            .map-controls {
                position: absolute;
                bottom: 15px;
                left: 15px;
                display: flex;
                gap: 8px;
                z-index: 1000;
                flex-wrap: wrap;
            }
            
            .control-btn {
                background: white;
                border: 1px solid #dadce0;
                border-radius: 20px;
                padding: 8px 12px;
                font-size: 12px;
                color: #3c4043;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                transition: all 0.2s ease;
                font-weight: 500;
            }
            
            .control-btn:hover, .control-btn.active {
                background: #1a73e8;
                color: white;
                box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);
            }
            
            .exit-fullscreen {
                position: absolute;
                top: 15px;
                right: 70px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 50px;
                padding: 12px;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                color: #1a73e8;
                font-size: 20px;
                font-weight: bold;
                transition: all 0.2s ease;
                display: none;
            }
            
            .exit-fullscreen:hover {
                background: #1a73e8;
                color: white;
            }
            
            .exit-fullscreen.show {
                display: block;
            }
            
            .progress-container {
                position: absolute;
                bottom: 70px;
                left: 15px;
                right: 15px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                z-index: 1000;
            }
            
            .progress-bar {
                width: 100%;
                height: 6px;
                background: #e8eaed;
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #1a73e8, #4285f4);
                border-radius: 3px;
                transition: width 0.3s ease;
                width: 0%;
            }
            
            .progress-text {
                font-size: 11px;
                color: #5f6368;
                text-align: center;
                font-weight: 500;
            }
            
            .fallback-map {
                height: 100vh;
                width: 100%;
                background: linear-gradient(45deg, #f0f2f5, #e4e6ea);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                color: #1a73e8;
                font-family: 'Roboto', Arial, sans-serif;
            }
            
            .fallback-content {
                text-align: center;
                max-width: 300px;
                padding: 20px;
            }
            
            .fallback-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .fallback-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #1a73e8;
            }
            
            .fallback-text {
                font-size: 14px;
                color: #5f6368;
                line-height: 1.4;
                margin-bottom: 16px;
            }
            
            .route-display {
                background: white;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                margin-top: 20px;
            }
            
            .route-step {
                padding: 8px 0;
                border-bottom: 1px solid #e8eaed;
                font-size: 12px;
                color: #5f6368;
            }
            
            .route-step:last-child {
                border-bottom: none;
            }
            
            .route-step.active {
                color: #1a73e8;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <div id="fallback-map" class="fallback-map" style="display: none;">
            <div class="fallback-content">
                <div class="fallback-icon">🗺️</div>
                <div class="fallback-title">Route Navigation</div>
                <div class="fallback-text">
                    Trip ${trip.id}: ${trip.pickup.location} to ${trip.delivery.location}
                </div>
                <div class="route-display" id="route-display">
                    <!-- Route steps will be populated here -->
                </div>
            </div>
        </div>
        
        <div class="exit-fullscreen" id="exitFullscreen" onclick="exitFullScreen()">
            ✕
        </div>
        
        <div class="control-panel">
            <div class="route-header">
                🚛 Trip ${trip.id}
            </div>
            <div class="trip-info">
                <div><strong>From:</strong> ${trip.pickup.location}</div>
                <div><strong>To:</strong> ${trip.delivery.location}</div>
                <div><strong>Cargo:</strong> ${trip.cargo}</div>
                <div><strong>Weight:</strong> ${trip.cargoWeight}</div>
                <div id="next-instruction" style="margin-top: 8px; font-weight: 500; color: #1a73e8;">
                    Ready for navigation
                </div>
            </div>
            <div class="route-stats">
                <div class="stat-item">
                    <div class="stat-value" id="total-distance">${trip.distance}</div>
                    <div class="stat-label">Distance</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="total-time">${trip.duration}</div>
                    <div class="stat-label">Duration</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="remaining-distance">${trip.distance}</div>
                    <div class="stat-label">Remaining</div>
                </div>
            </div>
        </div>
        
        <div class="speed-indicator">
            <span>🚛</span>
            <span id="current-speed">0 km/h</span>
        </div>
        
        <div class="custom-zoom-controls">
            <div class="zoom-btn" onclick="zoomIn()">+</div>
            <div class="zoom-btn" onclick="zoomOut()">−</div>
        </div>
        
        <div class="map-controls">
            <div class="control-btn active" onclick="setMapType('roadmap')">Map</div>
            <div class="control-btn" onclick="setMapType('satellite')">Satellite</div>
            <div class="control-btn" onclick="setMapType('hybrid')">Hybrid</div>
            <div class="control-btn" onclick="toggleTraffic()">Traffic</div>
            <div class="control-btn" onclick="fitRoute()">Fit Route</div>
        </div>
        
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="route-progress"></div>
            </div>
            <div class="progress-text" id="progress-text">Ready to start navigation</div>
        </div>
        
        <script>
            let map, directionsService, directionsRenderer;
            let driverMarker, currentPosition = 0;
            let trafficLayer, isTrafficVisible = false;
            let routeWaypoints = [];
            let isNavigating = false;
            let isFullScreen = false;
            let routeSteps = ${JSON.stringify(trip.routeSteps)};
            
            function showFallbackRoute() {
                document.getElementById('map').style.display = 'none';
                document.getElementById('fallback-map').style.display = 'flex';
                
                const routeDisplay = document.getElementById('route-display');
                routeSteps.forEach((step, index) => {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'route-step';
                    stepDiv.innerHTML = \`
                        <strong>Step \${index + 1}:</strong> \${step.instruction}<br>
                        <small>Distance: \${step.distance}</small>
                    \`;
                    routeDisplay.appendChild(stepDiv);
                });
                
                simulateFallbackNavigation();
            }
            
            function simulateFallbackNavigation() {
                window.fallbackNavigation = function(stepIndex) {
                    const steps = document.querySelectorAll('.route-step');
                    steps.forEach((step, index) => {
                        step.classList.toggle('active', index === stepIndex);
                    });
                };
            }
            
            function initMap() {
                try {
                    map = new google.maps.Map(document.getElementById('map'), {
                        zoom: 8,
                        center: { lat: ${(trip.pickup.lat + trip.delivery.lat) / 2}, lng: ${(trip.pickup.lng + trip.delivery.lng) / 2} },
                        mapTypeId: 'roadmap',
                        styles: [
                            {
                                featureType: 'poi',
                                elementType: 'labels',
                                stylers: [{ visibility: 'off' }]
                            },
                            {
                                featureType: 'transit',
                                elementType: 'labels',
                                stylers: [{ visibility: 'off' }]
                            }
                        ],
                        disableDefaultUI: true,
                        zoomControl: false,
                        mapTypeControl: false,
                        scaleControl: true,
                        streetViewControl: false,
                        rotateControl: false,
                        fullscreenControl: false,
                        gestureHandling: 'greedy'
                    });
                    
                    directionsService = new google.maps.DirectionsService();
                    directionsRenderer = new google.maps.DirectionsRenderer({
                        suppressMarkers: true,
                        polylineOptions: {
                            strokeColor: '#1a73e8',
                            strokeWeight: 6,
                            strokeOpacity: 0.8
                        }
                    });
                    directionsRenderer.setMap(map);
                    
                    trafficLayer = new google.maps.TrafficLayer();
                    
                    createRoute();
                } catch (error) {
                    console.error('Google Maps initialization failed:', error);
                    showFallbackRoute();
                }
            }
            
            function createRoute() {
                const start = { lat: ${trip.pickup.lat}, lng: ${trip.pickup.lng} };
                const end = { lat: ${trip.delivery.lat}, lng: ${trip.delivery.lng} };
                
                const waypoints = routeSteps.slice(1, -1).map(step => ({
                    location: { lat: step.lat, lng: step.lng },
                    stopover: false
                }));
                
                const request = {
                    origin: start,
                    destination: end,
                    waypoints: waypoints,
                    travelMode: google.maps.TravelMode.DRIVING,
                    drivingOptions: {
                        departureTime: new Date(),
                        trafficModel: 'bestguess'
                    },
                    unitSystem: google.maps.UnitSystem.METRIC,
                    avoidHighways: false,
                    avoidTolls: false
                };
                
                directionsService.route(request, (result, status) => {
                    if (status === 'OK') {
                        directionsRenderer.setDirections(result);
                        
                        const route = result.routes[0];
                        const leg = route.legs[0];
                        
                        document.getElementById('total-distance').textContent = leg.distance.text;
                        document.getElementById('total-time').textContent = leg.duration.text;
                        document.getElementById('remaining-distance').textContent = leg.distance.text;
                        
                        routeWaypoints = route.overview_path;
                        
                        createCustomMarkers(start, end);
                        
                        if (route.legs[0].steps.length > 0) {
                            document.getElementById('next-instruction').textContent = 
                                route.legs[0].steps[0].instructions.replace(/<[^>]*>/g, '');
                        }
                    } else {
                        console.error('Directions request failed:', status);
                        document.getElementById('next-instruction').textContent = 
                            'Using offline route data for navigation';
                        showFallbackRoute();
                    }
                });
            }
            
            function createCustomMarkers(start, end) {
                driverMarker = new google.maps.Marker({
                    position: start,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#1a73e8',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3
                    },
                    title: 'Driver Location',
                    zIndex: 1000
                });
                
                const destinationMarker = new google.maps.Marker({
                    position: end,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#ea4335',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                    },
                    title: 'Destination: ${trip.delivery.location}'
                });
                
                const driverInfoWindow = new google.maps.InfoWindow({
                    content: \`
                        <div style="padding: 10px; font-family: 'Roboto', sans-serif;">
                            <h4 style="margin: 0 0 8px 0; color: #1a73e8;">Driver Location</h4>
                            <p style="margin: 0; color: #5f6368; font-size: 12px;">
                                Trip ${trip.id}<br>
                                <strong>Speed:</strong> <span id="popup-speed">0 km/h</span><br>
                                <strong>Status:</strong> <span id="popup-status">Ready</span>
                            </p>
                        </div>
                    \`
                });
                
                const destInfoWindow = new google.maps.InfoWindow({
                    content: \`
                        <div style="padding: 10px; font-family: 'Roboto', sans-serif;">
                            <h4 style="margin: 0 0 8px 0; color: #ea4335;">Destination</h4>
                            <p style="margin: 0; color: #5f6368; font-size: 12px;">
                                ${trip.delivery.location}<br>
                                ${trip.delivery.address}<br>
                                <strong>ETA:</strong> ${trip.delivery.time}
                            </p>
                        </div>
                    \`
                });
                
                driverMarker.addListener('click', () => {
                    destInfoWindow.close();
                    driverInfoWindow.open(map, driverMarker);
                });
                
                destinationMarker.addListener('click', () => {
                    driverInfoWindow.close();
                    destInfoWindow.open(map, destinationMarker);
                });
            }
            
            function zoomIn() {
                if (map) map.setZoom(map.getZoom() + 1);
            }
            
            function zoomOut() {
                if (map) map.setZoom(map.getZoom() - 1);
            }
            
            function setMapType(type) {
                if (map) {
                    map.setMapTypeId(type);
                    
                    document.querySelectorAll('.control-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    event.target.classList.add('active');
                }
            }
            
            function toggleTraffic() {
                if (map && trafficLayer) {
                    if (isTrafficVisible) {
                        trafficLayer.setMap(null);
                        event.target.classList.remove('active');
                    } else {
                        trafficLayer.setMap(map);
                        event.target.classList.add('active');
                    }
                    isTrafficVisible = !isTrafficVisible;
                }
            }
            
            function fitRoute() {
                if (map) {
                    const bounds = new google.maps.LatLngBounds();
                    bounds.extend({ lat: ${trip.pickup.lat}, lng: ${trip.pickup.lng} });
                    bounds.extend({ lat: ${trip.delivery.lat}, lng: ${trip.delivery.lng} });
                    map.fitBounds(bounds, { padding: 50 });
                }
            }
            
            function enterFullScreen() {
                isFullScreen = true;
                document.getElementById('exitFullscreen').classList.add('show');
                if (map) {
                    setTimeout(() => {
                        google.maps.event.trigger(map, 'resize');
                        fitRoute();
                    }, 100);
                }
            }
            
            function exitFullScreen() {
                window.ReactNativeWebView?.postMessage('EXIT_FULLSCREEN');
            }
            
            function startNavigation() {
                if (isNavigating) return;
                
                isNavigating = true;
                currentPosition = 0;
                
                document.getElementById('current-speed').textContent = '65 km/h';
                document.getElementById('progress-text').textContent = 'Navigation in progress...';
                
                const moveDriver = () => {
                    if (currentPosition < routeSteps.length - 1) {
                        currentPosition++;
                        
                        if (window.fallbackNavigation) {
                            window.fallbackNavigation(currentPosition);
                        }
                        
                        if (driverMarker && routeWaypoints.length > 0) {
                            const stepProgress = Math.floor((currentPosition / (routeSteps.length - 1)) * routeWaypoints.length);
                            const clampedProgress = Math.min(stepProgress, routeWaypoints.length - 1);
                            
                            if (routeWaypoints[clampedProgress]) {
                                driverMarker.setPosition(routeWaypoints[clampedProgress]);
                            }
                        }
                        
                        const progress = (currentPosition / (routeSteps.length - 1)) * 100;
                        document.getElementById('route-progress').style.width = progress + '%';
                        
                        const totalDistance = parseInt('${trip.distance}'.replace(' km', ''));
                        const remainingKm = Math.round(totalDistance * (1 - progress / 100));
                        document.getElementById('remaining-distance').textContent = remainingKm + ' km';
                        
                        if (routeSteps[currentPosition]) {
                            document.getElementById('next-instruction').textContent = 
                                routeSteps[currentPosition].instruction;
                        }
                        
                        const speeds = [45, 55, 65, 75, 60, 50, 70];
                        const speed = speeds[Math.floor(Math.random() * speeds.length)];
                        document.getElementById('current-speed').textContent = speed + ' km/h';
                        
                        if (currentPosition < routeSteps.length - 1) {
                            setTimeout(moveDriver, 3000);
                        } else {
                            document.getElementById('current-speed').textContent = '0 km/h';
                            document.getElementById('progress-text').textContent = 'Destination reached!';
                            document.getElementById('remaining-distance').textContent = '0 km';
                            document.getElementById('next-instruction').textContent = 'Trip completed successfully!';
                            isNavigating = false;
                        }
                    }
                };
                
                setTimeout(moveDriver, 1000);
            }
            
            window.addEventListener('message', function(event) {
                if (event.data === 'START_TRACKING') {
                    startNavigation();
                } else if (event.data === 'ENTER_FULLSCREEN') {
                    enterFullScreen();
                }
            });
            
            function loadGoogleMaps() {
                const script = document.createElement('script');
                script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAMIfypjgj4ARy3ldyvSTNZ4y_-fbwDJ7E&callback=initMap&libraries=geometry';
                script.async = true;
                script.defer = true;
                script.onerror = function() {
                    console.error('Failed to load Google Maps API - falling back to route display');
                    showFallbackRoute();
                };
                document.head.appendChild(script);
            }
            
            window.initMap = function() {
                try {
                    initMap();
                } catch (error) {
                    console.error('Error initializing Google Maps:', error);
                    showFallbackRoute();
                }
            };
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    if (typeof google === 'undefined') {
                        loadGoogleMaps();
                    } else {
                        initMap();
                    }
                });
            } else {
                if (typeof google === 'undefined') {
                    loadGoogleMaps();
                } else {
                    initMap();
                }
            }
            
            setTimeout(function() {
                if (!map && document.getElementById('map').style.display !== 'none') {
                    console.log('Google Maps failed to initialize, showing fallback');
                    showFallbackRoute();
                }
            }, 5000);
        </script>
    </body>
    </html>
`;

    const webViewRef = useRef(null);

    const handleWebViewMessage = (event: any) => {
        const message = event.nativeEvent.data;
        console.log('WebView message:', message);

        if (message === 'EXIT_FULLSCREEN') {
            setFullScreenMap(false);
        }
    };

    const renderNavigationView = () => {
        if (!selectedTrip) return null;

        const renderMap = (isFullScreen = false) => (
            <View style={isFullScreen ? styles.fullScreenMapContainer : styles.mapContainer}>
                <WebView
                    ref={webViewRef}
                    source={{ html: generateMapHtml(selectedTrip) }}
                    style={isFullScreen ? styles.fullScreenMap : styles.map}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    onMessage={handleWebViewMessage}
                    injectedJavaScript={
                        tripStarted
                            ? (isFullScreen
                                ? "window.postMessage('START_TRACKING', '*'); window.postMessage('ENTER_FULLSCREEN', '*');"
                                : "window.postMessage('START_TRACKING', '*');")
                            : (isFullScreen
                                ? "window.postMessage('ENTER_FULLSCREEN', '*');"
                                : "")
                    }
                />

                {!isFullScreen && (
                    <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => setFullScreenMap(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.expandButtonText}>⛶</Text>
                    </TouchableOpacity>
                )}
            </View>
        );

        return (
            <>
                <StatusBar barStyle={fullScreenMap ? "light-content" : "dark-content"} />

                <Modal
                    visible={fullScreenMap}
                    animationType="slide"
                    statusBarTranslucent={true}
                    onRequestClose={() => setFullScreenMap(false)}
                >
                    <View style={styles.fullScreenContainer}>
                        {renderMap(true)}
                    </View>
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

                    {tripStarted && currentLocation && (
                        <View style={styles.navigationCard}>
                            <Text style={styles.navigationTitle}>Current Navigation</Text>
                            <View style={styles.stepContainer}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepText}>{currentStep + 1}</Text>
                                </View>
                                <View style={styles.stepInfo}>
                                    <Text style={styles.stepInstruction}>{currentLocation.instruction}</Text>
                                    <Text style={styles.stepDistance}>Distance: {currentLocation.distance}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {!showMap ? (
                        <TouchableOpacity
                            style={styles.loadButton}
                            onPress={() => setShowMap(true)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.loadButtonText}>Load Google Maps Navigation</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            {renderMap(false)}

                            <View style={styles.controlsContainer}>
                                {!tripStarted ? (
                                    <TouchableOpacity
                                        style={styles.startButton}
                                        onPress={handleStartTrip}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.startButtonText}>Start Navigation</Text>
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

                            <View style={styles.statsContainer}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Distance Covered</Text>
                                    <Text style={styles.statValue}>{distanceCovered} KM</Text>
                                    <Text style={styles.statSubtext}>
                                        {Math.round((distanceCovered / parseInt(selectedTrip.distance.replace(' km', ''))) * 100)}% Complete
                                    </Text>
                                </View>

                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Remaining</Text>
                                    <Text style={styles.statValue}>{parseInt(selectedTrip.distance.replace(' km', '')) - distanceCovered} KM</Text>
                                    <Text style={styles.statSubtext}>
                                        Est. {Math.round((parseInt(selectedTrip.distance.replace(' km', '')) - distanceCovered) / 60 * 60)} mins
                                    </Text>
                                </View>

                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Current Speed</Text>
                                    <Text style={styles.statValue}>
                                        {tripStarted ? "65 KM/H" : "0 KM/H"}
                                    </Text>
                                    <Text style={styles.statSubtext}>
                                        {tripStarted ? "Highway" : "Stopped"}
                                    </Text>
                                </View>

                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>ETA</Text>
                                    <Text style={styles.statValue}>{selectedTrip.estimatedArrival}</Text>
                                    <Text style={styles.statSubtext}>Today</Text>
                                </View>
                            </View>
                        </>
                    )}
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

    // Navigation Card
    navigationCard: {
        backgroundColor: "#1F2937",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        elevation: 4,
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

    // Map and Controls
    loadButton: {
        backgroundColor: "#1a73e8",
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        elevation: 3,
    },
    loadButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },

    fullScreenContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    fullScreenMapContainer: {
        flex: 1,
        position: "relative",
    },
    fullScreenMap: {
        flex: 1,
        width: width,
        height: height,
    },

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
    },
    map: {
        width: width - 32,
        height: 400,
    },

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
    },
    startButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
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
    },
    stopButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },

    // Stats Container
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
    },
    statSubtext: {
        fontSize: 10,
        color: "#9CA3AF",
    },

    // Responsive design for tablets
    '@media (min-width: 768px)': {
        container: {
            paddingHorizontal: 24,
        },
        tripCard: {
            marginHorizontal: 24,
        },
        mapContainer: {
            marginHorizontal: 24,
            height: 500,
        },
        map: {
            width: width - 48,
            height: 500,
        },
        statBox: {
            minWidth: (width - 80) / 4,
        },
    },
});