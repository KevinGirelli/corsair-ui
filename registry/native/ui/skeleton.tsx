import { useEffect, useState, type Ref } from "react";
import { Animated, Easing, type View, type ViewProps } from "react-native";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { useTheme } from "@/registry/native/lib/theme";

interface SkeletonProps extends ViewProps {
  ref?: Ref<View>;
}

const PULSE = { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true };

/**
 * A placeholder shape while content loads: give it the size of what is coming.
 * It pulses between full and half opacity every two seconds on the native
 * thread, and holds still with Reduce Motion. It is hidden from screen
 * readers; mark the loading region with `aria-busy` instead.
 *
 * @example
 * <Skeleton style={{ width: 160, height: 16 }} />
 */
function Skeleton({ style, ...props }: SkeletonProps) {
  const { colors, radius } = useTheme();
  const reduced = useReducedMotion();
  // Not useAnimatedValue, which react-native-web does not have.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, ...PULSE }),
        Animated.timing(opacity, { toValue: 1, ...PULSE }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduced]);

  return (
    <Animated.View
      aria-hidden
      style={[{ backgroundColor: colors.accent, borderRadius: radius.md, opacity }, style]}
      {...props}
    />
  );
}

export { Skeleton, type SkeletonProps };
