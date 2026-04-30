// src/navigation/AppNavigator.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ActivityIndicator, Image, Animated, TouchableOpacity, Modal, Vibration } from 'react-native';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp } from '@react-navigation/native';
import { authManager } from '../types/AuthManager';
import { apiService } from '../services/api/apiService';
import { socketService } from '../services/socket/socketService';
import { notificationService } from '../services/notificationService';

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

// Navigation Types - MainTabParamList only contains the Dashboard tab.
// All other screens live exclusively in RootStack so that navigation.navigate()
// pushes them onto the native stack — enabling iOS swipe-back gestures.
export type MainTabParamList = {
    Dashboard: { refresh?: boolean } | undefined;
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
    PendingTrips: { initialTab?: 'requests' | 'accepted' } | undefined;
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
    TakeTestScreen: { testType: string };
    TestResultsScreen: { testResult: any; testType: string };
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
    const [globalCallState, setGlobalCallState] = useState<'idle' | 'incoming' | 'connected' | 'declined'>('idle');
    const [globalIncomingCall, setGlobalIncomingCall] = useState<{ from: string; offer: any } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const globalPcRef = useRef<any>(null);
    const globalStreamRef = useRef<any>(null);
    const localAudioStreamRef = useRef<any>(null);
    const peerSocketIdRef = useRef<string | null>(null);

    // Vibration ring pattern — fires whenever incoming call arrives
    useEffect(() => {
        if (globalCallState === 'incoming') {
            Vibration.vibrate([0, 600, 400, 600], true);
        } else {
            Vibration.cancel();
        }
        return () => Vibration.cancel();
    }, [globalCallState]);

    const toggleMute = () => {
        const track = localAudioStreamRef.current?.getAudioTracks?.()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsMuted(prev => !prev);
        }
    };

    const toggleSpeaker = async () => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const InCallManager = require('react-native-incall-manager').default;
            InCallManager.setSpeakerphoneOn(!isSpeaker);
            setIsSpeaker(prev => !prev);
        } catch {
            console.warn('react-native-incall-manager not installed — speaker toggle unavailable');
        }
    };

    const cleanupCall = () => {
        globalPcRef.current?.close();
        globalPcRef.current = null;
        localAudioStreamRef.current?.getTracks().forEach((t: any) => t.stop());
        localAudioStreamRef.current = null;
        globalStreamRef.current = null;
        peerSocketIdRef.current = null;
        setIsMuted(false);
        setIsSpeaker(false);
        setGlobalIncomingCall(null);
    };

    const endGlobalCall = (notifyPeer = true) => {
        if (notifyPeer && peerSocketIdRef.current) {
            socketService.getSocket()?.emit('call-end', { to: peerSocketIdRef.current });
        }
        cleanupCall();
        setGlobalCallState('idle');
    };

    const rejectGlobalCall = () => {
        if (peerSocketIdRef.current) {
            socketService.getSocket()?.emit('call-rejected', { to: peerSocketIdRef.current });
        }
        cleanupCall();
        setGlobalCallState('idle');
    };

    const showDeclined = () => {
        cleanupCall();
        setGlobalCallState('declined');
        setTimeout(() => setGlobalCallState('idle'), 2500);
    };

    const acceptGlobalCall = async () => {
        if (!globalIncomingCall) return;
        try {
            if (Platform.OS === 'android') {
                await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
            }
            const pc: any = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ]
            });
            pc.onicecandidate = (e: any) => {
                if (e.candidate) socketService.getSocket()?.emit('call-ice', { to: globalIncomingCall.from, candidate: e.candidate });
            };
            pc.onaddstream = (e: any) => {
                console.log('🎧 Remote stream received in global call');
                globalStreamRef.current = e.stream;
            };
            pc.ontrack = (e: any) => {
                if (e.streams?.[0]) globalStreamRef.current = e.streams[0];
            };
            const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
            localAudioStreamRef.current = stream;
            globalStreamRef.current = stream;
            if (pc.addStream) {
                (pc as any).addStream(stream);
            } else {
                stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));
            }
            await pc.setRemoteDescription(new RTCSessionDescription(globalIncomingCall.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            globalPcRef.current = pc;
            peerSocketIdRef.current = globalIncomingCall.from;
            socketService.getSocket()?.emit('answer-call', { to: globalIncomingCall.from, answer });
            setGlobalCallState('connected');
        } catch (err) { console.error('❌ Accept call error:', err); }
    };

    useEffect(() => {
        const currentUser = authManager.getCurrentUser();
        const driverId = currentUser?.id || '';
        if (!driverId) return;

        let isMounted = true;

        // Register push token with server
        const registerToken = async () => {
            const token = await notificationService.registerForPushNotifications();
            if (token) {
                try {
                    await apiService.registerPushToken(token);
                    console.log('[Notifications] Push token registered with server');
                } catch (e) {
                    console.warn('[Notifications] Could not register token with server:', e);
                }
            }
        };
        registerToken();

        // Keep socket connected for real-time chat updates (no in-app banner)
        const initSocketAndListen = async () => {
            try {
                const token = await apiService.getStoredToken();
                if (!token || !isMounted) return;

                const alreadyConnected = socketService.isSocketConnected();
                if (!alreadyConnected) {
                    await socketService.initialize();
                }
                if (!isMounted) return;

                await socketService.authenticateChat(token);
                if (!isMounted) return;

                await new Promise(resolve => setTimeout(resolve, 500));
                if (!isMounted) return;

                console.log('[NotifSocket] joining driver chat room for driverId:', driverId);
                try {
                    await socketService.joinDriverChat(driverId);
                    console.log('[NotifSocket] joined driver chat room ✅');
                } catch (joinErr: any) {
                    console.warn('[NotifSocket] join attempt 1 failed:', joinErr?.message);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    if (!isMounted) return;
                    try {
                        await socketService.joinDriverChat(driverId);
                        console.log('[NotifSocket] joined driver chat room on retry ✅');
                    } catch (retryErr: any) {
                        console.error('[NotifSocket] join retry also failed:', retryErr?.message);
                    }
                }

                const rawSocket = socketService.getSocket();
                if (rawSocket) {
                    // Global incoming call listener — works on any screen
                    rawSocket.off('incoming-call-global');
                    rawSocket.on('incoming-call', async ({ from, offer }: any) => {
                        if (!isMounted) return;
                        setGlobalIncomingCall({ from, offer });
                        setGlobalCallState('incoming');
                        notificationService.sendLocalNotification(
                            '📞 Incoming Call',
                            'Dispatcher is calling you',
                            { type: 'incoming_call', from }
                        );
                    });
                    rawSocket.on('call-answered', ({ answer, from }: any) => {
                        if (from) peerSocketIdRef.current = from;
                        globalPcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
                        setGlobalCallState('connected');
                    });
                    rawSocket.on('call-ended', () => endGlobalCall(false));
                    rawSocket.on('call-rejected', () => showDeclined());
                    rawSocket.on('call-ice', ({ candidate }: any) => {
                        globalPcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
                    });
                    rawSocket.once('disconnect', (reason: string) => {
                        if (!isMounted) return;
                        setTimeout(() => {
                            if (isMounted) initSocketAndListen();
                        }, 3000);
                    });
                }
            } catch (err: any) {
                console.error('[NotifSocket] initSocketAndListen error:', err?.message);
            }
        };

        initSocketAndListen();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <View style={{ flex: 1 }}>
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
                </MainTab.Navigator>
            </View>
            <Footer onLogout={onLogout} />

            {/* Global call overlay — visible on ANY screen */}
            <Modal visible={globalCallState !== 'idle'} transparent animationType="fade">
                <View style={navStyles.callOverlay}>
                    {globalCallState === 'declined' ? (
                        <>
                            <View style={[navStyles.callAvatar, { backgroundColor: '#ef4444' }]}>
                                <Ionicons name="call" size={40} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                            </View>
                            <Text style={navStyles.callName}>Call Declined</Text>
                            <Text style={navStyles.callStatus}>The call was not accepted</Text>
                        </>
                    ) : (
                        <>
                            <View style={navStyles.callAvatar}>
                                <Text style={navStyles.callAvatarText}>D</Text>
                            </View>
                            <Text style={navStyles.callName}>Dispatcher</Text>
                            <Text style={navStyles.callStatus}>
                                {globalCallState === 'incoming' ? 'Incoming Call' : '● Connected'}
                            </Text>

                            {/* Mute + Speaker controls (connected only) */}
                            {globalCallState === 'connected' && (
                                <View style={navStyles.controlRow}>
                                    <TouchableOpacity style={[navStyles.controlBtn, isMuted && navStyles.controlBtnOn]} onPress={toggleMute}>
                                        <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={22} color="#fff" />
                                        <Text style={navStyles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[navStyles.controlBtn, isSpeaker && navStyles.controlBtnOn]} onPress={toggleSpeaker}>
                                        <Ionicons name={isSpeaker ? 'volume-high' : 'volume-medium'} size={22} color="#fff" />
                                        <Text style={navStyles.controlLabel}>{isSpeaker ? 'Speaker' : 'Earpiece'}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={navStyles.callButtons}>
                                {globalCallState === 'incoming' && (
                                    <View style={navStyles.callBtnWrap}>
                                        <TouchableOpacity style={navStyles.acceptBtn} onPress={acceptGlobalCall}>
                                            <Ionicons name="call" size={28} color="#fff" />
                                        </TouchableOpacity>
                                        <Text style={navStyles.callBtnLabel}>Accept</Text>
                                    </View>
                                )}
                                <View style={navStyles.callBtnWrap}>
                                    <TouchableOpacity
                                        style={navStyles.rejectBtn}
                                        onPress={globalCallState === 'incoming' ? rejectGlobalCall : endGlobalCall}
                                    >
                                        <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                                    </TouchableOpacity>
                                    <Text style={navStyles.callBtnLabel}>{globalCallState === 'incoming' ? 'Decline' : 'End'}</Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </Modal>
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
            {/* Main Tabs - declared FIRST so it is always the initial screen */}
            <RootStack.Screen name="MainTabs">
                {(props) => (
                    <MainTabNavigator
                        {...props}
                        onLogout={handleLogout}
                        navigation={props.navigation}
                    />
                )}
            </RootStack.Screen>

            {/* Onboarding Screens */}
            <RootStack.Screen name="OnboardingGuard" component={OnboardingGuardScreen} />
            <RootStack.Screen name="TrainingScreen" component={TrainingScreen} />
            <RootStack.Screen name="TestsScreen" component={TestsScreen} />
            <RootStack.Screen name="TakeTestScreen" component={TakeTestScreen} />
            <RootStack.Screen name="TestResultsScreen" component={TestResultsScreen} />
            <RootStack.Screen name="CertificatesScreen" component={CertificatesScreen} />
            <RootStack.Screen name="HRApprovalScreen">
                {(props) => <HRApprovalScreen {...props} onLogout={handleLogout} />}
            </RootStack.Screen>
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

const navStyles = StyleSheet.create({
    callOverlay: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
    callAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1976D2', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
    callAvatarText: { color: '#fff', fontSize: 40, fontWeight: '700' },
    callName: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
    callStatus: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 60 },
    callButtons: { flexDirection: 'row', gap: 40 },
    callBtnWrap: { alignItems: 'center', gap: 8 },
    callBtnLabel: { color: '#fff', fontSize: 12 },
    acceptBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
    rejectBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
    controlRow: { flexDirection: 'row', gap: 20, marginBottom: 32 },
    controlBtn: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 50, width: 64, height: 64, justifyContent: 'center' },
    controlBtnOn: { backgroundColor: 'rgba(255,255,255,0.35)' },
    controlLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4 },
});

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
});