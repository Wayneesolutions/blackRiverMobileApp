// src/config/env.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';
// Conditionally import expo-network (not available in Expo Go)
let Network: any = null;
try {
  Network = require('expo-network');
} catch (e) {
  // expo-network not available (e.g., in Expo Go)
  console.warn('expo-network not available, using fallback IP detection');
}
import { API_BASE_URL as ENV_API_BASE_URL, SOCKET_URL as ENV_SOCKET_URL, 
    NODE_ENV as ENV_NODE_ENV, DB_NAME as ENV_DB_NAME } from '@env';

// Debug: Log imported .env values
console.log('📦 .env values imported:', {
    ENV_API_BASE_URL,
    ENV_SOCKET_URL,
    ENV_NODE_ENV,
    ENV_DB_NAME
});

type ManifestWithReleaseChannel = typeof Constants.manifest & {
    releaseChannel?: string;
};

interface Config {
    API_BASE_URL: string;
    SOCKET_URL: string;
    NODE_ENV: string;
    DB_NAME: string;
}


const getCurrentIP = async (): Promise<string | null> => {
    try {
        // Only use expo-network if available (requires custom build)
        if (Network) {
            const networkState = await Network.getNetworkStateAsync();

            if (!networkState.isConnected) {
                console.log('❌ Not connected to network');
                return null;
            }

            const ipAddress = await Network.getIpAddressAsync();

            if (ipAddress && ipAddress !== '127.0.0.1') {
                console.log(`🌐 Current IP detected: ${ipAddress}`);
                return ipAddress;
            }
        } else {
            console.log('ℹ️ expo-network not available, using fallback IP detection');
        }

        return null;
    } catch (error) {
        console.log('❌ Failed to get current IP:', error);
        return null;
    }
};


const getFallbackIPs = () => {
    // If .env has values, don't use fallback IPs - force use of .env
    if (ENV_API_BASE_URL && ENV_API_BASE_URL !== 'undefined') {
        // Extract IP from .env URL if possible
        const envUrl = ENV_API_BASE_URL;
        const match = envUrl.match(/http:\/\/([^:]+)/);
        if (match && match[1]) {
            return [match[1]]; // Only return the .env IP
        }
    }
    
    const possibleIPs = [
        // Add common server IPs first (prioritize these)
        '192.168.31.247', // Current server IP
        '192.168.31.161', // Alternative server IP
        '192.168.1.17',
        '192.168.1.16',
        '192.168.0.16',
        '192.168.0.17',
        '10.0.0.16',
        '10.0.0.17',
        '192.168.1.100',
        '192.168.1.101',
        '192.168.0.100',
        '192.168.0.101'
    ];

    return possibleIPs;
};


const getLocalIP = async (): Promise<string> => {
    // PRIORITY 1: Use .env value if available
    if (ENV_API_BASE_URL && ENV_API_BASE_URL !== 'undefined') {
        const envUrl = ENV_API_BASE_URL;
        const match = envUrl.match(/http:\/\/([^:]+)/);
        if (match && match[1]) {
            console.log(`✅ Using .env IP: ${match[1]}`);
            return match[1];
        }
    }
    
    // PRIORITY 2: Try auto-detection
    const currentIP = await getCurrentIP();
    if (currentIP) {
        return currentIP;
    }

    // PRIORITY 3: Use fallback IPs
    const fallbackIPs = getFallbackIPs();
    console.log('🔄 Using fallback IPs, auto-detection failed');

    if (Platform.OS === 'android') {
        return fallbackIPs[0];
    }

    return fallbackIPs[0];
};

const getAPIEndpoints = async (): Promise<string[]> => {
    const endpoints: string[] = [];

    const currentIP = await getCurrentIP();

    if (currentIP) {
        endpoints.push(`http://${currentIP}:3000/api/v1`);
    }

    const fallbackIPs = getFallbackIPs();
    endpoints.push(...fallbackIPs.map(ip => `http://${ip}:3000/api/v1`));

    if (Platform.OS === 'android') {
        endpoints.push(
            'http://10.0.2.2:3000/api/v1',
            'http://localhost:3000/api/v1',
            'http://127.0.0.1:3000/api/v1'
        );
    } else if (Platform.OS === 'ios') {
        endpoints.push('http://localhost:3000/api/v1');
    } else {
        endpoints.push('http://localhost:3000/api/v1');
    }

    return [...new Set(endpoints)];
};

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

// Global variables - Load from .env file with fallbacks
// These will be updated by initConfig() but provide immediate values from .env
let config: Config | null = null;

// Get values from .env file, with platform-specific fallbacks
const getDefaultBaseURL = (): string => {
  // Use .env value if available
  if (ENV_API_BASE_URL && ENV_API_BASE_URL !== 'undefined') {
    return ENV_API_BASE_URL;
  }
  // Platform-specific fallbacks
  return Platform.OS === 'android' 
    ? 'http://10.0.2.2:3000/api/v1'  // Android emulator default
    : 'http://localhost:3000/api/v1'; // iOS simulator / web default
};

const getDefaultSocketURL = (): string => {
  if (ENV_SOCKET_URL && ENV_SOCKET_URL !== 'undefined') {
    return ENV_SOCKET_URL;
  }
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';
};

let API_BASE_URL: string = getDefaultBaseURL();
let SOCKET_URL: string = getDefaultSocketURL();
let NODE_ENV: string = (ENV_NODE_ENV && ENV_NODE_ENV !== 'undefined') ? ENV_NODE_ENV : 'development';
let DB_NAME: string = (ENV_DB_NAME && ENV_DB_NAME !== 'undefined') ? ENV_DB_NAME : 'blackriver';
let IS_DEV: boolean = NODE_ENV === 'development';
let IS_PROD: boolean = NODE_ENV === 'production';
let API_ENDPOINTS: string[] = [API_BASE_URL];


const initConfig = async () => {
    try {
        // Check if .env values exist - if so, skip auto-detection entirely
        const hasEnvValues = (ENV_API_BASE_URL && ENV_API_BASE_URL !== 'undefined') || 
                           (ENV_SOCKET_URL && ENV_SOCKET_URL !== 'undefined');
        
        if (hasEnvValues) {
            console.log('✅ .env file detected - skipping auto-detection');
            // Use .env values directly, no auto-detection needed
            if (ENV_API_BASE_URL && ENV_API_BASE_URL !== 'undefined') {
                API_BASE_URL = ENV_API_BASE_URL;
                console.log(`✅ Using .env API_BASE_URL: ${API_BASE_URL}`);
            }
            
            if (ENV_SOCKET_URL && ENV_SOCKET_URL !== 'undefined') {
                SOCKET_URL = ENV_SOCKET_URL;
                console.log(`✅ Using .env SOCKET_URL: ${SOCKET_URL}`);
            }
            
            // Still get config for other values (NODE_ENV, DB_NAME)
            config = await getEnvVars();
        } else {
            console.log('🚀 No .env values found - using auto-detection...');
            config = await getEnvVars();

            // Use auto-detected values
            if (config.API_BASE_URL && config.API_BASE_URL !== getDefaultBaseURL()) {
                console.log(`⚠️ Using auto-detected API_BASE_URL: ${config.API_BASE_URL}`);
                API_BASE_URL = config.API_BASE_URL;
            } else {
                console.log(`⚠️ Using default API_BASE_URL: ${getDefaultBaseURL()}`);
            }
            
            if (config.SOCKET_URL && config.SOCKET_URL !== getDefaultSocketURL()) {
                console.log(`⚠️ Using auto-detected SOCKET_URL: ${config.SOCKET_URL}`);
                SOCKET_URL = config.SOCKET_URL;
            } else {
                console.log(`⚠️ Using default SOCKET_URL: ${getDefaultSocketURL()}`);
            }
        }
        // Use .env NODE_ENV if provided, otherwise use config
        if (ENV_NODE_ENV && ENV_NODE_ENV !== 'undefined') {
            NODE_ENV = ENV_NODE_ENV;
        } else {
            NODE_ENV = config.NODE_ENV;
        }
        // Use .env DB_NAME if provided, otherwise use config
        if (ENV_DB_NAME && ENV_DB_NAME !== 'undefined') {
            DB_NAME = ENV_DB_NAME;
        } else {
            DB_NAME = config.DB_NAME;
        }
        IS_DEV = NODE_ENV === 'development';
        IS_PROD = NODE_ENV === 'production';

        if (IS_DEV) {
            // If .env values exist, prioritize them in endpoints list
            if (hasEnvValues) {
                // Use .env URL as primary, add fallbacks
                API_ENDPOINTS = [API_BASE_URL];
                const fallbackEndpoints = await getAPIEndpoints();
                // Add fallbacks but don't override .env URL
                for (const endpoint of fallbackEndpoints) {
                    if (endpoint !== API_BASE_URL && !API_ENDPOINTS.includes(endpoint)) {
                        API_ENDPOINTS.push(endpoint);
                    }
                }
            } else {
                API_ENDPOINTS = await getAPIEndpoints();
                // Ensure baseURL is in endpoints list
                if (!API_ENDPOINTS.includes(API_BASE_URL)) {
                    API_ENDPOINTS.unshift(API_BASE_URL);
                }
            }
        } else {
            API_ENDPOINTS = [API_BASE_URL];
        }

        if (IS_DEV) {
            const currentIP = await getCurrentIP();
            console.log('🚀 Environment Config:', {
                'Detected IP': currentIP,
                API_BASE_URL,
                SOCKET_URL,
                NODE_ENV,
                DB_NAME,
                Platform: Platform.OS,
                'Available Endpoints': API_ENDPOINTS.slice(0, 5),
                'Total Endpoints': API_ENDPOINTS.length
            });
        }
    } catch (error) {
        console.error('❌ Failed to initialize config:', error);
        // Keep default values if initialization fails
        console.log('⚠️ Using default configuration:', {
            API_BASE_URL,
            SOCKET_URL,
            NODE_ENV,
            Platform: Platform.OS
        });
    }
};

// Start initialization immediately
initConfig().catch(error => {
    console.error('❌ Config initialization error:', error);
});

export const testConnection = async (url?: string): Promise<boolean> => {
    const testUrl = url || API_BASE_URL || 'http://localhost:3000/api/v1';

    try {
        console.log(`🧪 Testing connection to: ${testUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

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


export const findWorkingEndpoint = async (): Promise<string | null> => {
    if (!IS_DEV) {
        return API_BASE_URL;
    }

    const currentIP = await getCurrentIP();
    if (currentIP) {
        const currentEndpoint = `http://${currentIP}:3000/api/v1`;
        console.log(`🎯 Testing current IP endpoint: ${currentEndpoint}`);

        if (await testConnection(currentEndpoint)) {
            console.log(`✅ Current IP endpoint works: ${currentEndpoint}`);

            // Don't override .env values - only update if no .env values exist
            if (config && !(ENV_API_BASE_URL && ENV_API_BASE_URL !== 'undefined')) {
                config.API_BASE_URL = currentEndpoint;
                config.SOCKET_URL = currentEndpoint.replace('/api/v1', '');
            }

            return currentEndpoint;
        }
    }

    for (const endpoint of API_ENDPOINTS) {
        if (currentIP && endpoint.includes(currentIP)) {
            continue;
        }

        console.log(`Testing fallback endpoint: ${endpoint}`);
        if (await testConnection(endpoint)) {
            console.log(`✅ Found working endpoint: ${endpoint}`);

            // Don't override .env values - only update if no .env values exist
            if (config && !(ENV_API_BASE_URL && ENV_API_BASE_URL !== 'undefined')) {
                config.API_BASE_URL = endpoint;
                config.SOCKET_URL = endpoint.replace('/api/v1', '');
            }

            return endpoint;
        }
    }

    console.log('❌ No working endpoints found');
    return API_BASE_URL;
};


export const refreshConfig = async (): Promise<void> => {
    console.log('🔄 Refreshing configuration...');
    configCache = null;
    await initConfig();
    console.log('✅ Configuration refreshed');
};

// Export functions
export const getConfig = async (): Promise<Config> => {
    if (!config) {
        await initConfig();
    }
    
    // Always return current values from global variables (which respect .env)
    // This ensures .env values take priority over cached config object
    return {
        API_BASE_URL: API_BASE_URL,  // Use global variable (respects .env)
        SOCKET_URL: SOCKET_URL,      // Use global variable (respects .env)
        NODE_ENV: NODE_ENV,
        DB_NAME: DB_NAME,
    };
};

export const getAPIBaseURL = async (): Promise<string> => {
    if (!API_BASE_URL) {
        await initConfig();
    }
    return API_BASE_URL;
};

// Export variables
export {
    config,
    API_BASE_URL,
    SOCKET_URL,
    NODE_ENV,
    DB_NAME,
    IS_DEV,
    IS_PROD,
    API_ENDPOINTS,
    getCurrentIP
};


export const useConfig = () => {
    return {
        API_BASE_URL,
        SOCKET_URL,
        NODE_ENV,
        DB_NAME,
        IS_DEV,
        IS_PROD,
        API_ENDPOINTS,
        refreshConfig,
        getCurrentIP
    };
};