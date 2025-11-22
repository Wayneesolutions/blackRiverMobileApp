# Android 11 APK Installation Guide

## Android 11 Specific Installation Steps

Android 11 (API 30) has stricter security measures. Follow these steps:

### Step 1: Enable "Install Unknown Apps" for Your File Manager

**Important:** Android 11 requires you to enable "Install unknown apps" for the specific app you're using to install the APK.

1. **Download the APK** to your device (via browser, email, or file manager)

2. **Enable Install Unknown Apps:**
   - Go to **Settings** → **Apps** → **Special app access** → **Install unknown apps**
   - **OR** Go to **Settings** → **Apps** → Find your **File Manager** (Files, My Files, etc.)
   - Tap on your File Manager app
   - Tap **"Install unknown apps"**
   - Toggle **"Allow from this source"** to **ON**

3. **If using Chrome/Browser:**
   - Go to **Settings** → **Apps** → **Chrome** (or your browser)
   - Tap **"Install unknown apps"**
   - Toggle **"Allow from this source"** to **ON**

### Step 2: Install the APK

1. Open your **File Manager**
2. Navigate to **Downloads** folder
3. Find the APK file (usually named like `app-release.apk` or `black-river-logistics.apk`)
4. **Tap on the APK file**
5. Tap **"Install"** when prompted
6. Wait for installation to complete
7. Tap **"Open"** or find the app in your app drawer

### Step 3: If Installation Still Fails

#### Option A: Use ADB (Recommended for Testing)

1. **Enable Developer Options:**
   - Go to **Settings** → **About phone**
   - Tap **"Build number"** 7 times
   - Go back to **Settings** → **System** → **Developer options**
   - Enable **"USB debugging"**

2. **Install via ADB:**
   ```bash
   # Connect your device via USB
   adb devices  # Verify device is connected
   adb install path/to/your-app.apk
   ```

#### Option B: Use "Files by Google" App

1. Install **"Files by Google"** from Play Store
2. Open the app
3. Enable "Install unknown apps" for Files by Google
4. Navigate to Downloads
5. Tap the APK and install

#### Option C: Use ADB Wireless (No USB needed)

1. Enable **USB debugging** and **Wireless debugging** in Developer Options
2. Connect to same WiFi as your computer
3. Pair device using ADB:
   ```bash
   adb pair <device-ip>:<port>
   adb connect <device-ip>:<port>
   adb install path/to/your-app.apk
   ```

### Step 4: Check for Common Issues

#### Issue: "App not installed as package appears to be invalid"
**Solution:**
- The APK might be corrupted. Download it again
- Make sure you downloaded the complete file (check file size)

#### Issue: "There was a problem parsing the package"
**Solution:**
- Your device might not support the APK architecture
- Try rebuilding with universal APK:
  ```bash
  eas build --platform android --profile preview --clear-cache
  ```

#### Issue: "App not installed" (no specific error)
**Solution:**
- Uninstall any previous version first:
  - Settings → Apps → Find "Black River Logistics" → Uninstall
- Clear cache of Package Installer:
  - Settings → Apps → Show system apps → Package Installer → Storage → Clear cache
- Try installing again

#### Issue: "Install blocked" or "Blocked by Play Protect"
**Solution:**
1. Go to **Google Play Store** → **Settings** → **Play Protect**
2. Turn OFF **"Scan apps with Play Protect"** temporarily
3. Try installing again
4. (You can turn it back on after installation)

### Step 5: Verify Installation

After successful installation:
1. Find **"Black River Logistics"** in your app drawer
2. Open the app
3. Grant necessary permissions when prompted
4. The app should launch successfully

## Quick Checklist for Android 11

- [ ] Downloaded APK to device
- [ ] Enabled "Install unknown apps" for File Manager/Browser
- [ ] Uninstalled any previous version
- [ ] Cleared Package Installer cache
- [ ] Disabled Play Protect temporarily (if needed)
- [ ] Have at least 100MB free storage
- [ ] Device is running Android 11 (API 30) or higher

## Alternative: Use EAS Build Development Profile

If preview build doesn't work, try development build:

```bash
eas build --platform android --profile development
```

Development builds are easier to install and update.

## Still Having Issues?

1. **Check the exact error message** - Take a screenshot
2. **Try on a different device** - To isolate device-specific issues
3. **Check EAS build logs** - Look for any warnings or errors
4. **Rebuild with clean cache:**
   ```bash
   eas build --platform android --profile preview --clear-cache
   ```

## Contact Support

If none of the above works, provide:
- Exact Android version (Settings → About phone → Android version)
- Device model
- Exact error message when trying to install
- Screenshot of the error (if possible)

