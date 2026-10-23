import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme, withAlpha } from "@/registry/native/lib/theme";
import { Text } from "@/registry/native/ui/text";

interface StickerProps {
  /** Position in the album, starting at 1. Shown as `#01`. */
  index: number;
  title: string;
  /** What it took, or the date it was earned. */
  detail: string;
  earned?: boolean;
  /** How close a locked sticker is, from 0 to 1. `0` hides the track. */
  progress?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * One tile of an album. An earned sticker is a filled card; a locked one is a
 * dashed outline with an optional progress track in `colors.ring`. The tile
 * does not know what the sticker means.
 *
 * @example
 * <Sticker index={1} title="First" detail="Post anything" earned={false} progress={0} />
 */
function Sticker({
  index,
  title,
  detail,
  earned = false,
  progress = 0,
  children,
  style,
}: StickerProps) {
  const { colors, radius } = useTheme();
  const amount = Math.min(Math.max(progress, 0), 1);

  return (
    <View
      style={[
        styles.tile,
        {
          borderRadius: radius.lg + 6,
          backgroundColor: earned ? colors.card : colors.background,
          borderColor: earned ? colors.border : colors.mutedForeground,
          borderStyle: earned ? "solid" : "dashed",
        },
        style,
      ]}
    >
      <Text variant="muted" style={styles.index}>{`#${String(index).padStart(2, "0")}`}</Text>
      <View
        style={[
          styles.medal,
          { backgroundColor: earned ? withAlpha(colors.ring, 0.28) : colors.muted },
        ]}
      >
        {children}
      </View>
      <Text style={styles.center}>{title}</Text>
      <Text variant="muted" style={styles.center}>
        {detail}
      </Text>
      {!earned && amount > 0 ? (
        <View style={[styles.track, { backgroundColor: colors.muted }]}>
          <View
            style={[styles.fill, { width: `${amount * 100}%`, backgroundColor: colors.ring }]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderWidth: 1.5,
  },
  index: {
    position: "absolute",
    top: 10,
    left: 12,
  },
  medal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    textAlign: "center",
  },
  track: {
    width: "70%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});

export { Sticker, type StickerProps };
