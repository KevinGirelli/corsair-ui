import {
  Children,
  isValidElement,
  useContext,
  createContext,
  type ReactElement,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, withAlpha } from "@/registry/native/lib/theme";
import { Text } from "@/registry/native/ui/text";

/** How far the centre mark rises above the bar. The dock reserves this space. */
const LIFT = 28;
const BAR = 64;
const MARK = 64;

interface DockProps {
  /** The `value` of the selected destination. */
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

interface DockItemProps {
  value: string;
  label: string;
  children?: ReactNode;
}

interface DockMarkProps {
  value: string;
  label: string;
  children: ReactNode;
}

const ToneContext = createContext<string | undefined>(undefined);

/** The colour of the selected destination, for an icon drawn inside an item. */
function useDockTone(): string | undefined {
  return useContext(ToneContext);
}

/**
 * A bottom bar of destinations with one raised centre mark. Destinations only:
 * the mark is a place, the same as the items beside it. The selected label
 * uses `colors.ring`. Give the bar an `accessibilityLabel` is unnecessary;
 * each item names itself.
 *
 * @example
 * <Dock value={tab} onValueChange={setTab}>
 *   <DockItem value="home" label="Home" />
 *   <DockMark value="play" label="Play"><Mark /></DockMark>
 *   <DockItem value="you" label="You" />
 * </Dock>
 */
function Dock({ value, onValueChange, children }: DockProps) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const items = Children.toArray(children).filter(isDockChild);

  return (
    <View style={{ paddingTop: LIFT }}>
      <View
        style={[
          styles.bar,
          {
            top: LIFT,
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.xl + 10,
            borderTopRightRadius: radius.xl + 10,
          },
        ]}
      />
      <View style={[styles.row, { paddingBottom: insets.bottom }]}>
        {items.map((item) => {
          const selected = item.props.value === value;
          const mark = item.type === DockMark;
          return (
            <Pressable
              key={item.props.value}
              accessibilityRole="tab"
              accessibilityLabel={item.props.label}
              accessibilityState={{ selected }}
              onPress={() => onValueChange(item.props.value)}
              style={mark ? styles.markTab : styles.tab}
            >
              {mark ? (
                <View
                  style={[
                    styles.mark,
                    {
                      borderColor: selected ? colors.ring : withAlpha(colors.ring, 0.4),
                      backgroundColor: selected ? withAlpha(colors.ring, 0.22) : colors.background,
                    },
                  ]}
                >
                  {item.props.children}
                </View>
              ) : (
                <ToneContext.Provider value={selected ? colors.ring : colors.mutedForeground}>
                  {item.props.children}
                </ToneContext.Provider>
              )}
              <Text
                variant="small"
                style={{
                  color: selected ? colors.ring : colors.mutedForeground,
                  fontWeight: selected ? "700" : "500",
                }}
              >
                {item.props.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DockItem(_props: DockItemProps) {
  return null;
}

function DockMark(_props: DockMarkProps) {
  return null;
}

function isDockChild(node: ReactNode): node is ReactElement<DockItemProps> {
  return isValidElement<DockItemProps>(node) && (node.type === DockItem || node.type === DockMark);
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
  },
  row: {
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    height: BAR,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  markTab: {
    flex: 1,
    height: BAR,
    marginTop: -LIFT,
    alignItems: "center",
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

export {
  Dock,
  DockItem,
  DockMark,
  useDockTone,
  type DockItemProps,
  type DockMarkProps,
  type DockProps,
};
