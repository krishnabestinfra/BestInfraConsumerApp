/**
 * Detect if app is running in Expo Go.
 * Remote push was removed from Expo Go in SDK 53 — use a development build for push.
 */
import Constants from 'expo-constants';

export const isRunningInExpoGo = () => Constants.appOwnership === 'expo';
