# How to Check Errors When App Terminates

When the app **completely terminates** (hard crash), the error handlers still log to **console**, which you can capture even after the app closes!

## Method 1: Use React Native Debugger (Recommended)

### Step 1: Install React Native Debugger

```bash
# Download from: https://github.com/jhen0409/react-native-debugger/releases
# Or install via npm:
npm install -g react-native-debugger
```

### Step 2: Enable Remote JS Debugging

1. Install the app on your device
2. Shake device → **"Debug"**
3. Or enable: Settings → Developer Options → Remote JS Debugging

### Step 3: Connect Debugger

1. Open React Native Debugger
2. It will automatically connect
3. Open **Console** tab
4. **Keep it open** while testing

### Step 4: Reproduce Crash

1. Click "View Map"
2. Watch the console - errors will appear even if app terminates
3. Copy the error messages

## Method 2: Use Chrome DevTools

### Step 1: Enable Debugging

1. Open app
2. Shake device → **"Debug"**
3. This opens Chrome DevTools

### Step 2: Open Console

1. In Chrome, go to `http://localhost:8081/debugger-ui/`
2. Open **Console** tab
3. Keep it visible

### Step 3: Test

1. Click "View Map"
2. Errors will appear in Chrome console
3. Even if app terminates, console logs remain

## Method 3: Logcat with Filters (Best for Native Crashes)

### Step 1: Connect Device

```powershell
adb devices
```

### Step 2: Start Logcat BEFORE Testing

```powershell
# Clear logs
adb logcat -c

# Start monitoring with buffer size (captures more)
adb logcat -G 16M

# Start logging to file
adb logcat -v time > crash_full_log.txt
```

### Step 3: Reproduce Crash

1. Click "View Map"
2. Wait for app to terminate
3. Press **Ctrl+C** to stop logcat

### Step 4: Check the File

Open `crash_full_log.txt` and search for:
- `FATAL EXCEPTION`
- `💥💥💥` (our crash markers)
- `MapView`
- `ReactNativeJS`

## Method 4: Built-in Crash Logs (After App Restarts)

### Step 1: App Crashes

When app terminates, crash reporter logs to console first (guaranteed)

### Step 2: Restart App

1. Open app again
2. Go to **Settings**
3. Tap **"View Crash Logs"**
4. See the crash that happened before termination

### Important Notes:

- **Console logs survive termination** - They're logged synchronously
- **AsyncStorage might not save** if app terminates immediately
- **Always check console/debugger first** for termination crashes

## What the Code Does

The updated crash reporter now:

1. ✅ **Logs to console FIRST** (synchronous - always runs)
2. ✅ **Uses special markers** (`💥💥💥`) to make logs easy to find
3. ✅ **Global error handlers** catch errors before termination
4. ✅ **Promise rejection handlers** catch async errors

## Console Log Format

When a crash happens, you'll see:

```
💥💥💥 CRASH START 💥💥💥
Component: MapViewWithLiveTracking
Error Name: TypeError
Error Message: Cannot read property 'latitude' of null
Stack Trace: ...
Additional Data: {...}
Full Crash Log: {...}
💥💥💥 CRASH END 💥💥💥
```

## Quick Test Commands

### Test with React Native Debugger:
```powershell
# 1. Start debugger
rndebugger

# 2. Enable remote debugging in app
# 3. Watch console
# 4. Click "View Map"
```

### Test with Logcat:
```powershell
# Start logging
adb logcat -c
adb logcat -v time *:E ReactNativeJS:V | Select-String -Pattern "💥|FATAL|MapView"
```

## Why This Works

1. **Console.error is synchronous** - Runs immediately, before app closes
2. **Global handlers catch early** - ErrorUtils.setGlobalHandler runs first
3. **Logcat captures everything** - Even native crashes
4. **Debugger persists logs** - Console stays open after crash

## Summary

For **app termination crashes**:

1. ✅ **Use React Native Debugger** - Best for JavaScript errors
2. ✅ **Use Logcat** - Best for native crashes
3. ✅ **Check built-in logs** - After app restarts
4. ✅ **Console logs always work** - Even during termination

**The console logs with `💥💥💥` markers will always be captured, even if the app terminates!**

