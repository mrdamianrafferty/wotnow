import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'eu.fishfindr.app',
  appName: 'Findr',
  webDir: '.capacitor-assets',

  server: {
    // PRODUCTION: Load content from Vercel
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
      backgroundColor: '#111827',  // Findr dark (gray-900)
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#0ea5e9',  // Cyan (sky-500)
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
