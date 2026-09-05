import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.godaisy.app',
  appName: 'Go Daisy',
  webDir: '.capacitor-assets-godaisy',

  // Tag the native WebView UA so the remotely-loaded site can tell it's the
  // installed app (matched by /Capacitor|wotnow-app|godaisy-app/i in
  // pages/index.tsx). Without this the native app is treated as a plain
  // browser and can be shown the marketing landing page.
  appendUserAgent: 'godaisy-app',

  server: {
    // PRODUCTION: Load content from Vercel
    url: 'https://godaisy.io',
    errorPath: 'index.html',
    cleartext: false,  // Force HTTPS

    // DEVELOPMENT: Uncomment to test locally
    // url: 'http://192.168.1.X:3000',
    // cleartext: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1c1917',  // "The Call" ink (--call-ink-1) — matches the Trailhead splash's base tone
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#b8860b',  // "The Call" amber (--call-amber)
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    PushNotifications: {
      /*
       * NO BADGE. There is nothing for a number to count.
       *
       * Go Daisy sends one message a day and that message IS the product —
       * tapping it opens the call, which is the whole of what it had to say.
       * There is no inbox behind it and no unread state, so a red 1 on the
       * icon would be counting something that does not exist and asking to be
       * cleared by opening an app the person had already decided not to open.
       *
       * `sound` and `alert` stay: the notification should arrive properly when
       * the app is in the foreground. It is only the icon badge that is wrong.
       */
      presentationOptions: ['sound', 'alert'],
    },
  },
};

export default config;
