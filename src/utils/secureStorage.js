/**
 * Secure storage for sensitive data (tokens).
 * Uses expo-secure-store when available; falls back to AsyncStorage otherwise.
 * Enterprise apps must protect access/refresh tokens.
 */

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SENSITIVE_KEYS = [
  "access_token",
  "refresh_token",
  "token_expiry",
];

let useSecureStore = null;

async function isSecureStoreAvailable() {
  if (useSecureStore !== null) return useSecureStore;
  try {
    await SecureStore.setItemAsync("__test__", "1");
    await SecureStore.deleteItemAsync("__test__");
    useSecureStore = true;
  } catch {
    useSecureStore = false;
  }
  return useSecureStore;
}

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.includes(key);
}

/**
 * Get item. Sensitive keys use SecureStore; others use AsyncStorage.
 * Migrates from AsyncStorage to SecureStore on first read for sensitive keys.
 */
export async function getItem(key) {
  const sensitive = isSensitiveKey(key);
  if (sensitive && (await isSecureStoreAvailable())) {
    try {
      let value = await SecureStore.getItemAsync(key);
      if (value == null) {
        value = await AsyncStorage.getItem(key);
        if (value != null) {
          await SecureStore.setItemAsync(key, value);
          await AsyncStorage.removeItem(key);
        }
      }
      return value;
    } catch (e) {
      if (__DEV__) console.warn("[secureStorage] SecureStore get failed, falling back:", e?.message);
      return await AsyncStorage.getItem(key);
    }
  }
  return await AsyncStorage.getItem(key);
}

/**
 * Set item. Sensitive keys use SecureStore; others use AsyncStorage.
 */
export async function setItem(key, value) {
  const sensitive = isSensitiveKey(key);
  if (sensitive && (await isSecureStoreAvailable())) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch (e) {
      if (__DEV__) console.warn("[secureStorage] SecureStore set failed, falling back:", e?.message);
    }
  }
  await AsyncStorage.setItem(key, value);
}

/**
 * Remove item from both stores.
 */
export async function removeItem(key) {
  try {
    if (await isSecureStoreAvailable()) await SecureStore.deleteItemAsync(key);
  } catch (_) {}
  await AsyncStorage.removeItem(key);
}

/**
 * Remove multiple items (e.g. token keys).
 */
export async function multiRemove(keys) {
  await Promise.all(keys.map((k) => removeItem(k)));
}
