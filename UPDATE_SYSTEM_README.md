# In-App Update System for Expo React Native App

This implementation provides a comprehensive in-app update system for your Expo React Native app, supporting both binary updates (Play Store/App Store) and Over-the-Air (OTA) updates.

## Features

### 1. **Automatic Update Checking**
- Checks for updates automatically on app launch
- Supports both OTA and binary updates
- Non-intrusive user experience

### 2. **Over-the-Air (OTA) Updates**
- Uses `expo-updates` for JavaScript bundle updates
- Automatic checking with `checkAutomatically: "ON_LOAD"`
- Seamless update experience without app store

### 3. **Binary Updates (Play Store/App Store)**
- Redirects users to appropriate app store
- Supports both Android (Play Store) and iOS (App Store)
- Graceful fallback to web store if app is not available

## Installation

The required dependencies are already installed:
```bash
npm install expo-updates expo-application
```

## Configuration

### app.json Configuration

The `app.json` has been updated with the following expo-updates configuration:

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    }
  }
}
```

## Usage

### 1. Automatic Update Checking

The update checker is automatically integrated into `App.js` and runs on app launch:

```javascript
import { checkForAppUpdates } from "./src/utils/updateChecker";

// In your App.js useEffect
useEffect(() => {
  loadFonts();
  checkForAppUpdates(); // Automatically checks for updates
}, []);
```

### 2. Manual Update Checking

You can also manually trigger update checks using the provided utility functions:

```javascript
import { 
  forceCheckForUpdates, 
  getAppVersionInfo, 
  isRunningLatestUpdate 
} from './src/utils/updateChecker';

// Force check for updates
await forceCheckForUpdates();

// Get current app version info
const versionInfo = getAppVersionInfo();

// Check if running latest update
const isLatest = await isRunningLatestUpdate();
```

### 3. Using the UpdateChecker Component

Include the `UpdateChecker` component in your Settings screen:

```javascript
import UpdateChecker from '../components/global/UpdateChecker';

// In your Settings screen
<UpdateChecker style={{ margin: 16 }} />
```

## API Reference

### `checkForAppUpdates()`
Main function that checks for both OTA and binary updates. Called automatically on app launch.

### `forceCheckForUpdates()`
Manually trigger update checking. Shows alert with update options.

### `getAppVersionInfo()`
Returns current app version information:
```javascript
{
  version: "1.0.1",
  buildVersion: "1",
  applicationId: "com.bestinfra.app",
  isDevice: true,
  platform: "android"
}
```

### `isRunningLatestUpdate()`
Returns `true` if running the latest available update, `false` otherwise.

## Configuration for Production

### For Binary Updates (Play Store/App Store)

1. **Android (Play Store)**:
   - Update the `package` name in `app.json` if needed
   - The system will automatically use the correct Play Store URL

2. **iOS (App Store)**:
   - Replace `'YOUR_APP_STORE_ID'` in `updateChecker.js` with your actual App Store ID
   - Find your App Store ID in App Store Connect

### For OTA Updates

1. **EAS Update Configuration**:
   ```bash
   # Install EAS CLI
   npm install -g @expo/eas-cli
   
   # Configure EAS
   eas update:configure
   ```

2. **Publishing Updates**:
   ```bash
   # Publish an update
   eas update --branch production --message "Bug fixes and improvements"
   ```

## User Experience

### OTA Updates
- User sees: "Update Available" alert
- Options: "Restart to Update" or "Later"
- Seamless update without leaving the app

### Binary Updates
- User sees: "Update Available" alert
- Options: "Update Now" or "Later"
- "Update Now" redirects to appropriate app store

## Error Handling

The system includes comprehensive error handling:
- Network errors during update checks
- Failed update downloads
- Store redirection failures
- Development mode detection

## Development vs Production

- **Development**: Update checking is disabled to prevent interference with development
- **Production**: Full update checking functionality is enabled

## Testing

### Testing OTA Updates
1. Build a production version of your app
2. Publish an update using EAS Update
3. Launch the app to see the update prompt

### Testing Binary Updates
1. Implement your version checking logic in `checkForBinaryUpdate()`
2. Compare current version with latest store version
3. Test the store redirection functionality

## Customization

### Customizing Update Messages
Edit the alert messages in `updateChecker.js`:

```javascript
Alert.alert(
  'Your Custom Title',
  'Your custom message here',
  [
    { text: 'Custom Later Text', style: 'cancel' },
    { text: 'Custom Update Text', onPress: updateFunction }
  ]
);
```

### Adding Version Comparison Logic
Implement your own version checking in `checkForBinaryUpdate()`:

```javascript
const checkForBinaryUpdate = async () => {
  try {
    const currentVersion = Application.nativeApplicationVersion;
    
    // Call your API to get latest version
    const response = await fetch('https://your-api.com/latest-version');
    const { latestVersion } = await response.json();
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      showBinaryUpdateAlert(Application.applicationId);
    }
  } catch (error) {
    console.error('Error checking for binary update:', error);
  }
};
```

## Troubleshooting

### Common Issues

1. **Updates not showing**: Ensure you're testing on a production build, not development
2. **Store redirection not working**: Check that the package name/App Store ID is correct
3. **OTA updates not applying**: Verify EAS Update configuration and network connectivity

### Debug Information

Use `getAppVersionInfo()` to get debug information about the current app state.

## Security Considerations

- Update checks only run in production builds
- All network requests are made over HTTPS
- User data is not transmitted during update checks
- Store redirections use official app store URLs only

## Performance

- Update checks are non-blocking and don't affect app startup time
- Checks are performed asynchronously
- Minimal network usage for version checking
- Efficient caching of update information
