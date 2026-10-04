import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

import { haptic } from "@/registry/native/lib/haptics";
import { Rating } from "@/registry/native/ui/rating";
import { WaveRating } from "@/registry/native/ui/wave-rating";

jest.mock("@/registry/native/lib/haptics", () => ({ haptic: jest.fn() }));

const ROW = 140;
/** The middle of star `n` in a 140 px row of five. */
const at = (n: number) => (n - 0.5) * (ROW / 5);

async function layOut(slider: ReturnType<typeof screen.getByRole>) {
  await fireEvent(slider, "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: ROW, height: 24 } },
  });
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("Rating", () => {
  it("read-only: one image named with the value", async () => {
    await render(<Rating readOnly value={3.5} accessibilityLabel="Court" />);
    expect(screen.getByRole("img", { name: "Court: 3.5 out of 5" })).toBeOnTheScreen();
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("interactive: one adjustable control that taps and swipes change", async () => {
    const onValueChange = jest.fn();
    await render(<Rating defaultValue={2} onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider", { name: "Rating" });
    expect(slider).toHaveAccessibilityValue({ min: 0, max: 5, now: 2, text: "2 out of 5" });

    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    expect(slider).toHaveAccessibilityValue({ now: 3 });
    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onValueChange).toHaveBeenLastCalledWith(2);
  });

  it("never steps below one star or past the last", async () => {
    const onValueChange = jest.fn();
    await render(
      <Rating value={5} onValueChange={onValueChange} getValueLabel={(v) => `${v} stars`} />
    );
    const slider = screen.getByRole("slider", { name: "Rating" });
    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(slider).toHaveAccessibilityValue({ text: "5 stars" });
  });

  it("picks the star that is tapped, with a 44 px touch area", async () => {
    const onValueChange = jest.fn();
    await render(<Rating onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider", { name: "Rating" });
    const fourth = slider.children[3];
    if (typeof fourth !== "object") throw new Error("missing star");
    expect(fourth.props.hitSlop).toMatchObject({ top: 10, bottom: 10 });
    await fireEvent.press(fourth);
    expect(onValueChange).toHaveBeenLastCalledWith(4);
  });

  it("offers no actions while disabled", async () => {
    await render(<Rating disabled defaultValue={1} />);
    const slider = screen.getByRole("slider", { name: "Rating" });
    expect(slider).toBeDisabled();
    expect(slider.props.accessibilityActions).toBeUndefined();
  });
});

describe("WaveRating", () => {
  it("keeps the rating's adjustable control", async () => {
    await render(<WaveRating defaultValue={2} accessibilityLabel="Rate the court" />);
    expect(screen.getByRole("slider", { name: "Rate the court" })).toHaveAccessibilityValue({
      now: 2,
      text: "2 out of 5",
    });
  });

  it("ticks once per star under a sweeping finger, and commits where it lets go", async () => {
    const onValueChange = jest.fn();
    await render(<WaveRating onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider", { name: "Rating" });
    await layOut(slider);

    // One whole sweep: the test utility always ends the gesture after the last event.
    await act(async () => {
      fireGestureHandler(getByGestureTestId("wave-rating-sweep"), [
        { state: State.BEGAN, x: at(1) },
        { state: State.ACTIVE, x: at(1) },
        { x: at(2) },
        { x: at(2) + 4 },
        { x: at(4) },
      ]);
    });
    expect(jest.mocked(haptic).mock.calls).toEqual([
      ["selection"],
      ["selection"],
      ["selection"],
      ["light"],
    ]);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    expect(slider).toHaveAccessibilityValue({ now: 4 });
    // The tip goes away with the finger.
    expect(screen.queryByText("4 stars", { includeHiddenElements: true })).toBeNull();
  });

  it("commits a tap", async () => {
    const onValueChange = jest.fn();
    await render(<WaveRating onValueChange={onValueChange} />);
    await layOut(screen.getByRole("slider", { name: "Rating" }));
    await act(async () => {
      fireGestureHandler(getByGestureTestId("wave-rating-tap"), [
        { state: State.BEGAN, x: at(3) },
        { state: State.ACTIVE, x: at(3) },
        { state: State.END, x: at(3) },
      ]);
    });
    expect(onValueChange).toHaveBeenLastCalledWith(3);
  });

  it("clamps a sweep past the end, and can stay silent", async () => {
    const onValueChange = jest.fn();
    await render(<WaveRating haptics={false} showTip={false} onValueChange={onValueChange} />);
    await layOut(screen.getByRole("slider", { name: "Rating" }));
    await act(async () => {
      fireGestureHandler(getByGestureTestId("wave-rating-sweep"), [
        { state: State.BEGAN, x: at(4) },
        { state: State.ACTIVE, x: ROW + 60 },
        { state: State.END, x: ROW + 60 },
      ]);
    });
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    expect(haptic).not.toHaveBeenCalled();
  });

  it("steps with the screen reader's swipes", async () => {
    const onValueChange = jest.fn();
    await render(<WaveRating defaultValue={3} onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider", { name: "Rating" });
    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onValueChange).toHaveBeenLastCalledWith(2);
  });

  it("shows the read-only rating as an image", async () => {
    await render(<WaveRating readOnly value={4} />);
    expect(screen.getByRole("img", { name: "Rating: 4 out of 5" })).toBeOnTheScreen();
  });
});
