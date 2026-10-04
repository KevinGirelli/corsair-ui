import type { Ref } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/registry/native/lib/theme";

interface SeparatorProps extends ViewProps {
  orientation?: "horizontal" | "vertical";
  /**
   * Purely visual (the default): screen readers skip it. Set it to false when
   * the line separates content in a way that matters for understanding it.
   */
  decorative?: boolean;
  ref?: Ref<View>;
}

/**
 * A hairline between items or sections in the border colour. Horizontal lines
 * fill the width; vertical ones fill the height of a row (give the row a
 * height or `alignItems: "stretch"`).
 */
function Separator({
  orientation = "horizontal",
  decorative = true,
  style,
  ...props
}: SeparatorProps) {
  const { colors } = useTheme();
  return (
    <View
      role={decorative ? "none" : "separator"}
      aria-hidden={decorative || undefined}
      style={[
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        { backgroundColor: colors.border },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
});

export { Separator, type SeparatorProps };
