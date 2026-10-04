import { render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { App, readLaunch } from "./app";
import { demos } from "./demos";
import { ITEMS } from "./items";

describe("gallery", () => {
  it("lists every item of the registry, the theme first", () => {
    expect(ITEMS).toHaveLength(22);
    expect(ITEMS[0]?.name).toBe("theme");
    expect(new Set(ITEMS.map((item) => item.name)).size).toBe(ITEMS.length);
  });

  it("has a demo for every item", () => {
    expect(ITEMS.filter((item) => !demos[item.name]).map((item) => item.name)).toEqual([]);
  });

  it.each(ITEMS.map((item) => item.name))("renders the %s demo", async (name) => {
    const Demo = demos[name]!;
    await render(
      <GestureHandlerRootView>
        <SafeAreaProvider>
          <Demo />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
    expect(screen.toJSON()).not.toBeNull();
  });

  it("opens on the list when there is nothing in the address", async () => {
    await render(<App />);
    expect(await screen.findByText("Corsair Native")).toBeOnTheScreen();
    expect(screen.getByText("Wave Rating")).toBeOnTheScreen();
  });
});

describe("readLaunch", () => {
  it("reads the item and the scheme from the address", () => {
    expect(
      readLaunch(
        "https://example.github.io/corsair-ui/native-preview/?item=wave-rating&scheme=dark"
      )
    ).toEqual({ item: "wave-rating", scheme: "dark" });
  });

  it("ignores items that do not exist and schemes it does not know", () => {
    expect(readLaunch("https://example.com/?item=../../secrets&scheme=sepia")).toEqual({
      item: null,
      scheme: null,
    });
  });

  it("survives a missing address, a fragment and a malformed escape", () => {
    expect(readLaunch(null)).toEqual({ item: null, scheme: null });
    expect(readLaunch("https://example.com/?item=button#top")).toEqual({
      item: "button",
      scheme: null,
    });
    expect(readLaunch("https://example.com/?item=%E0%A4%A&scheme=light")).toEqual({
      item: null,
      scheme: "light",
    });
  });
});
