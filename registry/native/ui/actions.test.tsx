import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet, Text as NativeText } from "react-native";

import { themes } from "@/registry/native/lib/theme";
import { Badge } from "@/registry/native/ui/badge";
import { Button } from "@/registry/native/ui/button";
import { Text } from "@/registry/native/ui/text";

const { colors } = themes.light;

/** The flattened style of the first view inside a host element. */
function firstLayer(element: ReturnType<typeof screen.getByRole>) {
  const [first] = element.children;
  return typeof first === "object" ? StyleSheet.flatten(first.props.style) : undefined;
}

describe("Button", () => {
  it("is a button named by its label that calls onPress", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    await user.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("paints the label in the variant's foreground", async () => {
    await render(<Button variant="destructive">Cancel booking</Button>);
    expect(screen.getByText("Cancel booking")).toHaveStyle({ color: colors.destructiveForeground });
  });

  it("passes the label style to Corsair Text inside", async () => {
    await render(
      <Button variant="secondary">
        <Text>Share</Text>
      </Button>
    );
    expect(screen.getByText("Share")).toHaveStyle({
      color: colors.secondaryForeground,
      fontSize: 16,
      fontWeight: "500",
    });
  });

  it("blocks presses and reports busy while loading", async () => {
    const onPress = jest.fn();
    await render(
      <Button loading onPress={onPress}>
        Pay
      </Button>
    );
    const button = screen.getByRole("button", { name: "Pay" });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("is disabled at half opacity", async () => {
    await render(<Button disabled>Send</Button>);
    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ opacity: 0.5 });
  });

  it("grows small buttons to a 44 px touch area", async () => {
    await render(
      <>
        <Button size="sm">Small</Button>
        <Button size="icon-sm" accessibilityLabel="Close">
          <NativeText>×</NativeText>
        </Button>
        <Button>Default</Button>
      </>
    );
    expect(screen.getByRole("button", { name: "Small" }).props.hitSlop).toBe(4);
    expect(screen.getByRole("button", { name: "Close" }).props.hitSlop).toBe(4);
    expect(screen.getByRole("button", { name: "Default" }).props.hitSlop).toBeUndefined();
  });

  it("raised: the face sinks into its base while pressed", async () => {
    const face = (element: ReturnType<typeof screen.getByRole>) => {
      const second = element.children[1];
      return typeof second === "object" ? StyleSheet.flatten(second.props.style) : undefined;
    };
    const { rerender } = await render(<Button variant="raised">Book</Button>);
    const button = screen.getByRole("button", { name: "Book" });
    expect(button).toHaveStyle({ marginBottom: 4 });
    // The base is drawn first, 4 px lower than the face it holds up.
    expect(firstLayer(button)).toMatchObject({ top: 4, bottom: -4 });
    expect(face(button)?.transform).toBeUndefined();

    await rerender(
      <Button variant="raised" testOnly_pressed>
        Book
      </Button>
    );
    expect(face(screen.getByRole("button", { name: "Book" }))?.transform).toEqual([
      { translateY: 4 },
    ]);
  });
});

describe("Badge", () => {
  it("shows a status as a coloured dot on a neutral badge", async () => {
    await render(
      <Badge testID="badge" variant="success">
        Paid
      </Badge>
    );
    expect(screen.getByText("Paid")).toHaveStyle({ color: colors.foreground, fontSize: 12 });
    expect(screen.getByTestId("badge")).toHaveStyle({ borderColor: colors.border });
    expect(firstLayer(screen.getByTestId("badge"))).toMatchObject({
      width: 6,
      backgroundColor: colors.success,
    });
  });

  it("takes the variant colours for styles", async () => {
    await render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toHaveStyle({ color: colors.primaryForeground });
  });

  it("swaps the dot for an icon that gets the status colour", async () => {
    const icon = jest.fn(() => <NativeText>!</NativeText>);
    await render(
      <Badge variant="warning" icon={icon}>
        Pending
      </Badge>
    );
    expect(icon).toHaveBeenCalledWith({ color: colors.warning, size: 12 });
    expect(screen.getByText("!")).toBeOnTheScreen();
  });
});
