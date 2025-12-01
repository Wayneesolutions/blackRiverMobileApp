# Google Maps API Key Types - Important Explanation

## The Problem You're Asking About

You have:
1. **Android API Key** in Google Cloud Console (restricted to Android package: `com.blackriverlogistics.app`)
2. **Backend API Key** in your backend `.env` file (might be different key or web key)
3. App is fetching from backend (Priority 3)

**Question:** How will it work if they're different keys?

## How Google Maps API Keys Work

### Key Type Restrictions in Google Cloud Console:

1. **Android Key** (Restricted)
   - ✅ Works for: Android native maps (`react-native-maps`)
   - ❌ Won't work for: Web maps, iOS maps, backend API calls

2. **Web Key** (Restricted)
   - ✅ Works for: Web maps, JavaScript API
   - ❌ Won't work for: Android native maps

3. **Server Key** / **Unrestricted Key**
   - ✅ Works for: Backend API calls (Directions, Geocoding)
   - ✅ Works for: Everything (but less secure)

## Current Setup Analysis

### In Your App:

**app.json** (Priority 2 - Primary):
```json
"android": {
  "config": {
    "googleMapsApiKey": "AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI"
  }
}
```
**This MUST be your Android key** (restricted to Android package)

**Backend** (Priority 3 - Fallback):
```javascript
// Backend .env
GOOGLE_MAPS_API_KEY=AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI
```
**This could be:**
- Same Android key (if unrestricted or same key)
- Different key (web/server key)

## How React Native Maps Uses the Key

### Android Native Maps (react-native-maps):

1. **For Map Rendering:**
   - Uses key from `AndroidManifest.xml` 
   - This comes from `app.json → android.config.googleMapsApiKey`
   - **MUST be Android-restricted key**

2. **For Directions API (HTTP calls):**
   - Uses key from code (Priority 1, 2, or 3)
   - Can use ANY key type (Android, Web, or Server key)

## The Solution

### Option 1: Use Same Key (Recommended)

Use the **same API key** for both, but configure it properly in Google Cloud Console:

1. Go to Google Cloud Console
2. Select your API key
3. Under **Application restrictions**, select:
   - ✅ **Android apps** (for mobile app)
   - ✅ **HTTP referrers (websites)** (for backend, if using web)
   - ✅ OR **None** (if you want it to work everywhere)

4. Add both:
   - Android package: `com.blackriverlogistics.app`
   - Backend URL: `https://portal.logistiqinnovations.ca/*`

### Option 2: Separate Keys (More Secure)

1. **Android Key** → Use in `app.json` only
   - Restricted to: Android package `com.blackriverlogistics.app`
   - Only works for Android native maps

2. **Server/Backend Key** → Use in backend `.env`
   - For: Directions API, Geocoding API calls
   - Restricted to: Your backend server IP/domain

**Then in your code:**
- Priority 1 & 2 should use Android key (from app.json)
- Priority 3 (backend) should only be used for Directions API calls, not for map rendering

## Current Priority Order in Your Code

```typescript
Priority 1: GOOGLE_MAPS_API_KEY from env.ts (EAS secrets)
Priority 2: app.json → extra.googleMapsApiKey (Android key) ✅
Priority 3: Backend API → /config endpoint (Backend key) ⚠️
```

**Problem:** If Priority 3 is used and it's a different key, Android native maps won't work!

## Why Android Native Maps Needs Android Key

When `react-native-maps` renders on Android:

1. It reads the key from `AndroidManifest.xml`
2. This comes from `app.json → android.config.googleMapsApiKey` during build
3. Google Maps SDK validates the key matches the package name
4. If key is not Android-restricted or doesn't match package → **Map won't render**

## What Happens in Your Current Setup

### Scenario A: Same Key (Current Setup)

If both use `AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI`:

✅ **Priority 1** (if set in EAS) → Uses Android key → ✅ Works  
✅ **Priority 2** (`app.json`) → Uses Android key → ✅ Works (embedded in manifest)  
✅ **Priority 3** (backend) → Uses same key → ✅ Works (same key)

**Result:** ✅ All work because it's the same key

### Scenario B: Different Keys

If backend has different key:

✅ **Priority 1** → Android key → ✅ Works  
✅ **Priority 2** → Android key → ✅ Works (embedded in manifest)  
⚠️ **Priority 3** → Different key → ⚠️ **MIGHT NOT WORK** for native maps

**Result:** ⚠️ Depends on which priority is used

## The Critical Point

**For Android Native Map Rendering:**

The key in `app.json → android.config.googleMapsApiKey` is **ALWAYS used** by Android system, regardless of what your code fetches. This is embedded in `AndroidManifest.xml` during the build.

**For Directions API (HTTP calls):**

Your code can use any key (Android, Web, or Server key).

## Recommended Setup

### Best Practice:

1. **Android Key** → In `app.json`
   - Restricted to: Android package `com.blackriverlogistics.app`
   - Used for: Native map rendering

2. **Same Key or Server Key** → In backend `.env`
   - Used for: Directions API calls, Geocoding
   - Can be same Android key OR separate server key

3. **Priority Order:**
   - Priority 2 (`app.json`) will almost always work
   - Priority 3 (backend) is just a fallback

## How to Verify

### Check Your Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API key
3. Check **Application restrictions**:
   - If it says "Android apps" → It's an Android key ✅
   - If it says "HTTP referrers" → It's a Web key
   - If it says "None" → It's unrestricted

4. Check if package name matches:
   - Should include: `com.blackriverlogistics.app`

## Summary

**Your current setup should work IF:**
- ✅ The key in `app.json` is your Android key
- ✅ Backend has the same key OR a server key
- ✅ Priority 2 (`app.json`) is used (most likely)

**It might NOT work IF:**
- ❌ Backend returns a different key (Web key)
- ❌ Priority 3 is used and key doesn't support Android

**Solution:** Make sure `app.json` has the correct Android key (which it does), and that should work regardless of what backend returns, because Android native maps use the key from the manifest, not from your JavaScript code.



