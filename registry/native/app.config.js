/**
 * Expo config for the gallery in gallery/, which shows every React Native
 * item. `npx expo start` here runs it on a phone with Expo Go; `npm run
 * preview:export` builds the web version the docs site embeds, served from
 * GitHub Pages under NATIVE_PREVIEW_BASE_URL (e.g. /corsair-ui/native-preview).
 *
 * @type {import("expo/config").ExpoConfig}
 */
module.exports = {
  name: "Corsair Native",
  slug: "corsair-native-gallery",
  version: "1.0.0",
  // Follow the device's light or dark mode instead of Expo's default, light.
  userInterfaceStyle: "automatic",
  web: { output: "single" },
  experiments: process.env.NATIVE_PREVIEW_BASE_URL
    ? { baseUrl: process.env.NATIVE_PREVIEW_BASE_URL }
    : {},
};
