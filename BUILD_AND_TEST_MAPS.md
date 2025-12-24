# Build APK and Test Maps - Following Previous Process

## Previous Deployment Method

Based on your project, you previously used:
- **EAS Build** (Expo Application Services)
- **Command**: `eas build --platform android --profile production`
- **Or via npm script**: `npm run build:android:production`

## Step-by-Step: Build & Test with Maps Fix

### Step 1: Install EAS CLI (Choose One Method)

#### Option A: Use npx (No Installation Needed) ✅ Recommended

You can use `npx` to run EAS CLI without installing globally:

```bash
npx eas-cli login
```

#### Option B: Install Globally

```bash
npm install -g eas-cli
```

#### Option C: Use npm Scripts (Easiest)

Your `package.json` already has build scripts! Just use:

```bash
npm run build:android:preview
# or
npm run build:android:production
```

### Step 2: Login to EAS

```bash
# If using npx:
npx eas-cli login

# If installed globally:
eas login

# If using npm scripts, login first:
npx eas-cli login
```

You'll be asked to:
1. Open a browser
2. Login to your Expo account (krishnadas7)
3. Authorize the CLI

### Step 3: Set Google Maps API Key Secret

**IMPORTANT**: This is the new step needed for maps to work!

```bash
# Using npx:
npx eas-cli secret:create --scope project --name GOOGLE_MAPS_API_KEY --value YOUR_API_KEY --type string

# Or if installed globally:
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value YOUR_API_KEY --type string
```

**Replace `YOUR_API_KEY` with your actual Google Maps API key**

**Or use EAS Dashboard:**
1. Go to: https://expo.dev/accounts/krishnadas7/projects/black-river-logistics/secrets
2. Click "Create Secret"
3. Name: `GOOGLE_MAPS_API_KEY`
4. Value: Your Google Maps API key
5. Scope: Project
6. Save

### Step 4: Verify Environment (Optional but Recommended)

Check your `.env` file has production values:

```bash
# Windows PowerShell
Get-Content .env

# Should show:
# API_BASE_URL=https://portal.logistiqinnovations.ca/api/v1
# SOCKET_URL=https://portal.logistiqinnovations.ca
# NODE_ENV=production
# DB_NAME=blackriver
```

### Step 5: Build the APK

#### Option A: Using npm Script (Easiest) ✅

```bash
# For testing (preview build - faster)
npm run build:android:preview

# For production
npm run build:android:production
```

#### Option B: Using npx

```bash
# Preview build
npx eas-cli build --platform android --profile preview

# Production build
npx eas-cli build --platform android --profile production
```

#### Option C: Using Global EAS CLI

```bash
eas build --platform android --profile preview
# or
eas build --platform android --profile production
```

**Build will take 15-30 minutes**

### Step 6: Monitor Build Progress

While building, you can:

1. **Watch terminal output** - Shows progress
2. **Check EAS Dashboard**: https://expo.dev/accounts/krishnadas7/projects/black-river-logistics/builds
3. **Get notified** - EAS will show download link when done

### Step 7: Download APK

Once build completes:

#### From Terminal:
- Build URL will be shown
- Or run: `npx eas-cli build:list` (or `npm run build:list`)

#### From Dashboard:
1. Go to: https://expo.dev/accounts/krishnadas7/projects/black-river-logistics/builds
2. Click on the latest build
3. Click "Download" button

### Step 8: Install APK on Device

#### Using ADB (if device connected via USB):

```bash
adb install path/to/downloaded-app.apk
```

#### Manual Installation:

1. Transfer APK to Android device (USB, email, cloud storage)
2. On device: **Settings** → **Apps** → **Special app access** → **Install unknown apps**
3. Select your **File Manager** or **Browser**
4. Toggle **"Allow from this source"** to **ON**
5. Open File Manager → Downloads
6. Tap APK file → Install

### Step 9: Test Maps

1. **Open the app** on your device
2. **Login** (if required)
3. **Navigate to Maps** screen or open a load with route
4. **Check if map displays**:
   - ✅ Map shows Google Maps tiles (not blank/gray)
   - ✅ Markers appear (pickup/dropoff)
   - ✅ Route lines appear
   - ✅ Map is interactive (zoom/pan works)

### Step 10: Debug if Maps Don't Work

#### Check Logs:

```bash
# Connect device via USB, then:
adb logcat | findstr /i "maps api key error"
```

#### Common Issues:

1. **Blank/Gray Map**:
   - API key not set in EAS secrets → Go back to Step 3
   - API key restrictions blocking app → Check Google Cloud Console
   - Rebuild APK after setting secret

2. **"API key not found" error**:
   - Verify secret is set: `npx eas-cli secret:list`
   - Rebuild APK

3. **Map loads but no tiles**:
   - Check internet connection
   - Verify API key restrictions in Google Cloud Console

## Quick Reference Commands

```bash
# 1. Login (one-time)
npx eas-cli login

# 2. Set API key secret (one-time, if not done)
npx eas-cli secret:create --scope project --name GOOGLE_MAPS_API_KEY --value YOUR_KEY --type string

# 3. Build APK (using npm script - easiest)
npm run build:android:preview

# 4. Check build status
npx eas-cli build:list
# or
npm run build:list

# 5. Install on device (if connected)
adb install app.apk

# 6. Check logs
adb logcat | findstr /i "maps error"
```

## Summary of Changes

✅ **What's New:**
- Added Google Maps API key configuration to `app.json`
- Added `GOOGLE_MAPS_API_KEY` to `eas.json` environment variables
- Updated code to use API key from app.json first, then backend

✅ **What Stays the Same:**
- Build process: `npm run build:android:preview` or `npm run build:android:production`
- Download from EAS Dashboard
- Installation process

## Next Steps

1. ✅ Set `GOOGLE_MAPS_API_KEY` secret in EAS (Step 3)
2. ✅ Build APK using your usual method (Step 5)
3. ✅ Test maps in the APK (Step 9)
4. ✅ If maps work, you're done! 🎉
5. ✅ If maps don't work, check debug steps (Step 10)

