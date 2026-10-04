import { useEffect, useState, type Ref } from "react";
import {
  Animated,
  Easing,
  I18nManager,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { useTheme, withAlpha } from "@/registry/native/lib/theme";

interface ProgressProps extends ViewProps {
  /** How much is done, from 0 to `max`. `null` means unknown: the bar runs back and forth. */
  value?: number | null;
  max?: number;
  /** What screen readers say for the value. */
  getValueLabel?: (value: number, max: number) => string;
  indicatorStyle?: StyleProp<ViewStyle>;
  ref?: Ref<View>;
}

const defaultValueLabel = (value: number, max: number) => `${Math.round((value / max) * 100)}%`;

/**
 * A bar for a task with a known amount, or an indeterminate one while the
 * amount is unknown. The fill springs to each new value on the native
 * thread; with Reduce Motion it jumps, and the indeterminate bar holds still
 * at half opacity. Name it with `accessibilityLabel` ("Upload").
 *
 * @example
 * <Progress value={10} max={14} accessibilityLabel="Players confirmed"
 *   getValueLabel={(value, max) => `${value} of ${max}`} />
 */
function Progress({
  value = null,
  max: maxProp = 100,
  getValueLabel = defaultValueLabel,
  indicatorStyle,
  style,
  onLayout,
  ...props
}: ProgressProps) {
  const { colors, motion } = useTheme();
  const reduced = useReducedMotion();
  const max = maxProp > 0 ? maxProp : 100;
  const known = value !== null && Number.isFinite(value);
  const clamped = known ? Math.min(Math.max(value, 0), max) : 0;
  const fraction = clamped / max;

  // Not useAnimatedValue, which react-native-web does not have.
  const [scale] = useState(() => new Animated.Value(fraction));
  const [travel] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!known) return;
    if (reduced) {
      scale.setValue(fraction);
      return;
    }
    const spring = Animated.spring(scale, {
      toValue: fraction,
      ...motion.spring.snappy,
      useNativeDriver: true,
    });
    spring.start();
    return () => spring.stop();
  }, [fraction, known, motion, reduced, scale]);

  const running = !known && !reduced && width > 0;
  useEffect(() => {
    if (!running) return;
    travel.setValue(0);
    const loop = Animated.loop(
      Animated.timing(travel, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [running, travel]);

  const segment = width * 0.4;
  const direction = I18nManager.isRTL ? -1 : 1;

  return (
    <View
      role="progressbar"
      accessible
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={known ? clamped : undefined}
      aria-valuetext={known ? getValueLabel(clamped, max) : undefined}
      aria-busy={!known || undefined}
      style={[styles.track, { backgroundColor: withAlpha(colors.primary, 0.2) }, style]}
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width);
        onLayout?.(event);
      }}
      {...props}
    >
      {known ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.primary,
              transformOrigin: I18nManager.isRTL ? "right" : "left",
              transform: [{ scaleX: scale }],
            },
            indicatorStyle,
          ]}
        />
      ) : reduced ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.still,
            { backgroundColor: colors.primary },
            indicatorStyle,
          ]}
        />
      ) : (
        <Animated.View
          style={[
            styles.segment,
            {
              width: segment,
              backgroundColor: colors.primary,
              transform: [
                {
                  translateX: travel.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-segment * direction, width * direction],
                  }),
                },
              ],
            },
            indicatorStyle,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    width: "100%",
    borderRadius: 9999,
    overflow: "hidden",
  },
  still: {
    opacity: 0.5,
  },
  segment: {
    position: "absolute",
    top: 0,
    bottom: 0,
    start: 0,
    borderRadius: 9999,
  },
});

export { Progress, type ProgressProps };
