import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type PanResponderInstance,
  type PressableProps,
  type StyleProp,
  type Text as NativeText,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { useTheme } from "@/registry/native/lib/theme";
import { Text, TextStyleContext, type TextProps } from "@/registry/native/ui/text";

interface DrawerContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Called by DrawerTitle with its view, which gets screen reader focus once the drawer is open. */
  registerTitle: (node: NativeText | null) => void;
  focusTitle: () => void;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

/** Drag handlers from DrawerContent, picked up by DrawerHeader. */
const DrawerDragContext = createContext<PanResponderInstance["panHandlers"] | null>(null);

function useDrawer(part: string) {
  const drawer = useContext(DrawerContext);
  if (!drawer) throw new Error(`<${part}> must be used inside <Drawer>.`);
  return drawer;
}

interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

/**
 * A panel that slides up from the bottom of the screen, for actions and short
 * forms. It is a modal: screen readers stay inside it, the Android back
 * button and the iOS escape gesture close it, and so does a tap on the
 * overlay. It can also be dragged down by its handle or header to close; that
 * is an extra, never the only way out. With Reduce Motion it appears without
 * sliding. Controlled with `open` / `onOpenChange` or uncontrolled with
 * `defaultOpen`.
 *
 * @example
 * <Drawer>
 *   <DrawerTrigger asChild>
 *     <Button variant="outline">Invite</Button>
 *   </DrawerTrigger>
 *   <DrawerContent>
 *     <DrawerHeader>
 *       <DrawerTitle>Invite your crew</DrawerTitle>
 *       <DrawerDescription>They get a link to join this game.</DrawerDescription>
 *     </DrawerHeader>
 *     <DrawerFooter>
 *       <DrawerClose asChild>
 *         <Button variant="outline">Done</Button>
 *       </DrawerClose>
 *     </DrawerFooter>
 *   </DrawerContent>
 * </Drawer>
 */
function Drawer({ open: openProp, defaultOpen = false, onOpenChange, children }: DrawerProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const title = useRef<NativeText | null>(null);
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange, openProp]
  );
  const registerTitle = useCallback((node: NativeText | null) => {
    title.current = node;
  }, []);
  const focusTitle = useCallback(() => {
    // react-native-web has no sendAccessibilityEvent; its Modal moves focus in itself.
    if (title.current && typeof AccessibilityInfo.sendAccessibilityEvent === "function") {
      AccessibilityInfo.sendAccessibilityEvent(title.current, "focus");
    }
  }, []);
  const value = useMemo(
    () => ({ open, setOpen, registerTitle, focusTitle }),
    [focusTitle, open, registerTitle, setOpen]
  );
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

type PressHandler = (event: GestureResponderEvent) => void;

interface DrawerButtonProps extends PressableProps {
  /** Give the press to the single child element (your own Button) instead of wrapping it. */
  asChild?: boolean;
  children?: ReactNode;
  ref?: Ref<View>;
}

function useDrawerButton(
  part: string,
  next: boolean,
  { asChild, onPress, children, ...props }: DrawerButtonProps
) {
  const drawer = useDrawer(part);
  const press: PressHandler = (event) => {
    onPress?.(event);
    drawer.setOpen(next);
  };
  if (asChild && isValidElement<{ onPress?: PressHandler }>(children)) {
    const child: ReactElement<{ onPress?: PressHandler }> = children;
    return cloneElement(child, {
      onPress: (event: GestureResponderEvent) => {
        child.props.onPress?.(event);
        press(event);
      },
    });
  }
  return (
    <Pressable role="button" onPress={press} {...props}>
      {children}
    </Pressable>
  );
}

/** Opens the drawer. With `asChild`, your own button opens it. */
function DrawerTrigger(props: DrawerButtonProps) {
  return useDrawerButton("DrawerTrigger", true, props);
}

/** Closes the drawer. With `asChild`, your own button closes it. */
function DrawerClose(props: DrawerButtonProps) {
  return useDrawerButton("DrawerClose", false, props);
}

interface DrawerContentProps extends ViewProps {
  /** Shows the grab handle at the top. It is decorative: hidden from screen readers. */
  showHandle?: boolean;
  /** Share of the drawer's height (0 to 1) it has to be dragged down to close on release. */
  closeThreshold?: number;
  overlayStyle?: StyleProp<ViewStyle>;
  ref?: Ref<View>;
}

/**
 * The panel, in a Modal above an overlay, at most 85% of the screen tall and
 * clear of the home indicator. It needs a DrawerTitle. For long content, put a
 * ScrollView below the header; on iOS the panel rises above the keyboard.
 */
function DrawerContent({
  showHandle = true,
  closeThreshold = 0.25,
  overlayStyle,
  style,
  children,
  ...props
}: DrawerContentProps) {
  const drawer = useDrawer("DrawerContent");
  const { colors, radius, motion } = useTheme();
  const reduced = useReducedMotion();
  const insets = useContext(SafeAreaInsetsContext);
  const { height: windowHeight } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  // How far the sheet is pushed down from where it rests: off screen until it enters.
  // (Not useAnimatedValue, which react-native-web does not have.)
  const [offset] = useState(() => new Animated.Value(windowHeight));
  const { open, setOpen, focusTitle } = drawer;

  // The Modal stays up after `open` turns false, until the sheet has slid out.
  const [wasOpen, setWasOpen] = useState(open);
  const [exiting, setExiting] = useState(false);
  if (wasOpen !== open) {
    setWasOpen(open);
    setExiting(!open);
  }
  const animateExit = exiting && !reduced && height > 0;
  const visible = open || animateExit;

  // `start` replaces whatever animation the value was running.
  const run = useCallback(
    (animation: Animated.CompositeAnimation, done?: () => void) =>
      animation.start(({ finished }) => {
        if (finished) done?.();
      }),
    []
  );

  useEffect(() => () => offset.stopAnimation(), [offset]);

  // In once open and measured; the title gets screen reader focus when it lands.
  const entered = useRef(false);
  useEffect(() => {
    if (!open) {
      entered.current = false;
      return;
    }
    if (height === 0 || entered.current) return;
    entered.current = true;
    if (reduced) {
      offset.stopAnimation();
      offset.setValue(0);
      focusTitle();
      return;
    }
    run(
      Animated.spring(offset, { toValue: 0, ...motion.spring.snappy, useNativeDriver: true }),
      focusTitle
    );
  }, [focusTitle, height, motion, offset, open, reduced, run]);

  // Out from wherever it is (a drag included), then the Modal goes away.
  useEffect(() => {
    if (open) return;
    if (!animateExit) {
      offset.stopAnimation();
      offset.setValue(height || windowHeight);
      return;
    }
    run(
      Animated.timing(offset, {
        toValue: height,
        duration: motion.duration.base,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      () => setExiting(false)
    );
  }, [animateExit, height, motion, offset, open, run, windowHeight]);

  const drag = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => offset.stopAnimation(),
        onPanResponderMove: (_, gesture) => {
          // Pulling up stretches a little; pulling down follows the finger.
          offset.setValue(gesture.dy > 0 ? gesture.dy : Math.max(gesture.dy / 6, -12));
        },
        onPanResponderRelease: (_, gesture) => {
          const threshold = Math.min(Math.max(closeThreshold, 0), 1) * height;
          if (gesture.dy > 0 && (gesture.dy >= threshold || gesture.vy > 1.2)) {
            setOpen(false);
            return;
          }
          if (reduced) offset.setValue(0);
          else
            run(
              Animated.spring(offset, {
                toValue: 0,
                ...motion.spring.snappy,
                useNativeDriver: true,
              })
            );
        },
        onPanResponderTerminate: () => {
          run(
            Animated.spring(offset, { toValue: 0, ...motion.spring.snappy, useNativeDriver: true })
          );
        },
      }),
    [closeThreshold, height, motion, offset, reduced, run, setOpen]
  );

  const fade = offset.interpolate({
    inputRange: [0, height || windowHeight],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => setOpen(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <Animated.View
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.overlay, opacity: fade },
            overlayStyle,
          ]}
        >
          <Pressable accessible={false} style={styles.fill} onPress={() => setOpen(false)} />
        </Animated.View>
        <TextStyleContext.Provider value={{ color: colors.foreground }}>
          <Animated.View
            role="dialog"
            aria-modal
            accessibilityViewIsModal
            onAccessibilityEscape={() => setOpen(false)}
            onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
            style={[
              styles.sheet,
              {
                maxHeight: windowHeight * 0.85,
                paddingBottom: insets?.bottom ?? 0,
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                transform: [{ translateY: offset }],
              },
              style,
            ]}
            {...props}
          >
            {showHandle ? (
              <View aria-hidden style={styles.handleArea} {...drag.panHandlers}>
                <View style={[styles.handle, { backgroundColor: colors.muted }]} />
              </View>
            ) : null}
            <DrawerDragContext.Provider value={drag.panHandlers}>
              {children}
            </DrawerDragContext.Provider>
          </Animated.View>
        </TextStyleContext.Provider>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The top of the drawer, with the title and description. Dragging it down moves the drawer, like the handle. */
function DrawerHeader({ style, ...props }: ViewProps & { ref?: Ref<View> }) {
  const handlers = useContext(DrawerDragContext);
  return <View style={[styles.header, style]} {...(handlers ?? {})} {...props} />;
}

function DrawerFooter({ style, ...props }: ViewProps & { ref?: Ref<View> }) {
  return <View style={[styles.footer, style]} {...props} />;
}

/** Names the drawer; screen reader focus moves to it when the drawer opens. */
function DrawerTitle({ style, ref, ...props }: TextProps) {
  const { registerTitle } = useDrawer("DrawerTitle");
  const { text, font } = useTheme();
  const attach = useMemo(() => mergeRefs(registerTitle, ref), [ref, registerTitle]);
  return (
    <Text
      ref={attach}
      role="heading"
      style={[text.base, font("semibold"), styles.centered, style]}
      {...props}
    />
  );
}

function DrawerDescription({ style, ...props }: TextProps) {
  return <Text variant="muted" style={[styles.centered, style]} {...props} />;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  sheet: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: 0,
    borderTopWidth: 1,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 9999,
  },
  header: {
    gap: 6,
    padding: 16,
  },
  centered: {
    textAlign: "center",
  },
  footer: {
    gap: 8,
    padding: 16,
  },
});

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  type DrawerContentProps,
  type DrawerProps,
};
