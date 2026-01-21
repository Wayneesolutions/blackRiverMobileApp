# iOS Installation Guide - Black River Logistics Driver App

## 📱 How to Install the iOS App on Your iPhone

Your build is complete and available at:
**Build URL:** https://expo.dev/artifacts/eas/mJgpMVPwHLK3BNi7rA1pYF.ipa

---

## Method 1: TestFlight (Recommended for Distribution) 🎯

### Step 1: Submit Build to TestFlight

1. **Open PowerShell/Terminal** in the `DriverMobileApp` directory

2. **Submit the latest build:**
   ```powershell
   cd DriverMobileApp
   eas submit --platform ios --latest
   ```
   
   Or submit a specific build ID:
   ```powershell
   eas submit --platform ios --id a7dd8227-8878-4840-9126-1eb7cee6a7d3
   ```

3. **Follow the prompts:**
   - Login with your Expo account
   - Select your Apple App Store Connect credentials
   - Wait for upload to complete (this may take 5-10 minutes)

### Step 2: Wait for Processing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to: **My Apps** → **Black River Logistics** → **TestFlight** tab
3. Wait for processing (usually 10-30 minutes). The build status will change from "Processing" to "Ready to Test"

### Step 3: Add Internal Testers (Optional)

1. In TestFlight, go to **Internal Testing**
2. Click **+** to add internal testers
3. Add your Apple ID email (wayneesolutions@gmail.com)
4. The build will be automatically available to internal testers

### Step 4: Add Yourself as Internal Tester (Required!)

**Important:** If TestFlight shows "Ready To Test" with no apps, you need to add yourself as a tester first.

#### Option A: Add Internal Tester in App Store Connect

1. **Go to App Store Connect:**
   - Visit: https://appstoreconnect.apple.com
   - Sign in with your Apple ID (wayneesolutions@gmail.com)

2. **Navigate to TestFlight:**
   - Click **"My Apps"**
   - Select **"Black River Logistics"**
   - Click the **"TestFlight"** tab at the top

3. **Add Internal Testers:**
   - Click **"Internal Testing"** in the left sidebar
   - Click the **"+"** button (or "Add Testers" button)
   - Enter your Apple ID email: **wayneesolutions@gmail.com**
   - Click **"Add"** or **"Invite"**
   - Save the changes

4. **Wait 1-2 minutes** for the invitation to sync

5. **Refresh TestFlight on your iPhone:**
   - Force close the TestFlight app (swipe up from bottom, swipe up on TestFlight)
   - Reopen TestFlight
   - The Black River Logistics app should now appear automatically

#### Option B: Get TestFlight Public Link

1. **In App Store Connect:**
   - Go to **TestFlight** tab → **External Testing**
   - Click **"+"** to create a new external testing group
   - Name it (e.g., "Beta Testers")
   - Add your build to the group
   - Enable **"Public Link"** if available
   - Copy the public link

2. **On your iPhone:**
   - Open the public link in Safari
   - It will open in TestFlight automatically
   - Tap **"Accept"** to join

### Step 5: Install on iPhone

1. **Open TestFlight app** on your iPhone

2. **You should now see** "Black River Logistics" app in the list

3. **Tap on the app**

4. **Tap "Install"** button

5. **Wait for installation** to complete

6. **Launch the app** from your home screen (it will appear after installation)

---

## Method 2: Direct Installation via Safari (Quick Testing) ⚡

**Note:** This method requires an **ad-hoc build** (not distribution). You'll need to rebuild with ad-hoc distribution.

### Option A: Rebuild with Ad-Hoc Distribution (For Direct Installation)

1. **Update eas.json** to add an ad-hoc build profile:
   ```json
   "preview": {
     "distribution": "internal",
     "ios": {
       "distribution": "ad-hoc"
     },
     "android": {
       "buildType": "apk"
     }
   }
   ```

2. **Build with ad-hoc profile:**
   ```powershell
   cd DriverMobileApp
   eas build --platform ios --profile preview
   ```

3. **Download the .ipa file** from the build URL

4. **Transfer to iPhone** via:
   - AirDrop (if using Mac)
   - iTunes/Finder (on Mac with iOS 13+)
   - Install via Safari (requires special setup)

### Option B: Use EAS Build Download + Third-Party Tool

1. **Download the .ipa file:**
   - Visit: https://expo.dev/artifacts/eas/mJgpMVPwHLK3BNi7rA1pYF.ipa
   - Save it to your computer

2. **Install using:**
   - **AltStore** (requires AltServer on Mac/Windows)
   - **Sideloadly** (Windows/Mac tool)
   - **3uTools** (Windows/Mac)

---

## Method 3: Using Xcode (For Developers) 💻

**Prerequisites:** Mac with Xcode installed

1. **Download the .ipa file** from the build URL

2. **Open Xcode** → **Window** → **Devices and Simulators**

3. **Connect your iPhone** via USB

4. **Select your iPhone** in the left sidebar

5. **Drag and drop the .ipa file** onto the "Installed Apps" section

6. **Trust the developer certificate** on your iPhone:
   - Settings → General → VPN & Device Management
   - Tap on the developer certificate
   - Tap "Trust"

---

## Method 4: App Store Distribution (For Production) 🚀

1. **Submit to App Store:**
   ```powershell
   cd DriverMobileApp
   eas submit --platform ios --latest
   ```

2. **In App Store Connect:**
   - Go to **My Apps** → **Black River Logistics**
   - Go to **App Store** tab (not TestFlight)
   - Create a new version or edit existing
   - Select the build you just submitted
   - Fill in app information (screenshots, description, etc.)
   - Submit for review

3. **Wait for Apple Review** (typically 1-3 days)

4. **Once approved**, your app will be live on the App Store

---

## Quick Reference Commands 📋

```powershell
# Submit latest build to TestFlight
cd DriverMobileApp
eas submit --platform ios --latest

# View all builds
eas build:list --platform ios

# Download a specific build
eas build:view <build-id>

# Check submission status
eas submit:list --platform ios
```

---

## Troubleshooting 🔧

### Issue: "No builds found"
- Make sure you're in the correct directory (`DriverMobileApp`)
- Check your Expo account: `eas whoami`

### Issue: "Build not processing in TestFlight"
- Wait 30-60 minutes for Apple to process
- Check App Store Connect for error messages
- Verify your Apple Developer account is active

### Issue: "Cannot install on iPhone"
- Make sure you're using the correct Apple ID
- Check that your iPhone's iOS version is compatible
- Verify the app is signed correctly

### Issue: "Untrusted Developer"
- Go to: Settings → General → VPN & Device Management
- Find and trust the developer certificate

---

## Current Build Details 📦

- **Build ID:** a7dd8227-8878-4840-9126-1eb7cee6a7d3
- **Build Number:** 3
- **Bundle ID:** com.blackriverlogistics.app
- **Distribution:** App Store (Production)
- **Download URL:** https://expo.dev/artifacts/eas/mJgpMVPwHLK3BNi7rA1pYF.ipa
- **Status:** ✅ Complete

---

## Next Steps 🎯

**For immediate testing:**
1. Use **Method 1 (TestFlight)** - Submit with `eas submit --platform ios --latest`
2. Wait for processing in App Store Connect
3. Install via TestFlight app

**For production release:**
1. Use **Method 4 (App Store)** - Same submission process, then create App Store listing

**Questions or issues?**
- Check Expo docs: https://docs.expo.dev/submit/ios/
- EAS Submit docs: https://docs.expo.dev/submit/introduction/

