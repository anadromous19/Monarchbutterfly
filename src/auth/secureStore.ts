export interface StorageAdapter {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

const memoryStore: Record<string, string> = {};

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const SecureStore = await import('expo-secure-store');
    if (SecureStore && SecureStore.getItemAsync) {
      return await SecureStore.getItemAsync(key);
    }
  } catch {
    // Fallback
  }
  return memoryStore[key] || null;
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store');
    if (SecureStore && SecureStore.setItemAsync) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch {
    // Fallback
  }
  memoryStore[key] = value;
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store');
    if (SecureStore && SecureStore.deleteItemAsync) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
  } catch {
    // Fallback
  }
  delete memoryStore[key];
}
