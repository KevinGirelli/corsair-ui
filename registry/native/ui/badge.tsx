import type { ReactNode, Ref } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme, type Theme } from "@/registry/native/lib/theme";
import { Text, TextStyleContext } from "@/registry/native/ui/text";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning";

const STATUS: ReadonlySet<BadgeVariant> = new Set(["destructive", "success", "warning"]);

type BadgeIcon = ReactNode | ((props: { color: string; size: number }) => ReactNode);

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  /**
   * Replaces the status dot. A function gets the status colour and a 12 px
   * size: `icon={({ color, size }) => <Check color={color} size={size} />}`.
   */
  icon?: BadgeIcon;
  /** A string becomes the label. */
  children?: ReactNode;
  ref?: Ref<View>;
}

function palette(variant: BadgeVariant, { colors }: Theme) {
  switch (variant) {
    case "default":
      return {
        background: colors.primary,
        foreground: colors.primaryForeground,
        border: "transparent",
      };
    case "secondary":
      return {
        background: colors.secondary,
        foreground: colors.secondaryForeground,
        border: "transparent",
      };
    default:
      return { background: "transparent", foreground: colors.foreground, border: colors.border };
  }
}

/**
 * A short status or metadata label. `default`, `secondary` and `outline`
 * are styles; `success`, `warning` and `destructive` are statuses, shown as a
 * coloured dot on a neutral badge, so the text has to say the status itself
 * ("Paid", not just a green dot).
 *
 * @example
 * <Badge variant="success">Confirmed</Badge>
 */
function Badge({ variant = "default", icon, children, style, ...props }: BadgeProps) {
  const theme = useTheme();
  const { colors, radius, text, font } = theme;
  const look = palette(variant, theme);
  const status = STATUS.has(variant)
    ? colors[variant as "destructive" | "success" | "warning"]
    : undefined;
  const mark =
    typeof icon === "function" ? icon({ color: status ?? look.foreground, size: 12 }) : icon;

  return (
    <View
      style={[
        styles.badge,
        { borderRadius: radius.md, backgroundColor: look.background, borderColor: look.border },
        style,
      ]}
      {...props}
    >
      {mark ?? (status ? <View style={[styles.dot, { backgroundColor: status }]} /> : null)}
      <TextStyleContext.Provider value={{ ...text.xs, ...font("medium"), color: look.foreground }}>
        {typeof children === "string" || typeof children === "number" ? (
          <Text numberOfLines={1}>{children}</Text>
        ) : (
          children
        )}
      </TextStyleContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export { Badge, type BadgeProps, type BadgeVariant };
