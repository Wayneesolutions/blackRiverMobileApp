// src/config/env.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Network from 'expo-network';

type ManifestWithReleaseChannel = typeof Constants.manifest & {
    releaseChannel?: string;
};

interface Config {
    API_BASE_URL: string;
    SOCKET_URL: string;
    NODE_ENV: string;
    DB_NAME: string;
}

const getLocalIP = () => {
    // Try multiple possible IPs for your network
    const possibleIPs = [
        '192.168.1.17',  // Your Metro server IP
        '192.168.1.16',  // Your previous IP
        '192.168.0.16',  // Common router range
        '192.168.0.17',
        '10.0.0.16',     // Another common range
        '10.0.0.17'
    ];

    if (Platform.OS === 'android') {
        return possibleIPs[0]; // Use Metro server IP first
    }

    return possibleIPs[0];
};

const getAPIEndpoints = () => {
    const possibleIPs = ['192.168.1.17', '192.168.1.16', '192.168.0.17', '192.168.0.16'];

    if (Platform.OS === 'android') {
        return [
            ...possibleIPs.map(ip => `http://${ip}:3000/api/v1`),
            'http://10.0.2.2:3000/api/v1',     // Android emulator
            'http://localhost:3000/api/v1',
            'http://127.0.0.1:3000/api/v1'
        ];
    } else if (Platform.OS === 'ios') {
        return [
            ...possibleIPs.map(ip => `http://${ip}:3000/api/v1`),
            'http://localhost:3000/api/v1'
        ];
    } else {
        return ['http://localhost:3000/api/v1'];
    }
};

// 🔧 ASYNC Environment configurations
const createENVConfig = async () => {
    const localIP = await getLocalIP();

    return {
        development: {
            API_BASE_URL: `http://${localIP}:3000/api/v1`,
            SOCKET_URL: `http://${localIP}:3000`,
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
};

const manifest = Constants.manifest as ManifestWithReleaseChannel;

// 🔧 ASYNC config getter
let configCache: Config | null = null;

const getEnvVars = async (env = manifest?.releaseChannel): Promise<Config> => {
    if (configCache) return configCache;

    const ENV = await createENVConfig();

    let config: Config;
    if (env === 'production') config = ENV.production;
    else if (env === 'staging') config = ENV.staging;
    else config = ENV.development;

    configCache = config;
    return config;
};

// 🔧 Initialize config asynchronously
let config: Config;
let API_BASE_URL: string;
let SOCKET_URL: string;
let NODE_ENV: string;
let DB_NAME: string;
let IS_DEV: boolean;
let IS_PROD: boolean;
let API_ENDPOINTS: string[];

// Initialize configuration
const initConfig = async () => {
    config = await getEnvVars();

    API_BASE_URL = config.API_BASE_URL;
    SOCKET_URL = config.SOCKET_URL;
    NODE_ENV = config.NODE_ENV;
    DB_NAME = config.DB_NAME;
    IS_DEV = NODE_ENV === 'development';
    IS_PROD = NODE_ENV === 'production';
    API_ENDPOINTS = IS_DEV ? await getAPIEndpoints() : [API_BASE_URL];

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
};

// Initialize immediately
initConfig().catch(console.error);

// 🔧 IMPROVED: Enhanced connection test with better error handling
export const testConnection = async (url?: string): Promise<boolean> => {
    const testUrl = url || API_BASE_URL || 'http://192.168.1.17:3000/api/v1';

    try {
        console.log(`🧪 Testing connection to: ${testUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout

        // Try health endpoint first, then fallback to base endpoint
        const healthUrl = `${testUrl.replace('/api/v1', '')}/api/v1/health`;

        const response = await fetch(healthUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ Connection test failed for ${testUrl}:`, errorMessage);
        return false;
    }
};

// 🔧 IMPROVED: Test all endpoints and return the first working one
export const findWorkingEndpoint = async (): Promise<string | null> => {
    if (!IS_DEV) {
        return API_BASE_URL;
    }

    console.log('🔍 Testing all available endpoints...');

    for (const endpoint of API_ENDPOINTS) {
        console.log(`Testing endpoint: ${endpoint}`);
        const isWorking = await testConnection(endpoint);
        if (isWorking) {
            console.log(`✅ Found working endpoint: ${endpoint}`);
            // Update the cached config with working endpoint
            if (config) {
                config.API_BASE_URL = endpoint;
                config.SOCKET_URL = endpoint.replace('/api/v1', '');
            }
            return endpoint;
        }
    }

    console.log('❌ No working endpoints found');
    return API_BASE_URL;
};

// 🔧 NEW: Get config with initialization check
export const getConfig = async (): Promise<Config> => {
    if (!config) {
        await initConfig();
    }
    return config;
};

// Export the config getter for async access
export const getAPIBaseURL = async (): Promise<string> => {
    if (!API_BASE_URL) {
        await initConfig();
    }
    return API_BASE_URL;
};

// Export other values (will be undefined until initConfig completes)
export {
    config,
    API_BASE_URL,
    SOCKET_URL,
    NODE_ENV,
    DB_NAME,
    IS_DEV,
    IS_PROD,
    API_ENDPOINTS
};

// 🔧 NEW: Hook for React components
export const useConfig = () => {
    return {
        API_BASE_URL,
        SOCKET_URL,
        NODE_ENV,
        DB_NAME,
        IS_DEV,
        IS_PROD,
        API_ENDPOINTS
    };
};