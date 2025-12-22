# Quick Steps to Check App Crash

## Method 1: Using the Debug Script (Easiest)

### Step 1: Connect Your Phone via USB

1. Enable **Developer Options** on your Android phone:
   - Go to **Settings** > **About Phone**
   - Find **Build Number** and tap it **7 times**
   - Go back to **Settings** > **Developer Options**
   - Turn ON **USB Debugging**

2. Connect phone to computer via USB cable

3. Allow USB debugging when prompted on phone (check "Always allow" if asked)

### Step 2: Verify Connection

Open PowerShell and run:
```powershell
adb devices
```

You should see your device listed. Example:
```
List of devices attached
ABC123XYZ    device
```

If you see "unauthorized", tap "Allow" on your phone screen.

### Step 3: Run the Debug Script

```powershell
cd DriverMobileApp
.\debug_crash.ps1
```

### Step 4: Reproduce the Crash

1. **Keep the PowerShell window open** (don't close it!)
2. Open your app on the phone
3. Click "View Map" button
4. **Watch the PowerShell window** - errors will appear in real-time
5. After the crash, press **Ctrl+C** to stop the script

### Step 5: Check the Log File

The script saves logs to a file like: `crash_debug_20241130_123456.txt`

Open it to see the full error details.

---

## Method 2: Manual Logcat (If Script Doesn't Work)

### Step 1: Connect Phone (Same as above)

### Step 2: Clear Old Logs
```powershell
adb logcat -c
```

### Step 3: Start Monitoring
```powershell
adb logcat -v time > crash_logs.txt
```

### Step 4: Reproduce Crash
1. Open app
2. Click "View Map"
3. Wait for crash

### Step 5: Stop Logging
Press **Ctrl+C** in the PowerShell window

### Step 6: Check the File
Open `crash_logs.txt` and look for:
- `FATAL EXCEPTION`
- `Error:`
- `Exception:`
- `MapView`
- `react-native-maps`

---

## Method 3: Filter for Errors Only

```powershell
# Clear logs first
adb logcat -c

# Monitor only errors
adb logcat *:E ReactNativeJS:V | Select-String -Pattern "FATAL|Error|Exception|MapView"
```

Then reproduce the crash.

---

## What to Look For in the Logs

### Common Error Patterns:

#### 1. FATAL EXCEPTION (Java/Android crash)
```
FATAL EXCEPTION: main
Process: com.blackriverlogistics.app, PID: 12345
java.lang.RuntimeException: ...
```
**This shows the Android native crash**

#### 2. React Native JavaScript Errors
```
ReactNativeJS: Error: ...
ReactNativeJS: TypeError: ...
ReactNativeJS: ReferenceError: ...
```
**This shows JavaScript errors**

#### 3. MapView Errors
```
MapView: ...
react-native-maps: ...
Error creating map: ...
```
**This shows map-specific errors**

#### 4. Module Not Found
```
Error: Could not find module 'react-native-maps'
Module not found: ...
```
**Native module not linked**

---

## Quick Troubleshooting

### If `adb devices` shows nothing:
- Make sure USB debugging is enabled
- Try a different USB cable
- Try a different USB port
- Install/update Android USB drivers

### If script shows "No device found":
```powershell
# Check devices again
adb devices

# Restart adb server
adb kill-server
adb start-server
adb devices
```

### If logs are empty:
- Make sure the app is installed and running
- Try clearing logs: `adb logcat -c` before running
- Check if you're filtering too much

---

## Example: What You'll See

```
================================================
Map Crash Debug Tool
================================================

Checking for connected Android device...
✓ Device connected: ABC123XYZ    device

Clearing old logs...
✓ Logs cleared

================================================
READY TO CAPTURE LOGS
================================================

[After clicking View Map, you'll see errors like:]

FATAL EXCEPTION: main
Process: com.blackriverlogistics.app, PID: 12345
java.lang.RuntimeException: Unable to start activity...
    at com.airbnb.android.react.maps.AirMapView.<init>(...)
    ...

[OR]

ReactNativeJS: Error: MapView is null
ReactNativeJS: TypeError: Cannot read property 'latitude' of null
```

---

## After Getting the Error

1. **Copy the error message** (especially the FATAL EXCEPTION part)
2. **Share it** - I'll help you fix it!

The most important part is usually the **first few lines** of the FATAL EXCEPTION.

---

## Alternative: Android Studio Logcat

If you have Android Studio installed:

1. Open Android Studio
2. Connect phone
3. Open **Logcat** tab (bottom of screen)
4. Filter by: `com.blackriverlogistics.app`
5. Reproduce crash
6. Check for red error messages

---

## Still Having Issues?

If you can't capture logs:

1. **Check if adb is installed:**
   ```powershell
   adb version
   ```

2. **If not installed**, install Android SDK Platform Tools:
   - Download from: https://developer.android.com/studio/releases/platform-tools
   - Extract and add to PATH
   - Or use Android Studio (includes adb)

3. **Try wireless debugging** (Android 11+):
   - Enable Wireless debugging in Developer Options
   - Pair via IP address shown on phone

---

## Summary

**Easiest method:**
```powershell
cd DriverMobileApp
.\debug_crash.ps1
```

Then click "View Map" and watch the terminal!












