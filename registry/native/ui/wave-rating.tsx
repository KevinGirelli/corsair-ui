import { useEffect, useState } from "react";
import { I18nManager, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { haptic } from "@/registry/native/lib/haptics";
import { useTheme } from "@/registry/native/lib/theme";
import { Rating, RatingStar, ratingSizes, type RatingProps } from "@/registry/native/ui/rating";
import { Text } from "@/registry/native/ui/text";

interface WaveRatingProps extends RatingProps {
  /** Shows a label over the star under the finger while it sweeps. */
  showTip?: boolean;
  /** Text of that label: "3 stars" by default. */
  tipLabel?: (stars: number, max: number) => string;
  /** A tick as each star lights up, and a tap when the score is set (expo-haptics). */
  haptics?: boolean;
}

/** How many stars behind the crest the wave reaches. */
const SPREAD = 3;
/** Delay between neighbouring stars as the wave travels, in ms. */
const STAGGER = 30;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const defaultValueLabel = (value: number, max: number) => `${value} out of ${max}`;
const defaultTipLabel = (stars: number) => `${stars} ${stars === 1 ? "star" : "stars"}`;

/** 0 to 1: how high a star rises, highest under the finger and fading out behind it. */
function liftOf(star: number, crest: number | null) {
  if (crest === null || star > crest) return 0;
  return Math.max(0, 1 - (crest - star) / SPREAD);
}

/**
 * The rating, animated: sweep a finger across the stars and they rise in a
 * wave that crests under it, with a haptic tick per star and a tip above
 * showing the score; let go, or tap, and the chosen star pops. It takes the
 * same props as `rating` and keeps its accessibility (one adjustable control,
 * swiped up and down by screen readers) and its read-only image, which does
 * not move. Vertical swipes still scroll a ScrollView. With Reduce Motion the
 * stars light up without rising or popping. Built on Gesture Handler and
 * Reanimated: the app needs a GestureHandlerRootView at its root.
 *
 * @example
 * <WaveRating
 *   defaultValue={4}
 *   onValueChange={setScore}
 *   accessibilityLabel="Rate the court"
 *   tipLabel={(stars) => ["Bad", "Meh", "OK", "Good", "Great"][stars - 1] ?? ""}
 * />
 */
function WaveRating({ showTip = true, tipLabel, haptics = true, ...props }: WaveRatingProps) {
  if (props.readOnly) return <Rating {...props} />;
  return (
    <InteractiveWaveRating showTip={showTip} tipLabel={tipLabel} haptics={haptics} {...props} />
  );
}

function InteractiveWaveRating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  max = 5,
  disabled,
  size = "default",
  getValueLabel = defaultValueLabel,
  accessibilityLabel,
  "aria-label": ariaLabel,
  showTip,
  tipLabel = defaultTipLabel,
  haptics: buzz,
  readOnly: _readOnly,
  style,
  onLayout,
  ...props
}: WaveRatingProps) {
  const reduced = useReducedMotion();
  const [internal, setInternal] = useState(defaultValue);
  const [preview, setPreview] = useState<number | null>(null);
  const [popped, setPopped] = useState({ star: 0, times: 0 });
  const [width, setWidth] = useState(0);
  // The star under the finger right now, read by gesture callbacks between renders.
  const crest = useSharedValue<number | null>(null);

  const count = Math.max(1, Math.floor(max));
  const value = clamp(valueProp ?? internal, 0, count);
  const picked = Math.round(value);
  const shown = preview ?? picked;
  const { star: starSize, gap } = ratingSizes[size];
  const cell = width / count;
  const name = ariaLabel ?? accessibilityLabel ?? "Rating";
  const stars = Array.from({ length: count }, (_, index) => index + 1);

  /** The star under `x` (from the view's left edge), clamped to the row. */
  const starAt = (x: number) => {
    if (width <= 0) return null;
    const index = clamp(Math.floor(x / cell), 0, count - 1);
    return I18nManager.isRTL ? count - index : index + 1;
  };

  const show = (star: number | null) => {
    if (star === null || star === crest.get()) return;
    crest.set(star);
    setPreview(star);
    if (buzz) haptic("selection");
  };

  const hide = () => {
    crest.set(null);
    setPreview(null);
  };

  const commit = (star: number | null) => {
    if (star === null) return;
    const next = clamp(star, 1, count);
    if (next !== picked) {
      if (valueProp === undefined) setInternal(next);
      onValueChange?.(next);
    }
    setPopped(({ times }) => ({ star: next, times: times + 1 }));
    if (buzz) haptic("light");
  };

  // Callbacks run on the JavaScript thread; the stars animate on the UI thread.
  const sweep = Gesture.Pan()
    .runOnJS(true)
    .enabled(!disabled)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onBegin((event) => show(starAt(event.x)))
    .onStart((event) => show(starAt(event.x)))
    .onUpdate((event) => show(starAt(event.x)))
    .onEnd(() => commit(crest.get()))
    .onFinalize(hide)
    .withTestId("wave-rating-sweep");
  const tap = Gesture.Tap()
    .runOnJS(true)
    .enabled(!disabled)
    .onEnd((event, success) => {
      if (success) commit(starAt(event.x));
    })
    .withTestId("wave-rating-tap");

  return (
    <GestureDetector gesture={Gesture.Race(sweep, tap)}>
      <View
        role="slider"
        accessible
        accessibilityLabel={name}
        aria-valuemin={0}
        aria-valuemax={count}
        aria-valuenow={picked}
        aria-valuetext={getValueLabel(picked, count)}
        aria-disabled={disabled || undefined}
        accessibilityActions={disabled ? undefined : [{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === "increment" && picked < count) commit(picked + 1);
          if (nativeEvent.actionName === "decrement" && picked > 1) commit(picked - 1);
        }}
        onLayout={(event) => {
          setWidth(event.nativeEvent.layout.width);
          onLayout?.(event);
        }}
        style={[styles.row, { gap }, disabled ? styles.disabled : null, style]}
        {...props}
      >
        {stars.map((star) => (
          <WaveStar
            key={star}
            star={star}
            crest={reduced ? null : preview}
            filled={star <= shown}
            size={starSize}
            pop={!reduced && popped.star === star ? popped.times : 0}
          />
        ))}
        {showTip && preview !== null ? (
          <Tip label={tipLabel(preview, count)} center={(preview - 0.5) * cell} reduced={reduced} />
        ) : null}
      </View>
    </GestureDetector>
  );
}

interface WaveStarProps {
  star: number;
  crest: number | null;
  filled: boolean;
  size: number;
  /** Counts up each time this star is picked, which pops it. */
  pop: number;
}

function WaveStar({ star, crest, filled, size, pop }: WaveStarProps) {
  const { motion } = useTheme();
  const lift = useSharedValue(0);
  const scale = useSharedValue(1);
  const target = liftOf(star, crest);

  useEffect(() => {
    // Rising, the wave travels from the crest backwards; settling, all at once.
    const delay = crest !== null && target > 0 ? (crest - star) * STAGGER : 0;
    lift.set(withDelay(delay, withSpring(target, motion.spring.bouncy)));
  }, [crest, lift, motion, star, target]);

  useEffect(() => {
    if (pop === 0) return;
    scale.set(
      withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, motion.spring.bouncy))
    );
  }, [motion, pop, scale]);

  const rise = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.get() * size * 0.35 }, { scale: 1 + lift.get() * 0.2 }],
  }));
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={rise}>
      <Animated.View style={bounce}>
        <RatingStar fill={filled ? 1 : 0} size={size} />
      </Animated.View>
    </Animated.View>
  );
}

/** The label over the crest. It glides between stars and hops as it lands. */
function Tip({ label, center, reduced }: { label: string; center: number; reduced: boolean }) {
  const { colors, radius, text, font, motion } = useTheme();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(center);
  const hop = useSharedValue(0);
  const direction = I18nManager.isRTL ? -1 : 1;

  useEffect(() => {
    if (reduced) {
      x.set(center);
      return;
    }
    x.set(withSpring(center, motion.spring.snappy));
    hop.set(withSequence(withTiming(-4, { duration: 90 }), withSpring(0, motion.spring.bouncy)));
  }, [center, hop, motion, reduced, x]);

  const place = useAnimatedStyle(() => ({
    transform: [{ translateX: direction * (x.get() - width / 2) }, { translateY: hop.get() }],
  }));

  return (
    <Animated.View
      aria-hidden
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.tip, { backgroundColor: colors.foreground, borderRadius: radius.md }, place]}
    >
      <Text numberOfLines={1} style={[text.xs, font("medium"), { color: colors.background }]}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  tip: {
    position: "absolute",
    pointerEvents: "none",
    bottom: "100%",
    start: 0,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  disabled: {
    opacity: 0.5,
  },
});

export { WaveRating, type WaveRatingProps };
