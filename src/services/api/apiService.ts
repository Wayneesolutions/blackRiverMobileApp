// src/services/ApiService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS, IS_DEV, findWorkingEndpoint } from '../../config/env';
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

    constructor() {
        this.baseURL = API_BASE_URL;
        this.initialize();
    }

    // 🔧 NEW: Initialize with working endpoint detection
    private async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Load token from storage
            const storedToken = await AsyncStorage.getItem('auth_token');
            this.token = storedToken;
            
            // Find working endpoint in development
            if (IS_DEV) {
                const workingEndpoint = await findWorkingEndpoint();
                if (workingEndpoint) {
                    this.baseURL = workingEndpoint;
                    logger.info('API Service initialized with endpoint', { endpoint: this.baseURL });
                }
            }
            
            this.isInitialized = true;
        } catch (error) {
            logger.error('Failed to initialize API service', error);
        }
    }

    // 🔧 NEW: Ensure initialization before requests
    private async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
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

    // 🔧 ENHANCED: Request method with endpoint fallback
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

        // Add auth token if required
        if (requiresAuth && this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        const requestOptions: RequestInit = {
            ...options,
            headers,
        };

        // 🔧 NEW: Try multiple endpoints in development
        const endpointsToTry = IS_DEV ? API_ENDPOINTS : [this.baseURL];
        let lastError: ApiResponse<T> = { success: false, error: 'Unknown error' };

        for (let i = 0; i < endpointsToTry.length; i++) {
            const baseUrl = endpointsToTry[i];
            const url = `${baseUrl}${endpoint}`;

            // Log request (professional logging)
            logger.debug('API Request', {
                requestId,
                attempt: i + 1,
                totalAttempts: endpointsToTry.length,
                method: options.method || 'GET',
                url,
                headers: this.sanitizeHeaders(headers),
                body: options.body ? JSON.parse(options.body as string) : null,
            });

            try {
                const startTime = Date.now();
                
                // Create timeout controller
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal,
                });
                
                clearTimeout(timeoutId);
                const endTime = Date.now();
                const duration = endTime - startTime;

                // Parse response
                let responseData: any;
                const contentType = response.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    responseData = await response.json();
                } else {
                    responseData = await response.text();
                }

                // Log response
                logger.debug('API Response', {
                    requestId,
                    attempt: i + 1,
                    status: response.status,
                    statusText: response.statusText,
                    duration: `${duration}ms`,
                    url,
                });

                // Handle different response statuses
                if (response.ok) {
                    // Success - update baseURL if it was different
                    if (baseUrl !== this.baseURL) {
                        this.baseURL = baseUrl;
                        logger.info('Switched to working endpoint', { endpoint: baseUrl });
                    }
                    
                    return {
                        success: true,
                        data: responseData,
                        statusCode: response.status,
                    };
                } else {
                    // Handle specific error codes
                    let errorMessage = responseData?.message || `HTTP Error: ${response.status}`;

                    switch (response.status) {
                        case 401:
                            errorMessage = 'Authentication failed. Please login again.';
                            await this.removeAuthToken();
                            break;
                        case 403:
                            errorMessage = 'Access denied. Insufficient permissions.';
                            break;
                        case 404:
                            errorMessage = 'Service not found. Please contact support.';
                            break;
                        case 422:
                            errorMessage = responseData?.message || 'Invalid data provided.';
                            break;
                        case 429:
                            errorMessage = 'Too many requests. Please try again later.';
                            break;
                        case 500:
                            errorMessage = 'Server error. Please try again later.';
                            break;
                        case 502:
                        case 503:
                        case 504:
                            errorMessage = 'Service temporarily unavailable.';
                            break;
                    }

                    logger.warn('API Error Response', {
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

                    // Don't try other endpoints for client errors (4xx)
                    if (response.status >= 400 && response.status < 500) {
                        return lastError;
                    }
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
                } else if (error.message === 'Network request failed') {
                    errorMessage = 'Unable to connect. Please check your internet connection.';
                } else if (error.message.includes('ECONNREFUSED')) {
                    errorMessage = 'Server is not available. Please try again later.';
                }

                lastError = {
                    success: false,
                    error: errorMessage,
                    statusCode: 0,
                };

                // Continue to try next endpoint if available
            }
        }

        // All endpoints failed
        logger.error('All endpoints failed', {
            requestId,
            totalAttempts: endpointsToTry.length,
            lastError,
        });

        return lastError;
    }

    // Sanitize headers for logging (remove sensitive data)
    private sanitizeHeaders(headers: Record<string, string>) {
        const sanitized = { ...headers };
        if (sanitized.Authorization) {
            sanitized.Authorization = 'Bearer ***';
        }
        return sanitized;
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
                email: response.data.driver.email,
            });
        }

        return response;
    }

    async logout(): Promise<ApiResponse> {
        const response = await this.request('/driver/logout', {
            method: 'POST'
        }, true);

        // Always remove local token, even if API call fails
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

    // 🔧 NEW: Get current endpoint info for debugging
    getEndpointInfo() {
        return {
            current: this.baseURL,
            available: IS_DEV ? API_ENDPOINTS : [this.baseURL],
            isInitialized: this.isInitialized,
        };
    }

    // 🔧 NEW: Test current connection
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.request('/health', { method: 'GET' });
            return response.success;
        } catch {
            return false;
        }
    }

    // Generic CRUD methods for any resource
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
}

// Singleton instance
export const apiService = new ApiService();
export default apiService;