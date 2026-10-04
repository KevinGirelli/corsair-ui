import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * - `selection`: a tick, for a value stepping (a star, a slider notch).
 * - `light` / `medium` / `heavy`: a tap of that weight, for presses and drops.
 * - `success` / `warning` / `error`: the result of an action.
 */
type HapticKind = "selection" | "light" | "medium" | "heavy" | "success" | "warning" | "error";

let enabled = true;

/** Turns every Corsair haptic on or off at once, for example from a "Vibration" setting. */
function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function play(kind: HapticKind): Promise<void> {
  switch (kind) {
    case "selection":
      return Haptics.selectionAsync();
    case "light":
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case "medium":
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case "heavy":
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    case "success":
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case "warning":
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case "error":
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

/**
 * Plays a short vibration through expo-haptics. It is fire-and-forget: it
 * does nothing on the web, while turned off with `setHapticsEnabled(false)`,
 * or on a device without a haptic engine, and it never throws. Keep it for
 * moments that answer the user's own touch.
 *
 * @example
 * haptic("selection"); // a star lit up under the finger
 * haptic("success"); // the booking went through
 */
function haptic(kind: HapticKind = "selection"): void {
  if (!enabled || Platform.OS === "web") return;
  try {
    play(kind).catch(() => {});
  } catch {
    // The native module is missing (Expo Go on the web, tests): stay silent.
  }
}

export { haptic, setHapticsEnabled, type HapticKind };
