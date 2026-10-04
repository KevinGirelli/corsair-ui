/**
 * Unit tests for the React Native items, on jest-expo with React Native
 * Testing Library. Items import each other through `@/registry/native/...`,
 * the path the shadcn CLI rewrites on install.
 *
 * A second project renders the gallery's demos with react-native-web in
 * jsdom (`*.web.test.tsx`): Expo apps run in browsers too, and
 * react-native-web lacks some React Native APIs.
 *
 * @type {import("jest").Config}
 */
const shared = {
  setupFiles: ["react-native-gesture-handler/jestSetup", "<rootDir>/jest.mocks.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/registry/native/(.*)$": "<rootDir>/$1",
  },
};

module.exports = {
  projects: [
    {
      ...shared,
      displayName: "native",
      preset: "jest-expo",
      testMatch: ["<rootDir>/{gallery,hooks,lib,ui}/**/*.test.{ts,tsx}"],
      testPathIgnorePatterns: ["/node_modules/", "\\.web\\.test\\.tsx?$"],
    },
    {
      ...shared,
      displayName: "web",
      preset: "jest-expo/web",
      setupFiles: [...shared.setupFiles, "<rootDir>/jest.web.js"],
      testMatch: ["<rootDir>/gallery/**/*.web.test.{ts,tsx}"],
      // The web preset leaves out the Babel preset the default one passes,
      // and there is no babel.config.js here.
      transform: {
        "\\.[jt]sx?$": [
          "babel-jest",
          {
            presets: [require.resolve("expo/internal/babel-preset")],
            caller: { name: "metro", bundler: "metro", platform: "web" },
          },
        ],
      },
    },
  ],
};
