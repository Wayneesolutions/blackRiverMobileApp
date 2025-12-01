# How to View Mobile App Logs

## Option 1: In-App Crash Logs (Easiest - No ADB Needed) ✅

The app automatically saves crash logs when errors occur. View them directly in the app:

### Steps:
1. **Open the app** on your device
2. **Go to Settings** (bottom navigation)
3. **Scroll down** and look for **"View Crash Logs"** or **"Debug"** section
4. **Tap "View Crash Logs"**
5. You'll see all crash logs with:
   - Timestamp
   - Error message
   - Stack trace
   - Component where error occurred
   - Additional debug data

### Features:
- ✅ View all crashes
- ✅ Export logs (Share button)
- ✅ Clear logs
- ✅ No computer needed
- ✅ Works on production builds

### If you don't see "View Crash Logs" in Settings:

We need to add it. The screen exists but may not be linked. Let me check and add it.

---

## Option 2: React Native Remote Debugging (Best for Development)

View console logs in Chrome DevTools:

### Steps:

1. **Connect Device:**
   - Connect phone to computer via USB
   - Or make sure phone and computer are on same WiFi

2. **Enable Remote Debugging:**
   - Shake your device (or press `Ctrl+M` / `Cmd+M` on emulator)
   - Tap **"Debug"** or **"Open Debugger"**
   - Or: Settings → Developer Options → Enable **"Debug JS Remotely"**

3. **Open Chrome:**
   - Chrome will automatically open: `http://localhost:8081/debugger-ui`
   - Or manually open Chrome DevTools

4. **View Logs:**
   - Open **Console** tab in Chrome DevTools
   - All `console.log`, `console.error`, etc. will appear here
   - Filter by typing: `MapView`, `ERROR`, `MAPVIEW`, etc.

### Enable Remote Debugging in Code (if not working):

Add this to your app startup (already in App.tsx):
```typescript
// Remote debugging is enabled by default in development
// For production builds, you can enable it manually
```

---

## Option 3: ADB Logcat (Most Detailed - Requires Setup)

View native Android logs including native crashes:

### Quick Setup:
1. **Install ADB** (see `ADB_SETUP_WINDOWS.md`)
2. **Connect device via USB**
3. **Enable USB Debugging** on device
4. **Run:**
   ```powershell
   adb logcat
   ```

### Filter Map-Related Logs:
```powershell
# Our debug script (after ADB is installed)
cd DriverMobileApp
.\debug_crash.ps1
```

### Manual Filtering:
```powershell
# View only errors
adb logcat *:E

# View React Native logs
adb logcat | Select-String "ReactNativeJS"

# View MapView logs
adb logcat | Select-String "MapView|react-native-maps|MAPVIEW"

# Save to file
adb logcat -v time > logs.txt
```

---

## Option 4: Expo Dev Tools (If Using Expo Go)

If you're using Expo development build:

1. **Start Expo:**
   ```bash
   npm start
   # or
   npx expo start
   ```

2. **View Logs in Terminal:**
   - All logs appear in the terminal
   - Press `j` to open debugger
   - Press `r` to reload

3. **View in Browser:**
   - Expo opens a web interface at `http://localhost:19002`
   - Click **"Logs"** tab
   - View real-time logs

---

## What Logs to Look For

When debugging the map crash, look for these messages:

### ✅ Success Indicators:
- `✅✅✅ RENDERING MAPVIEW - ALL CHECKS PASSED`
- `✅ Using Google Maps API key from...`
- `Map is ready`

### ❌ Error Indicators:
- `💥💥💥 MAPVIEW NOT AVAILABLE`
- `💥💥💥 INVALID PICKUP COORDINATES`
- `💥💥💥 INVALID REGION COORDINATES`
- `MAP RENDER ERROR`
- `FATAL EXCEPTION`
- `AndroidRuntime: FATAL`

### Debug Messages:
- `🗺️ MapView Debug:`
- `📦 Environment values loaded:`
- `MapView: Available` or `MapView: NULL`

---

## Quick Test: Check If Logging Works

1. **Open the app**
2. **Click "View Map"**
3. **If it crashes:**
   - **Option 1:** Restart app → Settings → View Crash Logs
   - **Option 2:** Connect via USB → Enable Remote Debugging → Open Chrome DevTools
   - **Option 3:** Run `adb logcat` in terminal

4. **Look for these in logs:**
   ```
   💥💥💥 MAPVIEW NOT AVAILABLE
   💥💥💥 INVALID COORDINATES
   ✅✅✅ RENDERING MAPVIEW - ALL CHECKS PASSED
   ```

---

## Adding "View Crash Logs" to Settings (If Missing)

If the option doesn't appear in Settings, we need to add it. Let me know and I'll add it to the Settings screen.

---

## Summary: Which Method to Use?

| Method | Best For | Requirements |
|--------|----------|--------------|
| **In-App Crash Logs** | Production builds, quick checks | None - works on device |
| **Remote Debugging** | Development, JavaScript errors | Same WiFi/USB, enable debug |
| **ADB Logcat** | Native crashes, detailed logs | ADB installed, USB debugging |
| **Expo Dev Tools** | Expo development builds | Expo CLI running |

**Recommended:** Start with **In-App Crash Logs** (no setup needed), then use **Remote Debugging** for detailed JavaScript debugging.

