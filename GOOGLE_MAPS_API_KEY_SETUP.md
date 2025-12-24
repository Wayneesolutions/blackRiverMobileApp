# Google Maps API Key Configuration Guide

## Current Setup

You're using the **same Google Maps API key** for both:
- ✅ **Backend** (`logistiqbackend/.env`): `GOOGLE_MAPS_API_KEY=AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI`
- ✅ **Mobile App** (`app.json`): `android.config.googleMapsApiKey` and `extra.googleMapsApiKey`

This is **perfectly fine** and a common practice!

## Google Cloud Console Configuration

To use the same key for both, ensure your API key has proper restrictions:

### 1. Application Restrictions

**Option A: Allow both (Recommended)**
- Select: **HTTP referrers (web sites)**
  - Add your backend URL: `https://portal.logistiqinnovations.ca/*`
- Select: **Android apps**
  - Add package name: `com.blackriverlogistics.app`
  - Add SHA-1 certificate fingerprint (from your signing key)

**Option B: No restrictions (Development only - NOT recommended for production)**
- Select: **None** (for testing)
- ⚠️ **Warning:** This allows anyone to use your key. Only use for testing!

### 2. API Restrictions

Enable these APIs:
- ✅ **Maps SDK for Android** (for mobile app)
- ✅ **Maps JavaScript API** (for backend/web)
- ✅ **Directions API** (for route calculations)
- ✅ **Geocoding API** (for address lookups)
- ✅ **Distance Matrix API** (if used)
- ✅ **Places API** (if used)

## How It Works

### Backend Usage
```javascript
// Backend uses the key for server-side API calls
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
// Used in: Geocoding, Directions, Distance Matrix APIs
```

### Mobile App Usage
```javascript
// Mobile app embeds the key in AndroidManifest.xml
// Automatically injected by Expo from app.json → android.config.googleMapsApiKey
```

## Current Configuration Files

### Backend (.env)
```env
GOOGLE_MAPS_API_KEY=AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI
```

### Mobile App (app.json)
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

## Priority Order in Mobile App

The mobile app tries to get the API key in this order:

1. **Environment Variable** (from EAS secrets/process.env) - Usually empty in production APK
2. **app.json extra** (from `Constants.expoConfig?.extra?.googleMapsApiKey`) - ✅ This should work
3. **Backend API** (fallback to `/api/v1/config` endpoint) - ✅ Currently being used

Since your app is calling the backend endpoint, it means Priority 1 & 2 didn't work, so it's using Priority 3 (backend).

## Why the Crash Might Still Happen

Even though the API key is the same, the crash might be due to:

1. **MapView component is null** - Native module not properly linked
2. **Invalid coordinates** - Coordinates are null/NaN when rendering map
3. **Permission issues** - Location permissions not granted
4. **API key restrictions** - Key doesn't allow the Android package name

## Check API Key Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your API key
4. Check **Application restrictions**:
   - Should include: `com.blackriverlogistics.app` under Android apps
   - Or: No restrictions (for testing)
5. Check **API restrictions**:
   - Should include: Maps SDK for Android

## Troubleshooting

### If backend returns key but app still crashes:

**Check 1: Verify Key is in app.json**
```bash
# Should show the API key
cat app.json | grep -A 2 "googleMapsApiKey"
```

**Check 2: Verify Key Restrictions in Google Console**
- Ensure Android app is added
- Ensure Maps SDK for Android is enabled

**Check 3: Check Logs**
```bash
# Run the debug script
cd DriverMobileApp
.\debug_crash.ps1
```

**Check 4: Rebuild APK**
After verifying everything:
```bash
eas build --platform android --profile production
```

## Recommendation

Since you're using the same key everywhere, it's working as intended. The backend fallback (Priority 3) is a good safety net. However, for better performance and to avoid network dependency, Priority 2 (app.json extra) should work.

If Priority 2 isn't working, the issue might be:
- The key in `app.json` is correct ✅
- But the app might need a fresh rebuild after adding it
- Or `Constants.expoConfig?.extra` might not be accessible in production builds

## Summary

✅ **Same key for backend and mobile app is FINE**
✅ **Current setup is correct**
✅ **Backend fallback is working**

The crash is likely **NOT** due to API key configuration, but rather:
- MapView native module issue
- Invalid coordinates
- Other runtime errors

**Next step:** Run `.\debug_crash.ps1` to see the actual error!












