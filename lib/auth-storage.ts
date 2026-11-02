import { Capacitor } from '@capacitor/core';

// Native credentials stay in the device Keychain; never fall back to plain text.
async function nativeStore() {
  const { SecureStorage, KeychainAccess } = await import('@aparajita/capacitor-secure-storage');
  return { SecureStorage, KeychainAccess };
}
export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    if (!Capacitor.isNativePlatform()) return window.localStorage.getItem(key);
    const { SecureStorage, KeychainAccess } = await nativeStore();
    const saved = await SecureStorage.get(key, false, false);
    if (typeof saved === 'string') { window.localStorage.removeItem(key); return saved; }
    const legacy = window.localStorage.getItem(key);
    if (legacy) {
      await SecureStorage.set(key, legacy, false, false, KeychainAccess.whenUnlockedThisDeviceOnly);
      window.localStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    if (!Capacitor.isNativePlatform()) { window.localStorage.setItem(key, value); return; }
    const { SecureStorage, KeychainAccess } = await nativeStore();
    await SecureStorage.set(key, value, false, false, KeychainAccess.whenUnlockedThisDeviceOnly);
    window.localStorage.removeItem(key);
  },
  async removeItem(key: string) {
    if (typeof window === 'undefined') return;
    if (Capacitor.isNativePlatform()) { const { SecureStorage } = await nativeStore(); await SecureStorage.remove(key, false); }
    window.localStorage.removeItem(key);
  },
};
