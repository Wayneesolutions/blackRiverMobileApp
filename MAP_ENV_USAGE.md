# Map Component Environment Variable Usage

## Overview

The `MapViewWithLiveTracking` component now uses a **priority-based approach** to get the Google Maps API key from multiple sources. This ensures the map works in all scenarios.

## Priority Order for API Key

The component checks for the API key in this order:

### 1. **Environment Variables (Highest Priority)**
   - Source: `GOOGLE_MAPS_API_KEY` from `env.ts`
   - Origin: EAS secrets, `process.env`, or `.env` file
   - When used: During EAS builds or local development with env vars

### 2. **app.json Extra Config**
   - Source: `Constants.expoConfig?.extra?.googleMapsApiKey`
   - Origin: `app.json` → `extra.googleMapsApiKey`
   - When used: Runtime access via Expo Constants

### 3. **Backend API (Fallback)**
   - Source: Backend `/config` endpoint
   - Origin: Server-side configuration
   - When used: When env vars and app.json don't have the key

## Implementation Details

### Native Map Component (React Native)

**Location**: `src/components/MapViewWithLiveTracking.tsx` (lines ~950-970)

```typescript
import { GOOGLE_MAPS_API_KEY } from '../config/env';
import Constants from 'expo-constants';

const fetchGoogleMapsApiKey = useCallback(async (): Promise<string | null> => {
  // Priority 1: Environment variable from env.ts
  if (GOOGLE_MAPS_API_KEY && typeof GOOGLE_MAPS_API_KEY === 'string' && GOOGLE_MAPS_API_KEY.length > 0) {
    logger.info('Using Google Maps API key from environment config');
    googleMapsApiKeyRef.current = GOOGLE_MAPS_API_KEY;
    return GOOGLE_MAPS_API_KEY;
  }

  // Priority 2: expo-constants extra config (from app.json)
  const extraConfig = Constants.expoConfig?.extra;
  if (extraConfig?.googleMapsApiKey && typeof extraConfig.googleMapsApiKey === 'string' && extraConfig.googleMapsApiKey.length > 0) {
    logger.info('Using Google Maps API key from app.json extra config');
    googleMapsApiKeyRef.current = extraConfig.googleMapsApiKey;
    return extraConfig.googleMapsApiKey;
  }

  // Priority 3: Backend API (fallback)
  try {
    const response = await apiService.get<{ data?: { googleMapsApiKey?: string } }>('/config', false);
    const apiKey = response?.data?.data?.googleMapsApiKey;
    if (apiKey && typeof apiKey === 'string' && apiKey.length > 0) {
      googleMapsApiKeyRef.current = apiKey;
      return apiKey;
    }
  } catch (apiError) {
    logger.warn('Failed to fetch Google Maps API key from backend', apiError);
  }

  return null;
}, []);
```

### Web Map Component

**Location**: `src/components/MapViewWithLiveTracking.tsx` (lines ~2672-2710)

```typescript
// Priority 1: Environment variable from env.ts
if (typeof GOOGLE_MAPS_API_KEY === 'string' && GOOGLE_MAPS_API_KEY.length > 0) {
  console.log('✅ Using Google Maps API key from environment config');
  apiKey = GOOGLE_MAPS_API_KEY;
}

// Priority 2: expo-constants extra config (from app.json)
if (!apiKey) {
  const extraConfig = Constants.expoConfig?.extra;
  if (extraConfig?.googleMapsApiKey && typeof extraConfig.googleMapsApiKey === 'string' && extraConfig.googleMapsApiKey.length > 0) {
    console.log('✅ Using Google Maps API key from app.json extra config');
    apiKey = extraConfig.googleMapsApiKey;
  }
}

// Priority 3: Backend API (fallback)
if (!apiKey) {
  // Try fetching from backend...
}
```

## Usage in Directions API

The API key is used when fetching route directions:

```typescript
const fetchRoutePolyline = useCallback(async () => {
  const apiKey = await fetchGoogleMapsApiKey();
  if (!apiKey) {
    // Fallback to basic route without Google Maps
    return;
  }

  const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickupLat},${pickupLng}&destination=${destinationLat},${destinationLng}&mode=driving&key=${apiKey}`;
  // ... fetch and process directions
}, [fetchGoogleMapsApiKey, ...]);
```

## Configuration Files

### app.json
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMapsApiKey": "AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI"
      }
    },
    "extra": {
      "googleMapsApiKey": "AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI"
    }
  }
}
```

### env.ts
```typescript
let GOOGLE_MAPS_API_KEY: string | undefined = 
  ENV_GOOGLE_MAPS_API_KEY || 
  Constants.expoConfig?.extra?.googleMapsApiKey;

export { GOOGLE_MAPS_API_KEY };
```

### eas.json
```json
{
  "build": {
    "production": {
      "env": {
        "GOOGLE_MAPS_API_KEY": "AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI"
      }
    }
  }
}
```

## How It Works in Different Scenarios

### Scenario 1: EAS Build (Production)
1. EAS secrets inject `GOOGLE_MAPS_API_KEY` as environment variable
2. `env.ts` reads it and exports `GOOGLE_MAPS_API_KEY`
3. Map component uses it (Priority 1) ✅

### Scenario 2: Local Development with .env
1. `.env` file has `GOOGLE_MAPS_API_KEY`
2. `react-native-dotenv` loads it via `@env` module
3. `env.ts` exports it
4. Map component uses it (Priority 1) ✅

### Scenario 3: Built APK (No backend available)
1. No environment variables available
2. Checks `app.json` extra config (Priority 2) ✅
3. Falls back to backend if available (Priority 3)

### Scenario 4: Web Platform
1. Same priority order applies
2. Loads Google Maps JavaScript API with the key
3. Shows fallback message if no key found

## Benefits of This Approach

✅ **Flexible**: Works in development, staging, and production  
✅ **Secure**: Supports EAS secrets for sensitive keys  
✅ **Resilient**: Multiple fallbacks ensure map works  
✅ **Debug-friendly**: Logs show which source is being used  

## Logging

The component logs which source it's using:
- `"Using Google Maps API key from environment config"` - Using env vars
- `"Using Google Maps API key from app.json extra config"` - Using app.json
- `"Using Google Maps API key from backend API"` - Using backend

Check your console/logs to see which source is active!


