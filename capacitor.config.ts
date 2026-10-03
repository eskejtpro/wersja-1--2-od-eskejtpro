import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymtracker.pro',
  appName: 'PlanPasika.v2',
  webDir: 'dist',
  backgroundColor: '#000000',
  loggingBehavior: 'none',
  server: {
    androidScheme: 'https',
  },
  android: {
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#000000'
  },
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false
      }
    },
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
