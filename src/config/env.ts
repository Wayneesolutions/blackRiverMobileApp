// src/config/env.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';



type ManifestWithReleaseChannel = typeof Constants.manifest & {
    releaseChannel?: string;
};

interface Config {
    API_BASE_URL: string;
    SOCKET_URL: string;
    NODE_ENV: string;
    DB_NAME: string;
}

// Get the local IP address for development with fallback options
const getLocalIP = () => {
    // 🔧 FIX: Use your actual working IP address
    const LOCAL_IP = '192.168.1.16'; // Your computer's actual IP

    if (Platform.OS === 'android') {
        // 🔧 FIX: Try actual IP first, then fallback to emulator IP
        return __DEV__ ? LOCAL_IP : LOCAL_IP; // Use LOCAL_IP for both dev and prod on Android
    }

    // For iOS simulator and physical devices
    return LOCAL_IP;
};

// Multiple endpoint fallback strategy
const getAPIEndpoints = () => {
    const LOCAL_IP = '192.168.1.16'; // Your working IP

    if (Platform.OS === 'android') {
        return [
            `http://${LOCAL_IP}:3000/api/v1`,     // Primary: Your actual IP
            `http://10.0.2.2:3000/api/v1`,       // Fallback: Emulator IP
            `http://localhost:3000/api/v1`,      // Last resort
        ];
    } else if (Platform.OS === 'ios') {
        return [
            `http://${LOCAL_IP}:3000/api/v1`,     // Primary: Your actual IP
            `http://localhost:3000/api/v1`,      // Fallback for simulator
        ];
    } else {
        return [`http://localhost:3000/api/v1`]; // Web
    }
};

// Environment configurations
const ENV = {
    development: {
        API_BASE_URL: getLocalIP() ? `http://${getLocalIP()}:3000/api/v1` : 'http://localhost:3000/api/v1',
        SOCKET_URL: getLocalIP() ? `http://${getLocalIP()}:3000` : 'http://localhost:3000',
        NODE_ENV: 'development',
        DB_NAME: 'blackriver',
    },
    staging: {
        API_BASE_URL: 'https://staging-api.blackriver.com/api/v1',
        SOCKET_URL: 'https://staging-api.blackriver.com',
        NODE_ENV: 'staging',
        DB_NAME: 'blackriver-staging',
    },
    production: {
        API_BASE_URL: 'https://api.blackriver.com/api/v1',
        SOCKET_URL: 'https://api.blackriver.com',
        NODE_ENV: 'production',
        DB_NAME: 'blackriver-prod',
    },
};

const manifest = Constants.manifest as ManifestWithReleaseChannel;

const getEnvVars = (env = manifest?.releaseChannel): Config => {
    if (env === 'production') return ENV.production;
    if (env === 'staging') return ENV.staging;
    return ENV.development;
};
export const config = getEnvVars();

// Export for easier access throughout the app
export const {
    API_BASE_URL,
    SOCKET_URL,
    NODE_ENV,
    DB_NAME
} = config;

export const IS_DEV = NODE_ENV === 'development';
export const IS_PROD = NODE_ENV === 'production';

// 🔧 NEW: Export endpoint options for fallback
export const API_ENDPOINTS = IS_DEV ? getAPIEndpoints() : [API_BASE_URL];

// Debug logging in development
if (IS_DEV) {
    console.log('🚀 Environment Config:', {
        API_BASE_URL,
        SOCKET_URL,
        NODE_ENV,
        DB_NAME,
        Platform: Platform.OS,
        'Available Endpoints': API_ENDPOINTS,
    });
}

// Enhanced connection test with multiple endpoints
export const testConnection = async (url?: string): Promise<boolean> => {
    const testUrl = url || API_BASE_URL;

    try {
        console.log(`🧪 Testing connection to: ${testUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${testUrl.replace('/api/v1', '')}/api/v1/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            console.log(`✅ Connection successful to: ${testUrl}`);
            return true;
        } else {
            console.log(`❌ Connection failed with status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Connection test failed for ${testUrl}:`, (error as Error).message);
        return false;
    }

};

// 🔧 NEW: Test all endpoints and return the first working one
export const findWorkingEndpoint = async (): Promise<string | null> => {
    if (!IS_DEV) {
        return API_BASE_URL;
    }

    console.log('🔍 Finding working endpoint...');

    for (const endpoint of API_ENDPOINTS) {
        const isWorking = await testConnection(endpoint);
        if (isWorking) {
            console.log(`✅ Found working endpoint: ${endpoint}`);
            return endpoint;
        }
    }

    console.log('⚠️ No working endpoints found, using default:', API_BASE_URL);
    return API_BASE_URL;
};