import { useState, type Ref } from "react";
import { Pressable, StyleSheet, View, type ViewProps } from "react-native";
import Svg, { Polygon } from "react-native-svg";

import { useTheme, withAlpha } from "@/registry/native/lib/theme";

type RatingSize = "xs" | "sm" | "default" | "lg";

/** Star size and the gap between stars, in px, per size. */
const ratingSizes: Record<RatingSize, { star: number; gap: number }> = {
  xs: { star: 14, gap: 2 },
  sm: { star: 18, gap: 2 },
  default: { star: 24, gap: 4 },
  lg: { star: 32, gap: 6 },
};

const TOUCH = 44;

/** A five-pointed star in a 24 px box; its points are computed, not traced. */
const STAR_POINTS = Array.from({ length: 10 }, (_, index) => {
  const radius = index % 2 === 0 ? 10.5 : 5;
  const angle = -Math.PI / 2 + (index * Math.PI) / 5;
  return `${(12 + radius * Math.cos(angle)).toFixed(2)},${(12.6 + radius * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const defaultValueLabel = (value: number, max: number) => `${value} out of ${max}`;

function StarShape({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon
        points={STAR_POINTS}
        fill={color}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface RatingStarProps {
  /** From 0 to 1: the filled star is clipped to that share of its width, from the start edge. */
  fill: number;
  size: number;
  /** Filled colour. Defaults to the theme's warning colour. */
  color?: string;
  /** Empty colour. Defaults to the muted foreground at 40%. */
  emptyColor?: string;
}

/** One star, filled or partly filled. Exported for the animated variants of the rating. */
function RatingStar({ fill, size, color, emptyColor }: RatingStarProps) {
  const { colors } = useTheme();
  const amount = clamp(fill, 0, 1);
  return (
    <View style={{ width: size, height: size }}>
      <StarShape size={size} color={emptyColor ?? withAlpha(colors.mutedForeground, 0.4)} />
      {amount > 0 ? (
        <View style={[styles.clip, { width: size * amount, height: size }]}>
          <StarShape size={size} color={color ?? colors.warning} />
        </View>
      ) : null}
    </View>
  );
}

interface RatingProps extends Omit<ViewProps, "children"> {
  /** Stars picked (controlled). Read-only ratings can be fractional, like 4.5. */
  value?: number;
  /** Stars picked at first (uncontrolled). */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Number of stars. */
  max?: number;
  /** Show the value without letting it change. */
  readOnly?: boolean;
  disabled?: boolean;
  size?: RatingSize;
  /** How the value is read to screen readers. */
  getValueLabel?: (value: number, max: number) => string;
  ref?: Ref<View>;
}

/**
 * Stars for giving or showing a score. Interactive, tapping a star picks it,
 * and screen readers hear one adjustable control ("Rating, 3 out of 5") that
 * swipes up and down change, the way iOS and Android expect a rating to work.
 * Each star has a 44 px tall touch area. With `readOnly` it is one image read
 * as "Rating: 4.5 out of 5", and fractional values fill part of a star.
 * Filled stars use the warning colour; nothing moves. For a finger sweeping
 * the row with motion and haptics, use `wave-rating`: same props.
 *
 * @example
 * <Rating defaultValue={3} onValueChange={setScore} accessibilityLabel="Rate the court" />
 * <Rating readOnly value={4.5} size="sm" />
 */
function Rating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  max = 5,
  readOnly = false,
  disabled,
  size = "default",
  getValueLabel = defaultValueLabel,
  accessibilityLabel,
  "aria-label": ariaLabel,
  style,
  ...props
}: RatingProps) {
  const [internal, setInternal] = useState(defaultValue);
  const count = Math.max(1, Math.floor(max));
  const value = clamp(valueProp ?? internal, 0, count);
  const { star: starSize, gap } = ratingSizes[size];
  const name = ariaLabel ?? accessibilityLabel ?? "Rating";
  const stars = Array.from({ length: count }, (_, index) => index + 1);

  if (readOnly) {
    return (
      <View
        role="img"
        accessible
        accessibilityLabel={`${name}: ${getValueLabel(value, count)}`}
        style={[styles.row, { gap }, style]}
        {...props}
      >
        {stars.map((star) => (
          <RatingStar key={star} fill={value - (star - 1)} size={starSize} />
        ))}
      </View>
    );
  }

  const picked = Math.round(value);
  const change = (next: number) => {
    const stars = clamp(next, 1, count);
    if (stars === picked) return;
    if (valueProp === undefined) setInternal(stars);
    onValueChange?.(stars);
  };
  const slop = Math.max(0, (TOUCH - starSize) / 2);

  return (
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
        if (nativeEvent.actionName === "increment") change(picked + 1);
        if (nativeEvent.actionName === "decrement") change(picked - 1);
      }}
      style={[styles.row, { gap }, disabled ? styles.disabled : null, style]}
      {...props}
    >
      {stars.map((star) => (
        <Pressable
          key={star}
          accessible={false}
          disabled={disabled}
          hitSlop={{ top: slop, bottom: slop, left: gap / 2, right: gap / 2 }}
          onPress={() => change(star)}
        >
          <RatingStar fill={star <= picked ? 1 : 0} size={starSize} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  clip: {
    position: "absolute",
    top: 0,
    start: 0,
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.5,
  },
});

export { Rating, RatingStar, ratingSizes, type RatingProps, type RatingSize, type RatingStarProps };
