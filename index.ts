import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';
import Logger from './src/utils/Logger';

// Global error handlers - catch all errors and log them
// This will catch unhandled JavaScript errors
const originalErrorHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
  // Log the error using our Logger
  Logger.error('Global JavaScript Error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      isFatal: isFatal || false,
    },
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
  }, 'GlobalErrorHandler');

  // Also log to console for immediate visibility
  console.error('🔥 GLOBAL ERROR:', error);
  console.error('Is Fatal:', isFatal);
  console.error('Stack:', error.stack);

  // Call the original handler to maintain default behavior
  if (originalErrorHandler) {
    originalErrorHandler(error, isFatal);
  }
});

// Handle unhandled promise rejections
// Check for web platform specifically and ensure window.addEventListener exists
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // For web platform only
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));

    Logger.error('Unhandled Promise Rejection', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        reason: event.reason,
      },
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    }, 'GlobalErrorHandler');

    console.error('🔥 UNHANDLED PROMISE REJECTION:', error);
    console.error('Reason:', event.reason);
    
    // Prevent default browser behavior
    event.preventDefault();
  });
} else {
  // For React Native platforms
  // Note: Unhandled promise rejections in React Native will eventually
  // bubble up to the ErrorUtils global handler we set up above.
  // React Native's ErrorUtils handles most unhandled promise rejections automatically.
  
  // Handle process-level unhandled rejections if available (for Node.js environments like Expo)
  if (typeof process !== 'undefined' && process.on) {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      const error = reason instanceof Error 
        ? reason 
        : new Error(String(reason));

      Logger.error('Unhandled Promise Rejection (process)', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          reason: reason,
        },
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      }, 'GlobalErrorHandler');

      console.error('🔥 UNHANDLED PROMISE REJECTION (process):', error);
      console.error('Reason:', reason);
    });
  }
}

// Log that error handlers are set up
Logger.info('Global error handlers initialized', {
  platform: Platform.OS,
  timestamp: new Date().toISOString(),
}, 'GlobalErrorHandler');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
