# Environment Configuration

## Base URL Configuration

The app is now configured with default base URLs that will work immediately:

### Default URLs by Platform:

- **Android Emulator**: `http://10.0.2.2:3000/api/v1`
- **iOS Simulator / Web**: `http://localhost:3000/api/v1`

### For Physical Devices:

If you're testing on a physical device, you need to use your computer's local IP address:

1. Find your computer's IP address:
   - **Windows**: Run `ipconfig` in command prompt, look for IPv4 Address
   - **Mac/Linux**: Run `ifconfig` or check System Preferences > Network

2. Update the base URL in `src/config/env.ts`:
   ```typescript
   let API_BASE_URL: string = 'http://YOUR_IP_ADDRESS:3000/api/v1';
   ```

### Configuration File

The configuration is handled in `src/config/env.ts`. The app will:
1. Use default values immediately (no undefined errors)
2. Automatically detect your network IP in development
3. Update to the best available endpoint

### Manual Override

To manually set a specific base URL, edit `src/config/env.ts` and modify the default value:

```typescript
let API_BASE_URL: string = 'http://192.168.1.100:3000/api/v1'; // Your server IP
```

## Current Setup

✅ Default values are set - no more `undefined` errors
✅ Automatic IP detection in development
✅ Fallback endpoints for reliability
✅ Platform-specific defaults (Android/iOS)



