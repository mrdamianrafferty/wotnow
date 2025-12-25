import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.godaisy.app',
  appName: 'Go Daisy',
  webDir: '.capacitor-assets-godaisy',

  server: {
    // PRODUCTION: Load content from Vercel
    url: 'https://godaisy.io',
    cleartext: false,  // Force HTTPS

    // DEVELOPMENT: Uncomment to test locally
    // url: 'http://192.168.1.X:3000',
    // cleartext: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',  // Go Daisy dark blue (slate-900)
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#0284c7',  // Sky blue (sky-600)
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
