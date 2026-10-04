import type { ReactNode, Ref } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useTheme, withAlpha, type Theme } from "@/registry/native/lib/theme";
import { Text, TextStyleContext } from "@/registry/native/ui/text";

type ButtonVariant =
  "default" | "secondary" | "outline" | "ghost" | "destructive" | "link" | "raised";
type ButtonSize = "sm" | "default" | "lg" | "icon-sm" | "icon" | "icon-lg";

/** Heights in px. The smaller ones get a larger touch area through hitSlop. */
const HEIGHT: Record<ButtonSize, number> = {
  sm: 36,
  default: 44,
  lg: 52,
  "icon-sm": 36,
  icon: 44,
  "icon-lg": 52,
};
const PADDING: Record<ButtonSize, number> = {
  sm: 12,
  default: 16,
  lg: 24,
  "icon-sm": 0,
  icon: 0,
  "icon-lg": 0,
};
/** Smallest touch target: 44 pt on iOS, close to Android's 48 dp. */
const TOUCH = 44;
/** How far the raised face sinks into its base. */
const LIP = 4;

interface Look {
  background: string;
  pressedBackground: string;
  foreground: string;
  border?: string;
}

function look(variant: ButtonVariant, { colors }: Theme): Look {
  switch (variant) {
    case "secondary":
      return {
        background: colors.secondary,
        pressedBackground: withAlpha(colors.secondary, 0.8),
        foreground: colors.secondaryForeground,
      };
    case "outline":
      return {
        background: colors.field,
        pressedBackground: colors.accent,
        foreground: colors.foreground,
        border: colors.input,
      };
    case "ghost":
      return {
        background: "transparent",
        pressedBackground: colors.accent,
        foreground: colors.foreground,
      };
    case "destructive":
      return {
        background: colors.destructive,
        pressedBackground: withAlpha(colors.destructive, 0.9),
        foreground: colors.destructiveForeground,
      };
    case "link":
      return {
        background: "transparent",
        pressedBackground: "transparent",
        foreground: colors.primary,
      };
    default:
      return {
        background: colors.primary,
        pressedBackground: withAlpha(colors.primary, 0.9),
        foreground: colors.primaryForeground,
      };
  }
}

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks presses while an action runs. */
  loading?: boolean;
  /** A string becomes the label; Corsair `Text` inside takes the label style. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Style for the label text. */
  textStyle?: StyleProp<TextStyle>;
  ref?: Ref<View>;
}

/**
 * Triggers an action. Variants `default`, `secondary`, `outline`, `ghost`,
 * `destructive` and `link`, plus `raised`: the face stands on a darker 4 px
 * base and sinks into it while pressed, like a key (it keeps 4 px of margin
 * below for the base). The icon sizes render a square: give them an
 * `accessibilityLabel`, since there is no text to read.
 *
 * Sizes are for fingers: 44 px tall by default, and the 36 px ones reach 44 px
 * of touch area through `hitSlop`.
 *
 * @example
 * <Button onPress={save}>Save</Button>
 * <Button variant="raised" size="lg" loading={saving}>Book the court</Button>
 */
function Button({
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  style,
  textStyle,
  hitSlop,
  role = "button",
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const { radius, text, font } = theme;
  const colors = look(variant, theme);
  const raised = variant === "raised";
  const inactive = Boolean(disabled || loading);
  const square = size.startsWith("icon");
  const height = HEIGHT[size];
  const slop = hitSlop ?? (height < TOUCH ? (TOUCH - height) / 2 : undefined);

  const label: TextStyle = {
    ...(size === "sm" ? text.sm : text.base),
    ...font("medium"),
    color: colors.foreground,
  };

  return (
    <Pressable
      role={role}
      // Pressable reports `disabled` to screen readers itself.
      disabled={inactive}
      aria-busy={loading}
      hitSlop={slop}
      style={[raised ? styles.raised : null, inactive ? styles.inactive : null, style]}
      {...props}
    >
      {({ pressed }) => {
        const face = (
          <View
            style={[
              styles.face,
              {
                height,
                width: square ? height : undefined,
                paddingHorizontal: PADDING[size],
                borderRadius: radius.md,
                backgroundColor: raised
                  ? theme.colors.primary
                  : pressed
                    ? colors.pressedBackground
                    : colors.background,
              },
              colors.border ? { borderWidth: 1, borderColor: colors.border } : null,
              raised && pressed ? { transform: [{ translateY: LIP }] } : null,
            ]}
          >
            {loading ? <ActivityIndicator size="small" color={colors.foreground} /> : null}
            <TextStyleContext.Provider
              value={[label, variant === "link" && pressed ? styles.underline : null, textStyle]}
            >
              {typeof children === "string" || typeof children === "number" ? (
                <Text numberOfLines={1}>{children}</Text>
              ) : (
                children
              )}
            </TextStyleContext.Provider>
          </View>
        );

        if (!raised) return face;
        return (
          <>
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.base,
                { borderRadius: radius.md, backgroundColor: theme.colors.primary },
              ]}
            >
              <View style={[StyleSheet.absoluteFill, styles.shade, { borderRadius: radius.md }]} />
            </View>
            {face}
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  raised: {
    marginBottom: LIP,
  },
  base: {
    top: LIP,
    bottom: -LIP,
  },
  shade: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  inactive: {
    opacity: 0.5,
  },
  underline: {
    textDecorationLine: "underline",
  },
});

export { Button, type ButtonProps, type ButtonSize, type ButtonVariant };
