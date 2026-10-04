import { createContext, useContext, type Ref } from "react";
import {
  Platform,
  Text as NativeText,
  type StyleProp,
  type TextProps as NativeTextProps,
  type TextStyle,
} from "react-native";

import { useTheme, type Theme } from "@/registry/native/lib/theme";

type TextVariant =
  "default" | "h1" | "h2" | "h3" | "h4" | "lead" | "large" | "small" | "muted" | "code";

/**
 * A style every Corsair `Text` inside picks up. Text in React Native does not
 * inherit from the views around it, so containers that colour their labels
 * (a Button, a Card, a Badge) provide it, and an explicit `variant` or
 * `style` on the Text still wins.
 */
const TextStyleContext = createContext<StyleProp<TextStyle>>(undefined);

const HEADINGS: ReadonlySet<TextVariant> = new Set(["h1", "h2", "h3", "h4"]);

const monospace = Platform.select({ ios: "Menlo", default: "monospace" });

function variantStyle(variant: TextVariant, { colors, text, font }: Theme): TextStyle {
  switch (variant) {
    case "h1":
      return { ...text["4xl"], ...font("bold"), letterSpacing: -0.9, color: colors.foreground };
    case "h2":
      return {
        ...text["3xl"],
        ...font("semibold"),
        letterSpacing: -0.75,
        color: colors.foreground,
      };
    case "h3":
      return { ...text["2xl"], ...font("semibold"), letterSpacing: -0.6, color: colors.foreground };
    case "h4":
      return { ...text.xl, ...font("semibold"), letterSpacing: -0.5, color: colors.foreground };
    case "lead":
      return { ...text.xl, ...font("regular"), color: colors.mutedForeground };
    case "large":
      return { ...text.lg, ...font("semibold"), color: colors.foreground };
    case "small":
      return { fontSize: 14, lineHeight: 16, ...font("medium"), color: colors.foreground };
    case "muted":
      return { ...text.sm, ...font("regular"), color: colors.mutedForeground };
    case "code":
      return {
        ...text.sm,
        fontFamily: monospace,
        color: colors.foreground,
        backgroundColor: colors.muted,
      };
    default:
      return { ...text.base, ...font("regular"), color: colors.foreground };
  }
}

interface TextProps extends NativeTextProps {
  /** Type style: `h1`–`h4` are also announced as headings. */
  variant?: TextVariant;
  ref?: Ref<NativeText>;
}

/**
 * Text in the theme's type scale and colours. Inside a Button, Card or Badge it
 * takes that container's colour; `variant` and `style` override it. It scales
 * with the device's font size, as text should.
 *
 * @example
 * <Text variant="h2">Booking</Text>
 * <Text variant="muted">Friday, 8 pm</Text>
 */
function Text({ variant = "default", role, style, ...props }: TextProps) {
  const theme = useTheme();
  const inherited = useContext(TextStyleContext);
  return (
    <NativeText
      role={role ?? (HEADINGS.has(variant) ? "heading" : undefined)}
      style={[
        variantStyle("default", theme),
        inherited,
        variant === "default" ? null : variantStyle(variant, theme),
        style,
      ]}
      {...props}
    />
  );
}

export { Text, TextStyleContext, type TextProps, type TextVariant };
