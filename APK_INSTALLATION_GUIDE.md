# APK Installation Troubleshooting Guide

## Common Issues and Solutions

### 1. Enable "Install from Unknown Sources"

**For Android 8.0 (Oreo) and above:**
1. Go to **Settings** → **Apps & notifications** → **Special app access** → **Install unknown apps**
2. Select your browser or file manager (Chrome, Files, etc.)
3. Toggle **"Allow from this source"** to ON

**For older Android versions:**
1. Go to **Settings** → **Security**
2. Enable **"Unknown sources"** or **"Install unknown apps"**

### 2. Check APK Architecture Compatibility

The APK should work on most devices, but if you get an installation error:
- Make sure your device is running **Android 6.0 (API 24) or higher**
- The APK is built for **arm64-v8a, armeabi-v7a, x86, and x86_64** architectures

### 3. Download Issues

**If the download seems corrupted:**
1. Try downloading the APK again from the EAS build page
2. Use a different browser or download manager
3. Check your internet connection

### 4. Storage Permission

**If you can't access the downloaded APK:**
1. Go to **Settings** → **Apps** → **Files** (or your file manager)
2. Enable **Storage** permission
3. Try downloading again

### 5. Clear Previous Installation Attempts

**If you previously tried to install:**
1. Go to **Settings** → **Apps**
2. Look for "Black River Logistics" or "com.blackriverlogistics.app"
3. If found, **Uninstall** it completely
4. Try installing the new APK again

### 6. Install via ADB (Advanced)

If direct installation doesn't work, you can install via ADB:

```bash
# Connect your device via USB
# Enable USB debugging in Developer Options
adb install path/to/your-app.apk
```

### 7. Check Device Storage

**Make sure you have enough storage:**
1. Go to **Settings** → **Storage**
2. Ensure you have at least **100MB** free space

### 8. Rebuild with Specific Configuration

If issues persist, rebuild with explicit settings:

```bash
eas build --platform android --profile preview --clear-cache
```

## Quick Checklist

- [ ] Unknown sources enabled for your browser/file manager
- [ ] Device running Android 6.0 or higher
- [ ] At least 100MB free storage
- [ ] APK downloaded completely (check file size)
- [ ] No previous installation of the app
- [ ] Storage permission granted to file manager

## Still Having Issues?

1. **Check the exact error message** when trying to install
2. **Try installing on a different device** to isolate the issue
3. **Check EAS build logs** for any warnings or errors
4. **Rebuild the APK** with the updated configuration

## Alternative: Use Development Build

If APK installation continues to fail, use a development build:

```bash
eas build --platform android --profile development
```

Then install via:
```bash
adb install path/to/development-build.apk
```


