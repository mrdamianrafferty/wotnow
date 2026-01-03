import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'eu.fishfindr.app',
  appName: 'Findr',
  webDir: '.capacitor-assets',

  // Server URL with offline fallback
  server: {
    url: 'https://fishfindr.eu/findr',
    // When server unreachable, load offline shell from webDir
    errorPath: 'index.html',
    cleartext: false,
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
