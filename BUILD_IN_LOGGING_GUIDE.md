# Built-in Crash Logging - View Logs in App

## What's Been Added

I've added **built-in crash logging** that saves errors directly to your device storage. Now you can see crash details **inside the app** without needing USB debugging!

## Features

✅ **Automatic Crash Capture** - Errors are automatically saved when they occur  
✅ **View in App** - Check crash logs from Settings screen  
✅ **Export Logs** - Share crash logs via email/message  
✅ **Detailed Error Info** - Full stack traces and context  

## How It Works

### 1. Automatic Logging

When the map crashes, it now:
- Saves error to device storage (AsyncStorage)
- Shows error message on screen
- Keeps last 50 crash logs

### 2. View Crash Logs

Add this to your Settings screen navigation:

```tsx
// In your navigation file (AppNavigator.tsx or similar)
import CrashLogsScreen from '../screens/settings/CrashLogsScreen';

// Add route:
<Stack.Screen 
  name="CrashLogs" 
  component={CrashLogsScreen} 
  options={{ title: 'Crash Logs' }}
/>
```

Then add a button in Settings screen:

```tsx
// In src/screens/settings/index.tsx
import { useNavigation } from '@react-navigation/native';

// Add this button in your settings list:
<TouchableOpacity
  style={styles.settingItem}
  onPress={() => navigation.navigate('CrashLogs' as any)}
>
  <View style={styles.settingLeft}>
    <Ionicons name="bug-outline" size={24} color="#EF4444" />
    <Text style={styles.settingText}>View Crash Logs</Text>
  </View>
  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
</TouchableOpacity>
```

## Usage

### Step 1: Build and Install APK

```bash
eas build --platform android --profile production
```

### Step 2: Test the App

1. Open your app
2. Click "View Map" 
3. If it crashes, the error is automatically saved

### Step 3: View Crash Logs

1. Go to **Settings** screen
2. Tap **"View Crash Logs"**
3. See all crash logs with:
   - Timestamp
   - Error message
   - Stack trace
   - Component where it crashed
   - Additional debug data

### Step 4: Export Logs

1. In Crash Logs screen, tap **"Export"**
2. Share via email, message, etc.
3. Send to developer for analysis

## What Gets Logged

Each crash log includes:

- ✅ **Timestamp** - When it happened
- ✅ **Error Name** - Type of error
- ✅ **Error Message** - What went wrong
- ✅ **Stack Trace** - Where it happened
- ✅ **Component** - Which component crashed
- ✅ **Platform** - Android/iOS
- ✅ **Additional Data** - MapView status, coordinates, etc.

## Example Crash Log

```
=== Crash Log #1 ===
Time: 2025-11-30T12:34:56.789Z
Component: MapViewWithLiveTracking
Platform: android
Error: TypeError
Message: Cannot read property 'latitude' of null
Stack:
  at MapViewWithLiveTracking.calculateRegion
  ...
Additional Data: {
  "hasMapView": false,
  "hasProvider": false,
  "platform": "android",
  "loadId": "12345"
}
```

## Benefits

### ✅ No USB Required
- View logs directly in app
- No need for adb or USB connection

### ✅ Works in Production
- Logs saved on device
- Can be exported anytime

### ✅ User-Friendly
- Easy to access from Settings
- Clear error messages
- Export for support

## Integration Steps

### Quick Integration (5 minutes)

1. **Crash reporter is already added** to map component ✅

2. **Add navigation route:**
   - Find your navigation file
   - Add `CrashLogsScreen` route

3. **Add Settings button:**
   - In Settings screen
   - Add "View Crash Logs" button

4. **Rebuild APK:**
   ```bash
   eas build --platform android --profile production
   ```

## Testing

### Test Crash Logging

1. Build the app
2. Install on device
3. Click "View Map" (to trigger potential crash)
4. Go to Settings > View Crash Logs
5. Verify crash is logged

### Test Export

1. View crash logs
2. Tap "Export"
3. Verify you can share the logs

## Limitations

- Logs are stored locally (on device)
- Maximum 50 logs (oldest are deleted)
- Logs are cleared if app is uninstalled

## Advanced: Send to Backend

To automatically send logs to your backend:

```typescript
// In crashReporter.ts, modify logCrash method:
async logCrash(error: Error, component?: string, additionalData?: any) {
  // ... existing code ...
  
  // Send to backend
  try {
    await fetch('https://portal.logistiqinnovations.ca/api/v1/crash-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crashLog)
    });
  } catch (e) {
    // Fallback: just save locally
  }
}
```

## Summary

Now you can:
1. ✅ Build APK with crash logging
2. ✅ Install on any device
3. ✅ View crash logs in Settings
4. ✅ Export and share logs
5. ✅ Debug without USB/adb

**No more USB debugging needed!** 🎉

