import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { themes, ThemeProvider, useTheme } from "@/registry/native/lib/theme";
import { CountUp } from "@/registry/native/ui/count-up";
import { Dock, DockItem, DockMark } from "@/registry/native/ui/dock";
import { Sticker } from "@/registry/native/ui/sticker";
import { Text } from "@/registry/native/ui/text";

const { colors } = themes.light;

function DockHarness() {
  const [value, setValue] = useState("home");
  return (
    <SafeAreaProvider>
      <Dock value={value} onValueChange={setValue}>
        <DockItem value="home" label="Home" />
        <DockMark value="play" label="Play">
          <Text>Mark</Text>
        </DockMark>
        <DockItem value="you" label="You" />
      </Dock>
    </SafeAreaProvider>
  );
}

describe("Dock", () => {
  it("selects the pressed destination and paints its label with the ring", async () => {
    await render(<DockHarness />);
    expect(screen.getByRole("tab", { name: "Home", selected: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("tab", { name: "You" }));
    expect(screen.getByRole("tab", { name: "You", selected: true })).toBeOnTheScreen();
    expect(screen.getByText("You")).toHaveStyle({ color: colors.ring });
  });
});

describe("CountUp", () => {
  it("shows the final formatted number when the duration is zero", async () => {
    await render(<CountUp value={12} duration={0} format={(value) => `${value} days`} />);
    expect(screen.getByText("12 days")).toHaveStyle({
      fontSize: 56,
      fontVariant: ["tabular-nums"],
    });
  });
});

describe("Sticker", () => {
  it("draws a dashed tile until it is earned", async () => {
    await render(<Sticker index={2} title="Week" detail="Seven days" progress={0.5} />);
    expect(screen.getByText("#02")).toBeOnTheScreen();
    expect(screen.getByText("Week")).toBeOnTheScreen();
  });
});

describe("display text", () => {
  it("is a large tabular number and is not a heading", async () => {
    await render(<Text variant="display">42</Text>);
    expect(screen.getByText("42")).toHaveStyle({ fontSize: 56, letterSpacing: -1.5 });
    expect(screen.queryByRole("heading", { name: "42" })).toBeNull();
  });
});

function RingName() {
  const { colors } = useTheme();
  return <Text>{colors.ring}</Text>;
}

describe("ring override", () => {
  it("replaces the ring under a provider and leaves the shared theme alone", async () => {
    await render(
      <ThemeProvider ring="#E8B4C4">
        <RingName />
      </ThemeProvider>
    );
    expect(screen.getByText("#E8B4C4")).toBeOnTheScreen();
    expect(themes.light.colors.ring).toBe("#737373");
  });
});
