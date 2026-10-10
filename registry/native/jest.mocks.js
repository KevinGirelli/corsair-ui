// Native modules have no implementation under Jest. These are the stand-ins
// each library ships for tests.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default
);
// These three reach for their native module on import and ship no mock, so
// tests get stand-ins that resolve like a device where everything works.
// Tests override them per case with jest.mocked(...).mockResolvedValueOnce().
jest.mock("react-native-view-shot", () => ({
  __esModule: true,
  default: "ViewShot",
  captureRef: jest.fn(async () => "/tmp/ReactNative/story.png"),
  captureScreen: jest.fn(async () => "/tmp/ReactNative/screen.png"),
  releaseCapture: jest.fn(),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ""),
  hasStringAsync: jest.fn(async () => false),
}));
