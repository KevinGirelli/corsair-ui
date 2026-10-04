/**
 * Unit tests for the React Native items, on jest-expo (the iOS preset) with
 * React Native Testing Library. Items import each other through
 * `@/registry/native/...`, the path the shadcn CLI rewrites on install.
 *
 * @type {import("jest").Config}
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/{hooks,lib,ui}/**/*.test.{ts,tsx}"],
  setupFiles: ["react-native-gesture-handler/jestSetup", "<rootDir>/jest.mocks.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/registry/native/(.*)$": "<rootDir>/$1",
  },
};
