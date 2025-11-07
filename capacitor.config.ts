import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'eu.fishfindr.app',
  appName: 'Findr',
  webDir: '.capacitor-assets',

  // Version info (synced with package.json, iOS project, Android gradle)
  // Version: 1.0.0 (Build: 1)

  server: {
    // PRODUCTION: Load content from Vercel
    // This hybrid architecture keeps all API routes on the server (secure)
    url: 'https://fishfindr.eu',
    cleartext: false,  // Force HTTPS

    // DEVELOPMENT: Uncomment to test locally
    // url: 'http://192.168.1.X:3000',
    // cleartext: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#111827',  // Findr dark theme
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#0ea5e9',  // Findr primary blue
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
