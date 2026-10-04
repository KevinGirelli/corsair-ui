import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  Animated,
  I18nManager,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { useTheme } from "@/registry/native/lib/theme";
import { Text, TextStyleContext } from "@/registry/native/ui/text";

type SegmentedControlSize = "sm" | "default" | "lg";

const ITEM_HEIGHT: Record<SegmentedControlSize, number> = { sm: 32, default: 36, lg: 44 };
const INSET = 4;
const TOUCH = 44;

interface SegmentedControlContextValue {
  value: string | undefined;
  size: SegmentedControlSize;
  /** True once the thumb is measured and drawn; until then the active item paints the pill. */
  ready: boolean;
  select: (value: string) => void;
}

const SegmentedControlContext = createContext<SegmentedControlContextValue>({
  value: undefined,
  size: "default",
  ready: false,
  select: () => {},
});

interface SegmentedControlProps extends ViewProps {
  /** The active item, controlled. */
  value?: string;
  /** The active item at first, uncontrolled. Give one: the control is never empty once chosen. */
  defaultValue?: string;
  /** Called with the newly active item's value. Pressing the active item again does nothing. */
  onValueChange?: (value: string) => void;
  size?: SegmentedControlSize;
  /** Style for the sliding thumb, e.g. `{ backgroundColor: colors.primary }`. */
  thumbStyle?: StyleProp<ViewStyle>;
  /** SegmentedControlItem elements, as direct children. */
  children?: ReactNode;
  ref?: Ref<View>;
}

/**
 * A switch between two or more options ("Players | Venues") with a thumb that
 * slides to the active one. The items share the width equally, like a native
 * segmented control, so the thumb only moves: it springs on the native thread,
 * and jumps with Reduce Motion. Screen readers hear a radio group (name it
 * with `accessibilityLabel`) with one checked option. It never goes empty:
 * pressing the active item keeps it.
 *
 * @example
 * <SegmentedControl accessibilityLabel="Show" defaultValue="upcoming">
 *   <SegmentedControlItem value="upcoming">Upcoming</SegmentedControlItem>
 *   <SegmentedControlItem value="played">Played</SegmentedControlItem>
 * </SegmentedControl>
 */
function SegmentedControl({
  value: valueProp,
  defaultValue,
  onValueChange,
  size = "default",
  thumbStyle,
  style,
  children,
  onLayout,
  ...props
}: SegmentedControlProps) {
  const { colors, motion, shadow } = useTheme();
  const reduced = useReducedMotion();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp ?? uncontrolled;
  const [width, setWidth] = useState(0);

  const values = Children.toArray(children).flatMap((child) =>
    isValidElement<SegmentedControlItemProps>(child) && typeof child.props.value === "string"
      ? [child.props.value]
      : []
  );
  const index = value === undefined ? -1 : values.indexOf(value);
  const segment = values.length > 0 ? (width - INSET * 2) / values.length : 0;
  const offset = Math.max(index, 0) * segment * (I18nManager.isRTL ? -1 : 1);
  const ready = segment > 0 && index >= 0;

  // Not useAnimatedValue, which react-native-web does not have.
  const [position] = useState(() => new Animated.Value(offset));
  const placed = useRef(false);

  useEffect(() => {
    if (!ready) return;
    // The first placement jumps; later ones slide.
    if (!placed.current || reduced) {
      placed.current = true;
      position.setValue(offset);
      return;
    }
    const spring = Animated.spring(position, {
      toValue: offset,
      ...motion.spring.snappy,
      useNativeDriver: true,
    });
    spring.start();
    return () => spring.stop();
  }, [motion, offset, position, ready, reduced]);

  const context = useMemo<SegmentedControlContextValue>(
    () => ({
      value,
      size,
      ready,
      select: (next) => {
        if (next === value) return;
        if (valueProp === undefined) setUncontrolled(next);
        onValueChange?.(next);
      },
    }),
    [onValueChange, ready, size, value, valueProp]
  );

  return (
    <View
      role="radiogroup"
      style={[styles.root, { backgroundColor: colors.muted, padding: INSET }, style]}
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width);
        onLayout?.(event);
      }}
      {...props}
    >
      {ready ? (
        <Animated.View
          style={[
            styles.thumb,
            {
              top: INSET,
              bottom: INSET,
              start: INSET,
              width: segment,
              backgroundColor: colors.background,
              boxShadow: shadow.sm,
              transform: [{ translateX: position }],
            },
            thumbStyle,
          ]}
        />
      ) : null}
      <SegmentedControlContext.Provider value={context}>
        {children}
      </SegmentedControlContext.Provider>
    </View>
  );
}

interface SegmentedControlItemProps extends Omit<PressableProps, "children" | "style" | "onPress"> {
  /** What `onValueChange` reports when this item is picked. */
  value: string;
  /** A string becomes the label; Corsair `Text` inside takes the label style. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<View>;
}

/** One option of a `SegmentedControl`. */
function SegmentedControlItem({
  value,
  disabled,
  style,
  children,
  hitSlop,
  ...props
}: SegmentedControlItemProps) {
  const { colors, text, font, shadow } = useTheme();
  const control = useContext(SegmentedControlContext);
  const active = control.value === value;
  const height = ITEM_HEIGHT[control.size];
  const label = {
    ...(control.size === "sm" ? text.xs : control.size === "lg" ? text.base : text.sm),
    ...font("medium"),
    color: active ? colors.foreground : colors.mutedForeground,
  };

  return (
    <Pressable
      role="radio"
      aria-checked={active}
      disabled={disabled}
      hitSlop={hitSlop ?? Math.max(0, (TOUCH - height) / 2 - INSET)}
      onPress={() => control.select(value)}
      style={[
        styles.item,
        { height },
        // Until the thumb is drawn, the active item paints the pill itself.
        active && !control.ready
          ? { backgroundColor: colors.background, boxShadow: shadow.sm }
          : null,
        disabled ? styles.disabled : null,
        style,
      ]}
      {...props}
    >
      <TextStyleContext.Provider value={label}>
        {typeof children === "string" ? <Text numberOfLines={1}>{children}</Text> : children}
      </TextStyleContext.Provider>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
  },
  thumb: {
    position: "absolute",
    borderRadius: 9999,
    pointerEvents: "none",
  },
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  disabled: {
    opacity: 0.5,
  },
});

export {
  SegmentedControl,
  SegmentedControlItem,
  type SegmentedControlItemProps,
  type SegmentedControlProps,
  type SegmentedControlSize,
};
