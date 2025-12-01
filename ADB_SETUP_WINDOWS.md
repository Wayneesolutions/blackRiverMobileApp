# ADB Setup for Windows

## Quick Setup (Recommended)

### Option 1: Install Android SDK Platform Tools Only (Lightweight)

1. **Download Platform Tools:**
   - Visit: https://developer.android.com/tools/releases/platform-tools
   - Or direct download: https://dl.google.com/android/repository/platform-tools-latest-windows.zip

2. **Extract:**
   - Extract `platform-tools` folder to a permanent location, e.g.:
     - `C:\Android\platform-tools`
     - `D:\Android\platform-tools`

3. **Add to PATH:**
   - Press `Win + X` → **System** → **Advanced system settings**
   - Click **Environment Variables**
   - Under **User variables**, find **Path** → Click **Edit**
   - Click **New** → Add: `C:\Android\platform-tools` (or your path)
   - Click **OK** on all dialogs

4. **Verify:**
   - Close and reopen PowerShell/Terminal
   - Run: `adb version`
   - Should show: `Android Debug Bridge version 1.0.xx`

### Option 2: Install via Chocolatey (If you have it)

```powershell
choco install adb
```

### Option 3: Install Android Studio (Full Setup)

1. Download Android Studio: https://developer.android.com/studio
2. Install it (includes ADB automatically)
3. ADB will be at: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
4. Add to PATH (same steps as Option 1)

## Enable USB Debugging on Your Device

1. **Enable Developer Options:**
   - Go to **Settings** → **About phone**
   - Tap **Build number** 7 times
   - You'll see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to **Settings** → **System** → **Developer options**
   - Enable **USB debugging**
   - Enable **Install via USB** (if available)

3. **Connect Device:**
   - Connect phone to PC via USB
   - On your phone, tap **"Allow USB debugging"** when prompted
   - Check **"Always allow from this computer"**

4. **Verify Connection:**
   ```powershell
   adb devices
   ```
   - Should show your device ID (not "unauthorized")

## Using ADB for Debugging

### Check Connected Devices
```powershell
adb devices
```

### View Real-time Logs
```powershell
adb logcat
```

### Filter Map-Related Errors
```powershell
adb logcat | Select-String -Pattern "MAPVIEW|INVALID|RENDERING|MapView|react-native-maps|FATAL|Error|Exception"
```

### Save Logs to File
```powershell
adb logcat -v time > crash_logs.txt
```

### Clear Logs
```powershell
adb logcat -c
```

## Use the Built-in Debug Script

We've created a PowerShell script that does this automatically:

```powershell
cd DriverMobileApp
.\debug_crash.ps1
```

This will:
- Check if ADB is available
- Connect to your device
- Filter and display crash logs
- Save logs to `crash_logs_[timestamp].txt`

## Alternative: Use In-App Crash Logs

Since you're using EAS Build, you can also use the built-in crash logging we added:

1. **Open the app** (even if it crashes)
2. **Restart the app**
3. Go to **Settings** → **View Crash Logs**
4. All crashes are saved automatically

This works even without ADB!

## Troubleshooting

### "adb: command not found"
- Make sure you added ADB to PATH
- **Restart PowerShell/Terminal** after adding to PATH
- Try full path: `C:\Android\platform-tools\adb.exe version`

### "device unauthorized"
- On your phone, revoke USB debugging authorizations:
  - Settings → Developer options → Revoke USB debugging authorizations
- Reconnect device and tap "Allow" when prompted

### "no devices/emulators found"
- Check USB connection
- Make sure USB debugging is enabled
- Try different USB port/cable
- On phone: Settings → Developer options → Enable **USB debugging (Security settings)**

### Device Not Showing
```powershell
# Restart ADB server
adb kill-server
adb start-server
adb devices
```

## Quick Reference

```powershell
# Check if ADB is installed
adb version

# List connected devices
adb devices

# View all logs
adb logcat

# View only errors
adb logcat *:E

# View React Native logs
adb logcat | Select-String "ReactNativeJS"

# Save logs to file
adb logcat -v time > logs.txt

# Clear logs
adb logcat -c

# Install APK via ADB
adb install app.apk

# Uninstall app
adb uninstall com.blackriverlogistics.app
```



