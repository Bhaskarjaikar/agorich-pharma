import type { CapacitorConfig } from '@capacitor/cli';

const PRODUCTION_DOMAIN = 'www.agorich.com';
const PRODUCTION_URL = `https://${PRODUCTION_DOMAIN}`;

const serverUrl = process.env.CAPACITOR_SERVER_URL || PRODUCTION_URL;
const isCleartext = serverUrl.startsWith('http://');

const capacitorConfig: CapacitorConfig = {
  appId: 'com.agorich.app',
  appName: 'Agorich Pharma',
  webDir: 'out',

  // Background color avoids the white flash during native boot and matches
  // the dark theme of the web app.
  backgroundColor: '#0b0f19',

  android: {
    // Allow mixed content (some WebView resources may be http in dev).
    allowMixedContent: true,
    // Keep the WebView background dark to avoid white flashes.
    backgroundColor: '#0b0f19',
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0b0f19',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },

  // Deep link configuration. The custom `agorich://` scheme is what gets
  // registered in the Android manifest so that Supabase auth emails and
  // OAuth callbacks can deep-link directly into the running app.
  server: {
    url: serverUrl,
    cleartext: isCleartext,
  },
};

export default capacitorConfig;
export { PRODUCTION_DOMAIN };
