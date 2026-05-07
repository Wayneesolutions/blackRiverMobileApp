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
import { useCallMiniBar, forceHideMiniBar } from '../contexts/CallMiniBarContext';

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
    const { showMiniBar, updateMiniBar, hideMiniBar } = useCallMiniBar();
    const [globalCallState, setGlobalCallState] = useState<'idle' | 'incoming' | 'connected' | 'declined'>('idle');
    const [globalIncomingCall, setGlobalIncomingCall] = useState<{ from: string; offer: any } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [audioOutput, setAudioOutput] = useState<'earpiece' | 'speaker' | 'bluetooth'>('earpiece');
    const [showAudioPicker, setShowAudioPicker] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [callSeconds, setCallSeconds] = useState(0);
    const globalPcRef = useRef<any>(null);
    const globalStreamRef = useRef<any>(null);
    const localAudioStreamRef = useRef<any>(null);
    const peerSocketIdRef = useRef<string | null>(null);
    const timerRef = useRef<any>(null);
    // Ref mirror so socket-listener closures can check live state
    const globalCallStateRef = useRef<'idle' | 'incoming' | 'connected' | 'declined'>('idle');
    useEffect(() => { globalCallStateRef.current = globalCallState; }, [globalCallState]);

    // Stable handler refs — store each socket listener so we can remove exactly
    // OUR handler on reconnect without touching DriverChatScreen's handlers
    const handlerIncomingCall = useRef<((...args: any[]) => void) | null>(null);
    const handlerCallAnswered = useRef<((...args: any[]) => void) | null>(null);
    const handlerCallIce      = useRef<((...args: any[]) => void) | null>(null);
    const handlerCallEnded    = useRef<((...args: any[]) => void) | null>(null);
    const handlerCallRejected = useRef<((...args: any[]) => void) | null>(null);

    const formatTime = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    useEffect(() => {
        if (globalCallState === 'connected') {
            setCallSeconds(0);
            timerRef.current = setInterval(() => setCallSeconds(p => p + 1), 1000);
        } else {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            setCallSeconds(0);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [globalCallState]);

    // Sync global mini bar (rendered above ALL screens via CallMiniBarContext)
    useEffect(() => {
        if (globalCallState === 'connected' && isMinimized) {
            showMiniBar({
                seconds: callSeconds,
                isMuted,
                callerLabel: 'Dispatcher',
                onEnd: () => endGlobalCall(),
                onToggleMute: toggleMute,
                onExpand: () => setIsMinimized(false),
            });
        } else {
            hideMiniBar();
        }
    }, [globalCallState, isMinimized]);

    useEffect(() => {
        if (globalCallState === 'connected' && isMinimized) {
            updateMiniBar({ seconds: callSeconds, isMuted });
        }
    }, [callSeconds, isMuted]);

    // Ringtone + vibration for incoming calls
    useEffect(() => {
        const tryICM = (fn: (m: any) => void) => {
            try { fn(require('react-native-incall-manager').default); } catch {}
        };
        if (globalCallState === 'incoming') {
            Vibration.vibrate([0, 600, 400, 600], true);
            tryICM(m => { m.start({ media: 'audio', auto: false }); m.startRingtone('_DEFAULT_'); });
        } else if (globalCallState === 'connected') {
            Vibration.cancel();
            // Ensure AEC-enabled audio session is active during the call
            tryICM(m => { m.stopRingtone(); m.stopRingback(); m.start({ media: 'audio', auto: false }); });
        } else {
            Vibration.cancel();
            tryICM(m => { m.stopRingtone(); m.stopRingback(); });
            if (globalCallState === 'idle') tryICM(m => m.stop());
        }
        return () => {
            Vibration.cancel();
            tryICM(m => { m.stopRingtone(); m.stopRingback(); });
        };
    }, [globalCallState]);

    const toggleMute = () => {
        const track = localAudioStreamRef.current?.getAudioTracks?.()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsMuted(prev => !prev);
        }
    };

    const selectAudioOutput = (output: 'earpiece' | 'speaker' | 'bluetooth') => {
        try {
            const ICM = require('react-native-incall-manager').default;
            if (output === 'speaker') {
                ICM.setSpeakerphoneOn(true);
            } else if (output === 'earpiece') {
                ICM.setSpeakerphoneOn(false);
                if (Platform.OS === 'android') {
                    try { ICM.chooseAudioRoute?.('EARPIECE'); } catch {}
                }
            } else if (output === 'bluetooth') {
                ICM.setSpeakerphoneOn(false);
                try { ICM.chooseAudioRoute?.('BLUETOOTH_HEADSET'); } catch {}
            }
        } catch {}
        setAudioOutput(output);
        setShowAudioPicker(false);
    };

    const cleanupCall = () => {
        hideMiniBar();
        globalPcRef.current?.close();
        globalPcRef.current = null;
        localAudioStreamRef.current?.getTracks().forEach((t: any) => t.stop());
        localAudioStreamRef.current = null;
        globalStreamRef.current = null;
        peerSocketIdRef.current = null;
        setIsMuted(false);
        setAudioOutput('earpiece');
        setIsMinimized(false);
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
            // Start InCallManager BEFORE getUserMedia so Android uses MODE_IN_COMMUNICATION
            // when the audio renderer is created — required for earpiece to work.
            try { require('react-native-incall-manager').default.start({ media: 'audio', auto: false }); } catch {}
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
            const stream = await mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any, video: false });
            // Default to earpiece immediately after stream is captured
            try { require('react-native-incall-manager').default.setSpeakerphoneOn(false); } catch {}
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
                    // Remove only OUR previous handlers (by ref) — never wipe all listeners,
                    // because DriverChatScreen may have registered its own call-answered etc.
                    if (handlerIncomingCall.current) rawSocket.off('incoming-call', handlerIncomingCall.current);
                    if (handlerCallAnswered.current) rawSocket.off('call-answered', handlerCallAnswered.current);
                    if (handlerCallIce.current)      rawSocket.off('call-ice',      handlerCallIce.current);
                    if (handlerCallEnded.current)    rawSocket.off('call-ended',    handlerCallEnded.current);
                    if (handlerCallRejected.current) rawSocket.off('call-rejected', handlerCallRejected.current);

                    // Define and store fresh handlers
                    handlerIncomingCall.current = async ({ from, offer }: any) => {
                        if (!isMounted) return;
                        peerSocketIdRef.current = from;
                        setGlobalIncomingCall({ from, offer });
                        setGlobalCallState('incoming');
                        // Only fire a local notification when the app is in the background;
                        // when in the foreground the full-screen call overlay is shown instead.
                        const appState = (await import('react-native')).AppState.currentState;
                        if (appState !== 'active') {
                            notificationService.sendLocalNotification(
                                '📞 Incoming Call',
                                'Dispatcher is calling you',
                                { type: 'incoming_call', from }
                            );
                        }
                    };
                    handlerCallAnswered.current = ({ answer, from }: any) => {
                        // Only handle if AppNavigator has an active call (incoming from dispatcher).
                        // Driver-initiated outgoing calls are handled by DriverChatScreen.
                        if (globalCallStateRef.current === 'idle') return;
                        if (from) peerSocketIdRef.current = from;
                        globalPcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
                        setGlobalCallState('connected');
                    };
                    handlerCallEnded.current = () => {
                        if (globalCallStateRef.current === 'idle') return;
                        const wasMissed = globalCallStateRef.current === 'incoming';
                        forceHideMiniBar();
                        endGlobalCall(false);
                        if (wasMissed) {
                            notificationService.sendLocalNotification(
                                '📵 Missed Call',
                                'You missed a call from Dispatcher',
                                { type: 'missed_call' }
                            );
                        }
                    };
                    handlerCallRejected.current = () => {
                        if (globalCallStateRef.current === 'idle') return;
                        forceHideMiniBar();
                        showDeclined();
                    };
                    handlerCallIce.current = ({ candidate }: any) => {
                        if (!globalPcRef.current) return;
                        globalPcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                    };

                    rawSocket.on('incoming-call', handlerIncomingCall.current);
                    rawSocket.on('call-answered', handlerCallAnswered.current);
                    rawSocket.on('call-ended',    handlerCallEnded.current);
                    rawSocket.on('call-rejected', handlerCallRejected.current);
                    rawSocket.on('call-ice',      handlerCallIce.current);

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

            {/* Full screen call — hidden when minimized */}
            <Modal visible={globalCallState !== 'idle' && !isMinimized} transparent={false} animationType="slide">
                <View style={navStyles.callOverlay}>
                    {globalCallState === 'declined' ? (
                        <View style={navStyles.callCenter}>
                            <View style={[navStyles.callAvatar, { backgroundColor: '#ef4444' }]}>
                                <Ionicons name="call" size={40} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                            </View>
                            <Text style={navStyles.callName}>Call Declined</Text>
                            <Text style={navStyles.callStatus}>The call was not accepted</Text>
                        </View>
                    ) : (
                        <>
                            {/* Top bar — minimize */}
                            <View style={navStyles.callTopBar}>
                                <View style={{ width: 36 }} />
                                <Text style={navStyles.callTopLabel}>
                                    {globalCallState === 'incoming' ? 'Incoming Call' : globalCallState === 'connected' ? 'On Call' : 'Calling...'}
                                </Text>
                                {globalCallState === 'connected' ? (
                                    <TouchableOpacity onPress={() => setIsMinimized(true)} style={navStyles.minimizeBtn}>
                                        <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.7)" />
                                    </TouchableOpacity>
                                ) : <View style={{ width: 36 }} />}
                            </View>

                            {/* Center — avatar + name + status */}
                            <View style={navStyles.callCenter}>
                                <View style={[navStyles.callAvatar, globalCallState === 'incoming' && { borderColor: '#22c55e', borderWidth: 3 }]}>
                                    <Text style={navStyles.callAvatarText}>D</Text>
                                </View>
                                <Text style={navStyles.callName}>Dispatcher</Text>
                                <Text style={[navStyles.callStatus, globalCallState === 'connected' && { color: '#22c55e' }]}>
                                    {globalCallState === 'connected' ? formatTime(callSeconds) : globalCallState === 'incoming' ? 'Incoming Call' : 'Calling...'}
                                </Text>
                            </View>

                            {/* Bottom — controls + action buttons */}
                            <View style={navStyles.callBottom}>
                                {globalCallState === 'connected' && (
                                    <View style={navStyles.controlRow}>
                                        <View style={navStyles.callBtnWrap}>
                                            <TouchableOpacity style={[navStyles.controlBtn, isMuted && navStyles.controlBtnOn]} onPress={toggleMute}>
                                                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
                                            </TouchableOpacity>
                                            <Text style={navStyles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                                        </View>
                                        <View style={navStyles.callBtnWrap}>
                                            <TouchableOpacity style={[navStyles.controlBtn, audioOutput !== 'earpiece' && navStyles.controlBtnOn]} onPress={() => setShowAudioPicker(true)}>
                                                <Ionicons name={audioOutput === 'speaker' ? 'volume-high' : audioOutput === 'bluetooth' ? 'bluetooth' : 'volume-medium'} size={24} color="#fff" />
                                            </TouchableOpacity>
                                            <Text style={navStyles.controlLabel}>{audioOutput === 'speaker' ? 'Speaker' : audioOutput === 'bluetooth' ? 'Bluetooth' : 'Earpiece'}</Text>
                                        </View>
                                    </View>
                                )}
                                <View style={navStyles.callButtons}>
                                    {globalCallState === 'incoming' && (
                                        <View style={navStyles.callBtnWrap}>
                                            <TouchableOpacity style={navStyles.acceptBtn} onPress={acceptGlobalCall}>
                                                <Ionicons name="call" size={30} color="#fff" />
                                            </TouchableOpacity>
                                            <Text style={navStyles.callBtnLabel}>Accept</Text>
                                        </View>
                                    )}
                                    <View style={navStyles.callBtnWrap}>
                                        <TouchableOpacity
                                            style={navStyles.rejectBtn}
                                            onPress={globalCallState === 'incoming' ? rejectGlobalCall : () => endGlobalCall()}
                                        >
                                            <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                                        </TouchableOpacity>
                                        <Text style={navStyles.callBtnLabel}>{globalCallState === 'incoming' ? 'Decline' : 'End Call'}</Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </Modal>

            {/* Mini bar is now rendered globally via CallMiniBarContext in App.tsx */}

            {/* ── Audio Output Picker ─────────────────────────────────────── */}
            <Modal visible={showAudioPicker} transparent animationType="fade" onRequestClose={() => setShowAudioPicker(false)}>
                <TouchableOpacity style={navStyles.pickerBackdrop} activeOpacity={1} onPress={() => setShowAudioPicker(false)}>
                    <View style={navStyles.pickerSheet}>
                        <View style={navStyles.pickerHandle} />
                        <Text style={navStyles.pickerTitle}>Audio Output</Text>
                        {([
                            { id: 'earpiece',  label: 'Earpiece',  sub: 'Phone speaker',  icon: 'phone-portrait-outline' },
                            { id: 'speaker',   label: 'Speaker',   sub: 'Loud speaker',   icon: 'volume-high-outline'    },
                            { id: 'bluetooth', label: 'Bluetooth', sub: 'Wireless audio', icon: 'bluetooth-outline'      },
                        ] as const).map(opt => {
                            const active = audioOutput === opt.id;
                            return (
                                <TouchableOpacity key={opt.id} style={[navStyles.pickerOption, active && navStyles.pickerOptionActive]} onPress={() => selectAudioOutput(opt.id)}>
                                    <View style={[navStyles.pickerIcon, active && navStyles.pickerIconActive]}>
                                        <Ionicons name={opt.icon} size={20} color={active ? '#fff' : '#8b9cb6'} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[navStyles.pickerLabel, active && { color: '#fff' }]}>{opt.label}</Text>
                                        <Text style={navStyles.pickerSub}>{opt.sub}</Text>
                                    </View>
                                    {active && <Ionicons name="checkmark-circle" size={22} color="#1976D2" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableOpacity>
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
            <RootStack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
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
            screenOptions={{
                headerShown: false,
                freezeOnBlur: true,
                animation: 'slide_from_right',
            }}
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
    callOverlay: { flex: 1, backgroundColor: '#0f0f1a' },
    callTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
    callTopLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
    minimizeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    callCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    callAvatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#1976D2', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#1976D2', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
    callAvatarText: { color: '#fff', fontSize: 44, fontWeight: '700' },
    callName: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
    callStatus: { color: 'rgba(255,255,255,0.55)', fontSize: 18, fontWeight: '500', letterSpacing: 1 },
    callBottom: { paddingBottom: 48, paddingHorizontal: 24, alignItems: 'center' },
    callButtons: { flexDirection: 'row', gap: 48, marginTop: 8 },
    callBtnWrap: { alignItems: 'center', gap: 10 },
    callBtnLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    acceptBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
    rejectBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
    controlRow: { flexDirection: 'row', gap: 28, marginBottom: 32 },
    controlBtn: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 50, width: 60, height: 60, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    controlBtnOn: { backgroundColor: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.3)' },
    controlLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 6 },
    // Full-screen transparent container — touches pass through except on miniBar itself
    miniBarOverlay: { flex: 1, justifyContent: 'flex-end' },
    // No position:'absolute' needed — Modal provides the layer above all screens
    miniBar: { backgroundColor: '#1a1a2e', borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, margin: 12, marginBottom: 70, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    miniAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1976D2', justifyContent: 'center', alignItems: 'center' },
    miniName: { color: '#fff', fontSize: 13, fontWeight: '600' },
    miniTimer: { color: '#22c55e', fontSize: 11, fontWeight: '500' },
    miniIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    // Audio output picker
    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: '#141428', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
    pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
    pickerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3 },
    pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    pickerOptionActive: { backgroundColor: 'rgba(25,118,210,0.15)', borderColor: '#1976D2' },
    pickerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    pickerIconActive: { backgroundColor: '#1976D2' },
    pickerLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
    pickerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
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