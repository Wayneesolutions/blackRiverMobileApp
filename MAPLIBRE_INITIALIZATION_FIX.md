# MapLibre "eventTypes of null" Error Fix

## The Problem

The error "Cannot read property 'eventTypes' of null" occurs when MapLibre's native module isn't properly initialized or linked.

## Solution Steps

### 1. **Rebuild the App (Required)**

MapLibre requires native code, so you **MUST rebuild** the app (not just hot reload):

#### For Development Build:
```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

#### For EAS Build:
```bash
# Build a new development build
eas build --profile development --platform android
# or
eas build --profile development --platform ios
```

### 2. **Clear Cache and Rebuild**

```bash
# Clear Metro bundler cache
npx expo start --clear

# Or for a full clean:
rm -rf node_modules
npm install
npx expo start --clear
```

### 3. **Verify MapLibre is Installed**

```bash
npm list @maplibre/maplibre-react-native
```

Should show version `^10.4.1` or similar.

### 4. **Check app.json Configuration**

Make sure your `app.json` has the necessary permissions (already configured):

```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "..."
      }
    }
  }
}
```

### 5. **Important Notes**

- ❌ **Expo Go doesn't support MapLibre** - You need a development build
- ✅ **Development builds work** - Use `expo run:android` or `expo run:ios`
- ✅ **EAS builds work** - Use `eas build`

### 6. **Current Implementation**

The component now includes:
- ✅ Initialization delay (300ms) before rendering MapView
- ✅ Error handling for map load failures
- ✅ Conditional rendering to prevent null errors
- ✅ Proper error messages

### 7. **If Still Getting Errors**

1. **Check if you're using Expo Go:**
   - MapLibre won't work in Expo Go
   - You need a development build

2. **Verify native modules are linked:**
   ```bash
   # For bare React Native (if you ejected)
   cd android && ./gradlew clean
   cd ios && pod install
   ```

3. **Check console logs:**
   - Look for "MapLibre failed to load" messages
   - Check for permission errors

### 8. **Alternative: Use Web Fallback**

If native builds aren't working, you can add a web fallback:

```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Use web map component
  return <WebMapComponent />;
}
```

## Quick Checklist

- [ ] Rebuilt the app (not just hot reload)
- [ ] Using development build (not Expo Go)
- [ ] Cleared Metro cache
- [ ] MapLibre package is installed
- [ ] Permissions are configured in app.json
- [ ] No conflicting map libraries (react-native-maps removed)

## Still Having Issues?

1. Check the console for specific error messages
2. Verify you're not using Expo Go
3. Try a completely fresh build:
   ```bash
   rm -rf node_modules .expo
   npm install
   npx expo run:android --clear
   ```

