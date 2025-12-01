// src/navigation/AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp } from '@react-navigation/native';
import { authManager } from '../types/AuthManager';
import { apiService } from '../services/api/apiService';

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
    Dashboard: undefined;
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
    Search: undefined;
    Trips: undefined;
    CrashLogs: undefined;
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
const LoadingScreen: React.FC = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#906AD1" />
        <Text style={styles.loadingText}>Loading...</Text>
    </View>
);

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
        backgroundColor: '#F8FAFC',
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