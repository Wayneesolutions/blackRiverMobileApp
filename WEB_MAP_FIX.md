# Web Map Bundling Fix

## Issue
Metro bundler is trying to bundle `react-native-maps` for web, which causes errors because it imports native-only modules.

## Solution Applied

1. **Updated metro.config.js** - Enhanced resolver to catch ALL react-native-maps imports including nested dependencies like `MapMarkerNativeComponent`

2. **Updated webMapsStub.js** - Added stub for `MapMarkerNativeComponent` to handle nested imports

3. **Lazy Loading** - Changed `loadMapsModule()` to only be called inside component `useEffect`, not at module level

4. **Platform Checks** - Added proper web detection using both `Platform.OS` and `typeof window` checks

## Testing

After these changes:
- **Clear Metro cache**: `npx expo start --clear`
- **Test web**: Should bundle without errors
- **Test native**: Should work in Expo Go and APK builds

The map will use:
- **Web**: `WebMapView` component (existing)
- **Native**: `react-native-maps` with OpenStreetMap tiles

