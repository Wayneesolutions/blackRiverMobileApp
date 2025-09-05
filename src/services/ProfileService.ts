// src/services/ProfileService.ts
import { apiService } from './api/apiService';
import { logger } from '../utils/loggerHelper';

export interface DriverProfile {
    _id: string;
    name: string;
    email: string;
    phone: string;
    country: string;
    profileImageUrl?: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProfileResponse {
    success: boolean;
    message: string;
    data: DriverProfile;
}

export interface UpdateProfileRequest {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
    profileImageUrl?: string;
}

class ProfileService {
    private cachedProfile: DriverProfile | null = null;
    private lastFetchTime: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Get driver profile from API
     */
    async getProfile(forceRefresh: boolean = false): Promise<DriverProfile | null> {
        try {
            // Check cache first unless force refresh is requested
            if (!forceRefresh && this.cachedProfile && this.isCacheValid()) {
                logger.info('Returning cached profile data');
                return this.cachedProfile;
            }

            logger.info('Fetching profile from API');
            const response = await apiService.get<ProfileResponse>('/driver/profile');

            if (response.success && response.data?.data) {
                this.cachedProfile = response.data.data;
                this.lastFetchTime = Date.now();
                
                logger.info('Profile fetched successfully', {
                    userId: this.cachedProfile._id,
                    name: this.cachedProfile.name,
                });
                
                return this.cachedProfile;
            } else {
                logger.error('Failed to fetch profile', {
                    error: response.error,
                    statusCode: response.statusCode,
                });
                return null;
            }
        } catch (error) {
            logger.error('Error fetching profile', error);
            return null;
        }
    }

    /**
     * Update driver profile
     */
    async updateProfile(updateData: UpdateProfileRequest): Promise<{success: boolean, message?: string, data?: DriverProfile}> {
        try {
            logger.info('Updating profile', { updateData });
            
            const response = await apiService.put<ProfileResponse>('/driver/profile', updateData);

            if (response.success && response.data?.data) {
                // Update cached profile
                this.cachedProfile = response.data.data;
                this.lastFetchTime = Date.now();
                
                logger.info('Profile updated successfully', {
                    userId: this.cachedProfile._id,
                });

                return {
                    success: true,
                    message: response.data.message || 'Profile updated successfully',
                    data: this.cachedProfile,
                };
            } else {
                logger.error('Failed to update profile', {
                    error: response.error,
                    statusCode: response.statusCode,
                });
                
                return {
                    success: false,
                    message: response.error || 'Failed to update profile',
                };
            }
        } catch (error) {
            logger.error('Error updating profile', error);
            return {
                success: false,
                message: 'Network error occurred while updating profile',
            };
        }
    }

    /**
     * Get cached profile without API call
     */
    getCachedProfile(): DriverProfile | null {
        if (this.cachedProfile && this.isCacheValid()) {
            return this.cachedProfile;
        }
        return null;
    }

    /**
     * Clear cached profile data
     */
    clearCache(): void {
        this.cachedProfile = null;
        this.lastFetchTime = 0;
        logger.info('Profile cache cleared');
    }

    /**
     * Check if cached data is still valid
     */
    private isCacheValid(): boolean {
        const now = Date.now();
        return (now - this.lastFetchTime) < this.CACHE_DURATION;
    }

    /**
     * Format profile data for display
     */
    formatProfileForDisplay(profile: DriverProfile) {
        return {
            id: profile._id,
            name: profile.name || 'Not specified',
            email: profile.email || 'Not specified',
            phone: profile.phone || 'Not specified',
            country: profile.country || 'Not specified',
            profileImage: profile.profileImageUrl,
            status: profile.status,
            memberSince: this.formatDate(profile.createdAt),
            lastUpdated: this.formatDate(profile.updatedAt),
        };
    }

    /**
     * Format date for display
     */
    private formatDate(dateString: string): string {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return 'Unknown';
        }
    }

    /**
     * Validate profile update data
     */
    validateUpdateData(data: UpdateProfileRequest): {isValid: boolean, errors: string[]} {
        const errors: string[] = [];

        // Validate email format
        if (data.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                errors.push('Please enter a valid email address');
            }
        }

        // Validate phone number
        if (data.phone) {
            const phoneRegex = /^\+?[\d\s-()]+$/;
            if (!phoneRegex.test(data.phone) || data.phone.replace(/\D/g, '').length < 10) {
                errors.push('Please enter a valid phone number');
            }
        }

        // Validate name
        if (data.name) {
            if (data.name.trim().length < 2) {
                errors.push('Name must be at least 2 characters long');
            }
        }

        // Validate country
        if (data.country) {
            if (data.country.trim().length < 2) {
                errors.push('Please enter a valid country name');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return apiService.isAuthenticated();
    }
}

// Singleton instance
export const profileService = new ProfileService();
export default profileService;