// src/services/ApiService.ts - CORRECTED VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS, IS_DEV } from '../../config/env';
import { logger } from '../../utils/loggerHelper';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    statusCode?: number;
}

interface LoginResponse {
    success: boolean;
    message: string;
    driver: {
        id: string;
        name: string;
        email: string;
        token: string;
    };
}

class ApiService {
    private baseURL: string;
    private token: string | null = null;
    private isInitialized: boolean = false;
    private requestCache = new Map();

    constructor() {
        this.baseURL = API_BASE_URL;
        // Initialize immediately without async operations
        this.loadTokenSync();
    }

    // 🔧 FIXED: Synchronous token loading
    private loadTokenSync() {
        AsyncStorage.getItem('auth_token').then(token => {
            if (token) {
                this.token = token;
                logger.info('Token loaded from storage');
            }
        }).catch(error => {
            logger.error('Failed to load token from storage', error);
        });
    }

    // 🔧 FIXED: Simplified initialization - only find working endpoint in dev
    private async ensureInitialized() {
        if (this.isInitialized) return;

        try {
            // In development, try to find working endpoint
            if (IS_DEV && API_ENDPOINTS && API_ENDPOINTS.length > 0) {
                const workingEndpoint = await this.findWorkingEndpoint();
                if (workingEndpoint) {
                    this.baseURL = workingEndpoint;
                    logger.info('Using working endpoint', { endpoint: this.baseURL });
                }
            }
            
            this.isInitialized = true;
            logger.info('API Service initialized', { baseURL: this.baseURL });
        } catch (error) {
            logger.error('Failed to initialize API service', error);
            // Continue with default endpoint
            this.isInitialized = true;
        }
    }

    // 🔧 FIXED: Better endpoint detection with shorter timeout
    private async findWorkingEndpoint(): Promise<string | null> {
        const endpoints = [...(API_ENDPOINTS || []), this.baseURL];
        const uniqueEndpoints = [...new Set(endpoints)];
        
        logger.info('Testing endpoints', { endpoints: uniqueEndpoints });

        for (const endpoint of uniqueEndpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

                const response = await fetch(`${endpoint}/health`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                // Accept any response that's not a network error
                logger.info(`Endpoint test result: ${endpoint} - Status: ${response.status}`);
                return endpoint;

            } catch (error: any) {
                logger.warn(`Endpoint failed: ${endpoint}`, { error: error.name });
                continue;
            }
        }

        logger.warn('No working endpoint found');
        return null;
    }

    // Set authorization token
    private async setAuthToken(token: string) {
        this.token = token;
        try {
            await AsyncStorage.setItem('auth_token', token);
            logger.info('Auth token stored successfully');
        } catch (error) {
            logger.error('Failed to store auth token', error);
        }
    }

    // Remove authorization token
    private async removeAuthToken() {
        this.token = null;
        try {
            await AsyncStorage.removeItem('auth_token');
            logger.info('Auth token removed successfully');
        } catch (error) {
            logger.error('Failed to remove auth token', error);
        }
    }

    // 🔧 FIXED: Improved request method with proper endpoint handling
    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        requiresAuth: boolean = false
    ): Promise<ApiResponse<T>> {
        await this.ensureInitialized();

        const requestId = Math.random().toString(36).substr(2, 9);

        // Prepare headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers as Record<string, string>,
        };

        // Add auth token if required and available
        if (requiresAuth && this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        const requestOptions: RequestInit = {
            ...options,
            headers,
        };

        // 🔧 FIXED: Create proper endpoint list for fallback
        const endpointsToTry: string[] = [];
        
        // Always try current baseURL first
        endpointsToTry.push(this.baseURL);
        
        // In development, add other endpoints as fallbacks
        if (IS_DEV && API_ENDPOINTS && API_ENDPOINTS.length > 0) {
            API_ENDPOINTS.forEach(ep => {
                if (ep !== this.baseURL && !endpointsToTry.includes(ep)) {
                    endpointsToTry.push(ep);
                }
            });
        }

        let lastError: ApiResponse<T> = { 
            success: false, 
            error: 'Unable to connect to server',
            statusCode: 0
        };

        for (let i = 0; i < endpointsToTry.length; i++) {
            const baseUrl = endpointsToTry[i];
            const url = `${baseUrl}${endpoint}`;

            logger.debug('API Request', {
                requestId,
                attempt: i + 1,
                totalAttempts: endpointsToTry.length,
                method: options.method || 'GET',
                url,
                hasAuth: requiresAuth && !!this.token,
            });

            try {
                const startTime = Date.now();
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;

                // Parse response
                let responseData: any;
                const contentType = response.headers.get('content-type');

                try {
                    if (contentType && contentType.includes('application/json')) {
                        responseData = await response.json();
                    } else {
                        responseData = await response.text();
                    }
                } catch (parseError) {
                    logger.warn('Failed to parse response', { parseError, status: response.status });
                    responseData = null;
                }

                logger.debug('API Response', {
                    requestId,
                    attempt: i + 1,
                    status: response.status,
                    duration: `${duration}ms`,
                    url,
                });

                // Handle successful responses
                if (response.ok) {
                    // Update baseURL if we switched to a working endpoint
                    if (baseUrl !== this.baseURL) {
                        this.baseURL = baseUrl;
                        logger.info('Switched to working endpoint', { endpoint: baseUrl });
                    }

                    return {
                        success: true,
                        data: responseData,
                        statusCode: response.status,
                    };
                }

                // Handle HTTP errors
                let errorMessage = 'Request failed';
                
                if (responseData && typeof responseData === 'object' && responseData.message) {
                    errorMessage = responseData.message;
                } else if (responseData && typeof responseData === 'string') {
                    errorMessage = responseData;
                }

                switch (response.status) {
                    case 401:
                        errorMessage = 'Authentication failed. Please login again.';
                        await this.removeAuthToken();
                        break;
                    case 403:
                        errorMessage = 'Access denied. Insufficient permissions.';
                        break;
                    case 404:
                        errorMessage = 'Service not found.';
                        break;
                    case 422:
                        errorMessage = responseData?.message || 'Invalid data provided.';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later.';
                        break;
                }

                logger.warn('API HTTP Error', {
                    requestId,
                    attempt: i + 1,
                    status: response.status,
                    error: errorMessage,
                    url,
                });

                lastError = {
                    success: false,
                    error: errorMessage,
                    statusCode: response.status,
                };

                // Don't try other endpoints for client errors (4xx) except 401, 403, 404
                if (response.status >= 400 && response.status < 500 && 
                    ![401, 403, 404, 502, 503, 504].includes(response.status)) {
                    return lastError;
                }

            } catch (error: any) {
                logger.error('API Network Error', {
                    requestId,
                    attempt: i + 1,
                    url,
                    error: error.message,
                    name: error.name,
                });

                let errorMessage = 'Network error occurred';

                if (error.name === 'AbortError') {
                    errorMessage = 'Request timed out. Please check your connection.';
                } else if (error.message?.includes('Network request failed') || 
                          error.message?.includes('fetch')) {
                    errorMessage = 'Unable to connect. Please check your internet connection.';
                } else if (error.message?.includes('ECONNREFUSED')) {
                    errorMessage = 'Server is not available.';
                }

                lastError = {
                    success: false,
                    error: errorMessage,
                    statusCode: 0,
                };

                // Continue to next endpoint
            }
        }

        // All endpoints failed
        logger.error('All endpoints failed', {
            requestId,
            totalAttempts: endpointsToTry.length,
            lastError: lastError.error,
        });

        return lastError;
    }

    // Auth endpoints
    async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
        const response = await this.request<LoginResponse>('/driver/login', {
            method: 'POST',
            body: JSON.stringify({
                email: email.trim().toLowerCase(),
                password: password.trim()
            }),
        });

        // Store token on successful login
        if (response.success && response.data?.driver?.token) {
            await this.setAuthToken(response.data.driver.token);
            logger.info('User logged in successfully', {
                userId: response.data.driver.id,
            });
        }

        return response;
    }

    async logout(): Promise<ApiResponse> {
        const response = await this.request('/driver/logout', {
            method: 'POST'
        }, true);

        // Always remove local token
        await this.removeAuthToken();
        logger.info('User logged out');

        return response;
    }

    // Profile endpoints
    async getProfile(): Promise<ApiResponse> {
        return this.request('/driver/profile', { method: 'GET' }, true);
    }

    async updateProfile(profileData: any): Promise<ApiResponse> {
        return this.request('/driver/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        }, true);
    }

    // Utility methods
    isAuthenticated(): boolean {
        return !!this.token;
    }

    async getStoredToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem('auth_token');
        } catch {
            return null;
        }
    }

    getEndpointInfo() {
        return {
            current: this.baseURL,
            available: IS_DEV ? API_ENDPOINTS : [this.baseURL],
            isInitialized: this.isInitialized,
        };
    }

    async testConnection(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response.status < 500;
        } catch {
            return false;
        }
    }

    // Generic CRUD methods
    async get<T>(endpoint: string, requiresAuth: boolean = true): Promise<ApiResponse<T>> {
        return this.request(endpoint, { method: 'GET' }, requiresAuth);
    }

    async post<T>(endpoint: string, data: any, requiresAuth: boolean = true): Promise<ApiResponse<T>> {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        }, requiresAuth);
    }

    async put<T>(endpoint: string, data: any, requiresAuth: boolean = true): Promise<ApiResponse<T>> {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        }, requiresAuth);
    }

    async delete<T>(endpoint: string, requiresAuth: boolean = true): Promise<ApiResponse<T>> {
        return this.request(endpoint, { method: 'DELETE' }, requiresAuth);
    }

    clearCache() {
        this.requestCache.clear();
    }

    async forceReInitialize() {
        this.isInitialized = false;
        this.clearCache();
        await this.ensureInitialized();
    }
}

// Singleton instance
export const apiService = new ApiService();
export default apiService;