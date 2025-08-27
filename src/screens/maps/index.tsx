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
} from "react-native";
import { WebView } from "react-native-webview";

const { width, height } = Dimensions.get("window");

export default function DriverTrackingScreen() {
    const [showMap, setShowMap] = useState(false);
    const [fullScreenMap, setFullScreenMap] = useState(false);
    const [tripStarted, setTripStarted] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [distanceCovered, setDistanceCovered] = useState(0);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [eta, setEta] = useState("2:30 PM");
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Route waypoints for detailed navigation
    const routeSteps = [
        {
            lat: 40.7128, lng: -74.0060,
            instruction: "Start from Manhattan, New York",
            distance: "0 km",
            type: "start"
        },
        {
            lat: 40.8176, lng: -73.7781,
            instruction: "Take I-95 N toward Bronx",
            distance: "25 km",
            type: "highway"
        },
        {
            lat: 41.0534, lng: -73.5387,
            instruction: "Continue on I-95 N through Connecticut",
            distance: "45 km",
            type: "highway"
        },
        {
            lat: 41.2033, lng: -73.2094,
            instruction: "Merge onto I-91 N toward Springfield",
            distance: "35 km",
            type: "merge"
        },
        {
            lat: 41.7658, lng: -72.6851,
            instruction: "Take I-90 E (Mass Pike) toward Boston",
            distance: "65 km",
            type: "highway"
        },
        {
            lat: 42.0629, lng: -71.7611,
            instruction: "Continue on I-90 E through Worcester",
            distance: "40 km",
            type: "highway"
        },
        {
            lat: 42.3601, lng: -71.0589,
            instruction: "Exit to downtown Boston - Destination reached",
            distance: "30 km",
            type: "destination"
        }
    ];

    useEffect(() => {
        if (tripStarted) {
            const interval = setInterval(() => {
                setCurrentStep(prev => {
                    const next = prev + 1;
                    if (next < routeSteps.length) {
                        setDistanceCovered(prev => prev + 5);
                        setCurrentLocation(routeSteps[next]);
                        return next;
                    }
                    return prev;
                });
            }, 8000);

            return () => clearInterval(interval);
        }
    }, [tripStarted]);

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

    const handleStartTrip = () => {
        setTripStarted(true);
        setCurrentLocation(routeSteps[0]);
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

    const handleMapExpand = () => {
        setFullScreenMap(true);
    };

    const handleMapClose = () => {
        setFullScreenMap(false);
    };

    // Professional Google Maps HTML with routing and zoom controls
    const mapHtml = `
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
            
            /* Custom Control Panel */
            .control-panel {
                position: absolute;
                top: 15px;
                left: 15px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 15px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                max-width: 280px;
                z-index: 1000;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .route-header {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                font-weight: 600;
                color: #1a73e8;
                font-size: 14px;
            }
            
            .route-info {
                font-size: 12px;
                color: #5f6368;
                line-height: 1.4;
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
            
            /* Speed and Status Indicator */
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
            
            /* Custom Zoom Controls */
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
            
            /* Map Style Controls */
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
            
            /* Exit Full Screen Button */
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
            
            /* Progress Bar */
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
            
            /* Error Message Styling */
            .error-message {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(220, 38, 38, 0.9);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                max-width: 300px;
                z-index: 2000;
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
                    Interactive route display from Manhattan, NY to Boston, MA
                </div>
                <div class="route-display" id="route-display">
                    <!-- Route steps will be populated here -->
                </div>
            </div>
        </div>
        
        <!-- Exit Full Screen Button -->
        <div class="exit-fullscreen" id="exitFullscreen" onclick="exitFullScreen()">
            ✕
        </div>
        
        <!-- Custom Control Panel -->
        <div class="control-panel">
            <div class="route-header">
                🧭 Navigation Route
            </div>
            <div class="route-info">
                <div><strong>From:</strong> Manhattan, NY</div>
                <div><strong>To:</strong> Boston, MA</div>
                <div id="next-instruction" style="margin-top: 8px; font-weight: 500; color: #1a73e8;">
                    Ready for navigation
                </div>
            </div>
            <div class="route-stats">
                <div class="stat-item">
                    <div class="stat-value" id="total-distance">240 km</div>
                    <div class="stat-label">Distance</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="total-time">4h 30m</div>
                    <div class="stat-label">Duration</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="remaining-distance">240 km</div>
                    <div class="stat-label">Remaining</div>
                </div>
            </div>
        </div>
        
        <!-- Speed Indicator -->
        <div class="speed-indicator">
            <span>🚛</span>
            <span id="current-speed">0 km/h</span>
        </div>
        
        <!-- Custom Zoom Controls -->
        <div class="custom-zoom-controls">
            <div class="zoom-btn" onclick="zoomIn()">+</div>
            <div class="zoom-btn" onclick="zoomOut()">−</div>
        </div>
        
        <!-- Map Style Controls -->
        <div class="map-controls">
            <div class="control-btn active" onclick="setMapType('roadmap')">Map</div>
            <div class="control-btn" onclick="setMapType('satellite')">Satellite</div>
            <div class="control-btn" onclick="setMapType('hybrid')">Hybrid</div>
            <div class="control-btn" onclick="toggleTraffic()">Traffic</div>
            <div class="control-btn" onclick="fitRoute()">Fit Route</div>
        </div>
        
        <!-- Progress Bar -->
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
            let routeSteps = [
                { lat: 40.7128, lng: -74.0060, instruction: "Start from Manhattan, New York", distance: "0 km", type: "start" },
                { lat: 40.8176, lng: -73.7781, instruction: "Take I-95 N toward Bronx", distance: "25 km", type: "highway" },
                { lat: 41.0534, lng: -73.5387, instruction: "Continue on I-95 N through Connecticut", distance: "45 km", type: "highway" },
                { lat: 41.2033, lng: -73.2094, instruction: "Merge onto I-91 N toward Springfield", distance: "35 km", type: "merge" },
                { lat: 41.7658, lng: -72.6851, instruction: "Take I-90 E (Mass Pike) toward Boston", distance: "65 km", type: "highway" },
                { lat: 42.0629, lng: -71.7611, instruction: "Continue on I-90 E through Worcester", distance: "40 km", type: "highway" },
                { lat: 42.3601, lng: -71.0589, instruction: "Exit to downtown Boston - Destination reached", distance: "30 km", type: "destination" }
            ];
            
            // Fallback route display
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
                
                // Simulate movement through fallback route
                simulateFallbackNavigation();
            }
            
            function simulateFallbackNavigation() {
                // This will be triggered by React Native WebView messages
                window.fallbackNavigation = function(stepIndex) {
                    const steps = document.querySelectorAll('.route-step');
                    steps.forEach((step, index) => {
                        step.classList.toggle('active', index === stepIndex);
                    });
                };
            }
            
            // Initialize Google Maps with error handling
            function initMap() {
                try {
                    // Create map with professional styling
                    map = new google.maps.Map(document.getElementById('map'), {
                        zoom: 8,
                        center: { lat: 41.5, lng: -72.5 }, // Center between NY and Boston
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
                    
                    // Initialize directions service and renderer
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
                    
                    // Initialize traffic layer
                    trafficLayer = new google.maps.TrafficLayer();
                    
                    // Create route
                    createRoute();
                } catch (error) {
                    console.error('Google Maps initialization failed:', error);
                    showFallbackRoute();
                }
            }
            
            function createRoute() {
                const start = { lat: 40.7128, lng: -74.0060 }; // Manhattan
                const end = { lat: 42.3601, lng: -71.0589 };   // Boston
                
                // Waypoints for more realistic routing
                const waypoints = [
                    { location: { lat: 40.8176, lng: -73.7781 }, stopover: false },
                    { location: { lat: 41.0534, lng: -73.5387 }, stopover: false },
                    { location: { lat: 41.2033, lng: -73.2094 }, stopover: false },
                    { location: { lat: 41.7658, lng: -72.6851 }, stopover: false },
                    { location: { lat: 42.0629, lng: -71.7611 }, stopover: false }
                ];
                
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
                        
                        // Extract route information
                        const route = result.routes[0];
                        const leg = route.legs[0];
                        
                        // Update route stats
                        document.getElementById('total-distance').textContent = leg.distance.text;
                        document.getElementById('total-time').textContent = leg.duration.text;
                        document.getElementById('remaining-distance').textContent = leg.distance.text;
                        
                        // Store waypoints for animation
                        routeWaypoints = route.overview_path;
                        
                        // Create custom markers
                        createCustomMarkers(start, end);
                        
                        // Update instructions
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
                // Driver marker (animated)
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
                
                // Destination marker
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
                    title: 'Destination: Boston, MA'
                });
                
                // Info windows
                const driverInfoWindow = new google.maps.InfoWindow({
                    content: \`
                        <div style="padding: 10px; font-family: 'Roboto', sans-serif;">
                            <h4 style="margin: 0 0 8px 0; color: #1a73e8;">🚛 Driver Location</h4>
                            <p style="margin: 0; color: #5f6368; font-size: 12px;">
                                Current Position<br>
                                <strong>Speed:</strong> <span id="popup-speed">0 km/h</span><br>
                                <strong>Status:</strong> <span id="popup-status">Ready</span>
                            </p>
                        </div>
                    \`
                });
                
                const destInfoWindow = new google.maps.InfoWindow({
                    content: \`
                        <div style="padding: 10px; font-family: 'Roboto', sans-serif;">
                            <h4 style="margin: 0 0 8px 0; color: #ea4335;">🏁 Destination</h4>
                            <p style="margin: 0; color: #5f6368; font-size: 12px;">
                                Boston, Massachusetts<br>
                                Downtown Area
                            </p>
                        </div>
                    \`
                });
                
                // Add click listeners for info windows
                driverMarker.addListener('click', () => {
                    destInfoWindow.close();
                    driverInfoWindow.open(map, driverMarker);
                });
                
                destinationMarker.addListener('click', () => {
                    driverInfoWindow.close();
                    destInfoWindow.open(map, destinationMarker);
                });
            }
            
            // Zoom controls
            function zoomIn() {
                if (map) map.setZoom(map.getZoom() + 1);
            }
            
            function zoomOut() {
                if (map) map.setZoom(map.getZoom() - 1);
            }
            
            // Map type controls
            function setMapType(type) {
                if (map) {
                    map.setMapTypeId(type);
                    
                    // Update active button
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
                    bounds.extend({ lat: 40.7128, lng: -74.0060 }); // NYC
                    bounds.extend({ lat: 42.3601, lng: -71.0589 }); // Boston
                    map.fitBounds(bounds, { padding: 50 });
                }
            }
            
            // Full screen functions
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
            
            // Driver movement simulation
            function startNavigation() {
                if (isNavigating) return;
                
                isNavigating = true;
                currentPosition = 0;
                
                document.getElementById('current-speed').textContent = '65 km/h';
                document.getElementById('progress-text').textContent = 'Navigation in progress...';
                
                const moveDriver = () => {
                    if (currentPosition < routeSteps.length - 1) {
                        currentPosition++;
                        
                        // Update fallback display if using fallback
                        if (window.fallbackNavigation) {
                            window.fallbackNavigation(currentPosition);
                        }
                        
                        // Update Google Maps if available
                        if (driverMarker && routeWaypoints.length > 0) {
                            const stepProgress = Math.floor((currentPosition / (routeSteps.length - 1)) * routeWaypoints.length);
                            const clampedProgress = Math.min(stepProgress, routeWaypoints.length - 1);
                            
                            if (routeWaypoints[clampedProgress]) {
                                driverMarker.setPosition(routeWaypoints[clampedProgress]);
                            }
                        }
                        
                        // Update progress
                        const progress = (currentPosition / (routeSteps.length - 1)) * 100;
                        document.getElementById('route-progress').style.width = progress + '%';
                        
                        // Update remaining distance
                        const remainingKm = Math.round(240 * (1 - progress / 100));
                        document.getElementById('remaining-distance').textContent = remainingKm + ' km';
                        
                        // Update instruction
                        if (routeSteps[currentPosition]) {
                            document.getElementById('next-instruction').textContent = 
                                routeSteps[currentPosition].instruction;
                        }
                        
                        // Update speed randomly for realism
                        const speeds = [45, 55, 65, 75, 60, 50, 70];
                        const speed = speeds[Math.floor(Math.random() * speeds.length)];
                        document.getElementById('current-speed').textContent = speed + ' km/h';
                        
                        // Continue movement
                        if (currentPosition < routeSteps.length - 1) {
                            setTimeout(moveDriver, 3000); // 3 second intervals
                        } else {
                            // Destination reached
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
            
            // Communication with React Native
            window.addEventListener('message', function(event) {
                if (event.data === 'START_TRACKING') {
                    startNavigation();
                } else if (event.data === 'ENTER_FULLSCREEN') {
                    enterFullScreen();
                }
            });
            
            // Load Google Maps API with error handling
            function loadGoogleMaps() {
                const script = document.createElement('script');
                // IMPORTANT: Replace 'YOUR_ACTUAL_API_KEY' with your real Google Maps API key
                // Change this line in the HTML:
                script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAMIfypjgj4ARy3ldyvSTNZ4y_-fbwDJ7E&callback=initMap&libraries=geometry';
                script.async = true;
                script.defer = true;
                script.onerror = function() {
                    console.error('Failed to load Google Maps API - falling back to route display');
                    showFallbackRoute();
                };
                document.head.appendChild(script);
            }
            
            // Handle case where Google Maps API is not available
            window.initMap = function() {
                try {
                    initMap();
                } catch (error) {
                    console.error('Error initializing Google Maps:', error);
                    showFallbackRoute();
                }
            };
            
            // Initialize on page load
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    // Check if we can access Google Maps
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
            
            // Fallback initialization if Google Maps fails to load
            setTimeout(function() {
                if (!map && document.getElementById('map').style.display !== 'none') {
                    console.log('Google Maps failed to initialize, showing fallback');
                    showFallbackRoute();
                }
            }, 5000); // Wait 5 seconds for Google Maps to load
        </script>
    </body>
    </html>
`;

    const webViewRef = useRef(null);

    const handleWebViewMessage = (event) => {
        const message = event.nativeEvent.data;
        console.log('WebView message:', message);

        if (message === 'EXIT_FULLSCREEN') {
            setFullScreenMap(false);
        }
    };

    const renderMap = (isFullScreen = false) => (
        <View style={isFullScreen ? styles.fullScreenMapContainer : styles.mapContainer}>
            <WebView
                ref={webViewRef}
                source={{ html: mapHtml }}
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

            {/* Expand button for embedded map */}
            {!isFullScreen && (
                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={handleMapExpand}
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

            {/* Full Screen Map Modal */}
            <Modal
                visible={fullScreenMap}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={handleMapClose}
            >
                <View style={styles.fullScreenContainer}>
                    {renderMap(true)}
                </View>
            </Modal>

            {/* Regular Screen Content */}
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Driver Header */}
                <View style={styles.headerContainer}>
                    <Text style={styles.header}>Professional Navigation</Text>
                    <Animated.View style={[styles.liveIndicator, { transform: [{ scale: pulseAnim }] }]}>
                        <Text style={styles.liveText}>
                            {tripStarted ? "🔴 LIVE" : "⚪ OFFLINE"}
                        </Text>
                    </Animated.View>
                </View>

                {/* Current Trip Info */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Status</Text>
                        <Text style={[styles.value, tripStarted ? styles.statusActive : styles.statusInactive]}>
                            {tripStarted ? "🚛 In Transit" : "📋 Ready to Start"}
                        </Text>
                    </View>

                    <View style={styles.routeSection}>
                        <Text style={styles.sectionTitle}>Route Information</Text>

                        <View style={styles.locationRow}>
                            <View style={styles.locationDot}>
                                <Text style={styles.locationEmoji}>📦</Text>
                            </View>
                            <View style={styles.locationInfo}>
                                <Text style={styles.locationLabel}>Pickup</Text>
                                <Text style={styles.locationValue}>Manhattan, New York</Text>
                                <Text style={styles.locationAddress}>Financial District</Text>
                            </View>
                        </View>

                        <View style={styles.routeLine} />

                        <View style={styles.locationRow}>
                            <View style={styles.locationDot}>
                                <Text style={styles.locationEmoji}>🏁</Text>
                            </View>
                            <View style={styles.locationInfo}>
                                <Text style={styles.locationLabel}>Delivery</Text>
                                <Text style={styles.locationValue}>Boston, Massachusetts</Text>
                                <Text style={styles.locationAddress}>Downtown Area</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Current Navigation Step */}
                {tripStarted && currentLocation && (
                    <View style={styles.navigationCard}>
                        <Text style={styles.navigationTitle}>🧭 Current Navigation</Text>
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

                {/* Map Controls */}
                {!showMap ? (
                    <TouchableOpacity
                        style={styles.loadButton}
                        onPress={() => setShowMap(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.loadButtonText}>🗺️ Load Google Maps Navigation</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        {/* Embedded Google Maps */}
                        {renderMap(false)}

                        {/* Trip Controls */}
                        <View style={styles.controlsContainer}>
                            {!tripStarted ? (
                                <TouchableOpacity
                                    style={styles.startButton}
                                    onPress={handleStartTrip}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.startButtonText}>🚀 Start Google Maps Navigation</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.tripControls}>
                                    <TouchableOpacity
                                        style={styles.pauseButton}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.pauseButtonText}>⏸️ Pause</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.stopButton}
                                        onPress={handleStopTrip}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.stopButtonText}>⏹️ Stop Trip</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Real-time Trip Stats */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Distance Covered</Text>
                                <Text style={styles.statValue}>{distanceCovered} KM</Text>
                                <Text style={styles.statSubtext}>
                                    {Math.round((distanceCovered / 240) * 100)}% Complete
                                </Text>
                            </View>

                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Remaining</Text>
                                <Text style={styles.statValue}>{240 - distanceCovered} KM</Text>
                                <Text style={styles.statSubtext}>
                                    Est. {Math.round((240 - distanceCovered) / 60 * 60)} mins
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
                                <Text style={styles.statValue}>{eta}</Text>
                                <Text style={styles.statSubtext}>Today</Text>
                            </View>
                        </View>

                        {/* Map Instructions */}
                        <View style={styles.instructionsCard}>
                            <Text style={styles.instructionsTitle}>📱 Map Features</Text>
                            <View style={styles.featureList}>
                                <Text style={styles.featureItem}>• Tap expand button (⛶) to view map in full screen</Text>
                                <Text style={styles.featureItem}>• Pinch to zoom in/out or use + - buttons</Text>
                                <Text style={styles.featureItem}>• Switch between Map, Satellite, and Hybrid views</Text>
                                <Text style={styles.featureItem}>• Toggle traffic layer for real-time conditions</Text>
                                <Text style={styles.featureItem}>• Tap markers for detailed information</Text>
                                <Text style={styles.featureItem}>• Use "Fit Route" to view entire journey</Text>
                                <Text style={styles.featureItem}>• Real-time driver position tracking</Text>
                                <Text style={styles.featureItem}>• Press ✕ button to exit full screen mode</Text>
                            </View>


                        </View>
                    </>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    // Main Container Styles
    container: {
        flex: 1,
        backgroundColor: "#f5f7fa",
    },

    // Header Styles
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 16,
    },
    header: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1a1a1a",
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

    // Card Styles
    card: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    // Row and Text Styles
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: "#666",
        fontWeight: "500",
    },
    value: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a1a",
    },
    statusActive: {
        color: "#1a73e8",
    },
    statusInactive: {
        color: "#6B7280",
    },

    // Route Section Styles
    routeSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginBottom: 16,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    locationDot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#1a73e8",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    locationEmoji: {
        fontSize: 18,
    },
    locationInfo: {
        flex: 1,
    },
    locationLabel: {
        fontSize: 12,
        color: "#666",
        fontWeight: "500",
    },
    locationValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginTop: 2,
    },
    locationAddress: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 1,
    },
    routeLine: {
        width: 2,
        height: 20,
        backgroundColor: "#1a73e8",
        marginLeft: 19,
        marginVertical: 4,
    },

    // Navigation Card Styles
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

    // Load Button Styles
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

    // Full Screen Map Styles
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

    // Regular Map Styles
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

    // Expand Button Styles
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

    // Control Styles
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

    // Stats Container Styles
    statsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: 16,
        marginBottom: 16,
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

    // Instructions Card Styles
    instructionsCard: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: "#4285f4",
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginBottom: 12,
    },
    featureList: {
        marginBottom: 16,
    },
    featureItem: {
        fontSize: 14,
        color: "#5f6368",
        marginBottom: 6,
        lineHeight: 20,
    },
    setupNote: {
        backgroundColor: "#f8f9fa",
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#1a73e8",
    },
    setupTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#1a73e8",
        marginBottom: 8,
    },
    setupText: {
        fontSize: 12,
        color: "#5f6368",
        marginBottom: 4,
        lineHeight: 16,
    },

    // Responsive Styles for Tablets
    '@media (min-width: 768px)': {
        container: {
            paddingHorizontal: 24,
        },
        headerContainer: {
            marginHorizontal: 24,
        },
        card: {
            marginHorizontal: 24,
        },
        navigationCard: {
            marginHorizontal: 24,
        },
        loadButton: {
            marginHorizontal: 24,
        },
        mapContainer: {
            marginHorizontal: 24,
            height: 500, // Larger height for tablets
        },
        map: {
            width: width - 48,
            height: 500,
        },
        controlsContainer: {
            marginHorizontal: 24,
        },
        statsContainer: {
            marginHorizontal: 24,
        },
        instructionsCard: {
            marginHorizontal: 24,
        },
        statBox: {
            minWidth: (width - 80) / 4, // 4 columns on tablets
        },
    },

    // Dark Mode Support (Optional)
    '@media (prefers-color-scheme: dark)': {
        container: {
            backgroundColor: "#1a1a1a",
        },
        card: {
            backgroundColor: "#2d2d2d",
        },
        header: {
            color: "#ffffff",
        },
        sectionTitle: {
            color: "#ffffff",
        },
        locationValue: {
            color: "#ffffff",
        },
        value: {
            color: "#ffffff",
        },
        instructionsCard: {
            backgroundColor: "#2d2d2d",
        },
        instructionsTitle: {
            color: "#ffffff",
        },
        statBox: {
            backgroundColor: "#2d2d2d",
        },
        statValue: {
            color: "#ffffff",
        },
    },
});