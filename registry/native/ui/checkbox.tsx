import { useEffect, useState, type Ref } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { useTheme } from "@/registry/native/lib/theme";

type CheckedState = boolean | "indeterminate";

const BOX = 20;
const TOUCH = 44;

interface CheckboxProps extends Omit<PressableProps, "children" | "style" | "onPress"> {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  /** Called with the new state. Pressing an indeterminate box checks it. */
  onCheckedChange?: (checked: boolean) => void;
  /** Shows the error state. */
  "aria-invalid"?: boolean;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<View>;
}

/**
 * A box to tick, for choices that are confirmed later (a form, a list to act
 * on). `"indeterminate"` shows a dash, for a parent whose children are partly
 * checked. The mark pops in with a spring, or just appears with Reduce
 * Motion. The box is 20 px with a 44 px touch area; name it with
 * `accessibilityLabel`, or wrap it and its label in one Pressable.
 *
 * @example
 * <Checkbox accessibilityLabel="I accept the terms" checked={accepted} onCheckedChange={setAccepted} />
 */
function Checkbox({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  "aria-invalid": invalid = false,
  disabled,
  style,
  hitSlop,
  ...props
}: CheckboxProps) {
  const { colors, motion } = useTheme();
  const reduced = useReducedMotion();
  const [uncontrolled, setUncontrolled] = useState<CheckedState>(defaultChecked);
  const checked = checkedProp ?? uncontrolled;
  const on = checked !== false;
  // Not useAnimatedValue, which react-native-web does not have.
  const [mark] = useState(() => new Animated.Value(on ? 1 : 0));

  useEffect(() => {
    if (reduced) {
      mark.setValue(on ? 1 : 0);
      return;
    }
    const animation = on
      ? Animated.spring(mark, { toValue: 1, ...motion.spring.snappy, useNativeDriver: true })
      : Animated.timing(mark, {
          toValue: 0,
          duration: motion.duration.fast,
          useNativeDriver: true,
        });
    animation.start();
    return () => animation.stop();
  }, [mark, motion, on, reduced]);

  return (
    <Pressable
      role="checkbox"
      aria-checked={checked === "indeterminate" ? "mixed" : checked}
      disabled={disabled}
      hitSlop={hitSlop ?? (TOUCH - BOX) / 2}
      onPress={() => {
        const next = checked !== true;
        if (checkedProp === undefined) setUncontrolled(next);
        onCheckedChange?.(next);
      }}
      style={[
        styles.box,
        {
          backgroundColor: on ? colors.primary : colors.field,
          borderColor: invalid ? colors.destructive : on ? colors.primary : colors.input,
        },
        disabled ? styles.disabled : null,
        style,
      ]}
      {...props}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            opacity: mark,
            transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          },
        ]}
      >
        {checked === "indeterminate" ? (
          <View style={[styles.dash, { backgroundColor: colors.primaryForeground }]} />
        ) : (
          <View style={[styles.tick, { borderColor: colors.primaryForeground }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: BOX,
    height: BOX,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  // A tick drawn as the bottom-right corner of a box turned 45°.
  tick: {
    width: 6,
    height: 11,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ translateY: -1 }, { rotate: "45deg" }],
  },
  dash: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});

export { Checkbox, type CheckboxProps, type CheckedState };
