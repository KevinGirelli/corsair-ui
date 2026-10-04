import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { haptic, setHapticsEnabled } from "@/registry/native/lib/haptics";

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

const mocked = Haptics as jest.Mocked<typeof Haptics>;
const os = Platform.OS;

afterEach(() => {
  setHapticsEnabled(true);
  Platform.OS = os;
  jest.clearAllMocks();
});

describe("haptic", () => {
  it("maps each kind to an expo-haptics call", () => {
    haptic();
    haptic("medium");
    haptic("error");
    expect(mocked.selectionAsync).toHaveBeenCalledTimes(1);
    expect(mocked.impactAsync).toHaveBeenCalledWith("medium");
    expect(mocked.notificationAsync).toHaveBeenCalledWith("error");
  });

  it("does nothing while turned off", () => {
    setHapticsEnabled(false);
    haptic("success");
    expect(mocked.notificationAsync).not.toHaveBeenCalled();
  });

  it("does nothing on the web", () => {
    Platform.OS = "web";
    haptic("light");
    expect(mocked.impactAsync).not.toHaveBeenCalled();
  });

  it("swallows failures from the native module", async () => {
    mocked.selectionAsync.mockImplementationOnce(() => Promise.reject(new Error("no engine")));
    mocked.impactAsync.mockImplementationOnce(() => {
      throw new Error("module missing");
    });
    expect(() => haptic("selection")).not.toThrow();
    expect(() => haptic("heavy")).not.toThrow();
    await Promise.resolve();
  });
});
