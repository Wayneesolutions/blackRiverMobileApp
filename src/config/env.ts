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


const getCurrentIP = async (): Promise<string | null> => {
    try {
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

        return null;
    } catch (error) {
        console.log('❌ Failed to get current IP:', error);
        return null;
    }
};


const getFallbackIPs = () => {
    const possibleIPs = [
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
    const currentIP = await getCurrentIP();

    if (currentIP) {
        return currentIP;
    }

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

// Global variables
let config: Config;
let API_BASE_URL: string;
let SOCKET_URL: string;
let NODE_ENV: string;
let DB_NAME: string;
let IS_DEV: boolean;
let IS_PROD: boolean;
let API_ENDPOINTS: string[];


const initConfig = async () => {
    console.log('🚀 Initializing config with IP detection...');

    config = await getEnvVars();

    API_BASE_URL = config.API_BASE_URL;
    SOCKET_URL = config.SOCKET_URL;
    NODE_ENV = config.NODE_ENV;
    DB_NAME = config.DB_NAME;
    IS_DEV = NODE_ENV === 'development';
    IS_PROD = NODE_ENV === 'production';

    if (IS_DEV) {
        API_ENDPOINTS = await getAPIEndpoints();
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
};

initConfig().catch(console.error);

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


            if (config) {
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
    return config;
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