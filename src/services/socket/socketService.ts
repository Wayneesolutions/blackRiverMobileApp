import { io, Socket } from 'socket.io-client';
import { logger } from '../../utils/loggerHelper';
import { getConfig } from '../../config/env';

let socket: Socket | null = null;

export interface VehicleLocation {
  _id: string;
  internalId: string;
  plateNumber: string;
  make: string;
  model: string;
  currentLocation: {
    latitude: string | number;
    longitude: string | number;
    address?: string;
    updatedAt?: string;
  };
  speed?: number;
  status?: string;
  driver?: {
    _id: string;
    name: string;
  };
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3; // Reduced to prevent endless retries

  async initialize(timeout: number = 10000): Promise<void> {
    if (this.socket?.connected) {
      logger.info('Socket already connected');
      return;
    }

    try {
      const config = await getConfig();
      const socketUrl = config.SOCKET_URL || 'http://localhost:3000';
      
      logger.info('Initializing socket connection', { 
        socketUrl,
        platform: typeof window !== 'undefined' ? 'web' : 'native'
      });

      // Log the URL being used for debugging
      console.log('🔌 Connecting to Socket.IO at:', socketUrl);
      console.log('🔍 Platform:', typeof window !== 'undefined' ? 'web' : 'native');
      console.log('🔍 User agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');

      // Test if we can reach the server first (for web)
      if (typeof window !== 'undefined') {
        try {
          const testUrl = socketUrl.replace(/\/$/, ''); // Remove trailing slash
          console.log('🧪 Testing server connection at:', testUrl);
          
          // Try to fetch a simple endpoint to verify server is reachable
          const healthCheck = await fetch(`${testUrl}/api/v1/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
          }).catch(() => null);
          
          if (healthCheck && healthCheck.ok) {
            console.log('✅ Server is reachable via HTTP');
          } else {
            console.warn('⚠️ Server health check failed, but continuing with socket connection...');
          }
        } catch (testError) {
          console.warn('⚠️ Could not test server connection:', testError);
        }
      }

      // Create a promise that resolves when connected
      return new Promise((resolve, reject) => {
        let resolved = false;
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.error(`❌ Socket connection timeout after ${timeout}ms to ${socketUrl}`);
            console.error('💡 Make sure your backend server is running and Socket.IO is configured');
            console.error(`💡 Trying to connect to: ${socketUrl}`);
            
            // Disconnect the socket if it exists
            if (this.socket) {
              this.socket.disconnect();
              this.socket = null;
            }
            
            reject(new Error(
              `Socket connection timeout. Please check:\n` +
              `1. Backend server is running on ${socketUrl}\n` +
              `2. Socket.IO is properly configured on the backend\n` +
              `3. No firewall blocking the connection`
            ));
          }
        }, timeout);

        // Configure Socket.IO based on platform
        const socketOptions: any = {
          transports: typeof window !== 'undefined' ? ['polling', 'websocket'] : ['websocket', 'polling'],
          reconnection: false, // Disable auto-reconnect - we'll handle it manually
          reconnectionAttempts: 0,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          autoConnect: true,
          timeout: Math.min(timeout - 1000, 5000), // Cap at 5 seconds for faster failure
          forceNew: false,
          withCredentials: false,
        };

        // For web, try polling first (more reliable)
        if (typeof window !== 'undefined') {
          socketOptions.transports = ['polling', 'websocket'];
          socketOptions.upgrade = true;
          socketOptions.rememberUpgrade = false; // Don't remember upgrade if it fails
          
          // On web, if using localhost, try 127.0.0.1 as fallback
          if (socketUrl.includes('localhost') && socketUrl.includes('3000')) {
            console.log('💡 Note: If connection fails, try using 127.0.0.1:3000 instead of localhost:3000');
          }
        }

        console.log('🔌 Creating Socket.IO client with options:', {
          url: socketUrl,
          transports: socketOptions.transports,
          timeout: socketOptions.timeout,
        });

        this.socket = io(socketUrl, socketOptions);

        console.log('🔌 Socket.IO client created, waiting for connection...');
        console.log('🔌 Socket ID (initial):', this.socket.id);
        console.log('🔌 Socket connected (initial):', this.socket.connected);

        // Set up event handlers with connection promise
        const connectHandler = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            logger.info('Socket connected', { socketId: this.socket?.id });
            console.log('✅ Socket.IO connected successfully!', { socketId: this.socket?.id });
            resolve();
          }
        };

        const connectErrorHandler = (error: any) => {
          this.reconnectAttempts++;
          const errorMsg = error?.message || error?.toString() || 'Unknown error';
          
          logger.error('Socket connection error', { 
            error: errorMsg,
            attempts: this.reconnectAttempts,
            socketUrl,
            description: error?.description
          });
          
          console.error('❌ Socket connection error:', errorMsg);
          console.error('   Details:', error);
          
          // If we've had too many errors, reject immediately
          if (this.reconnectAttempts >= 3) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
              }
              reject(new Error(`Failed to connect after ${this.reconnectAttempts} attempts: ${errorMsg}`));
            }
          }
        };

        // Set up handlers using once() so they only fire once
        this.socket.once('connect', connectHandler);
        this.socket.once('connect_error', connectErrorHandler);

        // If already connected (unlikely but possible)
        if (this.socket.connected) {
          clearTimeout(timeoutId);
          this.isConnected = true;
          resolve();
          // Still set up other handlers
          this.setupEventHandlers();
        } else {
          // Set up other event handlers (disconnect, reconnect, etc.)
          this.setupEventHandlers();
          
          // Clean up connect handlers after they fire
          this.socket.once('connect', () => {
            setTimeout(() => {
              this.socket?.off('connect', connectHandler);
              this.socket?.off('connect_error', connectErrorHandler);
            }, 100);
          });
        }
      });
    } catch (error: any) {
      logger.error('Failed to initialize socket', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Only set up connect handler if not already handled in initialize
    if (!this.socket.listeners('connect').length) {
      this.socket.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('Socket connected', { socketId: this.socket?.id });
      });
    }

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      logger.warn('Socket disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      logger.error('Socket connection error', { 
        error: error.message,
        attempts: this.reconnectAttempts 
      });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.reconnectAttempts = 0;
      logger.info('Socket reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      logger.error('Socket reconnect error', { error: error.message });
    });

    this.socket.on('reconnect_failed', () => {
      logger.error('Socket reconnect failed - max attempts reached');
    });
  }

  joinVehicle(vehicleId: string): void {
    if (!this.socket || !this.isConnected) {
      logger.warn('Cannot join vehicle - socket not connected');
      return;
    }

    logger.info('Joining vehicle room', { vehicleId });
    this.socket.emit('joinVehicle', vehicleId);
  }

  leaveVehicle(): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    logger.info('Leaving vehicle room');
    this.socket.emit('leaveVehicle');
  }

  onVehicleLocation(callback: (vehicle: VehicleLocation) => void): void {
    if (!this.socket) {
      logger.warn('Cannot listen for vehicle location - socket not initialized');
      return;
    }

    this.socket.on('vehicleLocation', (vehicle: VehicleLocation) => {
      logger.debug('Received vehicle location update', { 
        vehicleId: vehicle._id,
        internalId: vehicle.internalId 
      });
      callback(vehicle);
    });
  }

  offVehicleLocation(): void {
    if (!this.socket) {
      return;
    }

    this.socket.off('vehicleLocation');
  }

  disconnect(): void {
    if (this.socket) {
      this.leaveVehicle();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      logger.info('Socket disconnected');
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService;

