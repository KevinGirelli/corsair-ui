import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { useTheme } from "@/registry/native/lib/theme";
import { Text, type TextProps } from "@/registry/native/ui/text";

interface CountUpProps extends Omit<TextProps, "children"> {
  /** The number the text settles on. */
  value: number;
  /** Turns the animated number into the string that is shown. Receives an integer. */
  format?: (value: number) => string;
  /** Milliseconds. `0` shows the final number immediately, as Reduce Motion does. */
  duration?: number;
}

/**
 * A number that counts to `value`. Reduce Motion, and a `duration` of 0, show
 * the final number on the first paint. The default variant is `display`.
 *
 * @example
 * <CountUp value={1280} format={(value) => `${value}`} />
 */
function CountUp({
  value,
  format = (current) => String(current),
  duration,
  variant = "display",
  ...props
}: CountUpProps) {
  const reduced = useReducedMotion();
  const theme = useTheme();
  const ms = duration ?? theme.motion.duration.slow;
  const instant = reduced || ms === 0;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (instant) return;
    const target = Math.round(value);
    const animated = new Animated.Value(0);
    const listener = animated.addListener(({ value: current }) => setShown(Math.round(current)));
    const timing = Animated.timing(animated, {
      toValue: target,
      duration: ms,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    timing.start();
    return () => {
      timing.stop();
      animated.removeListener(listener);
    };
  }, [instant, ms, value]);

  const display = instant ? Math.round(value) : shown;

  return (
    <Text variant={variant} {...props}>
      {format(display)}
    </Text>
  );
}

export { CountUp, type CountUpProps };
