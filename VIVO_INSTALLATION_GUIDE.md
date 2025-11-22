# Vivo Z1 Pro APK Installation Guide

## Vivo-Specific Installation Steps

Vivo devices have additional security features that can block APK installation. Follow these steps:

### Step 1: Enable "Install Unknown Apps" for File Manager

**Vivo devices require specific steps:**

1. **Open Settings**
2. **Go to "Security"** or **"More Settings"** → **"Security"**
3. **Find "Unknown Sources"** or **"Install apps from unknown sources"**
4. **Enable it** (toggle ON)

**OR**

1. **Settings** → **Apps** → **Special app access** → **Install unknown apps**
2. **Select your File Manager** (Files, My Files, or Vivo File Manager)
3. **Toggle "Allow from this source"** to **ON**

### Step 2: Disable Vivo Security Scanner

Vivo has a built-in security scanner that can block installations:

1. **Settings** → **Security** → **Vivo Security** (or **iManager**)
2. **Turn OFF** "App Security Scan" or "Installation Security"
3. **Or** when installing, if you see a security warning, tap **"Install anyway"**

### Step 3: Disable Play Protect

1. **Open Google Play Store**
2. **Tap your profile** (top right)
3. **Play Protect** → **Settings**
4. **Turn OFF** "Scan apps with Play Protect"
5. Try installing again
6. (You can turn it back on after installation)

### Step 4: Install via Vivo File Manager

Vivo devices work best with their own file manager:

1. **Download the APK** to your device
2. **Open "Files"** or **"My Files"** app (Vivo's file manager)
3. **Navigate to Downloads**
4. **Tap the APK file**
5. **Tap "Install"**
6. If you see a security warning, tap **"Install anyway"** or **"Continue"**

### Step 5: Check Storage Permission

1. **Settings** → **Apps** → **Files** (or your file manager)
2. **Permissions** → **Storage**
3. **Make sure it's enabled**

### Step 6: Clear Package Installer Cache

1. **Settings** → **Apps** → **Show system apps**
2. **Find "Package Installer"** or **"Package Manager"**
3. **Storage** → **Clear cache**
4. **Try installing again**

## Common Vivo-Specific Issues

### Issue: "App not installed" or "Installation failed"

**Solutions:**
1. **Check available storage** - Vivo Z1 Pro needs at least 200MB free
2. **Uninstall any previous version** first:
   - Settings → Apps → Find "Black River Logistics" → Uninstall
3. **Restart your device** and try again
4. **Try installing from a different location** (Internal storage instead of SD card)

### Issue: "Blocked by security" or "Malicious app detected"

**Solutions:**
1. **Disable Vivo Security Scanner** (Step 2 above)
2. **Disable Play Protect** (Step 3 above)
3. **Install via ADB** (see below)

### Issue: "Package appears to be invalid"

**Solutions:**
1. **Re-download the APK** - The file might be corrupted
2. **Check file size** - Should be around 30-50MB
3. **Try downloading on WiFi** instead of mobile data

## Alternative: Install via ADB (Most Reliable)

If direct installation doesn't work, use ADB:

### Prerequisites:
- USB cable
- Computer with ADB installed
- USB debugging enabled on phone

### Steps:

1. **Enable Developer Options:**
   - Settings → About phone
   - Tap "Software version" or "Build number" **7 times**
   - Go back → **More settings** → **Developer options**

2. **Enable USB Debugging:**
   - Settings → More settings → Developer options
   - Enable **"USB debugging"**
   - Enable **"Install via USB"** (if available)

3. **Connect to Computer:**
   ```bash
   # On your computer
   adb devices  # Verify device is connected
   adb install path/to/your-app.apk
   ```

## Vivo Z1 Pro Specific Settings

**Android Version:** Vivo Z1 Pro runs Android 9.0 (Pie) or higher

**Additional Steps:**
1. **Settings** → **More settings** → **Application management**
2. **Special access** → **Install unknown apps**
3. **Enable for your File Manager**

## Still Not Working?

### Try These:

1. **Check Android Version:**
   - Settings → About phone → Android version
   - Should be Android 6.0 or higher (Vivo Z1 Pro should be fine)

2. **Check Available Storage:**
   - Settings → Storage
   - Ensure at least 200MB free space

3. **Try Different File Manager:**
   - Use "Files by Google" from Play Store
   - Enable "Install unknown apps" for it
   - Try installing through it

4. **Contact Support:**
   - Device model: Vivo Z1 Pro
   - Android version: [Check in Settings]
   - Exact error message: [Take screenshot]

## Quick Checklist for Vivo Z1 Pro

- [ ] Unknown sources enabled in Security settings
- [ ] Vivo Security Scanner disabled
- [ ] Play Protect disabled
- [ ] File Manager has "Install unknown apps" permission
- [ ] At least 200MB free storage
- [ ] Previous version uninstalled (if any)
- [ ] Package Installer cache cleared
- [ ] Device restarted

## Recommended: Use ADB Installation

For Vivo devices, ADB installation is often the most reliable method:

```bash
# On your computer
adb install -r your-app.apk
```

The `-r` flag allows reinstallation if app already exists.

