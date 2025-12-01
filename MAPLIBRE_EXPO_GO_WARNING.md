# ⚠️ IMPORTANT: MapLibre Does NOT Work with Expo Go

## The Problem

You're using `npx expo start` and scanning the QR code, which means you're using **Expo Go**.

**MapLibre (`@maplibre/maplibre-react-native`) requires native code compilation and will NOT work with Expo Go.**

## Why It Fails

- **Expo Go** = Pre-built app with limited native modules
- **MapLibre** = Requires custom native code compilation
- **Result** = "Cannot read property 'eventTypes' of null" error

## Solution: Use Development Build

You MUST create a **Development Build** instead of using Expo Go:

### Step 1: Create Development Build

```bash
eas build --platform android --profile development
```

This creates a custom build with MapLibre native code compiled in.

### Step 2: Install Development Build

1. Download the APK from EAS Build
2. Install on your device
3. Run `npx expo start --dev-client`
4. Scan QR code with the **Development Build** (not Expo Go)

### Step 3: Test Map

Now the map should work because MapLibre native code is compiled in.

## Alternative: Use react-native-maps with OpenStreetMap

If you need it to work **immediately** with Expo Go, we can switch to:
- `react-native-maps` (already installed)
- OpenStreetMap tiles (free, no API key)
- Works with Expo Go

Let me know if you want to switch!

## Current Status

✅ MapLibre code is implemented correctly
❌ Won't work with Expo Go (needs Development Build)
✅ Will work after creating Development Build

## Quick Test

After creating Development Build:
1. Install the development build APK
2. Run `npx expo start --dev-client`
3. Scan QR code
4. Click "View Map"
5. Should work! ✅

