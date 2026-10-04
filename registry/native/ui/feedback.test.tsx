import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Animated } from "react-native";

import { themes, withAlpha } from "@/registry/native/lib/theme";
import { Progress } from "@/registry/native/ui/progress";
import { Skeleton } from "@/registry/native/ui/skeleton";
import { Spinner } from "@/registry/native/ui/spinner";

const { colors } = themes.light;

function reduceMotion(enabled: boolean) {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(enabled);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Spinner", () => {
  it("is a busy progress indicator announced as Loading", async () => {
    await render(<Spinner />);
    const spinner = screen.getByRole("progressbar", { name: "Loading" });
    expect(spinner).toBeBusy();
    expect(spinner.props.color).toBe(colors.mutedForeground);
    expect(spinner.props.size).toBe("small");
  });

  it("takes a more specific name and the large size", async () => {
    await render(<Spinner size="lg" accessibilityLabel="Loading courts" />);
    expect(screen.getByRole("progressbar", { name: "Loading courts" }).props.size).toBe("large");
  });
});

describe("Skeleton", () => {
  it("is hidden from screen readers and pulses until Reduce Motion is on", async () => {
    reduceMotion(false);
    const loop = jest.spyOn(Animated, "loop");
    await render(<Skeleton testID="skeleton" style={{ width: 120, height: 16 }} />);
    const skeleton = screen.getByTestId("skeleton", { includeHiddenElements: true });
    expect(skeleton.props["aria-hidden"]).toBe(true);
    expect(skeleton).toHaveStyle({ backgroundColor: colors.accent, width: 120 });
    expect(loop).toHaveBeenCalledTimes(1);
  });

  it("holds still with Reduce Motion", async () => {
    reduceMotion(true);
    const loop = jest.spyOn(Animated, "loop");
    await render(<Skeleton testID="skeleton" />);
    await act(async () => {});
    // The first render may start the pulse; once the setting is known it stops and stays still.
    const calls = loop.mock.calls.length;
    await act(async () => {});
    expect(loop.mock.calls.length).toBe(calls);
    expect(screen.getByTestId("skeleton", { includeHiddenElements: true })).toHaveStyle({
      opacity: 1,
    });
  });
});

describe("Progress", () => {
  it("reports its value to screen readers", async () => {
    await render(<Progress value={40} accessibilityLabel="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 100, now: 40, text: "40%" });
    expect(bar).toHaveStyle({ backgroundColor: withAlpha(colors.primary, 0.2), height: 8 });
    expect(bar).not.toBeBusy();
  });

  it("clamps the value and takes a custom label", async () => {
    await render(
      <Progress
        value={20}
        max={14}
        accessibilityLabel="Players"
        getValueLabel={(value, max) => `${value} of ${max}`}
      />
    );
    expect(screen.getByRole("progressbar", { name: "Players" })).toHaveAccessibilityValue({
      now: 14,
      text: "14 of 14",
    });
  });

  it("is busy and has no value while indeterminate", async () => {
    await render(<Progress value={null} accessibilityLabel="Syncing" />);
    const bar = screen.getByRole("progressbar", { name: "Syncing" });
    expect(bar).toBeBusy();
    expect(bar.props["aria-valuenow"]).toBeUndefined();
  });
});
