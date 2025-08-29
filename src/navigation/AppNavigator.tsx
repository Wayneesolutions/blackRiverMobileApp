// src/navigation/AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp } from '@react-navigation/native';

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

// Navigation Types
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
    // Note: Notifications, Help, Search, and Trips are NOT included here
    // They will be modal screens only
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

// Trip Info Screen Component (temporary until real screen is created)
const TripInfoScreen: React.FC = () => (
    <View style={styles.placeholder}>
        <Ionicons name="information-circle" size={64} color="#906AD1" />
        <Text style={styles.placeholderText}>Trip Information</Text>
        <Text style={styles.placeholderSubtext}>
            Detailed trip data and analytics
        </Text>
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
                    <MainTab.Screen name="Settings" component={SettingsScreen} />
                    <MainTab.Screen name="LoadMap" component={LoadMapScreen} />
                    <MainTab.Screen name="Transfer" component={TransferScreen} />
                    <MainTab.Screen name="Fuel" component={FuelScreen} />
                    <MainTab.Screen name="ActiveTrips" component={ActiveTrips} />
                    <MainTab.Screen name="CompleteTrips" component={CompleteTrips} />
                    <MainTab.Screen name="PendingTrips" component={PendingTrips} />
                </MainTab.Navigator>
            </View>
            <Footer navigation={navigation} />
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

    // Check authentication status on app start
    useEffect(() => {
        checkInitialAuthState();
    }, []);

    const checkInitialAuthState = async (): Promise<void> => {
        try {
            const authStatus = await AuthService.checkAuthStatus();

            setAuthState({
                isAuthenticated: authStatus.isAuthenticated,
                isLoading: false,
                userData: authStatus.userData
            });

            // Optional: Log for debugging
            if (__DEV__) {
                console.log('Auth Status:', {
                    isAuthenticated: authStatus.isAuthenticated,
                    hasUserData: !!authStatus.userData,
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
        await AuthService.setAuthenticated(userData);
        setAuthState({
            isAuthenticated: true,
            isLoading: false,
            userData: userData
        });
    };

    // Handle logout
    const handleLogout = async (): Promise<void> => {
        await AuthService.clearAuth();
        setAuthState({
            isAuthenticated: false,
            isLoading: false,
            userData: null
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

            {/* Modal Screens - These will NOT have Header and Footer */}
            <RootStack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ 
                    presentation: 'modal',
                    headerShown: false 
                }}
            />
            <RootStack.Screen
                name="Help"
                component={HelpScreen}
                options={{ 
                    presentation: 'modal',
                    headerShown: false 
                }}
            />
            <RootStack.Screen
                name="Search"
                component={SearchScreen}
                options={{ 
                    presentation: 'modal',
                    headerShown: false 
                }}
            />
            <RootStack.Screen
                name="Trips"
                component={TripInfoScreen}
                options={{
                    presentation: 'modal',
                    headerShown: false
                }}
            />

            {/* Additional Stack Screens for direct access (with Header/Footer) */}
            <RootStack.Screen name="NewTrip">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <NewTripScreen {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Vehicle">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <VehicleScreen {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Trailer">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <TrailerScreen {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Documents">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <DocumentsScreen {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Settings">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <SettingsScreen {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="LoadMap">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <LoadMapScreen {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Transfer">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <TransferScreen {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="Fuel">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <FuelScreen {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="ActiveTrips">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <ActiveTrips {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="CompleteTrips">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <CompleteTrips {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
                )}
            </RootStack.Screen>
            <RootStack.Screen name="PendingTrips">
                {(props) => (
                    <View style={{ flex: 1 }}>
                        <Header />
                        <View style={{ flex: 1 }}>
                            <PendingTrips {...props} />
                        </View>
                        <Footer navigation={props.navigation} />
                    </View>
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