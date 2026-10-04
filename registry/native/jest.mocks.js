// Native modules have no implementation under Jest. These are the stand-ins
// each library ships for tests.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default
);
