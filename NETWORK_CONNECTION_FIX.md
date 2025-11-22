# Network Connection Error Fix

## Issue
App shows "Network connection error" when trying to login on Vivo Z1 Pro.

## Root Cause
The `.env` file is in `.gitignore` and might not be included in the EAS build, causing the app to use default/localhost URLs instead of the production backend.

## Solution Applied

### 1. Environment Variables in EAS Build
Added environment variables directly in `eas.json` for production builds:
```json
"production": {
  "env": {
    "API_BASE_URL": "https://portal.logistiqinnovations.ca/api/v1",
    "SOCKET_URL": "https://portal.logistiqinnovations.ca",
    "NODE_ENV": "production",
    "DB_NAME": "blackriver"
  }
}
```

### 2. Network Security Configuration
Added network security settings in `app.json`:
- `ACCESS_NETWORK_STATE` permission
- Network security config for HTTPS

## Next Steps

### Rebuild the APK

**Important:** You need to rebuild the APK with the updated configuration:

```bash
eas build --platform android --profile production --clear-cache
```

This will:
- Include environment variables in the build
- Use the production backend URL: `https://portal.logistiqinnovations.ca/api/v1`
- Configure network security properly

### Verify After Rebuild

1. **Install the new APK** on your Vivo Z1 Pro
2. **Open the app**
3. **Check the console logs** (if using development build) - should show:
   ```
   ✅ .env file detected - skipping auto-detection
   ✅ Using .env API_BASE_URL: https://portal.logistiqinnovations.ca/api/v1
   ```
4. **Try logging in** - should connect to production backend

## Troubleshooting

### If still getting network error:

1. **Check Internet Connection:**
   - Make sure your device has internet access
   - Try opening `https://portal.logistiqinnovations.ca` in browser

2. **Check Backend Status:**
   - Verify backend is running and accessible
   - Test API endpoint: `https://portal.logistiqinnovations.ca/api/v1/health`

3. **Check App Logs:**
   - The app should log which URL it's trying to connect to
   - Look for: `API_BASE_URL` in console logs

4. **Verify Environment Variables:**
   - The build should include env vars from `eas.json`
   - Check build logs to confirm env vars are set

### Test Backend Connection

You can test if the backend is accessible from your device:

1. Open browser on your phone
2. Go to: `https://portal.logistiqinnovations.ca/api/v1/health`
3. Should return a response (even if it's an error, it means connection works)

## Current Configuration

**Production Backend:**
- API: `https://portal.logistiqinnovations.ca/api/v1`
- Socket: `https://portal.logistiqinnovations.ca`

**Environment Variables:**
- Set in `eas.json` production profile
- Will be included in the build

## Quick Fix Command

```bash
# Rebuild with updated configuration
eas build --platform android --profile production --clear-cache
```

After rebuild, the app will use the production backend URL automatically.

