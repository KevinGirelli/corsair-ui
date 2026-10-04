import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";

import { themes } from "@/registry/native/lib/theme";
import { Checkbox } from "@/registry/native/ui/checkbox";
import { SegmentedControl, SegmentedControlItem } from "@/registry/native/ui/segmented-control";
import { Switch } from "@/registry/native/ui/switch";

const { colors } = themes.light;

describe("Switch", () => {
  it("toggles on press and reports the new state", async () => {
    const user = userEvent.setup();
    const onCheckedChange = jest.fn();
    await render(<Switch accessibilityLabel="Reminders" onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch", { name: "Reminders" });
    expect(control).not.toBeChecked();
    await user.press(control);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(control).toBeChecked();
  });

  it("follows a controlled value", async () => {
    const { rerender } = await render(
      <Switch accessibilityLabel="Open game" checked={false} onCheckedChange={() => {}} />
    );
    await fireEvent.press(screen.getByRole("switch", { name: "Open game" }));
    expect(screen.getByRole("switch", { name: "Open game" })).not.toBeChecked();
    await rerender(<Switch accessibilityLabel="Open game" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch", { name: "Open game" })).toBeChecked();
  });

  it("does nothing while disabled", async () => {
    const onCheckedChange = jest.fn();
    await render(<Switch accessibilityLabel="Sync" disabled onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch", { name: "Sync" });
    expect(control).toBeDisabled();
    await fireEvent.press(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("reaches a 44 px touch area", async () => {
    await render(<Switch accessibilityLabel="Small" size="sm" />);
    expect(screen.getByRole("switch", { name: "Small" }).props.hitSlop).toBe(12);
  });
});

describe("Checkbox", () => {
  it("checks and unchecks on press", async () => {
    const user = userEvent.setup();
    const onCheckedChange = jest.fn();
    await render(<Checkbox accessibilityLabel="Terms" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Terms" });
    await user.press(box);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(box).toBeChecked();
    expect(box).toHaveStyle({ backgroundColor: colors.primary, borderColor: colors.primary });
    await user.press(box);
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
    expect(box).not.toBeChecked();
  });

  it("reports indeterminate as mixed, and pressing it checks it", async () => {
    const onCheckedChange = jest.fn();
    await render(
      <Checkbox
        accessibilityLabel="All"
        defaultChecked="indeterminate"
        onCheckedChange={onCheckedChange}
      />
    );
    const box = screen.getByRole("checkbox", { name: "All" });
    expect(box).toBePartiallyChecked();
    await fireEvent.press(box);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
  });

  it("marks errors with a destructive border", async () => {
    await render(<Checkbox accessibilityLabel="Age" aria-invalid />);
    expect(screen.getByRole("checkbox", { name: "Age" })).toHaveStyle({
      borderColor: colors.destructive,
    });
  });
});

describe("SegmentedControl", () => {
  function Audience({ onValueChange }: { onValueChange?: (value: string) => void }) {
    const [value, setValue] = useState("players");
    return (
      <SegmentedControl
        accessibilityLabel="Audience"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
      >
        <SegmentedControlItem value="players">Players</SegmentedControlItem>
        <SegmentedControlItem value="venues">Venues</SegmentedControlItem>
        <SegmentedControlItem value="clubs" disabled>
          Clubs
        </SegmentedControlItem>
      </SegmentedControl>
    );
  }

  it("is a radio group with one checked option", async () => {
    await render(<Audience />);
    // The group is not one accessibility element, or iOS would merge the options into it.
    const group = screen.getByLabelText("Audience");
    expect(group.props.role).toBe("radiogroup");
    expect(group.props.accessible).toBeUndefined();
    expect(screen.getByRole("radio", { name: "Players" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Venues" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Clubs" })).toBeDisabled();
    expect(screen.getByText("Players")).toHaveStyle({ color: colors.foreground });
    expect(screen.getByText("Venues")).toHaveStyle({ color: colors.mutedForeground });
  });

  it("moves to the pressed option and never goes empty", async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    await render(<Audience onValueChange={onValueChange} />);
    await user.press(screen.getByRole("radio", { name: "Venues" }));
    expect(onValueChange).toHaveBeenLastCalledWith("venues");
    expect(screen.getByRole("radio", { name: "Venues" })).toBeChecked();
    await user.press(screen.getByRole("radio", { name: "Venues" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("paints the active pill itself until it is measured, then draws the thumb", async () => {
    await render(<Audience />);
    const players = screen.getByRole("radio", { name: "Players" });
    expect(players).toHaveStyle({ backgroundColor: colors.background });
    await fireEvent(screen.getByLabelText("Audience"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 308, height: 44 } },
    });
    expect(screen.getByRole("radio", { name: "Players" })).not.toHaveStyle({
      backgroundColor: colors.background,
    });
  });

  it("starts uncontrolled from defaultValue", async () => {
    await render(
      <SegmentedControl accessibilityLabel="Show" defaultValue="played">
        <SegmentedControlItem value="upcoming">Upcoming</SegmentedControlItem>
        <SegmentedControlItem value="played">Played</SegmentedControlItem>
      </SegmentedControl>
    );
    expect(screen.getByRole("radio", { name: "Played" })).toBeChecked();
    await fireEvent.press(screen.getByRole("radio", { name: "Upcoming" }));
    expect(screen.getByRole("radio", { name: "Upcoming" })).toBeChecked();
  });
});
