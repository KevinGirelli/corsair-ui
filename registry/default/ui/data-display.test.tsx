import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/registry/default/ui/avatar";
import { CodeBlock } from "@/registry/default/ui/code-block";
import { CornerFrame } from "@/registry/default/ui/corner-frame";
import { NumberTicker } from "@/registry/default/ui/number-ticker";
import { Rating } from "@/registry/default/ui/rating";
import { Stat, StatCaption, StatGroup, StatLabel, StatValue } from "@/registry/default/ui/stat";
import { installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Avatar", () => {
  it("shows the fallback while the image has not loaded", () => {
    render(
      <AvatarGroup>
        <Avatar size="lg">
          <AvatarImage src="/ada.jpg" alt="Ada Lovelace" />
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
        <Avatar size="sm">
          <AvatarFallback>GH</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    );
    const avatars = document.querySelectorAll("[data-slot=avatar]");
    expect(avatars).toHaveLength(2);
    expect(avatars[0]?.getAttribute("data-size")).toBe("lg");
    expect(avatars[0]?.className).toContain("size-12");
    expect(avatars[1]?.className).toContain("size-6");
    expect(screen.getByText("AL").getAttribute("data-slot")).toBe("avatar-fallback");
    expect(document.querySelector("[data-slot=avatar-group]")?.className).toContain("-space-x-2");
  });
});

describe("Rating", () => {
  it("read-only: one image named with the value, filling part of a star", () => {
    render(<Rating readOnly value={3.5} />);
    const rating = screen.getByRole("img", { name: "Rating: 3.5 out of 5" });
    const stars = rating.querySelectorAll("[data-slot=rating-star]");
    expect(stars).toHaveLength(5);
    expect([...stars].map((star) => star.getAttribute("data-fill"))).toEqual([
      "full",
      "full",
      "full",
      "partial",
      "empty",
    ]);
    const partial = stars[3]!.querySelector<SVGElement>("[data-filled=true]")!;
    expect(partial.style.clipPath).toBe("inset(0 50% 0 0)");
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("has an extra small size for dense layouts", () => {
    render(<Rating readOnly value={4} size="xs" />);
    const rating = screen.getByRole("img", { name: "Rating: 4 out of 5" });
    expect(rating.className).toContain("[&_[data-slot=rating-star]]:size-3");
  });

  it("read-only: takes a custom label and value text", () => {
    render(
      <Rating
        readOnly
        value={4}
        max={10}
        aria-label="Score"
        getValueLabel={(value, max) => `${value} of ${max}`}
      />
    );
    expect(screen.getByRole("img", { name: "Score: 4 of 10" })).toBeTruthy();
  });

  it("interactive: a radio per star, picked by click and arrow keys", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating defaultValue={2} onValueChange={onValueChange} />);
    const group = screen.getByRole("radiogroup", { name: "Rating" });
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("aria-label"))).toEqual([
      "1 star",
      "2 stars",
      "3 stars",
      "4 stars",
      "5 stars",
    ]);
    expect(screen.getByRole("radio", { name: "2 stars" }).getAttribute("aria-checked")).toBe(
      "true"
    );

    await user.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    expect(group.getAttribute("data-value")).toBe("4");
    expect(group.querySelectorAll("[data-filled=true]")).toHaveLength(4);

    // Radix moves focus on the next tick and checks the radio while the key is still down.
    await user.keyboard("{ArrowLeft>}");
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(3));
    await user.keyboard("{/ArrowLeft}");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "3 stars" }));
  });

  it("interactive: previews under a pen, but not under a finger", () => {
    render(<Rating defaultValue={1} />);
    const group = screen.getByRole("radiogroup");
    fireEvent.pointerEnter(screen.getByRole("radio", { name: "3 stars" }), {
      pointerType: "touch",
    });
    expect(group.hasAttribute("data-hovered")).toBe(false);
    fireEvent.pointerEnter(screen.getByRole("radio", { name: "3 stars" }), { pointerType: "pen" });
    expect(group.querySelectorAll("[data-filled=true]")).toHaveLength(3);
  });

  it("interactive: previews the stars under a mouse pointer", () => {
    render(<Rating defaultValue={1} starLabel={(n) => `${n} of 5`} />);
    const group = screen.getByRole("radiogroup");
    const fourth = screen.getByRole("radio", { name: "4 of 5" });
    fireEvent.pointerEnter(fourth, { pointerType: "mouse" });
    expect(group.hasAttribute("data-hovered")).toBe(true);
    expect(group.querySelectorAll("[data-slot=rating-item][data-hovered]")).toHaveLength(4);
    expect(group.querySelectorAll("[data-filled=true]")).toHaveLength(4);
    fireEvent.pointerLeave(group, { pointerType: "mouse" });
    expect(group.hasAttribute("data-hovered")).toBe(false);
    expect(group.querySelectorAll("[data-filled=true]")).toHaveLength(1);
  });

  it("interactive: submits its value with a form under `name`", () => {
    render(
      <form>
        <Rating name="score" defaultValue={3} />
      </form>
    );
    const checked = document.querySelector<HTMLInputElement>('input[name="score"]:checked');
    expect(checked?.value).toBe("3");
  });

  it("interactive: follows a controlled value", () => {
    const { rerender } = render(<Rating value={1} onValueChange={() => {}} />);
    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    expect(screen.getByRole("radio", { name: "1 star" }).getAttribute("aria-checked")).toBe("true");
    rerender(<Rating value={5} onValueChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "5 stars" }).getAttribute("aria-checked")).toBe(
      "true"
    );
  });
});

describe("Stat", () => {
  it("pairs each label with its value in a description list", () => {
    render(
      <StatGroup>
        <Stat>
          <StatLabel>Revenue</StatLabel>
          <StatValue>$48,200</StatValue>
          <StatCaption trend="up">12% since last month</StatCaption>
        </Stat>
        <Stat>
          <StatLabel>Churn</StatLabel>
          <StatValue>2%</StatValue>
          <StatCaption trend="down" trendLabel="Better">
            0.4 points
          </StatCaption>
        </Stat>
      </StatGroup>
    );
    expect(document.querySelector("dl")?.getAttribute("data-slot")).toBe("stat-group");
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Revenue",
      "Churn",
    ]);
    const captions = document.querySelectorAll("[data-slot=stat-caption]");
    expect(captions[0]?.getAttribute("data-trend")).toBe("up");
    expect(captions[0]?.textContent).toBe("Increase: 12% since last month");
    expect(captions[1]?.textContent).toBe("Better: 0.4 points");
    expect(
      captions[0]?.querySelector("[data-slot=stat-trend-icon]")?.getAttribute("aria-hidden")
    ).toBe("true");
  });
});

describe("NumberTicker", () => {
  const output = () =>
    document.querySelector<HTMLElement>("[data-slot=number-ticker-value]")!.textContent;

  it("server HTML holds the final formatted value", () => {
    const html = renderToString(
      <NumberTicker value={1234.5} format={{ style: "currency", currency: "USD" }} />
    );
    expect(html).toContain("$1,234.50");
    expect(html).toContain('data-state="static"');
  });

  it("waits at `from` until it is seen, then counts to the value", async () => {
    render(<NumberTicker value={1234} from={10} duration={40} />);
    const root = document.querySelector("[data-slot=number-ticker]")!;
    expect(root.getAttribute("data-state")).toBe("armed");
    expect(output()).toBe("10");
    // Screen readers only ever get the final value.
    expect(root.querySelector(".sr-only")?.textContent).toBe("1,234");
    expect(root.querySelector("[aria-hidden=true]")).toBe(
      document.querySelector("[data-slot=number-ticker-value]")
    );

    act(() => io.intersect(root, true));
    expect(root.getAttribute("data-state")).toBe("play");
    await waitFor(() => expect(output()).toBe("1,234"));
  });

  it("keeps the precision of the value on every frame", async () => {
    render(<NumberTicker value={9.5} trigger="load" duration={40} locale="de-DE" />);
    await waitFor(() => expect(output()).toBe("9,5"));
  });

  it("shows the final value at once with reduced motion", () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    render(<NumberTicker value={500} trigger="load" />);
    expect(output()).toBe("500");
  });

  it("holds at `from` while play is false", () => {
    const { rerender } = render(<NumberTicker value={80} play={false} />);
    expect(output()).toBe("0");
    rerender(<NumberTicker value={80} play duration={0} />);
    expect(document.querySelector("[data-slot=number-ticker]")?.getAttribute("data-state")).toBe(
      "play"
    );
  });
});

describe("CodeBlock", () => {
  function stubClipboard() {
    const clipboard = { writeText: vi.fn(async () => {}) };
    Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
    return clipboard;
  }

  it("is a figure named by its caption with a focusable, scrollable pre", () => {
    render(<CodeBlock title="install.sh" language="bash" code="pnpm install" />);
    const figure = screen.getByRole("figure", { name: "install.sh" });
    expect(figure.getAttribute("data-language")).toBe("bash");
    expect(screen.getByText("bash").getAttribute("data-slot")).toBe("code-block-language");
    const pre = figure.querySelector("pre")!;
    expect(pre.tabIndex).toBe(0);
    expect(pre.className).toContain("overflow-x-auto");
    expect(pre.querySelector("code")?.textContent).toBe("pnpm install");
  });

  it("copies the raw code, even when highlighted children are shown", async () => {
    const clipboard = stubClipboard();
    render(
      <CodeBlock code="const a = 1;" copyLabel="Copy snippet">
        <span className="token">const</span> a = 1;
      </CodeBlock>
    );
    expect(document.querySelector("code .token")?.textContent).toBe("const");
    fireEvent.click(screen.getByRole("button", { name: "Copy snippet" }));
    expect(clipboard.writeText).toHaveBeenCalledWith("const a = 1;");
    expect(await screen.findByText("Copied")).toBeTruthy();
  });

  it("wraps long lines on request and can drop the copy button", () => {
    render(<CodeBlock code="x" wrap showCopyButton={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    const pre = document.querySelector("pre")!;
    expect(pre.className).toContain("whitespace-pre-wrap");
    expect(pre.className).not.toContain("whitespace-pre ");
    expect(document.querySelector("figure")?.getAttribute("data-wrap")).toBe("true");
  });
});

describe("CornerFrame", () => {
  it("draws four decorative brackets by default", () => {
    render(<CornerFrame>Content</CornerFrame>);
    const frame = document.querySelector<HTMLElement>("[data-slot=corner-frame]")!;
    const corners = frame.querySelectorAll<HTMLElement>("[data-slot=corner-frame-corner]");
    expect(corners).toHaveLength(4);
    for (const corner of corners) expect(corner.getAttribute("aria-hidden")).toBe("true");
    expect(frame.style.getPropertyValue("--corner-frame-size")).toBe("12px");
    expect(frame.style.getPropertyValue("--corner-frame-color")).toBe("");
    expect(frame.className).toContain("relative");
  });

  it("draws only the corners asked for, in the given colour and inset", () => {
    render(
      <CornerFrame corners={["top-left", "bottom-right"]} color="red" inset="-4px" size="20px">
        Content
      </CornerFrame>
    );
    const frame = document.querySelector<HTMLElement>("[data-slot=corner-frame]")!;
    const corners = [...frame.querySelectorAll("[data-slot=corner-frame-corner]")];
    expect(corners.map((corner) => corner.getAttribute("data-corner"))).toEqual([
      "top-left",
      "bottom-right",
    ]);
    expect(frame.style.getPropertyValue("--corner-frame-color")).toBe("red");
    expect(frame.style.getPropertyValue("--corner-frame-inset")).toBe("-4px");
    expect(frame.style.getPropertyValue("--corner-frame-size")).toBe("20px");
  });

  it("frames its child element with asChild", () => {
    render(
      <CornerFrame asChild>
        <section aria-label="Framed">Inside</section>
      </CornerFrame>
    );
    const section = screen.getByRole("region", { name: "Framed" });
    expect(section.getAttribute("data-slot")).toBe("corner-frame");
    expect(section.querySelectorAll("[data-slot=corner-frame-corner]")).toHaveLength(4);
    expect(section.textContent).toBe("Inside");
  });
});
