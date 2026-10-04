import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WaveRating } from "@/registry/default/ui/wave-rating";
import { installMatchMedia } from "@/test-utils/browser";

const STAR = 24;

/** Lays the radios out in a row, 24 px apart, since jsdom has no layout. */
function layOut() {
  screen.getAllByRole("radio").forEach((radio, index) => {
    const left = index * STAR;
    radio.getBoundingClientRect = () =>
      ({
        left,
        right: left + STAR,
        top: 0,
        bottom: STAR,
        width: STAR,
        height: STAR,
        x: left,
        y: 0,
      }) as DOMRect;
    Object.defineProperty(radio, "offsetLeft", { configurable: true, value: left });
    Object.defineProperty(radio, "offsetWidth", { configurable: true, value: STAR });
  });
}

/** The middle of star `n`, in client coordinates. */
const at = (n: number) => (n - 1) * STAR + STAR / 2;

/** Each star's lift, to two decimals. */
function lifts() {
  return [...document.querySelectorAll<HTMLElement>("[data-slot=wave-rating-lift]")].map(
    (lift) => Math.round(Number(lift.style.getPropertyValue("--wave-rating-lift")) * 100) / 100
  );
}

let animate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  installMatchMedia();
  animate = vi.fn();
  Element.prototype.animate = animate as unknown as Element["animate"];
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (Element.prototype as Partial<Element>).animate;
});

describe("WaveRating", () => {
  it("keeps the rating's radio group: a radio per star, named by its score", () => {
    render(<WaveRating defaultValue={2} aria-label="Rate the court" />);
    expect(screen.getByRole("radiogroup", { name: "Rate the court" })).toBeTruthy();
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("aria-label"))).toEqual([
      "1 star",
      "2 stars",
      "3 stars",
      "4 stars",
      "5 stars",
    ]);
    expect(screen.getByRole("radio", { name: "2 stars" }).getAttribute("aria-checked")).toBe(
      "true"
    );
  });

  it("commits a finger sweep where it lets go, with a pop", () => {
    const onValueChange = vi.fn();
    render(<WaveRating onValueChange={onValueChange} />);
    layOut();
    const group = screen.getByRole("radiogroup");

    fireEvent.pointerDown(group, { pointerId: 1, pointerType: "touch", button: 0, clientX: at(1) });
    expect(group.hasAttribute("data-previewing")).toBe(true);
    fireEvent.pointerMove(group, { pointerId: 1, pointerType: "touch", clientX: at(4) });
    // The wave crests under the finger and fades out behind it.
    expect(lifts()).toEqual([0, 0.33, 0.67, 1, 0]);
    expect(group.querySelectorAll("[data-filled=true]")).toHaveLength(4);
    expect(
      screen.getByText("4 stars", { selector: "[data-slot=wave-rating-tip] span" })
    ).toBeTruthy();

    fireEvent.pointerUp(group, { pointerId: 1, pointerType: "touch", clientX: at(4) });
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    expect(group.hasAttribute("data-previewing")).toBe(false);
    expect(screen.getByRole("radio", { name: "4 stars" }).getAttribute("aria-checked")).toBe(
      "true"
    );
    expect(animate).toHaveBeenCalledWith(
      expect.arrayContaining([{ transform: "scale(1.35)" }]),
      expect.objectContaining({ duration: 360 })
    );
  });

  it("swallows the click that follows a sweep, so it commits once", () => {
    const onValueChange = vi.fn();
    render(<WaveRating onValueChange={onValueChange} />);
    layOut();
    const group = screen.getByRole("radiogroup");
    fireEvent.pointerDown(group, { pointerId: 2, pointerType: "mouse", button: 0, clientX: at(2) });
    fireEvent.pointerMove(group, { pointerId: 2, pointerType: "mouse", clientX: at(5) });
    fireEvent.pointerUp(group, { pointerId: 2, pointerType: "mouse", clientX: at(5) });
    fireEvent.click(screen.getByRole("radio", { name: "2 stars" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(5);
  });

  it("clamps a sweep past either end to the first or last star", () => {
    const onValueChange = vi.fn();
    render(<WaveRating defaultValue={3} onValueChange={onValueChange} />);
    layOut();
    const group = screen.getByRole("radiogroup");
    fireEvent.pointerDown(group, { pointerId: 3, pointerType: "pen", button: 0, clientX: at(3) });
    fireEvent.pointerMove(group, { pointerId: 3, pointerType: "pen", clientX: 400 });
    fireEvent.pointerUp(group, { pointerId: 3, pointerType: "pen", clientX: 400 });
    expect(onValueChange).toHaveBeenLastCalledWith(5);
  });

  it("drops the preview without committing when the browser takes the gesture", () => {
    const onValueChange = vi.fn();
    render(<WaveRating defaultValue={1} onValueChange={onValueChange} />);
    layOut();
    const group = screen.getByRole("radiogroup");
    fireEvent.pointerDown(group, { pointerId: 4, pointerType: "touch", button: 0, clientX: at(3) });
    fireEvent.pointerCancel(group, { pointerId: 4, pointerType: "touch" });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(group.hasAttribute("data-previewing")).toBe(false);
    expect(group.querySelectorAll("[data-filled=true]")).toHaveLength(1);
  });

  it("previews under a hovering mouse, but not under a finger that is not pressing", () => {
    render(<WaveRating />);
    layOut();
    const group = screen.getByRole("radiogroup");
    fireEvent.pointerMove(group, { pointerId: 5, pointerType: "touch", clientX: at(3) });
    expect(group.hasAttribute("data-previewing")).toBe(false);
    fireEvent.pointerMove(group, { pointerId: 6, pointerType: "mouse", clientX: at(3) });
    expect(group.querySelectorAll("[data-previewed]")).toHaveLength(3);
    fireEvent.pointerLeave(group, { pointerId: 6, pointerType: "mouse" });
    expect(group.hasAttribute("data-previewing")).toBe(false);
  });

  it("buzzes once per star under a finger, and can be told not to", () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { ...navigator, vibrate });
    const { unmount } = render(<WaveRating />);
    layOut();
    const group = screen.getByRole("radiogroup");
    fireEvent.pointerDown(group, { pointerId: 7, pointerType: "touch", button: 0, clientX: at(1) });
    fireEvent.pointerMove(group, { pointerId: 7, pointerType: "touch", clientX: at(1) + 4 });
    fireEvent.pointerMove(group, { pointerId: 7, pointerType: "touch", clientX: at(2) });
    expect(vibrate).toHaveBeenCalledTimes(2);
    unmount();

    vibrate.mockClear();
    render(<WaveRating haptics={false} />);
    layOut();
    fireEvent.pointerDown(screen.getByRole("radiogroup"), {
      pointerId: 8,
      pointerType: "touch",
      button: 0,
      clientX: at(2),
    });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("lights the stars without moving them under reduced motion", () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    const onValueChange = vi.fn();
    render(<WaveRating onValueChange={onValueChange} />);
    layOut();
    const group = screen.getByRole("radiogroup");
    fireEvent.pointerDown(group, { pointerId: 9, pointerType: "touch", button: 0, clientX: at(4) });
    expect(lifts()).toEqual([0, 0, 0, 0, 0]);
    expect(group.querySelectorAll("[data-filled=true]")).toHaveLength(4);
    fireEvent.pointerUp(group, { pointerId: 9, pointerType: "touch", clientX: at(4) });
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    expect(animate).not.toHaveBeenCalled();
  });

  it("pops the new star when the keyboard changes the score", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<WaveRating defaultValue={2} onValueChange={onValueChange} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "2 stars" }));
    await act(async () => {
      await user.keyboard("{ArrowRight>}");
    });
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(3));
    await user.keyboard("{/ArrowRight}");
    expect(animate).toHaveBeenCalled();
  });

  it("commits the star pressed even without coordinates, as assistive tech may send", () => {
    const onValueChange = vi.fn();
    render(<WaveRating onValueChange={onValueChange} />);
    const third = screen.getByRole("radio", { name: "3 stars" });
    fireEvent.pointerDown(third, { pointerId: 11, pointerType: "mouse", button: 0 });
    fireEvent.pointerUp(third, { pointerId: 11, pointerType: "mouse" });
    fireEvent.click(third);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(3);
  });

  it("takes a label for the tip", () => {
    render(
      <WaveRating tipLabel={(stars) => ["Bad", "Meh", "OK", "Good", "Great"][stars - 1] ?? ""} />
    );
    layOut();
    fireEvent.pointerDown(screen.getByRole("radiogroup"), {
      pointerId: 10,
      pointerType: "touch",
      button: 0,
      clientX: at(5),
    });
    expect(
      screen.getByText("Great").closest("[data-slot=wave-rating-tip]")?.getAttribute("aria-hidden")
    ).toBe("true");
  });

  it("submits with a form and shows the read-only rating as an image", () => {
    const { unmount } = render(
      <form>
        <WaveRating name="score" defaultValue={3} />
      </form>
    );
    expect(document.querySelector<HTMLInputElement>('input[name="score"]:checked')?.value).toBe(
      "3"
    );
    unmount();
    render(<WaveRating readOnly value={4.5} showTip haptics />);
    expect(screen.getByRole("img", { name: "Rating: 4.5 out of 5" })).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});
