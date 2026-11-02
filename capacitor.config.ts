import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.loodi.app',
  appName: 'LOODI',
  webDir: 'mobile/dist',
  ios: { contentInset: 'never', backgroundColor: '#f6f3ed' },
};
export default config;
