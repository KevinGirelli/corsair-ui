/**
 * Every demo of the gallery under react-native-web, in jsdom. Expo apps run
 * in browsers too, and react-native-web lacks some React Native APIs (such as
 * useAnimatedValue and AccessibilityInfo.announceForAccessibilityWithOptions):
 * an item that reaches for one fails here instead of in someone's web build.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { App } from "./app";
import { demos } from "./demos";
import { ITEMS } from "./items";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.restoreAllMocks();
});

/** Starts the gallery as if the page had this address (react-native-web reads it once, on load). */
async function launch(url: string) {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(url);
  await act(async () => root.render(<App />));
}

/** Clicks the button whose text is exactly `label`, the way a pointer would. */
async function press(label: string) {
  const buttons = [...document.querySelectorAll<HTMLElement>("[role=button], button")];
  const target = buttons.find((element) => element.textContent?.trim() === label);
  if (!target) {
    const names = buttons.map((element) => element.textContent?.trim()).join(", ");
    throw new Error(`No button named "${label}" among: ${names}`);
  }
  await act(async () => target.click());
}

it.each(ITEMS.map((item) => item.name))("renders the %s demo", async (name) => {
  const Demo = demos[name]!;
  await act(async () =>
    root.render(
      <GestureHandlerRootView>
        <SafeAreaProvider>
          <Demo />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    )
  );
  expect(container.textContent).not.toBe("");
});

it("opens on the list without an item in the address", async () => {
  await launch("http://localhost/");
  expect(container.textContent).toContain("items from the React Native registry");
});

it("opens one item from the address, as the docs site embeds it", async () => {
  await launch("http://localhost/?item=segmented-control&scheme=dark");
  expect(container.textContent).toContain("3 games coming up");
  expect(container.textContent).not.toContain("items from the React Native registry");
  expect(container.textContent).not.toContain("All items");
});

it("shows toasts in a live region", async () => {
  await launch("http://localhost/?item=toast");
  await press("Show a toast");
  expect(document.querySelector("[aria-live=polite]")?.textContent).toContain("Saved");
});

it("opens the drawer", async () => {
  await launch("http://localhost/?item=drawer");
  await press("Invite players");
  expect(document.body.textContent).toContain("Invite your crew");
});
