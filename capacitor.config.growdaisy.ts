import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.growdaisy.app',
  appName: 'Grow Daisy',
  webDir: '.capacitor-assets-growdaisy',

  // Version info (synced with package.json, iOS project, Android gradle)
  // Version: 1.0.0 (Build: 1)

  server: {
    // PRODUCTION: Load content from subdomain (can later point to growdaisy.io)
    // This hybrid architecture keeps all API routes on the server (secure)
    url: 'https://grow.godaisy.io',
    errorPath: 'index.html',
    cleartext: false,  // Force HTTPS

    // DEVELOPMENT: Uncomment to test locally
    // url: 'http://192.168.1.X:3000/grow',
    // cleartext: true,
  },

  // Deep linking configuration for OAuth callbacks
  // URL schemes are configured in native projects:
  // - iOS: ios-growdaisy/App/App/Info.plist (CFBundleURLSchemes = growdaisy)
  // - Android: android-growdaisy/app/src/main/AndroidManifest.xml (android:scheme = growdaisy)

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#065f46',  // Emerald dark (garden theme)
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#10b981',  // Emerald primary
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      // For garden reminders (watering, harvesting, etc.)
      smallIcon: 'ic_stat_icon',
      iconColor: '#10b981',
    },
  },
};

export default config;
