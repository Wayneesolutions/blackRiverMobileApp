# MapLibre Crash Fix Guide

## Issue: App Crashes When Clicking "View Map"

If the app crashes when clicking "View Map" after migrating to MapLibre, here are the most common causes and fixes:

## Possible Causes

### 1. MapLibre Native Module Not Compiled
MapLibre requires native code compilation. It **will NOT work** with:
- ❌ Expo Go (development app)
- ✅ Only works with **Development Build** or **Production Build** (EAS Build)

**Solution:** You MUST rebuild the app with EAS Build:
```bash
eas build --platform android --profile production
```

### 2. Native Module Not Linked
MapLibre might not be properly linked in the native project.

**Solution:** 
- Run `npx expo prebuild` to regenerate native folders
- Or rebuild with EAS (it handles this automatically)

### 3. Missing Permissions
MapLibre might need location permissions.

**Solution:** Check `app.json` has location permissions (already added):
```json
"permissions": [
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION"
]
```

### 4. Invalid Map Style URL
The style URL might be unreachable or invalid.

**Solution:** The current style URL is:
```
https://demotiles.maplibre.org/style.json
```

If this doesn't work, try:
- `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
- Or host your own style

### 5. MapLibre Package Version Issue
The installed version might have compatibility issues.

**Solution:** Try reinstalling:
```bash
npm uninstall @maplibre/maplibre-react-native
npm install @maplibre/maplibre-react-native@latest
```

## How to Debug

### 1. Check Console Logs
Enable Remote Debugging and look for:
- `✅ MapLibre modules loaded successfully` - Good sign
- `❌ Failed to load @maplibre/maplibre-react-native` - Package not installed properly
- `💥💥💥 MAPLIBRE NOT AVAILABLE` - Module not available (needs rebuild)

### 2. Check Crash Logs Screen
1. Open app
2. Go to Settings → View Crash Logs
3. Look for error messages about MapLibre

### 3. Check ADB Logcat
```bash
adb logcat | Select-String "MapLibre|FATAL|AndroidRuntime"
```

## Quick Fix: Use Fallback Map

If MapLibre continues to crash, you can temporarily revert to a simpler map or show an error message. The code already has fallback handling that shows an error message instead of crashing.

## Next Steps

1. **Rebuild the app** (MOST IMPORTANT):
   ```bash
   eas build --platform android --profile production
   ```

2. **Test the new build** on a physical device

3. **Check logs** if it still crashes:
   - Remote Debugging
   - ADB Logcat
   - In-app crash logs

## Alternative: Use react-native-maps with OpenStreetMap

If MapLibre continues to have issues, you can use `react-native-maps` with OpenStreetMap tiles (also free, no API key needed). Let me know if you want to switch to this approach.

