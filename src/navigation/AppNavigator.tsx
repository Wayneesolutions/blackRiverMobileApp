import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

// Import screens (you'll create these)
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OtpScreen from '../screens/auth/OTPScreen';

import Header from "../../src/components/common/Header"
import Footer from "../../src/components/common/Footer"

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

function MainTabNavigator() {
    return (
        <View style={{ flex: 1 }}>
            {/* ✅ Custom Header */}
            <Header />

            <View style={{ flex: 1 }}>
                <MainTab.Navigator
                    initialRouteName="Dashboard"
                    screenOptions={{
                        headerShown: false, // hide native header
                        tabBarStyle: { display: "none" }, // hide default tab bar
                    }}
                >
                    <MainTab.Screen name="Dashboard" component={DashboardScreen} />
                    <MainTab.Screen name="Vehicle" component={VehicleScreen} />
                    <MainTab.Screen name="Trailer" component={TrailerScreen} />
                    <MainTab.Screen name="Documents" component={DocumentsScreen} />
                    <MainTab.Screen name="Settings" component={SettingsScreen} />
                </MainTab.Navigator>
            </View>

            {/* ✅ Custom Footer (your replacement for tabs) */}
            <Footer />
        </View>
    );
}

export default function AppNavigator() {
    // For testing purposes, let's start with authenticated state
    // Change this to false when you want to test login flow
    const [isAuthenticated, setIsAuthenticated] = useState(true);

    if (!isAuthenticated) {
        // Authentication flow
        return (
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="Login" component={LoginScreen} />
                <RootStack.Screen name="OTP">
                    {(props) => <OtpScreen {...props} setIsAuthenticated={setIsAuthenticated} />}
                </RootStack.Screen>
            </RootStack.Navigator>
        );
    }

    // Main app flow - when authenticated
    return (
        <RootStack.Navigator 
            screenOptions={{ headerShown: false }}
            initialRouteName="MainTabs"
        >
            <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
            
            {/* Modal Screens */}
            <RootStack.Screen 
                name="SOS" 
                component={() => <PlaceholderScreen title="SOS Emergency" />}
                options={{ presentation: 'modal' }}
            />
            <RootStack.Screen 
                name="AssetIncidents" 
                component={() => <PlaceholderScreen title="Asset Incidents" />}
                options={{ presentation: 'modal' }}
            />
            <RootStack.Screen 
                name="PayrollDetails" 
                component={() => <PlaceholderScreen title="Payroll Details" />}
                options={{ presentation: 'modal' }}
            />
            <RootStack.Screen 
                name="LoadMap" 
                component={() => <PlaceholderScreen title="Load Map" />}
                options={{ presentation: 'modal' }}
            />
            <RootStack.Screen 
                name="RoadsideCheck" 
                component={() => <PlaceholderScreen title="Roadside Check" />}
                options={{ presentation: 'modal' }}
            />
        </RootStack.Navigator>
    );
}

const styles = StyleSheet.create({
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
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