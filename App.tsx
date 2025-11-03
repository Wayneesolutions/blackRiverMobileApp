import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  // Set document title for web platform
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const setTitle = () => {
        const appTitle = Constants.expoConfig?.web?.title || 
                         Constants.expoConfig?.name || 
                         'Black River Logistics - Driver App';
        
        // Always set the title directly
        document.title = appTitle;
        
        // Also update meta tags if they exist
        let metaTitle = document.querySelector('meta[property="og:title"]');
        if (!metaTitle) {
          metaTitle = document.createElement('meta');
          metaTitle.setAttribute('property', 'og:title');
          document.head.appendChild(metaTitle);
        }
        metaTitle.setAttribute('content', appTitle);
      };

      // Set immediately
      setTitle();
      
      // Set again after a short delay to ensure it overrides any other code
      const timeoutId = setTimeout(setTitle, 100);
      
      // Also set on every focus to ensure it stays
      window.addEventListener('focus', setTitle);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('focus', setTitle);
      };
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        documentTitle={{
          formatter: (options, route) => {
            return options?.title ?? route?.name ?? 'Black River Logistics - Driver App';
          },
        }}
      >
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}