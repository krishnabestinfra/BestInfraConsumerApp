import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { forceCheckForUpdates, getAppVersionInfo, isRunningLatestUpdate } from '../../utils/updateChecker';

/**
 * Update Checker Component
 * Can be used in Settings screen or anywhere you want manual update checking
 */
const UpdateChecker = ({ style }) => {
  const { getScaledFontSize } = useTheme();
  const s18 = getScaledFontSize(18);
  const s14 = getScaledFontSize(14);
  const s16 = getScaledFontSize(16);
  const [isChecking, setIsChecking] = React.useState(false);
  const [versionInfo, setVersionInfo] = React.useState(null);

  React.useEffect(() => {
    // Get version info when component mounts
    const info = getAppVersionInfo();
    setVersionInfo(info);
  }, []);

  const handleForceCheck = async () => {
    setIsChecking(true);
    try {
      await forceCheckForUpdates();
    } catch (error) {
      Alert.alert('Error', 'Failed to check for updates. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckLatest = async () => {
    try {
      const isLatest = await isRunningLatestUpdate();
      if (isLatest) {
        Alert.alert('Up to Date', 'You are running the latest version of the app.');
      } else {
        Alert.alert('Update Available', 'A new version is available. Please restart the app to update.');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to check update status.');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { fontSize: s18 }]}>App Updates</Text>
      
      {versionInfo && (
        <View style={styles.versionInfo}>
          <Text style={[styles.versionText, { fontSize: s14 }]}>Version: {versionInfo.version}</Text>
          <Text style={[styles.buildText, { fontSize: s14 }]}>Build: {versionInfo.buildVersion}</Text>
          <Text style={[styles.platformText, { fontSize: s14 }]}>Platform: {versionInfo.platform}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.button, isChecking && styles.buttonDisabled]} 
        onPress={handleForceCheck}
        disabled={isChecking}
      >
        <Text style={[styles.buttonText, { fontSize: s16 }]}>
          {isChecking ? 'Checking...' : 'Check for Updates'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]} 
        onPress={handleCheckLatest}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText, { fontSize: s16 }]}>
          Check Update Status
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  versionInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buildText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  platformText: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});

export default UpdateChecker;
