// src/navigation/AppNavigator.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ActivityIndicator, Image, Animated, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp } from '@react-navigation/native';
import { authManager } from '../types/AuthManager';
import { apiService } from '../services/api/apiService';
import { socketService } from '../services/socket/socketService';

// Import screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OtpScreen from '../screens/auth/OTPScreen';
import Header from "../../src/components/common/Header"
import Footer from "../../src/components/common/Footer"
import NewTripScreen from '../screens/newTrip/index';
import VehicleScreen from "../screens/vehicle/index";
import TrailerScreen from "../screens/trailer/index";
import HosScreen from "../screens/hos/index"
import AssetIncidentsScreen from "../screens/assestins/index"
import SettingsScreen from "../screens/settings/index"
import DocumentsScreen from "../screens/documents/index"
import LoadMapScreen from "../screens/maps/index"
import TransferScreen from "../screens/transfer/index"
import FuelScreen from "../screens/fuel/index"
import ActiveTrips from "../screens/dashboard/ActiveTrips";
import CompleteTrips from "../screens/dashboard/CompleteTrips";
import PendingTrips from "../screens/dashboard/PendingTrips";

// Import new screens
import NotificationsScreen from "../screens/notifications/index";
import HelpScreen from "../screens/help/index";
import SearchScreen from "../screens/search/index";
import TripInfoScreen from "../screens/tripInfo/index";
import CrashLogsScreen from "../screens/settings/CrashLogsScreen";
import TripChatScreen from "../screens/chat/TripChatScreen";
import DriverChatScreen from "../screens/chat/DriverChatScreen";
import OnboardingGuardScreen from "../screens/onboarding/OnboardingGuardScreen";
import TrainingScreen from "../screens/onboarding/TrainingScreen";
import TestsScreen from "../screens/onboarding/TestsScreen";
import TakeTestScreen from "../screens/onboarding/TakeTestScreen";
import TestResultsScreen from "../screens/onboarding/TestResultsScreen";
import CertificatesScreen from "../screens/onboarding/CertificatesScreen";
import HRApprovalScreen from "../screens/onboarding/HRApprovalScreen";
import ELDDocumentsScreen from "../screens/eld/ELDDocumentsScreen";
import MileageSheetScreen from "../screens/mileage/MileageSheetScreen";

// Asset imports - using require for better compatibility with Expo
const appLogo = require("../../assets/app-icon.png");

// Constants for storage keys
const STORAGE_KEYS = {
    IS_AUTHENTICATED: '@fleetgo_is_authenticated',
    USER_DATA: '@fleetgo_user_data',
    LOGIN_TIME: '@fleetgo_login_time'
};

// Type definitions
interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    userData: any;
}

interface AuthStatus {
    isAuthenticated: boolean;
    userData: any;
    loginTime: Date | null;
}

interface MainTabNavigatorProps {
    onLogout: () => void;
    navigation: NavigationProp<RootStackParamList>;
}

interface PlaceholderScreenProps {
    title: string;
}

// Navigation Types - Include all screens in MainTabParamList
export type MainTabParamList = {
    Dashboard: { refresh?: boolean } | undefined;
    NewTrip: undefined;
    Vehicle: undefined;
    Trailer: undefined;
    HOS: undefined;
    AssetIncidents: undefined;
    Documents: undefined;
    Settings: undefined;
    Transfer: undefined;
    LoadMap: undefined;
    Fuel: undefined;
    ActiveTrips: undefined;
    CompleteTrips: undefined;
    PendingTrips: undefined;
    Notifications: undefined;
    Help: undefined;
    Search: undefined;
    Trips: undefined;
    MileageSheet: undefined;
};

export type RootStackParamList = {
    Login: undefined;
    OTP: undefined;
    MainTabs: { screen?: keyof MainTabParamList };
    NewTrip: undefined;
    Vehicle: undefined;
    Trailer: undefined;
    HOS: undefined;
    AssetIncidents: undefined;
    Settings: undefined;
    Transfer: undefined;
    Documents: undefined;
    LoadMap: undefined;
    Fuel: undefined;
    ActiveTrips: undefined;
    CompleteTrips: undefined;
    PendingTrips: undefined;
    Notifications: undefined;
    Help: undefined;
    TripInfo: undefined;
    TripChat: { tripId: string; tripNumber: string };
    DriverChat: undefined;
    Search: undefined;
    Trips: undefined;
    CrashLogs: undefined;
    OnboardingGuard: undefined;
    TrainingScreen: undefined;
    TestsScreen: undefined;
    CertificatesScreen: undefined;
    HRApprovalScreen: undefined;
    ELDDocuments: undefined;
    MileageSheet: undefined;
};

const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

// Authentication Helper Functions
export const AuthService = {
    // Check if user has ever logged in
    checkAuthStatus: async (): Promise<AuthStatus> => {
        try {
            const isAuthenticated = await AsyncStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
            const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            const loginTime = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TIME);

            return {
                isAuthenticated: isAuthenticated === 'true',
                userData: userData ? JSON.parse(userData) : null,
                loginTime: loginTime ? new Date(loginTime) : null
            };
        } catch (error) {
            console.error('Error checking auth status:', error);
            return { isAuthenticated: false, userData: null, loginTime: null };
        }
    },

    // Set user as authenticated
    setAuthenticated: async (userData: any = null): Promise<void> => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
            if (userData) {
                await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
            }
            await AsyncStorage.setItem(STORAGE_KEYS.LOGIN_TIME, new Date().toISOString());
        } catch (error) {
            console.error('Error setting auth status:', error);
        }
    },

    // Clear authentication data (logout)
    clearAuth: async (): Promise<void> => {
        try {
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.IS_AUTHENTICATED,
                STORAGE_KEYS.USER_DATA,
                STORAGE_KEYS.LOGIN_TIME
            ]);
        } catch (error) {
            console.error('Error clearing auth data:', error);
        }
    }
};

// Loading Screen Component
const LoadingScreen: React.FC = () => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

    React.useEffect(() => {
        // Fade in and scale animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <View style={styles.loadingContainer}>
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <Image
                    source={appLogo}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
            </Animated.View>
            <ActivityIndicator 
                size="large" 
                color="#906AD1" 
                style={styles.loadingSpinner}
            />
        </View>
    );
};

// Placeholder screens for new functionality
const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title }) => (
    <View style={styles.placeholder}>
        <Ionicons name="construct" size={64} color="#6B7280" />
        <Text style={styles.placeholderText}>{title}</Text>
        <Text style={styles.placeholderSubtext}>Coming Soon</Text>
    </View>
);

// Wrapper component for screens with Header and Footer
const ScreenWithHeaderFooter: React.FC<{ 
    component: React.ComponentType<any>;
    navigation: any;
    route: any;
    onLogout: () => void;
}> = ({ component: Component, navigation, route, onLogout }) => (
    <View style={{ flex: 1 }}>
        <Header />
        <View style={{ flex: 1 }}>
            <Component navigation={navigation} route={route} />
        </View>
        <Footer onLogout={onLogout} />
    </View>
);

// Main Tab Navigator with Authentication Context
function MainTabNavigator({ onLogout, navigation }: MainTabNavigatorProps) {
    const [dispatcherNotif, setDispatcherNotif] = useState<{
        senderName: string;
        message: string;
    } | null>(null);
    const notifTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const currentUser = authManager.getCurrentUser();
        const driverId = currentUser?.id || '';
        if (!driverId) return;

        let isMounted = true;

        const handleDispatcherMessage = (message: any) => {
            console.log('[NotifSocket] newChatMessage received:', {
                senderType: message.senderType,
                senderName: message.senderName,
                driverId: message.driverId,
                message: message.message?.substring(0, 50),
            });
            if (!isMounted) return;
            // Only show notifications for dispatcher messages (not driver or system)
            if (
                message.senderType === 'driver' ||
                message.senderType === 'system' ||
                message.forDispatchersOnly ||
                message.isSystemMessage
            ) {
                console.log('[NotifSocket] message filtered out, senderType:', message.senderType);
                return;
            }

            // Verify message belongs to this driver
            let messageDriverId = '';
            if (message.driverId) {
                messageDriverId = typeof message.driverId === 'object'
                    ? message.driverId._id?.toString() || ''
                    : String(message.driverId);
            }
            if (messageDriverId && messageDriverId !== String(driverId)) return;

            const senderName = message.senderName || message.senderId?.name || 'Dispatcher';
            const text = message.message || 'New message';

            setDispatcherNotif({ senderName, message: text });

            if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
            notifTimerRef.current = setTimeout(() => {
                if (isMounted) setDispatcherNotif(null);
            }, 5000);
        };

        const initSocketAndListen = async () => {
            console.log('[NotifSocket] initSocketAndListen started');
            try {
                const token = await apiService.getStoredToken();
                console.log('[NotifSocket] token:', token ? 'found' : 'MISSING');
                if (!token || !isMounted) return;

                const alreadyConnected = socketService.isSocketConnected();
                console.log('[NotifSocket] already connected:', alreadyConnected);
                if (!alreadyConnected) {
                    console.log('[NotifSocket] calling initialize...');
                    await socketService.initialize();
                    console.log('[NotifSocket] initialize done, connected:', socketService.isSocketConnected());
                }
                if (!isMounted) return;

                console.log('[NotifSocket] authenticating...');
                await socketService.authenticateChat(token);
                console.log('[NotifSocket] authenticated');
                if (!isMounted) return;

                await new Promise(resolve => setTimeout(resolve, 500));
                if (!isMounted) return;

                // Register listener before join so it's ready the moment the socket enters the room
                socketService.onNewChatMessage(handleDispatcherMessage);
                console.log('[NotifSocket] newChatMessage listener registered');

                // Join the driver chat room — required for backend to route messages here
                console.log('[NotifSocket] joining driver chat room for driverId:', driverId);
                try {
                    await socketService.joinDriverChat(driverId);
                    console.log('[NotifSocket] joined driver chat room ✅');
                } catch (joinErr: any) {
                    console.warn('[NotifSocket] join attempt 1 failed:', joinErr?.message);
                    // First attempt failed — retry once after a short delay
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    if (!isMounted) return;
                    try {
                        await socketService.joinDriverChat(driverId);
                        console.log('[NotifSocket] joined driver chat room on retry ✅');
                    } catch (retryErr: any) {
                        console.error('[NotifSocket] join retry also failed:', retryErr?.message);
                    }
                }

                // Re-run the full init sequence if the socket drops (e.g. nginx proxy timeout)
                const rawSocket = socketService.getSocket();
                if (rawSocket) {
                    rawSocket.once('disconnect', (reason: string) => {
                        console.log('[NotifSocket] socket disconnected, reason:', reason, '— will reconnect in 3s');
                        if (!isMounted) return;
                        setTimeout(() => {
                            if (isMounted) initSocketAndListen();
                        }, 3000);
                    });
                    console.log('[NotifSocket] disconnect→reconnect handler attached, socketId:', rawSocket.id);
                }
            } catch (err: any) {
                console.error('[NotifSocket] initSocketAndListen error:', err?.message);
            }
        };

        initSocketAndListen();

        return () => {
            isMounted = false;
            socketService.offNewChatMessage(handleDispatcherMessage);
            if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        };
    }, []);

    const handleOpenChat = () => {
        setDispatcherNotif(null);
        navigation.navigate('DriverChat');
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Dispatcher message notification banner */}
            <Modal
                visible={!!dispatcherNotif}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setDispatcherNotif(null)}
            >
                <View style={styles.notifOverlay} pointerEvents="box-none">
                    <View style={styles.notifBanner}>
                        <View style={styles.notifLeft}>
                            <View style={styles.notifIconCircle}>
                                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                            </View>
                            <View style={styles.notifTextBlock}>
                                <Text style={styles.notifSender} numberOfLines={1}>
                                    {dispatcherNotif?.senderName}
                                </Text>
                                <Text style={styles.notifMessage} numberOfLines={2}>
                                    {dispatcherNotif?.message}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.notifActions}>
                            <TouchableOpacity onPress={handleOpenChat} style={styles.notifOpenBtn}>
                                <Text style={styles.notifOpenText}>Open</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setDispatcherNotif(null)} style={styles.notifDismissBtn}>
                                <Ionicons name="close" size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Header />
            <View style={{ flex: 1 }}>
                <MainTab.Navigator
                    initialRouteName="Dashboard"
                    screenOptions={{
                        headerShown: false,
                        tabBarStyle: { display: "none" },
                    }}
                >
                    <MainTab.Screen name="Dashboard" component={DashboardScreen} />
                    <MainTab.Screen name="NewTrip" component={NewTripScreen} />
                    <MainTab.Screen name="Vehicle" component={VehicleScreen} />
                    <MainTab.Screen name="Trailer" component={TrailerScreen} />
                    <MainTab.Screen name="HOS" component={HosScreen} />
                    <MainTab.Screen name="AssetIncidents" component={AssetIncidentsScreen} />
                    <MainTab.Screen name="Documents" component={DocumentsScreen} />
                    <MainTab.Screen name="Settings">
                        {(props) => <SettingsScreen {...props} onLogout={onLogout} />}
                    </MainTab.Screen>
                    <MainTab.Screen name="LoadMap" component={LoadMapScreen} />
                    <MainTab.Screen name="Transfer" component={TransferScreen} />
                    <MainTab.Screen name="Fuel" component={FuelScreen} />
                    <MainTab.Screen name="ActiveTrips" component={ActiveTrips} />
                    <MainTab.Screen name="CompleteTrips" component={CompleteTrips} />
                    <MainTab.Screen name="PendingTrips" component={PendingTrips} />
                    <MainTab.Screen name="Notifications" component={NotificationsScreen} />
                    <MainTab.Screen name="Help" component={HelpScreen} />
                    <MainTab.Screen name="Search" component={SearchScreen} />
                    <MainTab.Screen name="Trips" component={TripInfoScreen} />
                </MainTab.Navigator>
            </View>
            <Footer onLogout={onLogout} />
        </View>
    );
}

// Main App Navigator
export default function AppNavigator() {
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        userData: null
    });

    // Handle logout - defined before useEffect so it can be referenced
    const handleLogout = async (): Promise<void> => {
        try {
            // Clear auth data
            await AuthService.clearAuth();
            // Also logout from authManager
            await authManager.logout();
            
            // Update auth state - this will trigger re-render and show login screen
            setAuthState({
                isAuthenticated: false,
                isLoading: false,
                userData: null
            });
        } catch (error) {
            console.error('Error during logout:', error);
            // Still update state to show login screen even if clearing fails
            setAuthState({
                isAuthenticated: false,
                isLoading: false,
                userData: null
            });
        }
    };

    // Check authentication status on app start
    useEffect(() => {
        checkInitialAuthState();
        
        // Set up token expiration callback for API service
        apiService.setOnTokenExpired(() => {
            handleLogout();
        });
        
        // Cleanup on unmount
        return () => {
            apiService.setOnTokenExpired(() => {});
        };
    }, []);

    const checkInitialAuthState = async (): Promise<void> => {
        try {
            // Check both AuthService and authManager for consistency
            const authStatus = await AuthService.checkAuthStatus();
            const authManagerState = authManager.getAuthState();
            const authManagerUser = authManager.getCurrentUser();

            // If authManager has auth data but AuthService doesn't, sync them
            const isAuthenticated = authStatus.isAuthenticated || authManagerState.isAuthenticated;
            const userData = authStatus.userData || authManagerUser;

            if (authManagerState.isAuthenticated && !authStatus.isAuthenticated && authManagerUser) {
                // Sync AuthService with authManager
                await AuthService.setAuthenticated(authManagerUser);
            }

            setAuthState({
                isAuthenticated,
                isLoading: false,
                userData
            });

            // Optional: Log for debugging
            if (__DEV__) {
                console.log('Auth Status:', {
                    isAuthenticated,
                    hasUserData: !!userData,
                    lastLogin: authStatus.loginTime?.toLocaleString()
                });
            }
        } catch (error) {
            console.error('Error checking initial auth state:', error);
            setAuthState({
                isAuthenticated: false,
                isLoading: false,
                userData: null
            });
        }
    };

    // Handle successful authentication
    const handleAuthSuccess = async (userData: any = null): Promise<void> => {
        // Sync both AuthService and ensure authManager is also updated
        await AuthService.setAuthenticated(userData);
        
        // Update authManager if it's not already updated (should be updated by LoginScreen, but ensure sync)
        if (userData && !authManager.isAuthenticated()) {
            await authManager.login({
                id: userData.id,
                name: userData.name,
                email: userData.email,
                token: userData.token,
            });
        }
        
        setAuthState({
            isAuthenticated: true,
            isLoading: false,
            userData: userData
        });
    };

    // Show loading screen while checking auth status
    if (authState.isLoading) {
        return <LoadingScreen />;
    }

    // Show authentication flow for non-authenticated users
    if (!authState.isAuthenticated) {
        return (
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="Login">
                    {(props) => (
                        <LoginScreen
                            {...props}
                            onAuthSuccess={handleAuthSuccess}
                        />
                    )}
                </RootStack.Screen>
                <RootStack.Screen name="OTP">
                    {(props) => (
                        <OtpScreen
                            {...props}
                            onAuthSuccess={handleAuthSuccess}
                        />
                    )}
                </RootStack.Screen>
            </RootStack.Navigator>
        );
    }

    // Show main app for authenticated users
    return (
        <RootStack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="MainTabs"
        >
            {/* Onboarding Screens */}
            <RootStack.Screen name="OnboardingGuard">
                {(props) => (
                    <OnboardingGuardScreen {...props} />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="TrainingScreen" component={TrainingScreen} />
            <RootStack.Screen name="TestsScreen" component={TestsScreen} />
            <RootStack.Screen name="TakeTestScreen" component={TakeTestScreen} />
            <RootStack.Screen name="TestResultsScreen" component={TestResultsScreen} />
            <RootStack.Screen name="CertificatesScreen" component={CertificatesScreen} />
            <RootStack.Screen name="HRApprovalScreen" component={HRApprovalScreen} />
            <RootStack.Screen name="ELDDocuments">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={ELDDocumentsScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="MileageSheet">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={MileageSheetScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            {/* Main Tabs - These will have Header and Footer */}
            <RootStack.Screen name="MainTabs">
                {(props) => (
                    <MainTabNavigator
                        {...props}
                        onLogout={handleLogout}
                        navigation={props.navigation}
                    />
                )}
            </RootStack.Screen>

            {/* Additional Stack Screens for direct access (with Header/Footer) */}
            <RootStack.Screen name="NewTrip">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={NewTripScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Vehicle">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={VehicleScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Trailer">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={TrailerScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Documents">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={DocumentsScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Settings">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={SettingsScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="LoadMap">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={LoadMapScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Transfer">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={TransferScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Fuel">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={FuelScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="ActiveTrips">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={ActiveTrips}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="CompleteTrips">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={CompleteTrips}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="PendingTrips">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={PendingTrips}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>

            {/* Footer Screens - Now with Header and Footer */}
            <RootStack.Screen name="Notifications">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={NotificationsScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Help">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={HelpScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Search">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={SearchScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Trips">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={TripInfoScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="TripChat">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={TripChatScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>
            <RootStack.Screen name="DriverChat" component={DriverChatScreen} />
            <RootStack.Screen name="CrashLogs">
                {(props) => (
                    <ScreenWithHeaderFooter
                        component={CrashLogsScreen}
                        navigation={props.navigation}
                        route={props.route}
                        onLogout={handleLogout}
                    />
                )}
            </RootStack.Screen>

            {/* Special Modal Screens that should not have header/footer */}
            <RootStack.Screen
                name="HOS"
                component={HosScreen}
                options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
                name="AssetIncidents"
                component={AssetIncidentsScreen}
                options={{ presentation: 'modal' }}
            />
        </RootStack.Navigator>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    logoContainer: {
        marginBottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoImage: {
        width: 150,
        height: 150,
    },
    loadingSpinner: {
        marginTop: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 12,
        fontWeight: '500',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 20,
    },
    placeholderText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 16,
        textAlign: 'center',
    },
    placeholderSubtext: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 22,
    },
    notifOverlay: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        paddingTop: 48,
        paddingHorizontal: 12,
    },
    notifBanner: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#8B5CF6',
    },
    notifLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    notifIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#8B5CF6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    notifTextBlock: {
        flex: 1,
    },
    notifSender: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    notifMessage: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    notifActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    notifOpenBtn: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    notifOpenText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    notifDismissBtn: {
        padding: 4,
    },
});