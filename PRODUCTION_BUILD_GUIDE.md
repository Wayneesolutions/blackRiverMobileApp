# Production APK Build Guide

## ✅ Current Configuration

Your app is configured for production with:
- **API Base URL:** `https://portal.logistiqinnovations.ca/api/v1`
- **Socket URL:** `https://portal.logistiqinnovations.ca`
- **Environment:** `production`
- **Database:** `blackriver`

## 🚀 Build Production APK

### Step 1: Verify Environment

Make sure your `.env` file has production values:

```bash
cat .env
```

Should show:
```
API_BASE_URL=https://portal.logistiqinnovations.ca/api/v1
SOCKET_URL=https://portal.logistiqinnovations.ca
NODE_ENV=production
DB_NAME=blackriver
```

### Step 2: Build the APK

Run this command to build the production APK:

```bash
eas build --platform android --profile production
```

**What this does:**
- Builds a production-ready APK
- Uses your `.env` file values (production backend)
- Auto-increments version code
- Creates a signed APK ready for distribution

### Step 3: Wait for Build

- The build will take **15-30 minutes**
- You'll see progress in the terminal
- You can also check: https://expo.dev/accounts/krishnadas7/projects/black-river-logistics/builds

### Step 4: Download APK

Once build completes:

1. **From Terminal:**
   - The build URL will be shown
   - Or run: `eas build:list` to see all builds

2. **From Expo Dashboard:**
   - Go to: https://expo.dev/accounts/krishnadas7/projects/black-river-logistics/builds
   - Click on the latest build
   - Download the APK file

## 📤 Share with Client

### Option 1: Direct Download Link

1. After build completes, copy the download URL
2. Share the URL with your client
3. They can download directly on their Android device

### Option 2: Upload to Cloud Storage

1. Download the APK to your computer
2. Upload to:
   - Google Drive
   - Dropbox
   - OneDrive
   - Or any file sharing service
3. Share the link with your client

### Option 3: Email

1. Download the APK
2. Attach to email (if file size allows)
3. Send to client

## 📱 Client Installation Instructions

Share these instructions with your client:

### For Android 11+ (Most Common)

1. **Download the APK** to your device
2. **Enable "Install Unknown Apps":**
   - Go to **Settings** → **Apps** → **Special app access** → **Install unknown apps**
   - Select your **File Manager** or **Browser**
   - Toggle **"Allow from this source"** to **ON**
3. **Open File Manager** → **Downloads**
4. **Tap the APK file** → **Install**
5. **Open the app** and grant necessary permissions

### If Installation Fails

- Make sure "Unknown sources" is enabled for your File Manager
- Try disabling Play Protect temporarily
- Ensure you have at least 100MB free storage

## 🔄 Update App Version

Before building, you can update the version in `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",  // Update version
    "android": {
      "versionCode": 2  // Increment version code
    }
  }
}
```

The `autoIncrement: true` in `eas.json` will automatically increment version code, but you can manually set it too.

## ✅ Pre-Build Checklist

- [ ] `.env` file has correct production URLs
- [ ] `NODE_ENV=production` in `.env`
- [ ] App version is correct in `app.json`
- [ ] All features tested in development
- [ ] Backend is deployed and accessible
- [ ] EAS CLI is logged in: `eas login`

## 🎯 Quick Build Command

```bash
# One command to build production APK
eas build --platform android --profile production
```

## 📊 Build Status

Check build status:
```bash
eas build:list
```

## 🔍 Verify Build Configuration

Your `eas.json` production profile:
- ✅ `autoIncrement: true` - Auto-increments version
- ✅ `buildType: "apk"` - Creates APK (not AAB)
- ✅ Uses production environment from `.env`

## 🆘 Troubleshooting

### Build Fails?

1. **Check EAS login:**
   ```bash
   eas whoami
   ```

2. **Clear cache and rebuild:**
   ```bash
   eas build --platform android --profile production --clear-cache
   ```

3. **Check build logs:**
   - Visit the build page on Expo dashboard
   - Check for specific errors

### APK Too Large?

- Production builds are optimized
- If still large, consider using AAB format for Play Store
- Current APK should be ~30-50MB

## 📝 Notes

- The `.env` file is included in the build
- Production backend URL is hardcoded in the APK
- Client doesn't need to configure anything
- App will connect to: `https://portal.logistiqinnovations.ca`

