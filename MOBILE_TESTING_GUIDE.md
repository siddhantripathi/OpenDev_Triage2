# Mobile Testing Guide for OpenDev Triage

## ⚠️ Pre-Testing Requirements

### 1. Bundle Identifier Issue (MUST FIX FIRST!)
Your bundle identifiers are mismatched between configuration files:
- **app.json**: `com.opendevtriage.app`
- **iOS (GoogleService-Info.plist)**: `com.Sid.OpenDevTriage`
- **Android (google-services.json)**: `com.OpenDevTriage.app`

**Choose ONE bundle identifier and update everywhere:**

Option A: Use `com.opendevtriage.app` (recommended)
- Update Firebase console to generate new `GoogleService-Info.plist` and `google-services.json` with this bundle ID
- Or update `app.json` to match existing Firebase config

Option B: Use existing Firebase bundle IDs
- Update `app.json` iOS bundleIdentifier to `com.Sid.OpenDevTriage`
- Update `app.json` Android package to `com.OpenDevTriage.app`

### 2. n8n Webhook URL for Mobile Testing

**Problem**: `localhost:5678` doesn't work on mobile devices

**Solution Options**:

#### Option A: Use ngrok (Recommended for Testing)
1. Install ngrok: https://ngrok.com/download
2. Start your n8n instance: (make sure it's running)
3. In a new terminal, run:
   ```bash
   ngrok http 5678
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)
5. Update `.env`:
   ```
   EXPO_PUBLIC_N8N_WEBHOOK_URL=https://abc123.ngrok-free.app/webhook/OpenDev_Triage
   ```

#### Option B: Deploy n8n to Cloud
Deploy to services like:
- Railway (https://railway.app)
- Render (https://render.com)
- DigitalOcean App Platform
- Heroku

---

## 📱 Testing on iOS

### Prerequisites
- Mac computer with Xcode installed
- iOS device OR iOS Simulator
- Expo Go app installed (for quick testing) OR ability to create development build

### Method 1: Expo Go (Quick Testing)
**Note**: Expo Go has limitations with Google Sign-In due to custom native modules.

1. Install Expo Go on your iOS device from App Store
2. Start the development server:
   ```bash
   npm run ios
   # or if on physical device:
   npm start
   ```
3. Scan the QR code with your iPhone camera
4. App will open in Expo Go

**Limitation**: Google OAuth may not work fully in Expo Go. Use Method 2 for full testing.

### Method 2: Development Build (Full Testing - RECOMMENDED)
This creates a standalone app with all native features.

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure EAS:
   ```bash
   eas build:configure
   ```

4. Create iOS development build:
   ```bash
   eas build --profile development --platform ios
   ```

5. Install on device or simulator:
   - For device: Download IPA and install via Xcode or Apple Configurator
   - For simulator: Use the provided simulator URL

6. Start the dev server:
   ```bash
   npm start --dev-client
   ```

### Testing Checklist - iOS
- [ ] App launches successfully
- [ ] "Sign in with Google" button appears
- [ ] Google sign-in popup opens
- [ ] After sign-in, user profile is visible
- [ ] "Connect GitHub Account" button appears after Google sign-in
- [ ] Can select a repository
- [ ] Can trigger analysis (requires n8n URL to be accessible)
- [ ] Analysis results display correctly
- [ ] Can view analysis history
- [ ] Profile screen shows user info

---

## 🤖 Testing on Android

### Prerequisites
- Android Studio installed
- Android device with USB debugging enabled OR Android Emulator
- Expo Go app (for quick testing) OR ability to create development build

### Method 1: Expo Go (Quick Testing)

1. Install Expo Go from Google Play Store
2. Enable USB debugging on Android device
3. Start the development server:
   ```bash
   npm run android
   ```
4. Scan QR code in Expo Go app

**Limitation**: Google OAuth may not work fully in Expo Go. Use Method 2 for full testing.

### Method 2: Development Build (Full Testing - RECOMMENDED)

1. Create Android development build:
   ```bash
   eas build --profile development --platform android
   ```

2. Install APK on device:
   - Download APK from EAS build page
   - Install on device or emulator
   - Or use: `adb install path/to/app.apk`

3. Start the dev server:
   ```bash
   npm start --dev-client
   ```

### Testing Checklist - Android
- [ ] App launches successfully
- [ ] "Sign in with Google" button appears
- [ ] Google sign-in popup opens
- [ ] After sign-in, user profile is visible
- [ ] "Connect GitHub Account" button appears after Google sign-in
- [ ] Can select a repository
- [ ] Can trigger analysis (requires n8n URL to be accessible)
- [ ] Analysis results display correctly
- [ ] Can view analysis history
- [ ] Profile screen shows user info

---

## 🔧 Troubleshooting

### Google Sign-In Not Working

**iOS Issues:**
1. Verify `GoogleService-Info.plist` is present
2. Check bundle identifier matches Firebase console
3. Ensure iOS Client ID is correct in `.env`
4. Check Firebase Console → Authentication → Sign-in method → Google is enabled

**Android Issues:**
1. Verify `google-services.json` is present
2. Check package name matches Firebase console
3. Ensure Android Client ID is correct in `.env`
4. Get SHA-1 fingerprint and add to Firebase:
   ```bash
   # For debug build:
   cd android
   ./gradlew signingReport
   ```
5. Add SHA-1 to Firebase Console → Project Settings → Your Android app

### n8n Connection Failing

**Error**: "Cannot connect to n8n"
- **Solution**: Make sure n8n URL is accessible from mobile device (use ngrok or cloud deployment)

**Error**: "n8n webhook not found"
- **Solution**: Verify webhook endpoint is active in n8n workflow

**Error**: "Network request failed"
- **Solution**: Check if mobile device can access the n8n URL (try opening in mobile browser)

### Build Errors

**Error**: "Bundle identifier mismatch"
- **Solution**: Update all config files to use same bundle identifier

**Error**: "Module not found: expo-auth-session"
- **Solution**: Run `npm install` to ensure all dependencies are installed

---

## 🧪 Testing Script

Quick test commands:

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm start

# 3. For iOS (Mac only)
npm run ios

# 4. For Android
npm run android

# 5. For web (to compare behavior)
npm run web
```

---

## 📊 Core Functionality Test Cases

### 1. Authentication Flow
1. Open app → Should show login screen
2. Tap "Sign in with Google" → Google auth popup appears
3. Select Google account → Returns to app
4. Should see home screen with "Connect GitHub Account" button

### 2. n8n API Communication
1. After authentication, tap "Connect GitHub Account"
2. Authorize GitHub access
3. Select a repository from the list
4. Tap "Analyze Repository"
5. Should see loading indicator
6. Analysis results should appear within 30-90 seconds
7. Results should show:
   - Repository name
   - List of issues found
   - Analysis prompt/summary

### 3. Data Persistence
1. Complete an analysis
2. Navigate to "History" tab
3. Should see previous analysis
4. Tap on history item → Should show details
5. Close app and reopen
6. User should still be logged in
7. History should persist

---

## 🚀 Next Steps

1. ✅ Fix bundle identifier mismatch
2. ✅ Set up ngrok for n8n (or deploy to cloud)
3. ✅ Update `.env` with ngrok URL
4. ✅ Create iOS development build with EAS
5. ✅ Create Android development build with EAS
6. ✅ Test on both platforms
7. ✅ Document any issues found
8. ✅ Fix issues and retest

---

## 📝 Notes

- **Expo Go limitations**: Full native features (like proper Google OAuth) require development builds
- **Network accessibility**: Mobile devices need network-accessible URLs (not localhost)
- **Firebase configuration**: Ensure all bundle identifiers and package names match
- **Testing frequency**: Test on both iOS and Android before major releases

