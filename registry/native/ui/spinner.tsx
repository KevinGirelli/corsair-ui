import type { Ref } from "react";
import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";

import { useTheme } from "@/registry/native/lib/theme";

type SpinnerSize = "sm" | "default" | "lg";

interface SpinnerProps extends Omit<ActivityIndicatorProps, "size"> {
  size?: SpinnerSize;
  ref?: Ref<ActivityIndicator>;
}

/**
 * The platform's own activity indicator in the theme's muted colour, so it
 * looks native on iOS and Android. It is announced as "Loading"; pass a more
 * specific `accessibilityLabel` when you can ("Loading courts"). Inside a
 * Button, use the Button's `loading` prop instead.
 */
function Spinner({
  size = "default",
  color,
  accessibilityLabel = "Loading",
  style,
  ...props
}: SpinnerProps) {
  const { colors } = useTheme();
  return (
    <ActivityIndicator
      // The native view is not an accessibility element on its own.
      accessible
      role="progressbar"
      aria-busy
      accessibilityLabel={accessibilityLabel}
      size={size === "lg" ? "large" : "small"}
      color={color ?? colors.mutedForeground}
      style={[size === "sm" ? { transform: [{ scale: 0.75 }] } : null, style]}
      {...props}
    />
  );
}

export { Spinner, type SpinnerProps, type SpinnerSize };
