import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FlipCard,
  FlipCardBack,
  FlipCardFront,
  FlipCardTrigger,
  type FlipCardProps,
} from "@/registry/default/ui/flip-card";
import { installMatchMedia } from "@/test-utils/browser";

beforeEach(() => {
  installMatchMedia([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const parts = () => ({
  root: document.querySelector<HTMLElement>("[data-slot=flip-card]")!,
  front: document.querySelector<HTMLElement>("[data-slot=flip-card-front]")!,
  back: document.querySelector<HTMLElement>("[data-slot=flip-card-back]")!,
});

function ClickCard(props: FlipCardProps) {
  return (
    <FlipCard trigger="click" {...props}>
      <FlipCardFront>
        Plan
        <FlipCardTrigger>Show details</FlipCardTrigger>
      </FlipCardFront>
      <FlipCardBack>
        Details
        <FlipCardTrigger>Back</FlipCardTrigger>
      </FlipCardBack>
    </FlipCard>
  );
}

describe("FlipCard click", () => {
  it("toggles from a trigger when uncontrolled and reflects it in aria-pressed", () => {
    render(<ClickCard />);
    const { root, front, back } = parts();
    expect(root.dataset.state).toBe("unflipped");
    const show = screen.getByRole("button", { name: "Show details" });
    expect(show.getAttribute("aria-pressed")).toBe("false");
    expect(show.getAttribute("type")).toBe("button");
    expect(show.getAttribute("aria-controls")).toBe(root.id);

    fireEvent.click(show);
    expect(root.dataset.state).toBe("flipped");
    expect(front.dataset.state).toBe("flipped");
    expect(back.dataset.state).toBe("flipped");
    expect(front.dataset.side).toBe("front");
    expect(back.dataset.side).toBe("back");
    const backButton = screen.getByRole("button", { name: "Back" });
    expect(backButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(backButton);
    expect(root.dataset.state).toBe("unflipped");
  });

  it("makes the face turned away inert and hidden from screen readers", () => {
    render(<ClickCard />);
    const { front, back } = parts();
    expect(back.hasAttribute("inert")).toBe(true);
    expect(back.getAttribute("aria-hidden")).toBe("true");
    expect(front.hasAttribute("inert")).toBe(false);
    expect(front.getAttribute("aria-hidden")).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(front.hasAttribute("inert")).toBe(true);
    expect(front.getAttribute("aria-hidden")).toBe("true");
    expect(back.hasAttribute("inert")).toBe(false);
    expect(back.getAttribute("aria-hidden")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show details" })).toBeNull();
  });

  it("moves focus to the trigger on the face that turned up", () => {
    render(<ClickCard />);
    const show = screen.getByRole("button", { name: "Show details" });
    show.focus();
    fireEvent.click(show);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Back" }));
  });

  it("follows the flipped prop when controlled and reports requests", () => {
    const onFlippedChange = vi.fn();
    const { rerender } = render(<ClickCard flipped={false} onFlippedChange={onFlippedChange} />);
    const { root } = parts();
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(onFlippedChange).toHaveBeenCalledWith(true);
    expect(root.dataset.state).toBe("unflipped");

    rerender(<ClickCard flipped onFlippedChange={onFlippedChange} />);
    expect(root.dataset.state).toBe("flipped");
  });

  it("calls onFlippedChange with each next value when uncontrolled", () => {
    const onFlippedChange = vi.fn();
    render(<ClickCard defaultFlipped onFlippedChange={onFlippedChange} />);
    expect(parts().root.dataset.state).toBe("flipped");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onFlippedChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(onFlippedChange).toHaveBeenLastCalledWith(true);
  });

  it("does not flip when the card itself is clicked", () => {
    installMatchMedia(["(hover: none)"]);
    render(<ClickCard />);
    fireEvent.click(parts().front);
    expect(parts().root.dataset.state).toBe("unflipped");
  });

  it("renders the trigger as its child with asChild and keeps a custom aria-controls", () => {
    render(
      <FlipCard trigger="click">
        <FlipCardFront id="front">
          <FlipCardTrigger asChild aria-controls="front">
            <a href="#details">Details</a>
          </FlipCardTrigger>
        </FlipCardFront>
        <FlipCardBack>Back</FlipCardBack>
      </FlipCard>
    );
    const link = screen.getByRole("link", { name: "Details" });
    expect(link.dataset.slot).toBe("flip-card-trigger");
    expect(link.getAttribute("aria-controls")).toBe("front");
    expect(link.hasAttribute("type")).toBe(false);
  });
});

describe("FlipCard manual", () => {
  function Grid() {
    const [revealed, setRevealed] = useState(0);
    return (
      <>
        <button type="button" onClick={() => setRevealed((count) => count + 1)}>
          Next
        </button>
        {["Mon", "Tue"].map((day, index) => (
          <FlipCard key={day} trigger="manual" flipped={index < revealed}>
            <FlipCardFront>{day}</FlipCardFront>
            <FlipCardBack>{`${day} back`}</FlipCardBack>
          </FlipCard>
        ))}
      </>
    );
  }

  it("turns only from the flipped prop and hides the face that is away", () => {
    render(<Grid />);
    const roots = document.querySelectorAll<HTMLElement>("[data-slot=flip-card]");
    expect([...roots].map((root) => root.dataset.state)).toEqual(["unflipped", "unflipped"]);
    fireEvent.click(roots[0]!);
    expect(roots[0]!.dataset.state).toBe("unflipped");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect([...roots].map((root) => root.dataset.state)).toEqual(["flipped", "unflipped"]);
    const firstFront = roots[0]!.querySelector<HTMLElement>("[data-slot=flip-card-front]")!;
    const firstBack = roots[0]!.querySelector<HTMLElement>("[data-slot=flip-card-back]")!;
    expect(firstFront.hasAttribute("inert")).toBe(true);
    expect(firstFront.getAttribute("aria-hidden")).toBe("true");
    expect(firstBack.hasAttribute("inert")).toBe(false);
  });
});

describe("FlipCard hover", () => {
  function HoverCard(props: FlipCardProps) {
    return (
      <FlipCard {...props}>
        <FlipCardFront>Parrot</FlipCardFront>
        <FlipCardBack>
          <a href="#parrot">Get this sticker</a>
        </FlipCardBack>
      </FlipCard>
    );
  }

  it("flips with CSS on hover and focus, keeping both faces readable", () => {
    render(<HoverCard />);
    const { root, front, back } = parts();
    expect(root.dataset.trigger).toBe("hover");
    expect(root.className).toContain("group/flip-card");
    expect(root.className).toContain("[@media(hover:hover)]:hover:[--flip-card-turn:1]");
    expect(root.className).toContain("focus-within:[--flip-card-turn:1]");
    for (const face of [front, back]) {
      expect(face.hasAttribute("inert")).toBe(false);
      expect(face.getAttribute("aria-hidden")).toBeNull();
    }
    expect(screen.getByRole("link", { name: "Get this sticker" })).toBeTruthy();
  });

  it("ignores clicks on devices that can hover", () => {
    render(<HoverCard />);
    fireEvent.click(parts().front);
    expect(parts().root.dataset.state).toBe("unflipped");
  });

  it("toggles on tap where there is no hover, leaving links inside alone", () => {
    installMatchMedia(["(hover: none)"]);
    const onFlippedChange = vi.fn();
    render(<HoverCard onFlippedChange={onFlippedChange} />);
    const { root, front } = parts();
    fireEvent.click(front);
    expect(root.dataset.state).toBe("flipped");
    expect(onFlippedChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("link", { name: "Get this sticker" }));
    expect(root.dataset.state).toBe("flipped");

    fireEvent.click(root);
    expect(root.dataset.state).toBe("unflipped");
  });

  it("does not use hover or focus classes outside hover mode", () => {
    render(<ClickCard />);
    const { root, back } = parts();
    expect(root.className).not.toContain("hover:[--flip-card-turn:1]");
    expect(root.className).not.toContain("focus-within:");
    expect(back.className).not.toContain("group-hover/flip-card");
  });
});

describe("FlipCard rendering", () => {
  it("turns around the y axis by default and the x axis on request", () => {
    const { unmount } = render(<ClickCard />);
    expect(parts().front.className).toContain("rotateY(");
    expect(parts().back.className).toContain("rotateY(");
    unmount();

    render(<ClickCard axis="x" />);
    const { root, front, back } = parts();
    expect(root.dataset.axis).toBe("x");
    expect(front.className).toContain("motion-safe:[transform:rotateX(");
    expect(back.className).toContain("motion-safe:[transform:rotateX(");
    expect(front.className).not.toContain("rotateY(");
  });

  it("crossfades instead of turning with reduced motion", () => {
    render(<ClickCard />);
    const { front, back } = parts();
    // The turn is behind motion-safe:, so reduced motion has no transform at all.
    expect(front.className).toContain("motion-safe:[transform:");
    expect(front.className).not.toMatch(/(^|\s)\[transform:/);
    expect(front.className).toContain("motion-reduce:[opacity:calc(1_-_var(--flip-card-turn))]");
    expect(back.className).toContain("motion-reduce:[opacity:var(--flip-card-turn)]");
    expect(front.className).toContain("transition-[transform,opacity]");
    expect(front.className).toContain("[backface-visibility:hidden]");
  });

  it("sets duration, easing and perspective inline", () => {
    render(<ClickCard duration={300} easing="linear" perspective={800} />);
    const { root, front, back } = parts();
    expect(root.style.perspective).toBe("800px");
    for (const face of [front, back]) {
      expect(face.style.transitionDuration).toBe("300ms");
      expect(face.style.transitionTimingFunction).toBe("linear");
    }
  });

  it("defaults to 600ms, a 1000px perspective and an ease-out curve", () => {
    render(<ClickCard />);
    const { root, front } = parts();
    expect(root.style.perspective).toBe("1000px");
    expect(front.style.transitionDuration).toBe("600ms");
    expect(front.style.transitionTimingFunction).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
  });

  it("stacks both faces in one grid cell, the one facing the reader on top", () => {
    render(<ClickCard />);
    const { root, front, back } = parts();
    expect(root.className).toContain("grid");
    expect(root.className).toContain("[--flip-card-turn:0]");
    expect(root.className).toContain("data-[state=flipped]:[--flip-card-turn:1]");
    for (const face of [front, back]) {
      expect(face.className).toContain("col-start-1");
      expect(face.className).toContain("row-start-1");
    }
    expect(front.className).toContain("[z-index:calc(1_-_var(--flip-card-turn))]");
    expect(back.className).toContain("[z-index:var(--flip-card-turn)]");
  });

  it("passes native props and refs to every part", () => {
    const rootRef = createRef<HTMLDivElement>();
    const frontRef = createRef<HTMLDivElement>();
    const backRef = createRef<HTMLDivElement>();
    const triggerRef = createRef<HTMLButtonElement>();
    render(
      <FlipCard
        ref={rootRef}
        id="card"
        trigger="click"
        className="size-40"
        style={{ color: "red" }}
        data-testid="card"
      >
        <FlipCardFront ref={frontRef} className="bg-card" title="front">
          <FlipCardTrigger ref={triggerRef} className="underline">
            Flip
          </FlipCardTrigger>
        </FlipCardFront>
        <FlipCardBack ref={backRef} style={{ transitionDuration: "10ms" }}>
          Back
        </FlipCardBack>
      </FlipCard>
    );
    const { root, front, back } = parts();
    expect(rootRef.current).toBe(root);
    expect(frontRef.current).toBe(front);
    expect(backRef.current).toBe(back);
    expect(triggerRef.current?.dataset.slot).toBe("flip-card-trigger");
    expect(root.id).toBe("card");
    expect(root.className).toContain("size-40");
    expect(root.style.color).toBe("red");
    expect(root.style.perspective).toBe("1000px");
    expect(root.dataset.testid).toBe("card");
    expect(front.title).toBe("front");
    expect(front.className).toContain("bg-card");
    expect(back.style.transitionDuration).toBe("10ms");
    expect(triggerRef.current?.getAttribute("aria-controls")).toBe("card");
  });

  it("lets a trigger's onClick cancel the flip", () => {
    render(
      <FlipCard trigger="click">
        <FlipCardFront>
          <FlipCardTrigger onClick={(event) => event.preventDefault()}>Flip</FlipCardTrigger>
        </FlipCardFront>
        <FlipCardBack>Back</FlipCardBack>
      </FlipCard>
    );
    fireEvent.click(screen.getByRole("button", { name: "Flip" }));
    expect(parts().root.dataset.state).toBe("unflipped");
  });

  it("explains a part used outside FlipCard", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<FlipCardTrigger>Flip</FlipCardTrigger>)).toThrow(
      "FlipCardTrigger must be used inside <FlipCard>."
    );
  });
});
