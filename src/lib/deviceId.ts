import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'stocklab-device-id';

/** A stable per-install identifier, persisted locally. Used as the `deviceid` header the backend expects. */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) return existing;

  const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(KEY, id);
  return id;
}
