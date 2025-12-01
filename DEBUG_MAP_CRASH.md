# Debugging Map Crash Issue

## Problem
App crashes when clicking "View Map" button after installing APK.

## Common Causes

### 1. Missing react-native-maps Plugin
The `react-native-maps` package requires a plugin in `app.json` for Expo to properly configure it during the build.

### 2. Missing Google Maps API Key in AndroidManifest
The API key must be correctly injected into AndroidManifest.xml during build.

### 3. Invalid Coordinates
Crash can occur if coordinates are null, NaN, or invalid.

### 4. Missing Native Module
react-native-maps native module not properly linked.

## Step-by-Step Debugging

### Step 1: Check Android Logcat

Connect your device via USB and run:

```bash
# Windows PowerShell
adb logcat | Select-String -Pattern "ReactNative|MapView|maps|FATAL"

# Or filter by your app package
adb logcat | Select-String -Pattern "com.blackriverlogistics.app"

# Or save to file
adb logcat > crash_logs.txt
```

Look for:
- `FATAL EXCEPTION`
- `react-native-maps`
- `MapView`
- `Google Maps API`
- Error stack traces

### Step 2: Check if react-native-maps Plugin is Configured

**Current `app.json` plugins:**
```json
"plugins": [
  "expo-font"
]
```

**Should be:**
```json
"plugins": [
  "expo-font",
  [
    "react-native-maps",
    {
      "googleMapsApiKey": "AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI"
    }
  ]
]
```

### Step 3: Verify Google Maps API Key Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Check your API key restrictions:
   - **Application restrictions**: Should include your package name: `com.blackriverlogistics.app`
   - **API restrictions**: Should include:
     - Maps SDK for Android
     - Directions API
     - Geocoding API (if used)

### Step 4: Test in Development

Before building APK, test locally:

```bash
cd DriverMobileApp
npx expo run:android
```

This will show more detailed error messages.

### Step 5: Check Build Logs

Check your EAS build logs for any warnings or errors related to:
- react-native-maps
- Google Maps
- AndroidManifest.xml
- Gradle build errors

## Quick Fixes to Try

### Fix 1: Add react-native-maps Plugin to app.json

```json
{
  "expo": {
    "plugins": [
      "expo-font",
      [
        "react-native-maps",
        {
          "googleMapsApiKey": "AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI"
        }
      ]
    ]
  }
}
```

Then rebuild:
```bash
eas build --platform android --profile production
```

### Fix 2: Verify API Key in Google Cloud Console

1. Check API key is active
2. Verify package name restriction: `com.blackriverlogistics.app`
3. Ensure Maps SDK for Android is enabled

### Fix 3: Check Logs on Device

Use logcat or React Native debugger to see actual error:

```bash
# Real-time logs
adb logcat *:E ReactNativeJS:V ReactNative:V

# Save to file
adb logcat -d > debug_logs.txt
```

### Fix 4: Add Error Boundary

The component now has better error handling, but you can also wrap the entire app in an ErrorBoundary.

## Expected Error Messages

### If MapView is null:
```
MapView: ✗
PROVIDER_GOOGLE: ✗
react-native-maps is not installed. Please rebuild the app with EAS Build.
```

### If API Key is wrong:
```
Map error occurred
Google Maps API key authentication failed
```

### If Coordinates are invalid:
```
Invalid map region coordinates
```

## Next Steps

1. **Add the plugin** to `app.json` (see Fix 1 above)
2. **Rebuild the APK** with EAS
3. **Check logcat** when clicking "View Map"
4. **Share the error logs** for further debugging

## How to Get Error Details

### Option 1: Use adb logcat
```bash
adb logcat | Select-String -Pattern "FATAL|Error|Exception|react-native-maps"
```

### Option 2: Use React Native Debugger
- Shake device → "Debug" → Check console

### Option 3: Add Crash Reporting
Consider adding Sentry or similar for production crash reporting:
```bash
npm install @sentry/react-native
```

## Current Status

✅ Error handling added to MapView component
✅ Better logging for debugging
✅ Fallback UI when map fails
⚠️ Need to add react-native-maps plugin to app.json

