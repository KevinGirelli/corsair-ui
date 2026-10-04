import { useEffect, useState, type Ref } from "react";
import {
  Animated,
  I18nManager,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { useTheme } from "@/registry/native/lib/theme";

type SwitchSize = "sm" | "default";

const SIZE: Record<SwitchSize, { width: number; height: number; thumb: number }> = {
  sm: { width: 36, height: 20, thumb: 16 },
  default: { width: 48, height: 28, thumb: 24 },
};
const INSET = 2;
const TOUCH = 44;

interface SwitchProps extends Omit<PressableProps, "children" | "style" | "onPress"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: SwitchSize;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<View>;
}

/**
 * An on/off control for settings that take effect at once. The thumb springs
 * across on the native thread while the track fades to the primary colour;
 * with Reduce Motion it jumps. Screen readers hear a switch, on or off; name
 * it with `accessibilityLabel`. Controlled with `checked` / `onCheckedChange`
 * or uncontrolled with `defaultChecked`.
 *
 * @example
 * <Switch accessibilityLabel="Game reminders" checked={reminders} onCheckedChange={setReminders} />
 */
function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  size = "default",
  disabled,
  style,
  hitSlop,
  ...props
}: SwitchProps) {
  const { colors, scheme, motion } = useTheme();
  const reduced = useReducedMotion();
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const checked = checkedProp ?? uncontrolled;
  // Not useAnimatedValue, which react-native-web does not have.
  const [progress] = useState(() => new Animated.Value(checked ? 1 : 0));
  const { width, height, thumb } = SIZE[size];
  const travel = (width - thumb - INSET * 2) * (I18nManager.isRTL ? -1 : 1);

  useEffect(() => {
    if (reduced) {
      progress.setValue(checked ? 1 : 0);
      return;
    }
    const spring = Animated.spring(progress, {
      toValue: checked ? 1 : 0,
      ...motion.spring.snappy,
      useNativeDriver: true,
    });
    spring.start();
    return () => spring.stop();
  }, [checked, motion, progress, reduced]);

  // In dark mode the thumb follows the web theme: foreground off, primary-foreground on.
  const thumbOff = scheme === "dark" ? colors.foreground : colors.background;
  const thumbOn = scheme === "dark" ? colors.primaryForeground : colors.background;

  return (
    <Pressable
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      hitSlop={hitSlop ?? Math.max(0, (TOUCH - height) / 2)}
      onPress={() => {
        const next = !checked;
        if (checkedProp === undefined) setUncontrolled(next);
        onCheckedChange?.(next);
      }}
      style={[
        styles.track,
        { width, height, backgroundColor: colors.input },
        disabled ? styles.disabled : null,
        style,
      ]}
      {...props}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.round,
          { backgroundColor: colors.primary, opacity: progress },
        ]}
      />
      <Animated.View
        style={[
          styles.round,
          styles.thumb,
          {
            width: thumb,
            height: thumb,
            backgroundColor: thumbOff,
            transform: [
              {
                translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }),
              },
            ],
          },
        ]}
      >
        {thumbOn === thumbOff ? null : (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.round,
              { backgroundColor: thumbOn, opacity: progress },
            ]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    justifyContent: "center",
    borderRadius: 9999,
    paddingHorizontal: INSET,
    overflow: "hidden",
  },
  round: {
    borderRadius: 9999,
  },
  thumb: {
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.15)",
  },
  disabled: {
    opacity: 0.5,
  },
});

export { Switch, type SwitchProps, type SwitchSize };
