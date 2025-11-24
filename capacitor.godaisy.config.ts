import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.godaisy.app',
  appName: 'Go Daisy',
  webDir: '.capacitor-assets-godaisy',

  // Version info (synced manually with package.json + Xcode build settings)
  // Version: 1.0.0 (Build: 1)

  server: {
    // Hybrid shell loads live web experience from Vercel
    url: 'https://godaisy.io',
    cleartext: false,
    // To debug locally, override with LAN IP + cleartext true
    // url: 'http://192.168.1.X:3000',
    // cleartext: true,
  },

  // Deep-link schemes for OAuth callbacks and SSO handoff
  ios: {
    scheme: 'godaisy',
  },
  android: {
    scheme: 'godaisy',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#0284c7',
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
