# Android Build Troubleshooting Guide

## Quick Fix Commands

### Method 1: Use the Automated Build Script (Recommended)
```bash
# Make the build script executable
chmod +x build-android.js

# Run the complete build process
npm run build:android
```

### Method 2: Manual Step-by-Step Process
```bash
# 1. Clean everything
npm run clean

# 2. Setup dependencies
npm run setup

# 3. Generate bundle manually
npm run bundle-android

# 4. Build APK
npm run build:android-debug
```

### Method 3: Using EAS Build (Cloud)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Build in the cloud
npm run build:android-eas
```

## Common Issues and Solutions

### Issue 1: "Unable to load script" Error
**Cause**: Metro bundler not running or bundle not generated
**Solution**:
```bash
# Start Metro in one terminal
npm run metro

# In another terminal, build the app
npm run build:android-debug
```

### Issue 2: Bundle not found
**Cause**: Bundle file not generated in correct location
**Solution**:
```bash
# Check if bundle exists
ls -la android/app/src/main/assets/

# If not, generate it manually
npm run bundle-android
```

### Issue 3: Metro cache issues
**Cause**: Stale Metro cache
**Solution**:
```bash
# Clear all caches
npm run clean

# Restart Metro with fresh cache
npm run metro
```

### Issue 4: Android device not detected
**Cause**: ADB not running or device not connected
**Solution**:
```bash
# Check connected devices
adb devices

# If no devices, restart ADB
adb kill-server
adb start-server

# For emulator, start it first
emulator -avd <your_avd_name>
```

### Issue 5: Gradle build failures
**Cause**: Android build tools issues
**Solution**:
```bash
# Clean Gradle cache
cd android
./gradlew clean
cd ..

# Rebuild
npm run build:android-debug
```

## Build Variants

### Debug Build (Development)
```bash
npm run build:android-debug
```
- Includes debugging symbols
- Uses Metro bundler
- Faster build time

### Release Build (Production)
```bash
npm run build:android-release
```
- Optimized and minified
- Uses pre-generated bundle
- Slower build time but smaller APK

### EAS Build (Cloud)
```bash
npm run build:android-eas
```
- Built in Expo's cloud infrastructure
- No local Android SDK required
- Best for CI/CD

## File Locations

- **APK Output**: `android/app/build/outputs/apk/debug/`
- **Bundle File**: `android/app/src/main/assets/index.android.bundle`
- **Assets**: `android/app/src/main/res/`

## Environment Requirements

- Node.js 16+ 
- npm or yarn
- Android SDK
- Android Build Tools
- Java Development Kit (JDK) 11+

## Still Having Issues?

1. **Check Metro logs**: Look for specific error messages in the Metro terminal
2. **Check Android logs**: Use `adb logcat` to see device logs
3. **Verify dependencies**: Run `npm run setup` to fix dependency issues
4. **Clean everything**: Run `npm run clean` and try again

## Debug Mode

To run in debug mode with Metro:
```bash
# Terminal 1: Start Metro
npm run metro

# Terminal 2: Run on device
npm run android
```

This allows for hot reloading and debugging.

