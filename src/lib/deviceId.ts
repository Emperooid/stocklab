import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'stocklab-device-id';

// Cached in-memory once resolved, and single-flighted while resolving —
// without this, several API calls firing at app startup (before AsyncStorage
// has been written) could each independently "not find" an existing id and
// generate their own, so the same app instance would send different
// deviceid values on different requests within the same session. That would
// make the backend's ValidateDeviceId() check fail unpredictably.
let cached: string | null = null;
let inFlight: Promise<string> | null = null;

async function resolveDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) return existing;

  const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(KEY, id);
  return id;
}

/** A stable per-install identifier, persisted locally. Used as the `deviceid` header the backend expects. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = resolveDeviceId().then((id) => {
      cached = id;
      inFlight = null;
      return id;
    });
  }
  return inFlight;
}
