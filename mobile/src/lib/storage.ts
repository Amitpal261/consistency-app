import AsyncStorage from "@react-native-async-storage/async-storage";

function getWebStorage(): Storage | null {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function withWebFallback<T>(
  nativeOperation: () => Promise<T>,
  webFallback: () => T | Promise<T>
): Promise<T> {
  try {
    return await nativeOperation();
  } catch (error) {
    const webStorage = getWebStorage();
    if (!webStorage) {
      throw error;
    }
    return await Promise.resolve(webFallback());
  }
}

export async function getStoredItem(key: string): Promise<string | null> {
  return withWebFallback(
    () => AsyncStorage.getItem(key),
    () => getWebStorage()?.getItem(key) ?? null
  );
}

export async function getStoredJSON<T>(key: string): Promise<T | null> {
  const raw = await getStoredItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  await withWebFallback(
    () => AsyncStorage.setItem(key, value),
    () => {
      const webStorage = getWebStorage();
      if (webStorage) {
        webStorage.setItem(key, value);
      }
    }
  );
}

export async function setStoredJSON<T>(key: string, value: T): Promise<void> {
  await setStoredItem(key, JSON.stringify(value));
}

export async function removeStoredItem(key: string): Promise<void> {
  await withWebFallback(
    () => AsyncStorage.removeItem(key),
    () => {
      const webStorage = getWebStorage();
      if (webStorage) {
        webStorage.removeItem(key);
      }
    }
  );
}
