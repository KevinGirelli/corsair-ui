import type { ReactNode, Ref } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/registry/native/lib/theme";
import { Text, TextStyleContext, type TextProps } from "@/registry/native/ui/text";

type AlertVariant = "default" | "destructive" | "success" | "warning";

type AlertIcon = ReactNode | ((props: { color: string; size: number }) => ReactNode);

interface AlertProps extends ViewProps {
  variant?: AlertVariant;
  /**
   * Shown at the start. A function gets the variant's colour and a 16 px size:
   * `icon={({ color, size }) => <TriangleAlert color={color} size={size} />}`.
   */
  icon?: AlertIcon;
  children?: ReactNode;
  ref?: Ref<View>;
}

/**
 * A callout for something the user should know, on the card surface; the
 * variant colours the icon. It is read as one element, title then
 * description. For an alert that appears after an action, also call
 * `AccessibilityInfo.announceForAccessibility` so it is heard right away.
 *
 * @example
 * <Alert variant="warning" icon={({ color, size }) => <Clock color={color} size={size} />}>
 *   <AlertTitle>Payment pending</AlertTitle>
 *   <AlertDescription>Pay your share by Friday to keep your spot.</AlertDescription>
 * </Alert>
 */
function Alert({ variant = "default", icon, style, children, ...props }: AlertProps) {
  const { colors, radius, text } = useTheme();
  const tone = variant === "default" ? colors.foreground : colors[variant];
  const mark = typeof icon === "function" ? icon({ color: tone, size: 16 }) : icon;

  return (
    <TextStyleContext.Provider value={{ ...text.sm, color: colors.cardForeground }}>
      <View
        role="alert"
        accessible
        style={[
          styles.alert,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg },
          style,
        ]}
        {...props}
      >
        {mark ? <View style={styles.icon}>{mark}</View> : null}
        <View style={styles.body}>{children}</View>
      </View>
    </TextStyleContext.Provider>
  );
}

function AlertTitle({ style, ...props }: TextProps) {
  const { font } = useTheme();
  return <Text style={[styles.title, font("medium"), style]} {...props} />;
}

function AlertDescription({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <Text style={[styles.description, { color: colors.mutedForeground }, style]} {...props} />;
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    lineHeight: 20,
    letterSpacing: -0.35,
  },
  description: {
    lineHeight: 22,
  },
});

export { Alert, AlertDescription, AlertTitle, type AlertProps, type AlertVariant };
