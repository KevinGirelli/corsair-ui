import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { useTheme, withAlpha } from "@/registry/native/lib/theme";
import { Text } from "@/registry/native/ui/text";

type ToastVariant = "default" | "success" | "destructive";
type ToasterPosition = "top" | "bottom";

interface ToastAction {
  /** Visible text of the action button. */
  label: string;
  onPress: () => void;
  /**
   * Read after the toast for screen reader users, who may not reach the button
   * before it closes: how to do the same thing without it ("Undo from the trash").
   */
  altText?: string;
}

interface ToastOptions {
  title?: string;
  description?: string;
  action?: ToastAction;
  variant?: ToastVariant;
  /** Milliseconds before it closes on its own. Overrides the Toaster's `duration`; `Infinity` keeps it open. */
  duration?: number;
  /** Replaces the variant's icon. */
  icon?: ReactNode;
}

interface ToastItem extends ToastOptions {
  id: string;
  /** False while the toast plays its exit animation, just before it is removed. */
  open: boolean;
}

interface ToastHandle {
  id: string;
  dismiss: () => void;
  update: (options: ToastOptions) => void;
}

/** How many toasts are open at once; a new one closes the oldest. */
const MAX_VISIBLE = 3;
/** Removes a closed toast if no Toaster is there to finish its exit animation. */
const REMOVE_DELAY = 1000;
/** How far a toast has to be swiped sideways to go. */
const SWIPE_DISTANCE = 72;

let toasts: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const removeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const EMPTY: ToastItem[] = [];

function emit(next: ToastItem[]) {
  toasts = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function remove(id: string) {
  clearTimeout(removeTimers.get(id));
  removeTimers.delete(id);
  if (toasts.some((item) => item.id === id)) emit(toasts.filter((item) => item.id !== id));
}

function dismiss(id?: string) {
  const closing = toasts.filter((item) => item.open && (id === undefined || item.id === id));
  if (closing.length === 0) return;
  emit(toasts.map((item) => (closing.includes(item) ? { ...item, open: false } : item)));
  for (const item of closing) {
    if (!removeTimers.has(item.id)) {
      removeTimers.set(
        item.id,
        setTimeout(() => remove(item.id), REMOVE_DELAY)
      );
    }
  }
}

function update(id: string, options: ToastOptions) {
  emit(toasts.map((item) => (item.id === id ? { ...item, ...options } : item)));
}

/**
 * Screen readers hear every toast once, when it is created; destructive ones
 * interrupt. react-native-web has no announcement API: on the web the
 * Toaster is a live region instead.
 */
function announce({ title, description, action, variant }: ToastOptions) {
  const message = [title, description, action?.altText].filter(Boolean).join(". ");
  if (!message || typeof AccessibilityInfo.announceForAccessibilityWithOptions !== "function") {
    return;
  }
  AccessibilityInfo.announceForAccessibilityWithOptions(message, {
    queue: variant !== "destructive",
  });
}

/**
 * Shows a toast in the mounted `Toaster` and returns a handle to update or
 * dismiss it. Works anywhere, including outside components.
 *
 * @example
 * const saved = toast({ title: "Saved", variant: "success" });
 * saved.update({ description: "Your crew can see it now." });
 * toast.dismiss(); // closes every toast
 */
function toast(options: ToastOptions): ToastHandle {
  counter += 1;
  const id = `toast-${counter}`;
  const next = [...toasts, { ...options, id, open: true }];
  emit(next);
  announce(options);
  const open = next.filter((item) => item.open);
  for (const item of open.slice(0, Math.max(0, open.length - MAX_VISIBLE))) dismiss(item.id);
  return {
    id,
    dismiss: () => dismiss(id),
    update: (changes) => update(id, changes),
  };
}

/** Closes one toast by id, or every toast when called without one. */
toast.dismiss = dismiss;

/** The current toasts, including ones that are closing. Re-renders when the list changes. */
function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY
  );
}

interface ToasterProps {
  /** The edge of the screen the toasts stack against. */
  position?: ToasterPosition;
  /** Milliseconds before a toast closes on its own. */
  duration?: number;
  /** Accessible name of each toast's close button. */
  closeLabel?: string;
  /** Space between the stack and the safe area, in px. */
  offset?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders the toasts created with `toast()`. Mount it once, as the last child
 * of the app's root view, inside the SafeAreaProvider. At most three are open
 * at a time; screen readers hear each one when it appears. A toast's timer
 * pauses while it is touched and while the app is in the background, and it
 * can be swiped away sideways or towards its edge. With Reduce Motion toasts
 * appear and disappear without moving.
 *
 * A React Native Modal covers everything below it, toasts included: to show
 * toasts over a Drawer, render a second Toaster inside its content.
 *
 * @example
 * <Toaster position="top" />
 * // anywhere:
 * toast({
 *   title: "Player removed",
 *   action: { label: "Undo", onPress: restore, altText: "Add them back from the lineup" },
 * });
 */
function Toaster({
  position = "bottom",
  duration = 5000,
  closeLabel = "Close",
  offset = 16,
  style,
}: ToasterProps) {
  const items = useToasts();
  const insets = useContext(SafeAreaInsetsContext);
  const reduced = useReducedMotion();
  const edge = (position === "top" ? insets?.top : insets?.bottom) ?? 0;
  const ordered = position === "top" ? [...items].reverse() : items;

  return (
    <View
      // Only on the web: on phones announce() speaks each toast, and a live
      // region would make Android read it twice.
      aria-live={Platform.OS === "web" ? "polite" : undefined}
      style={[
        StyleSheet.absoluteFill,
        styles.toaster,
        position === "top"
          ? { justifyContent: "flex-start", paddingTop: edge + offset }
          : { justifyContent: "flex-end", paddingBottom: edge + offset },
        style,
      ]}
    >
      {ordered.map((item) => (
        <ToastView
          key={item.id}
          item={item}
          position={position}
          duration={item.duration ?? duration}
          closeLabel={closeLabel}
          reduced={reduced}
        />
      ))}
    </View>
  );
}

interface ToastViewProps {
  item: ToastItem;
  position: ToasterPosition;
  duration: number;
  closeLabel: string;
  reduced: boolean;
}

function ToastView({ item, position, duration, closeLabel, reduced }: ToastViewProps) {
  const { colors, radius, shadow, text, font, motion } = useTheme();
  // Not useAnimatedValue, which react-native-web does not have.
  const [shown] = useState(() => new Animated.Value(reduced ? 1 : 0));
  const [dragX] = useState(() => new Animated.Value(0));
  const [dragY] = useState(() => new Animated.Value(0));
  const [touched, setTouched] = useState(false);
  const [background, setBackground] = useState(AppState.currentState === "background");
  const remaining = useRef(duration);
  const { id, open } = item;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setBackground(state === "background")
    );
    return () => subscription.remove();
  }, []);

  // Enter, then exit once dismissed; the exit removes the toast when it ends.
  useEffect(() => {
    const finish = () => {
      if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      remove(id);
    };
    if (reduced) {
      shown.setValue(open ? 1 : 0);
      if (!open) finish();
      return;
    }
    const animation = open
      ? Animated.spring(shown, { toValue: 1, ...motion.spring.snappy, useNativeDriver: true })
      : Animated.timing(shown, {
          toValue: 0,
          duration: motion.duration.base,
          useNativeDriver: true,
        });
    animation.start(({ finished }) => {
      if (finished && !open) finish();
    });
    return () => animation.stop();
  }, [id, motion, open, reduced, shown]);

  // A new duration (from `update`) restarts the countdown.
  useEffect(() => {
    remaining.current = duration;
  }, [duration]);

  useEffect(() => {
    if (!open || touched || background || !Number.isFinite(remaining.current)) return;
    const started = Date.now();
    const timer = setTimeout(() => dismiss(id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [background, duration, id, open, touched]);

  const swipe = useMemo(() => {
    const toEdge = position === "bottom" ? 1 : -1;
    const move = (value: Animated.Value, toValue: number) =>
      Animated.timing(value, { toValue, duration: motion.duration.base, useNativeDriver: true });
    const settle = () =>
      Animated.parallel([
        Animated.spring(dragX, { toValue: 0, ...motion.spring.snappy, useNativeDriver: true }),
        Animated.spring(dragY, { toValue: 0, ...motion.spring.snappy, useNativeDriver: true }),
      ]).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
      onPanResponderGrant: () => setTouched(true),
      onPanResponderMove: (_, gesture) => {
        // Away from the edge it resists; towards it, it follows the finger.
        const along = gesture.dy * toEdge;
        dragX.setValue(gesture.dx);
        dragY.setValue((along > 0 ? along : along / 5) * toEdge);
      },
      onPanResponderRelease: (_, gesture) => {
        setTouched(false);
        const sideways =
          Math.abs(gesture.dx) > SWIPE_DISTANCE ||
          (Math.abs(gesture.vx) > 0.6 && Math.abs(gesture.dx) > 16);
        const along = gesture.dy * toEdge;
        const toward = along > 40 || gesture.vy * toEdge > 0.6;
        if (!sideways && !toward) return settle();
        dismiss(id);
        if (reduced) return;
        if (sideways) move(dragX, Math.sign(gesture.dx) * 480).start();
        else move(dragY, 160 * toEdge).start();
      },
      onPanResponderTerminate: () => {
        setTouched(false);
        settle();
      },
    });
  }, [dragX, dragY, id, motion, position, reduced]);

  const destructive = item.variant === "destructive";
  const foreground = destructive ? colors.destructiveForeground : colors.foreground;
  const enterFrom = position === "bottom" ? 40 : -40;

  return (
    <Animated.View
      {...swipe.panHandlers}
      onTouchStart={() => setTouched(true)}
      onTouchEnd={() => setTouched(false)}
      onTouchCancel={() => setTouched(false)}
      style={[
        styles.toast,
        {
          borderRadius: radius.md,
          boxShadow: shadow.lg,
          backgroundColor: destructive ? colors.destructive : colors.background,
          borderColor: destructive
            ? colors.destructive
            : item.variant === "success"
              ? withAlpha(colors.success, 0.5)
              : colors.border,
          opacity: shown,
          transform: [
            { translateX: dragX },
            {
              translateY: Animated.add(
                dragY,
                shown.interpolate({ inputRange: [0, 1], outputRange: [enterFrom, 0] })
              ),
            },
            { scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      {item.icon ?? <StatusIcon variant={item.variant ?? "default"} />}
      <View accessible style={styles.body}>
        {item.title ? (
          <Text style={[text.sm, font("semibold"), { color: foreground }]}>{item.title}</Text>
        ) : null}
        {item.description ? (
          <Text style={[text.sm, styles.description, { color: foreground }]}>
            {item.description}
          </Text>
        ) : null}
      </View>
      {item.action ? (
        <Pressable
          role="button"
          onPress={() => {
            item.action?.onPress();
            dismiss(id);
          }}
          style={({ pressed }) => [
            styles.action,
            {
              borderRadius: radius.md,
              borderColor: destructive
                ? withAlpha(colors.destructiveForeground, 0.4)
                : colors.border,
              backgroundColor: pressed
                ? destructive
                  ? withAlpha(colors.destructiveForeground, 0.1)
                  : colors.accent
                : "transparent",
            },
          ]}
        >
          <Text style={[text.sm, font("medium"), { color: foreground }]}>{item.action.label}</Text>
        </Pressable>
      ) : null}
      <Pressable
        role="button"
        accessibilityLabel={closeLabel}
        hitSlop={10}
        onPress={() => dismiss(id)}
        style={({ pressed }) => [styles.close, { opacity: pressed ? 1 : 0.7 }]}
      >
        <View
          style={[
            styles.closeBar,
            { backgroundColor: foreground, transform: [{ rotate: "45deg" }] },
          ]}
        />
        <View
          style={[
            styles.closeBar,
            { backgroundColor: foreground, transform: [{ rotate: "-45deg" }] },
          ]}
        />
      </Pressable>
    </Animated.View>
  );
}

/** A filled circle with a tick for success, an outlined one with "!" for destructive. */
function StatusIcon({ variant }: { variant: ToastVariant }) {
  const { colors, font } = useTheme();
  if (variant === "success") {
    return (
      <View aria-hidden style={[styles.icon, { backgroundColor: colors.success }]}>
        <View style={[styles.tick, { borderColor: colors.background }]} />
      </View>
    );
  }
  if (variant === "destructive") {
    return (
      <View
        aria-hidden
        style={[styles.icon, styles.outlined, { borderColor: colors.destructiveForeground }]}
      >
        <Text style={[styles.bang, font("bold"), { color: colors.destructiveForeground }]}>!</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  toaster: {
    // Touches between toasts reach the screen below.
    pointerEvents: "box-none",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  toast: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    padding: 16,
    paddingEnd: 40,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  description: {
    opacity: 0.9,
  },
  action: {
    alignSelf: "center",
    height: 32,
    justifyContent: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  close: {
    position: "absolute",
    top: 8,
    end: 8,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBar: {
    position: "absolute",
    width: 12,
    height: 1.5,
    borderRadius: 1,
  },
  icon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  outlined: {
    borderWidth: 1.5,
  },
  tick: {
    width: 4,
    height: 8,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    transform: [{ translateY: -1 }, { rotate: "45deg" }],
  },
  bang: {
    fontSize: 10,
    lineHeight: 12,
  },
});

export {
  toast,
  Toaster,
  useToasts,
  type ToastAction,
  type ToasterPosition,
  type ToasterProps,
  type ToastHandle,
  type ToastItem,
  type ToastOptions,
  type ToastVariant,
};
