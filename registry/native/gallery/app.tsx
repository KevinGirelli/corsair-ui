import { useEffect, useState, type ReactNode } from "react";
import {
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeProvider, useTheme, type ColorScheme } from "@/registry/native/lib/theme";
import { Button } from "@/registry/native/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/registry/native/ui/segmented-control";
import { Separator } from "@/registry/native/ui/separator";
import { Text } from "@/registry/native/ui/text";
import { Toaster } from "@/registry/native/ui/toast";

import { demos } from "./demos";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { ITEMS, type GalleryItem } from "./items";

type Appearance = ColorScheme | "system";

interface Launch {
  /** One item to show on its own, as the docs site embeds it; null for the list. */
  item: string | null;
  scheme: ColorScheme | null;
}

/**
 * Reads `?item=button&scheme=dark` from the address the app was opened with:
 * the page's on the web, a deep link on a phone. Unknown values are ignored.
 */
function readLaunch(url: string | null | undefined): Launch {
  const params = new Map<string, string>();
  const query = url?.split("#")[0]?.split("?")[1] ?? "";
  for (const pair of query.split("&")) {
    const [key, value = ""] = pair.split("=");
    if (!key) continue;
    try {
      params.set(decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, " ")));
    } catch {
      // A malformed escape: skip that pair.
    }
  }
  const item = params.get("item");
  const scheme = params.get("scheme");
  return {
    item: ITEMS.some((entry) => entry.name === item) ? (item ?? null) : null,
    scheme: scheme === "light" || scheme === "dark" ? scheme : null,
  };
}

/**
 * Every React Native item with a demo. On a phone it opens on the list; the
 * docs site loads the web build with `?item=` and gets that item alone,
 * padded for the phone frame it draws around it.
 */
function App() {
  const [launch, setLaunch] = useState<Launch | null>(null);

  useEffect(() => {
    let active = true;
    const start = (url: string | null) => {
      if (active) setLaunch(readLaunch(url));
    };
    Linking.getInitialURL().then(start, () => start(null));
    return () => {
      active = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>{launch ? <Gallery launch={launch} /> : null}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Gallery({ launch }: { launch: Launch }) {
  const [appearance, setAppearance] = useState<Appearance>(launch.scheme ?? "system");
  const [open, setOpen] = useState(launch.item);
  const embedded = launch.item !== null;
  const item = ITEMS.find((entry) => entry.name === open);

  // Android's back button returns to the list.
  useEffect(() => {
    if (embedded || open === null) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setOpen(null);
      return true;
    });
    return () => subscription.remove();
  }, [embedded, open]);

  return (
    <ThemeProvider scheme={appearance === "system" ? undefined : appearance}>
      <Surface>
        {item ? (
          <ItemScreen
            key={item.name}
            item={item}
            embedded={embedded}
            onBack={embedded ? undefined : () => setOpen(null)}
          />
        ) : (
          <IndexScreen appearance={appearance} onAppearance={setAppearance} onOpen={setOpen} />
        )}
      </Surface>
      <Toaster offset={24} />
    </ThemeProvider>
  );
}

function Surface({ children }: { children: ReactNode }) {
  const { colors, scheme } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
      {children}
    </View>
  );
}

function IndexScreen({
  appearance,
  onAppearance,
  onOpen,
}: {
  appearance: Appearance;
  onAppearance: (appearance: Appearance) => void;
  onOpen: (name: string) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Text variant="h2">Corsair Native</Text>
      <Text variant="muted">
        {ITEMS.length} items from the React Native registry. Open one to try it.
      </Text>
      <SegmentedControl
        accessibilityLabel="Appearance"
        value={appearance}
        onValueChange={(value) => onAppearance(value as Appearance)}
        style={styles.appearance}
      >
        <SegmentedControlItem value="system">System</SegmentedControlItem>
        <SegmentedControlItem value="light">Light</SegmentedControlItem>
        <SegmentedControlItem value="dark">Dark</SegmentedControlItem>
      </SegmentedControl>
      <View>
        {ITEMS.map((entry, index) => (
          <View key={entry.name}>
            {index > 0 ? <Separator /> : null}
            <Pressable
              role="button"
              accessibilityHint={entry.description}
              onPress={() => onOpen(entry.name)}
              style={({ pressed }) => [styles.entry, pressed ? styles.pressed : null]}
            >
              <View style={styles.entryText}>
                <Text variant="large">{entry.title}</Text>
                <Text variant="muted" numberOfLines={2}>
                  {entry.description}
                </Text>
              </View>
              <ChevronRightIcon color={colors.mutedForeground} size={18} />
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function ItemScreen({
  item,
  embedded,
  onBack,
}: {
  item: GalleryItem;
  embedded: boolean;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const Demo = demos[item.name];
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.screen,
        {
          // Embedded, the docs site draws a phone with a cut-out over the top.
          paddingTop: insets.top + (embedded ? 56 : 12),
          // Room for toasts at the bottom.
          paddingBottom: insets.bottom + 96,
        },
      ]}
    >
      {onBack ? (
        <Button variant="ghost" size="sm" onPress={onBack} style={styles.back}>
          <ChevronLeftIcon color={colors.foreground} />
          <Text>All items</Text>
        </Button>
      ) : null}
      <Text variant="h3">{item.title}</Text>
      {embedded ? null : <Text variant="muted">{item.description}</Text>}
      <View style={styles.demo}>
        {Demo ? <Demo /> : <Text variant="muted">No demo for this item yet.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  screen: {
    gap: 8,
    paddingHorizontal: 20,
  },
  appearance: {
    marginVertical: 16,
  },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  entryText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  back: {
    alignSelf: "flex-start",
    marginStart: -12,
    marginBottom: 8,
  },
  demo: {
    gap: 28,
    marginTop: 20,
  },
});

export { App, readLaunch };
