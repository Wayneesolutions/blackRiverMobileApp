// src/services/ApiService.ts - CORRECTED VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS, IS_DEV, getAPIBaseURL } from '../../config/env';
import { logger } from '../../utils/loggerHelper';
import { authManager } from '../../types/AuthManager';
import { AuthService } from '../../navigation/AppNavigator';

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
    private baseURL: string | null = null;
    private token: string | null = null;
    private isInitialized: boolean = false;
    private configInitialized: boolean = false;
    private requestCache = new Map();
    private onTokenExpiredCallback: (() => void) | null = null;
    private isLoggingOut: boolean = false;

    constructor() {
        // Initialize immediately without async operations
        this.loadTokenSync();
        // Try to get baseURL from config (might be undefined if config not loaded yet)
        this.baseURL = API_BASE_URL || null;
    }

    // Set callback for token expiration
    setOnTokenExpired(callback: () => void) {
        this.onTokenExpiredCallback = callback;
    }

    // Handle token expiration - clear auth and trigger logout
    private async handleTokenExpiration(): Promise<void> {
        // Prevent multiple simultaneous logout attempts
        if (this.isLoggingOut) {
            logger.warn('Logout already in progress, skipping duplicate call');
            return;
        }

        this.isLoggingOut = true;
        logger.warn('⚠️ Token expired or invalid. Logging out automatically...');

        try {
            // Clear token from API service
            await this.removeAuthToken();
            
            // Clear auth data from authManager
            await authManager.logout();
            
            // Clear auth data from AuthService
            await AuthService.clearAuth();
            
            logger.info('Auth data cleared successfully');
            
            // Trigger callback if set (for navigation)
            if (this.onTokenExpiredCallback) {
                this.onTokenExpiredCallback();
            }
        } catch (error) {
            logger.error('Error during automatic logout', error);
        } finally {
            // Reset flag after a delay to allow logout to complete
            setTimeout(() => {
                this.isLoggingOut = false;
            }, 2000);
        }
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

    // 🔧 FIXED: Non-blocking initialization - don't block requests with health checks
    private async ensureInitialized() {
        if (this.isInitialized && this.configInitialized) return;

        // Wait for config to be initialized if baseURL is undefined
        if (!this.baseURL || this.baseURL === 'undefined') {
            try {
                const baseURL = await getAPIBaseURL();
                if (baseURL) {
                    this.baseURL = baseURL;
                    this.configInitialized = true;
                    logger.info('Config loaded, baseURL set', { baseURL: this.baseURL });
                } else {
                    // Fallback if config still not ready
                    this.baseURL = API_BASE_URL || 'http://localhost:3000/api/v1';
                    logger.warn('Using fallback baseURL', { baseURL: this.baseURL });
                }
            } catch (error) {
                logger.error('Failed to get API base URL', error);
                this.baseURL = API_BASE_URL || 'http://localhost:3000/api/v1';
            }
        } else {
            this.configInitialized = true;
        }

        // Mark as initialized
        this.isInitialized = true;
        logger.info('API Service initialized', { baseURL: this.baseURL });

        // Only do endpoint discovery in background if in dev mode and we have multiple endpoints
        // Don't block requests for this
        if (IS_DEV && API_ENDPOINTS && API_ENDPOINTS.length > 1) {
            // Run endpoint discovery in background without blocking
            this.findWorkingEndpointInBackground().catch(error => {
                logger.warn('Background endpoint discovery failed', { error });
            });
        }
    }

    // 🔧 FIXED: Non-blocking endpoint detection - only test current endpoint first
    private async findWorkingEndpointInBackground(): Promise<void> {
        try {
            // First, quickly test the current baseURL
            const currentEndpoint = this.baseURL;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

                const response = await fetch(`${currentEndpoint}/health`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (response.ok || response.status < 500) {
                    logger.info(`Current endpoint works: ${currentEndpoint}`);
                    return; // Current endpoint works, no need to test others
                }
            } catch (error) {
                logger.debug(`Current endpoint test failed: ${currentEndpoint}`);
            }

            // Only if current endpoint fails, try a few others (max 3 to avoid too many requests)
            const endpointsToTry = (API_ENDPOINTS || [])
                .filter(ep => ep !== currentEndpoint)
                .slice(0, 3); // Only try first 3 alternatives

            for (const endpoint of endpointsToTry) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

                    const response = await fetch(`${endpoint}/health`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (response.ok || response.status < 500) {
                        this.baseURL = endpoint;
                        logger.info(`Switched to working endpoint: ${endpoint}`);
                        return; // Found working endpoint
                    }
                } catch (error: any) {
                    logger.debug(`Endpoint test failed: ${endpoint}`);
                    continue;
                }
            }

            logger.warn('No alternative working endpoint found, using current');
        } catch (error) {
            logger.warn('Background endpoint discovery error', { error });
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

    // 🔧 FIXED: Improved request method with proper endpoint handling
    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        requiresAuth: boolean = false
    ): Promise<ApiResponse<T>> {
        await this.ensureInitialized();

        const requestId = Math.random().toString(36).substr(2, 9);

        // Prepare headers
        // Don't set Content-Type for FormData - let fetch API set it with boundary
        const body = options?.body;
        let isFormData = false;
        try {
            isFormData = body != null && typeof FormData !== 'undefined' && body instanceof FormData;
        } catch (e) {
            // FormData might not be available or instanceof check failed
            isFormData = false;
        }
        const headers: Record<string, string> = {
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(options.headers as Record<string, string> || {}),
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
        
        // Ensure we have a valid baseURL
        if (!this.baseURL || this.baseURL === 'undefined') {
            logger.error('baseURL is undefined, cannot make request', { endpoint });
            return {
                success: false,
                error: 'API configuration not initialized. Please restart the app.',
                statusCode: 0
            };
        }
        
        // Always try current baseURL first
        endpointsToTry.push(this.baseURL);
        
        // In development, ONLY add fallback endpoints if baseURL is a default/localhost URL
        // If baseURL is a specific IP (like from .env), don't try other endpoints
        const isDefaultURL = !this.baseURL || 
            this.baseURL === 'http://localhost:3000/api/v1' || 
            this.baseURL === 'http://10.0.2.2:3000/api/v1' ||
            this.baseURL.includes('localhost') ||
            this.baseURL.includes('127.0.0.1');
        
        // Only try fallback endpoints if using default/localhost URL
        // If .env is set with a specific IP, we should ONLY use that
        if (IS_DEV && isDefaultURL && API_ENDPOINTS && API_ENDPOINTS.length > 0) {
            API_ENDPOINTS.forEach(ep => {
                if (ep && ep !== this.baseURL && !endpointsToTry.includes(ep)) {
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

                    // Log response data for debugging
                    logger.debug('Response data structure', { 
                        hasData: !!responseData,
                        dataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
                        dataType: typeof responseData
                    });

                    // Check for token expiration in successful responses (200 with success: false)
                    if (responseData && typeof responseData === 'object' && responseData.success === false) {
                        const message = responseData.message || responseData.error || '';
                        const lowerMessage = message.toLowerCase();
                        
                        // Check if message indicates token expiration
                        if (lowerMessage.includes('token has expired') || 
                            lowerMessage.includes('token expired') ||
                            lowerMessage.includes('no token provided') ||
                            lowerMessage.includes('please login again') ||
                            lowerMessage.includes('invalid token')) {
                            await this.handleTokenExpiration();
                            return {
                                success: false,
                                error: message || 'Token has expired. Please login again.',
                                statusCode: 401,
                            };
                        }
                    }

                    // Handle response format: backend returns {success: true/false, message: "..."}
                    // For password change, we check responseData.success explicitly
                    const backendSuccess = responseData?.success === true;
                    const isSuccess = backendSuccess && response.status < 400;
                    
                    return {
                        success: isSuccess,
                        data: responseData,
                        error: !backendSuccess ? (responseData?.message || responseData?.error || 'Request failed') : undefined,
                        statusCode: response.status,
                    };
                }

                // Handle HTTP errors
                let errorMessage = 'Request failed';
                
                // Check if backend returned an error message in responseData
                if (responseData && typeof responseData === 'object') {
                    if (responseData.message) {
                        errorMessage = responseData.message;
                    } else if (responseData.error) {
                        errorMessage = responseData.error;
                    } else if (responseData.success === false && responseData.message) {
                        errorMessage = responseData.message;
                    }
                } else if (responseData && typeof responseData === 'string') {
                    errorMessage = responseData;
                }

                switch (response.status) {
                    case 400:
                        // Bad request - use backend message if available
                        errorMessage = responseData?.message || responseData?.error || 'Invalid request. Please check your input.';
                        break;
                    case 401:
                        // Check for token-related errors
                        const message = responseData?.message || responseData?.error || '';
                        const lowerMessage = message.toLowerCase();
                        
                        // For login endpoint, 401 always means invalid credentials (not token issue)
                        // Don't call handleTokenExpiration for login attempts
                        if (endpoint.includes('/login')) {
                            errorMessage = message || 'Invalid credentials';
                        }
                        // For other endpoints, check if it's a token expiration/invalid token error
                        else if (lowerMessage.includes('token has expired') || 
                            lowerMessage.includes('token expired') ||
                            lowerMessage.includes('no token provided') ||
                            lowerMessage.includes('invalid token') ||
                            lowerMessage.includes('please login again') ||
                            message.includes('No token provided')) {
                            // Trigger automatic logout
                            await this.handleTokenExpiration();
                            errorMessage = message || 'Token has expired. Please login again.';
                        } else {
                            errorMessage = message || 'Authentication failed. Please login again.';
                            await this.handleTokenExpiration();
                        }
                        break;
                    case 403:
                        // Check if 403 is due to token issues
                        const forbiddenMessage = responseData?.message || responseData?.error || '';
                        const lowerForbiddenMessage = forbiddenMessage.toLowerCase();
                        
                        if (lowerForbiddenMessage.includes('token') || 
                            lowerForbiddenMessage.includes('expired') ||
                            lowerForbiddenMessage.includes('invalid token')) {
                            await this.handleTokenExpiration();
                            errorMessage = forbiddenMessage || 'Token has expired. Please login again.';
                        } else {
                            errorMessage = forbiddenMessage || 'Access denied. Insufficient permissions.';
                        }
                        break;
                    case 404:
                        errorMessage = responseData?.message || 'Service not found.';
                        break;
                    case 422:
                        errorMessage = responseData?.message || 'Invalid data provided.';
                        break;
                    case 500:
                        errorMessage = responseData?.message || responseData?.error || 'Server error. Please try again later.';
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

                // Return immediately for 404 errors (Driver not found, etc.) - no point trying other endpoints
                if (response.status === 404) {
                    return lastError;
                }

                // Return immediately for 401 errors on login endpoint (Invalid credentials)
                // Login endpoint doesn't require auth, so 401 always means invalid credentials
                if (response.status === 401 && endpoint.includes('/login')) {
                    return lastError;
                }

                // Return immediately for 400 errors (Bad request) - no point trying other endpoints
                if (response.status === 400) {
                    return lastError;
                }

                // Don't try other endpoints for client errors (4xx) except 401 (token issues), 403, 502, 503, 504
                if (response.status >= 400 && response.status < 500 && 
                    ![401, 403, 502, 503, 504].includes(response.status)) {
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
                let detailedMessage = '';

                if (error.name === 'AbortError') {
                    errorMessage = 'Request timed out. Please check your connection.';
                    detailedMessage = `Connection to ${baseUrl} timed out after 15 seconds.`;
                } else if (error.message?.includes('Network request failed') || 
                          error.message?.includes('fetch')) {
                    errorMessage = 'Unable to connect to server.';
                    detailedMessage = `Cannot reach ${baseUrl}.\n\nPossible causes:\n• Backend server not running\n• Wrong IP address\n• Device and server on different networks\n• Firewall blocking connection\n\nTroubleshooting:\n1. Verify backend is running: http://192.168.31.161:3000\n2. Check if device and server are on same Wi-Fi\n3. Try accessing ${baseUrl}/health in phone browser\n4. Check Windows Firewall allows port 3000`;
                } else if (error.message?.includes('ECONNREFUSED')) {
                    errorMessage = 'Server is not available.';
                    detailedMessage = `Connection refused by ${baseUrl}. Server might not be running.`;
                } else {
                    detailedMessage = `Error connecting to ${baseUrl}: ${error.message || error.name}`;
                }

                lastError = {
                    success: false,
                    error: detailedMessage || errorMessage,
                    statusCode: 0,
                };

                // Continue to next endpoint
            }
        }

        // All endpoints failed - provide detailed error message
        logger.error('All endpoints failed', {
            requestId,
            totalAttempts: endpointsToTry.length,
            lastError: lastError.error,
            triedEndpoints: endpointsToTry,
        });

        // Create a more helpful error message
        const errorDetails = `Unable to connect to server.\n\nTried connecting to:\n${endpointsToTry.map((ep, idx) => `• ${ep}`).join('\n')}\n\nPossible issues:\n1. Backend server is not running\n2. Wrong IP address (current: 192.168.31.161)\n3. Device and server not on same Wi-Fi network\n4. Firewall blocking port 3000\n\nTo fix:\n• Check backend is running on port 3000\n• Verify IP address: Open http://192.168.31.161:3000 in phone browser\n• Ensure device and server are on same network\n• Check Windows Firewall allows port 3000`;

        return {
            success: false,
            error: errorDetails,
            statusCode: 0,
        };
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

    // Driver Loads/Trips endpoints
    async getActiveLoads(): Promise<ApiResponse<{ count: number; loads: any[] }>> {
        return this.request('/driver/loads/active', { method: 'GET' }, true);
    }

    async getPendingLoads(): Promise<ApiResponse<{ count: number; loads: any[] }>> {
        return this.request('/driver/loads/pending', { method: 'GET' }, true);
    }

    async getCompletedLoads(): Promise<ApiResponse<{ count: number; loads: any[] }>> {
        return this.request('/driver/loads/completed', { method: 'GET' }, true);
    }

    async getStartedLoads(): Promise<ApiResponse<{ count: number; loads: any[] }>> {
        return this.request('/driver/loads/started', { method: 'GET' }, true);
    }

    async updateLoadStatus(loadId: string, status: string): Promise<ApiResponse> {
        return this.request('/driver/loads/status', {
            method: 'PUT',
            body: JSON.stringify({ loadId, status })
        }, true);
    }

    // Driver Trips endpoints
    async getPendingTrips(): Promise<ApiResponse<{ count: number; data: any[] }>> {
        return this.request('/driver/trips?status=planned', { method: 'GET' }, true);
    }

    async getActiveTrips(): Promise<ApiResponse<{ count: number; data: any[] }>> {
        return this.request('/driver/trips?status=in-progress', { method: 'GET' }, true);
    }

    async getCompletedTrips(): Promise<ApiResponse<{ count: number; data: any[] }>> {
        return this.request('/driver/trips?status=completed', { method: 'GET' }, true);
    }

    async startTrip(tripId: string): Promise<ApiResponse> {
        return this.request(`/driver/trips/${tripId}/start`, {
            method: 'POST'
        }, true);
    }

    async completeTrip(tripId: string): Promise<ApiResponse> {
        return this.request(`/driver/trips/${tripId}/complete`, {
            method: 'POST'
        }, true);
    }

    async getTripDocumentSignedUrl(tripId: string, documentId: string, disposition: 'inline' | 'attachment' = 'inline'): Promise<ApiResponse<{ url: string; expiresIn: number }>> {
        return this.request(`/driver/trips/${tripId}/documents/${documentId}/signed-url?disposition=${disposition}`, {
            method: 'GET'
        }, true);
    }

    async getOrderAttachmentSignedUrl(orderId: string, attachmentId: string, disposition: 'inline' | 'attachment' = 'inline'): Promise<ApiResponse<{ url: string; expiresIn: number }>> {
        return this.request(`/driver/orders/${orderId}/attachments/${attachmentId}/signed-url?disposition=${disposition}`, {
            method: 'GET'
        }, true);
    }

    async getNotifications(): Promise<ApiResponse> {
        return this.request('/driver/notifications', { method: 'GET' }, true);
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
        logger.info('Changing password - API call initiated', { 
            hasCurrentPassword: !!currentPassword, 
            hasNewPassword: !!newPassword,
            endpoint: '/driver/change-password'
        });
        
        try {
            const response = await this.request('/driver/change-password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword, newPassword })
            }, true);
            
            logger.debug('Change password response received', {
                success: response.success,
                error: response.error,
                statusCode: response.statusCode,
                hasData: !!response.data
            });
            
            return response;
        } catch (error: any) {
            logger.error('Exception in changePassword API call', {
                error: error.message,
                name: error.name,
                stack: error.stack
            });
            return {
                success: false,
                error: error.message || 'Failed to change password',
                statusCode: 0
            };
        }
    }

    async submitFeedback(feedbackType: string, feedbackText: string): Promise<ApiResponse> {
        return this.request('/driver/feedback', {
            method: 'POST',
            body: JSON.stringify({ 
                type: feedbackType,
                message: feedbackText 
            })
        }, true);
    }

    // ========== DOCUMENT METHODS ==========
    async getDriverDocuments(): Promise<ApiResponse<{ data: any[]; count: number }>> {
        try {
            logger.info('Fetching driver documents');
            
            const response = await this.request<{ success: boolean; message: string; data: any[]; count: number }>('/driver/documents', {
                method: 'GET'
            }, true);

            return response;
        } catch (error: any) {
            logger.error('Error fetching driver documents', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch documents',
                statusCode: 0
            };
        }
    }

    async getDriverDocumentById(documentId: string): Promise<ApiResponse> {
        try {
            logger.info('Fetching driver document by ID', { documentId });
            
            const response = await this.request(`/driver/documents/${documentId}`, {
                method: 'GET'
            }, true);

            return response;
        } catch (error: any) {
            logger.error('Error fetching driver document', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch document',
                statusCode: 0
            };
        }
    }

    async uploadDriverDocument(
        documentFile: any,
        documentType: string,
        documentNumber?: string,
        issueDate?: string,
        expiryDate?: string,
        description?: string
    ): Promise<ApiResponse> {
        try {
            logger.info('Uploading driver document', { documentType, hasFile: !!documentFile });

            const formData = new FormData();
            
            // Handle file upload - React Native Web needs special handling
            if (documentFile) {
                // For React Native Web, we need to fetch the file and create a Blob
                if (typeof window !== 'undefined' && documentFile.uri) {
                    try {
                        // For web platform, fetch the file as blob
                        const response = await fetch(documentFile.uri);
                        const blob = await response.blob();
                        const file = new File(
                            [blob],
                            documentFile.name || 'document.pdf',
                            { type: documentFile.type || blob.type || 'application/pdf' }
                        );
                        formData.append('documentFile', file);
                        logger.info('File prepared for web upload', { name: file.name, type: file.type, size: file.size });
                    } catch (blobError) {
                        logger.warn('Failed to create blob from URI, trying direct append', blobError);
                        // Fallback: try direct append (works for native)
                        formData.append('documentFile', {
                            uri: documentFile.uri,
                            type: documentFile.type || 'application/pdf',
                            name: documentFile.name || 'document.pdf',
                        } as any);
                    }
                } else {
                    // For native React Native, use the object format
                    formData.append('documentFile', {
                        uri: documentFile.uri,
                        type: documentFile.type || 'application/pdf',
                        name: documentFile.name || 'document.pdf',
                    } as any);
                }
            } else {
                logger.error('No document file provided');
                return {
                    success: false,
                    error: 'Document file is required',
                    statusCode: 400
                };
            }

            formData.append('documentType', documentType);
            if (documentNumber) formData.append('documentNumber', documentNumber);
            if (issueDate) formData.append('issueDate', issueDate);
            if (expiryDate) formData.append('expiryDate', expiryDate);
            if (description) formData.append('description', description);

            logger.debug('FormData prepared', {
                hasDocumentFile: formData.has('documentFile'),
                documentType,
                hasDocumentNumber: !!documentNumber,
                hasIssueDate: !!issueDate,
                hasExpiryDate: !!expiryDate,
            });

            const response = await this.request('/driver/documents', {
                method: 'POST',
                body: formData,
            }, true);

            return response;
        } catch (error: any) {
            logger.error('Error uploading driver document', error);
            return {
                success: false,
                error: error.message || 'Failed to upload document',
                statusCode: 0
            };
        }
    }

    async updateDriverDocument(
        documentId: string,
        documentFile?: any,
        documentType?: string,
        documentNumber?: string,
        issueDate?: string,
        expiryDate?: string,
        description?: string,
        status?: string
    ): Promise<ApiResponse> {
        try {
            logger.info('Updating driver document', { documentId, hasFile: !!documentFile });

            const formData = new FormData();
            
            // Handle file upload - React Native Web needs special handling
            if (documentFile) {
                // For React Native Web, we need to fetch the file and create a Blob
                if (typeof window !== 'undefined' && documentFile.uri) {
                    try {
                        // For web platform, fetch the file as blob
                        const response = await fetch(documentFile.uri);
                        const blob = await response.blob();
                        const file = new File(
                            [blob],
                            documentFile.name || 'document.pdf',
                            { type: documentFile.type || blob.type || 'application/pdf' }
                        );
                        formData.append('documentFile', file);
                        logger.info('File prepared for web update', { name: file.name, type: file.type, size: file.size });
                    } catch (blobError) {
                        logger.warn('Failed to create blob from URI, trying direct append', blobError);
                        // Fallback: try direct append (works for native)
                        formData.append('documentFile', {
                            uri: documentFile.uri,
                            type: documentFile.type || 'application/pdf',
                            name: documentFile.name || 'document.pdf',
                        } as any);
                    }
                } else {
                    // For native React Native, use the object format
                    formData.append('documentFile', {
                        uri: documentFile.uri,
                        type: documentFile.type || 'application/pdf',
                        name: documentFile.name || 'document.pdf',
                    } as any);
                }
            }
            
            if (documentType) formData.append('documentType', documentType);
            if (documentNumber) formData.append('documentNumber', documentNumber);
            if (issueDate) formData.append('issueDate', issueDate);
            if (expiryDate) formData.append('expiryDate', expiryDate);
            if (description) formData.append('description', description);
            if (status) formData.append('status', status);

            logger.debug('FormData prepared for update', {
                hasDocumentFile: formData.has('documentFile'),
                documentType,
                hasDocumentNumber: !!documentNumber,
                hasIssueDate: !!issueDate,
                hasExpiryDate: !!expiryDate,
            });

            const response = await this.request(`/driver/documents/${documentId}`, {
                method: 'PUT',
                body: formData,
            }, true);

            return response;
        } catch (error: any) {
            logger.error('Error updating driver document', error);
            return {
                success: false,
                error: error.message || 'Failed to update document',
                statusCode: 0
            };
        }
    }

    async deleteDriverDocument(documentId: string): Promise<ApiResponse> {
        try {
            logger.info('Deleting driver document', { documentId });
            
            const response = await this.request(`/driver/documents/${documentId}`, {
                method: 'DELETE'
            }, true);

            return response;
        } catch (error: any) {
            logger.error('Error deleting driver document', error);
            return {
                success: false,
                error: error.message || 'Failed to delete document',
                statusCode: 0
            };
        }
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