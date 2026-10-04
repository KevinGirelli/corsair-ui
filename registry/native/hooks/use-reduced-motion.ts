import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** The last answer from the system, so components mounted later start with it. */
let lastKnown = false;

/**
 * Whether "Reduce motion" is on in the device's accessibility settings (on
 * the web, `prefers-reduced-motion`). It follows changes while the app is
 * open. The first render of the first component uses `false` until the system
 * answers; later mounts start with the last answer, so they do not animate
 * when they should not.
 *
 * @example
 * const reduced = useReducedMotion();
 * Animated.timing(opacity, { toValue: 1, duration: reduced ? 0 : 200, useNativeDriver: true });
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(lastKnown);

  useEffect(() => {
    let active = true;
    const update = (value: boolean) => {
      lastKnown = value;
      if (active) setReduced(value);
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update, () => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", update);
    return () => {
      active = false;
      // react-native-web returns nothing where the browser lacks matchMedia.
      subscription?.remove();
    };
  }, []);

  return reduced;
}

export { useReducedMotion };
