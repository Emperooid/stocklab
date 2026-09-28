import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PHONE_KEY = 'crowdstock-biometric-phone';
const PASSWORD_KEY = 'crowdstock-biometric-password';

export interface SavedCredentials {
  phone: string;
  password: string;
}

/** Whether this device has biometric hardware set up (Face ID, fingerprint, etc.). */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch {
    // On simulators / Expo Go / platforms without the native module wired up,
    // these can throw — treat that as "not available" rather than crashing,
    // so the login screen just falls back to password instead of hiding the
    // biometric button behind an unhandled rejection.
    return false;
  }
}

/** Prompts Face ID / fingerprint / device PIN. Resolves true only on success. */
export async function authenticateWithBiometric(reason = 'Log in to CrowdStock'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    disableDeviceFallback: false,
  });
  return result.success;
}

/** Stores phone+password behind the device's secure enclave / keystore, for biometric-gated login. */
export async function saveCredentials(phone: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(PHONE_KEY, phone);
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function getSavedCredentials(): Promise<SavedCredentials | null> {
  const [phone, password] = await Promise.all([
    SecureStore.getItemAsync(PHONE_KEY),
    SecureStore.getItemAsync(PASSWORD_KEY),
  ]);
  if (!phone || !password) return null;
  return { phone, password };
}

export async function clearSavedCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(PHONE_KEY);
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
}
