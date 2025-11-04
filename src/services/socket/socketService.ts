import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
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
      // Use .env SOCKET_URL if available, otherwise use config value
      const socketUrl = config.SOCKET_URL || 'http://localhost:3000';
      
      // Log which SOCKET_URL is being used for debugging
      console.log(`🔌 Using SOCKET_URL from: ${config.SOCKET_URL ? 'config' : 'default'}`);
      
      logger.info('Initializing socket connection', { 
        socketUrl,
        platform: Platform.OS
      });
      
      console.log(`🔌 Connecting to Socket.IO at: ${socketUrl}`);
      console.log(`🔌 Platform: ${Platform.OS}`);

      // Test if we can reach the server first (for React Native)
      if (Platform.OS !== 'web') {
        try {
          const testUrl = socketUrl.replace(/\/$/, ''); // Remove trailing slash
          console.log(`🧪 Testing server connection at: ${testUrl}/api/v1/config`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(`${testUrl}/api/v1/config`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            console.log(`✅ Server is reachable via HTTP`);
          } else {
            console.warn(`⚠️ Server responded with status: ${response.status}`);
          }
        } catch (testError: any) {
          const errorMsg = testError?.message || 'Unknown error';
          console.error(`❌ Cannot reach server at ${socketUrl}:`, errorMsg);
          console.error(`   This is likely a network connectivity issue.`);
          console.error(`   Troubleshooting steps:`);
          console.error(`   1. Verify backend server is running on ${socketUrl}`);
          console.error(`   2. Check if mobile device and server are on SAME Wi-Fi network`);
          console.error(`   3. Test in browser: Open http://192.168.31.161:3000/api/v1/health on your phone's browser`);
          console.error(`   4. Windows Firewall: Allow port 3000 for incoming connections`);
          console.error(`   5. Android: Check if network_security_config.xml allows cleartext traffic`);
          console.error(`   6. Try ping: ping 192.168.31.161 from mobile device`);
          // Don't throw - let socket.io try anyway
        }
      }

      // Create a promise that resolves when connected
      return new Promise((resolve, reject) => {
        let resolved = false;
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.error('❌ Socket: Connection timeout');
            
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
        // For React Native, try polling first (more reliable), then upgrade to websocket
        const socketOptions: any = {
          transports: ['polling', 'websocket'], // Always use polling first for better compatibility
          reconnection: false, // Disable auto-reconnect - we'll handle it manually
          reconnectionAttempts: 0,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          autoConnect: true,
          timeout: 10000, // 10 seconds timeout
          forceNew: false,
          withCredentials: false,
          upgrade: true,
          rememberUpgrade: false,
          // Add path for socket.io
          path: '/socket.io/',
          // Add query parameters for better debugging
          query: {
            platform: Platform.OS,
          },
        };

        this.socket = io(socketUrl, socketOptions);

        // Set up event handlers with connection promise
        const connectHandler = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            logger.info('Socket connected', { socketId: this.socket?.id });
            console.log('✅ Socket: Connected');
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
          
          console.error('❌ Socket: Connection failed -', errorMsg);
          
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
        console.log('✅ Socket: Connected');
      });
    }

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      logger.warn('Socket disconnected', { reason });
      console.warn('⚠️ Socket: Disconnected');
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
      logger.warn('Cannot join vehicle - socket not connected', { 
        hasSocket: !!this.socket,
        isConnected: this.isConnected 
      });
      console.warn('⚠️ Socket not connected - cannot join vehicle room');
      return;
    }

    logger.info('Joining vehicle room', { vehicleId, socketId: this.socket.id });
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
      console.warn('⚠️ Socket not initialized - cannot listen for vehicle location');
      return;
    }

    // Remove any existing listener to avoid duplicates
    this.socket.off('vehicleLocation');

    this.socket.on('vehicleLocation', (vehicle: VehicleLocation) => {
      logger.debug('Received vehicle location update', { 
        vehicleId: vehicle._id,
        internalId: vehicle.internalId,
        plateNumber: vehicle.plateNumber,
        latitude: vehicle.currentLocation?.latitude,
        longitude: vehicle.currentLocation?.longitude,
        speed: vehicle.speed
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

