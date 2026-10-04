import type { ReactNode, Ref } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/registry/native/lib/theme";
import { Text, type TextProps } from "@/registry/native/ui/text";

type PartProps = ViewProps & { ref?: Ref<View> };

interface EmptyStateProps extends PartProps {
  /** `dashed` draws a dashed border around it; `plain` has none. */
  variant?: "dashed" | "plain";
}

/**
 * What a screen shows when there is nothing to list yet: an icon, a title
 * that says what is missing, a line about what to do, and actions. Compose it
 * from EmptyStateIcon, EmptyStateTitle, EmptyStateDescription and
 * EmptyStateActions.
 *
 * @example
 * <EmptyState>
 *   <EmptyStateIcon>{({ color, size }) => <CalendarX color={color} size={size} />}</EmptyStateIcon>
 *   <EmptyStateTitle>No games this week</EmptyStateTitle>
 *   <EmptyStateDescription>Book a court and invite your crew.</EmptyStateDescription>
 *   <EmptyStateActions><Button>Find a court</Button></EmptyStateActions>
 * </EmptyState>
 */
function EmptyState({ variant = "dashed", style, ...props }: EmptyStateProps) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.root,
        { borderRadius: radius.lg },
        variant === "dashed"
          ? { borderWidth: 1, borderStyle: "dashed", borderColor: colors.border }
          : null,
        style,
      ]}
      {...props}
    />
  );
}

interface EmptyStateIconProps extends Omit<PartProps, "children"> {
  /** An icon, or a function that gets the muted colour and a 24 px size. */
  children?: ReactNode | ((props: { color: string; size: number }) => ReactNode);
}

/** A 48 px circle around a 24 px icon. Decorative: hidden from screen readers. */
function EmptyStateIcon({ style, children, ...props }: EmptyStateIconProps) {
  const { colors } = useTheme();
  return (
    <View aria-hidden style={[styles.icon, { backgroundColor: colors.muted }, style]} {...props}>
      {typeof children === "function"
        ? children({ color: colors.mutedForeground, size: 24 })
        : children}
    </View>
  );
}

function EmptyStateTitle({ style, ...props }: TextProps) {
  const { text, font } = useTheme();
  return (
    <Text role="heading" style={[text.lg, font("semibold"), styles.title, style]} {...props} />
  );
}

function EmptyStateDescription({ style, ...props }: TextProps) {
  return <Text variant="muted" style={[styles.description, style]} {...props} />;
}

function EmptyStateActions({ style, ...props }: PartProps) {
  return <View style={[styles.actions, style]} {...props} />;
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 32,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.45,
  },
  description: {
    textAlign: "center",
    maxWidth: 384,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
});

export {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  type EmptyStateProps,
};
