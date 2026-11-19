import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Adds what app.json cannot hold: the Google Maps key Android needs for the gym map. It comes from the
 * environment at build time (see .env.example) and is never committed. iOS uses Apple Maps and needs no key.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '' }],
  ],
});
