# How to Debug App Crash - Step by Step Guide

## Problem
App crashes/terminates when clicking "View Map" button after installing APK.

## Quick Debugging Steps

### Step 1: Connect Your Device via USB

1. Enable **Developer Options** on your Android device:
   - Go to **Settings** > **About Phone**
   - Tap **Build Number** 7 times
   - Go back to **Settings** > **Developer Options**
   - Enable **USB Debugging**

2. Connect device to your computer via USB

3. Verify connection:
   ```bash
   adb devices
   ```
   You should see your device listed.

### Step 2: Clear Old Logs and Start Fresh

```bash
# Clear old logcat logs
adb logcat -c

# This clears the buffer so you start fresh
```

### Step 3: Start Monitoring Logs (BEFORE clicking the button)

**Windows PowerShell:**
```powershell
# Option 1: Show all errors and React Native logs
adb logcat | Select-String -Pattern "FATAL|AndroidRuntime|ReactNativeJS|MapView|react-native-maps|Error|Exception"

# Option 2: Save to file for detailed analysis
adb logcat > crash_logs.txt

# Option 3: Filter for your app package
adb logcat | Select-String -Pattern "com.blackriverlogistics.app"
```

**Alternative (more detailed):**
```powershell
# Save all logs with timestamps
adb logcat -v time > detailed_logs.txt
```

### Step 4: Reproduce the Crash

1. **Keep the terminal running** (from Step 3)
2. Open your app on the device
3. Click "View Map" button
4. Watch the terminal for error messages

### Step 5: Analyze the Logs

Look for these key indicators:

#### A. FATAL EXCEPTION
```
FATAL EXCEPTION: main
Process: com.blackriverlogistics.app, PID: xxxxx
java.lang.RuntimeException: ...
```

#### B. React Native Errors
```
ReactNativeJS: 'Error: ...'
ReactNativeJS: TypeError: ...
```

#### C. MapView Errors
```
MapView: ...
react-native-maps: ...
Google Maps: ...
```

#### D. Missing Native Module
```
Error: Could not find module ...
Module not found: react-native-maps
```

## Common Errors and Solutions

### Error 1: "MapView is null" or "react-native-maps not available"

**Cause:** Native module not properly linked or not available in production build.

**Solution:**
- Rebuild with EAS: `eas build --platform android --profile production`
- Ensure `react-native-maps` is in `package.json`

### Error 2: "Google Maps API key authentication failed"

**Cause:** API key missing or incorrect in AndroidManifest.xml.

**Check:**
```bash
# After building, check the generated AndroidManifest.xml (in EAS build artifacts)
# Or verify in Google Cloud Console that:
# 1. API key is active
# 2. Package name restriction: com.blackriverlogistics.app
# 3. Maps SDK for Android is enabled
```

### Error 3: "Invalid coordinates" or "NaN"

**Cause:** Coordinates are null or invalid when rendering map.

**Solution:** Check if `pickupLat`, `pickupLng`, etc. are valid numbers.

### Error 4: "No implementation found for..."

**Cause:** Native module method not found (linking issue).

**Solution:** This usually means you need to rebuild with EAS (not Expo Go).

## Detailed Log Analysis Commands

### Get Full Stack Trace
```powershell
# Filter for fatal exceptions with full stack traces
adb logcat | Select-String -Pattern "FATAL|at com|at java" -Context 0,20
```

### Get React Native JavaScript Errors
```powershell
adb logcat | Select-String -Pattern "ReactNativeJS|console.error|Error:" -Context 0,5
```

### Save Everything for Analysis
```powershell
# Save complete log with timestamps
adb logcat -v time *:E ReactNativeJS:V ReactNative:V > full_debug_log.txt

# Then reproduce crash, then press Ctrl+C to stop
```

## Using Android Studio (Alternative Method)

1. Install **Android Studio**
2. Open **Logcat** window (View > Tool Windows > Logcat)
3. Connect device via USB
4. Select your device from dropdown
5. Filter by package: `com.blackriverlogistics.app`
6. Reproduce crash
7. Check for red error messages

## Testing the Fix

After getting logs, share the error with me. Common fixes:

### Quick Test: Add More Logging

The component already has error handling, but we can add more. Check if you see these log messages:

- `"Rendering MapView"` - Map is attempting to render
- `"Map is ready"` - Map successfully loaded
- `"Map error occurred"` - Map failed to load
- `"MapView: ✗"` - MapView component is null

## What to Share

When reporting the issue, share:

1. **The FATAL EXCEPTION block** (complete stack trace)
2. **Any ReactNativeJS errors**
3. **MapView related errors**
4. **The exact error message**

Example of what to share:
```
FATAL EXCEPTION: main
Process: com.blackriverlogistics.app, PID: 12345
java.lang.RuntimeException: Unable to start activity ComponentInfo{...}
...
at com.airbnb.android.react.maps.AirMapView.<init>(AirMapView.java:...)
```

## Quick Debug Script

Create a file `debug_crash.ps1`:

```powershell
# debug_crash.ps1
Write-Host "Clearing old logs..."
adb logcat -c

Write-Host "Starting log monitoring..."
Write-Host "Now click 'View Map' in your app..."
Write-Host "Press Ctrl+C to stop after crash"

adb logcat -v time *:E ReactNativeJS:V ReactNative:V | Tee-Object -FilePath "crash_debug_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
```

Run it:
```powershell
.\debug_crash.ps1
```

This will save logs to a file with timestamp.

## Most Likely Causes

Based on the setup, the crash is likely due to:

1. **react-native-maps not properly configured** - Need EAS build, not Expo Go
2. **Google Maps API key not in AndroidManifest** - Check if `android.config.googleMapsApiKey` is being injected
3. **Invalid coordinates** - Check if pickup/dropoff coordinates are valid
4. **Missing permissions** - Location permissions might not be granted

## Next Steps

1. **Run the logcat command** before clicking the button
2. **Reproduce the crash**
3. **Copy the error messages** from the terminal
4. **Share the errors** and I'll help fix them



