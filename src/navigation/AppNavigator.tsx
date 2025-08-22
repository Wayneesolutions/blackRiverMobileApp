import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

// Import screens (you'll create these)
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OtpScreen from '../screens/auth/OTPScreen';

// Types
export type MainTabParamList = {
    Dashboard: undefined;
    Vehicle: undefined;
    Trailer: undefined;
    Documents: undefined;
    Settings: undefined;
};

export type RootStackParamList = {
    // Auth Stack
    Login: undefined;
    OTP: undefined;

    // Main App
    MainTabs: undefined;

    // Modal Screens
    SOS: undefined;
    AssetIncidents: undefined;
    PayrollDetails: undefined;
    LoadMap: undefined;
    RoadsideCheck: undefined;
    DocumentViewer: { documentId: string };
    VehicleDetails: { vehicleId: string };
    TrailerDetails: { trailerId: string };
};

const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

// Placeholder screens - you'll replace these with actual components
const PlaceholderScreen: React.FC<{ title: string }> = ({ title }) => (
    <View style={styles.placeholder}>
        <Ionicons name="construct" size={64} color="#6B7280" />
        <Text style={styles.placeholderText}>{title}</Text>
        <Text style={styles.placeholderSubtext}>Coming Soon</Text>
    </View>
);

const VehicleScreen = () => <PlaceholderScreen title="Vehicle Management" />;
const TrailerScreen = () => <PlaceholderScreen title="Trailer Management" />;
const DocumentsScreen = () => <PlaceholderScreen title="Documents" />;
const SettingsScreen = () => <PlaceholderScreen title="Settings" />;

function AuthNavigator() {
    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Login" component={LoginScreen} />
        </RootStack.Navigator>
    );
}

function MainTabNavigator() {
    return (
        <MainTab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    switch (route.name) {
                        case 'Dashboard':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'Vehicle':
                            iconName = focused ? 'car' : 'car-outline';
                            break;
                        case 'Trailer':
                            iconName = focused ? 'business' : 'business-outline';
                            break;
                        case 'Documents':
                            iconName = focused ? 'document-text' : 'document-text-outline';
                            break;
                        case 'Settings':
                            iconName = focused ? 'settings' : 'settings-outline';
                            break;
                        default:
                            iconName = 'home-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#6B46C1',
                tabBarInactiveTintColor: '#6B7280',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 68,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                headerStyle: {
                    backgroundColor: '#6B46C1',
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            })}
        >
            <MainTab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ title: 'Black River', headerShown: false }}
            />
            <MainTab.Screen
                name="Vehicle"
                component={VehicleScreen}
                options={{ title: 'Vehicles' }}
            />
            <MainTab.Screen
                name="Trailer"
                component={TrailerScreen}
                options={{ title: 'Trailers' }}
            />
            <MainTab.Screen
                name="Documents"
                component={DocumentsScreen}
                options={{ title: 'Documents' }}
            />
            <MainTab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
            />
        </MainTab.Navigator>
    );
}

export default function AppNavigator() {
    // Start with login screen, then navigate to main app after authentication
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
                <>
                    <RootStack.Screen name="Login" component={LoginScreen} />
                    <RootStack.Screen name="OTP">
                        {(props) => <OtpScreen {...props} setIsAuthenticated={setIsAuthenticated} />}
                    </RootStack.Screen>
                </>
            ) : null}

            {/* ✅ Always keep MainTabs registered */}
            <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
        </RootStack.Navigator>
    );
}

const styles = StyleSheet.create({
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 20,
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
    },
});