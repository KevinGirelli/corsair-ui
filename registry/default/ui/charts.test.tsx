import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installIntersectionObserver } from "@/test-utils/browser";
import { AreaChart } from "@/registry/default/ui/area-chart";
import { BarChart } from "@/registry/default/ui/bar-chart";
import { DonutChart } from "@/registry/default/ui/donut-chart";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const slots = (slot: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement | SVGElement>(`[data-slot=${slot}]`),
];

/** The y of every M and L point in a path. */
const ys = (d: string) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]));

describe("BarChart", () => {
  const data = [12, 18, 15, 24];
  const labels = ["Mon", "Tue", "Wed", "Thu"];

  it("is a slider over the bars, starting at the last one", () => {
    render(<BarChart name="Visitors" data={data} labels={labels} />);
    const slider = screen.getByRole("slider", { name: "Visitors" });
    expect(slider.getAttribute("aria-valuemax")).toBe("4");
    expect(slider.getAttribute("aria-valuenow")).toBe("4");
    expect(slider.getAttribute("aria-valuetext")).toBe("Thu: 24");
    expect(slider.getAttribute("aria-orientation")).toBe("horizontal");
    expect(slots("bar-chart-bar")).toHaveLength(4);
    expect(slots("bar-chart-bar")[3]!.hasAttribute("data-active")).toBe(true);
  });

  it("moves with the arrow keys, Home and End", () => {
    const onIndexChange = vi.fn();
    render(<BarChart data={data} labels={labels} onIndexChange={onIndexChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Wed: 15");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Mon: 12");
    expect(slots("bar-chart-bar")[0]!.hasAttribute("data-active")).toBe(true);
    fireEvent.keyDown(slider, { key: "End" });
    expect(onIndexChange).toHaveBeenLastCalledWith(3);
  });

  it("highlights the bar under the pointer and dims the others until it leaves", () => {
    render(<BarChart data={data} labels={labels} />);
    const slider = screen.getByRole("slider");
    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 100));
    fireEvent.pointerMove(slider, { clientX: 150 });
    expect(slider.getAttribute("aria-valuenow")).toBe("2");
    const bars = slots("bar-chart-bar");
    expect(bars[1]!.hasAttribute("data-active")).toBe(true);
    expect(bars.filter((bar) => bar.hasAttribute("data-dimmed"))).toHaveLength(3);
    expect(slots("bar-chart-tooltip")[0]!.getAttribute("data-state")).toBe("open");
    fireEvent.pointerLeave(slider);
    expect(bars.some((bar) => bar.hasAttribute("data-dimmed"))).toBe(false);
    expect(slots("bar-chart-tooltip")[0]!.getAttribute("data-state")).toBe("closed");
  });

  it("runs top to bottom when horizontal, with a label per row", () => {
    render(<BarChart data={data} labels={labels} orientation="horizontal" />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-orientation")).toBe("vertical");
    fireEvent.keyDown(slider, { key: "Home" });
    fireEvent.keyDown(slider, { key: "ArrowDown" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Tue: 18");
    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 128));
    fireEvent.pointerMove(slider, { clientY: 100 });
    expect(slider.getAttribute("aria-valuenow")).toBe("4");
    expect(slots("bar-chart-axis")[0]!.textContent).toBe("MonTueWedThu");
  });

  it("draws negative values below the zero line", () => {
    render(<BarChart data={[3, -2]} />);
    const zero = Number(slots("bar-chart-zero")[0]!.getAttribute("y1"));
    const [up, down] = slots("bar-chart-bar");
    expect(up!.hasAttribute("data-negative")).toBe(false);
    expect(down!.hasAttribute("data-negative")).toBe(true);
    expect(Math.max(...ys(up!.getAttribute("d")!))).toBeLessThanOrEqual(zero);
    expect(Math.min(...ys(down!.getAttribute("d")!))).toBeGreaterThanOrEqual(zero);
    expect(Math.max(...ys(down!.getAttribute("d")!))).toBeGreaterThan(zero);
  });

  it("writes the values on the bars with showValues", () => {
    render(<BarChart data={[1200, -300]} showValues numberFormat={{ notation: "compact" }} />);
    expect(slots("bar-chart-value").map((value) => value.textContent)).toEqual(["1.2K", "-300"]);
  });

  it("formats numbers the same way on the server and in the browser", () => {
    const html = renderToString(
      <BarChart data={[1200, 3400]} numberFormat={{ style: "currency", currency: "USD" }} />
    );
    expect(html).toContain("$3,400.00");
  });

  it("leaves server-rendered bars as they are, so nothing hides before the browser checks", () => {
    const html = renderToString(<BarChart data={data} />);
    expect(html).toContain('data-state="static"');
    expect(html).not.toContain("scale(1, 0)");
  });

  it("grows the bars from the zero line when they come into view", () => {
    render(<BarChart data={data} />);
    const slider = screen.getByRole("slider");
    const bar = slots("bar-chart-bar")[0]!;
    expect(slider.getAttribute("data-state")).toBe("armed");
    expect(bar.style.transform).toBe("scale(1, 0)");
    act(() => io.intersect(slider, true));
    expect(slider.getAttribute("data-state")).toBe("play");
    expect(bar.style.transform).toBe("");
    expect(bar.style.transition).toContain("transform 600ms");
  });

  it("skips the growth with reduced motion or animated={false}", () => {
    const { unmount } = render(<BarChart data={data} />);
    // CSS drops the start state and the transition under prefers-reduced-motion.
    expect(slots("bar-chart-bar")[0]!.getAttribute("class")).toContain(
      "motion-reduce:![transform:none]"
    );
    unmount();
    render(<BarChart data={data} animated={false} />);
    expect(screen.getByRole("slider").getAttribute("data-state")).toBe("static");
    expect((slots("bar-chart-bar")[0] as SVGElement).style.transform).toBe("");
  });

  it("passes className, native props and ref to the root", () => {
    const ref = vi.fn();
    render(<BarChart data={data} className="h-40" id="visits" ref={ref} color="red" />);
    const root = slots("bar-chart")[0]!;
    expect(root.id).toBe("visits");
    expect(root.getAttribute("class")).toContain("h-40");
    expect(root.style.getPropertyValue("--bar-chart-color")).toBe("red");
    expect(ref).toHaveBeenCalledWith(root);
  });
});

describe("AreaChart", () => {
  const labels = ["Jan", "Feb", "Mar", "Apr"];
  const series = [
    { name: "Cargo", data: [40, 52, 48, 61] },
    { name: "Crew", data: [20, 24, 22, 30] },
  ];

  it("is a slider over the positions that announces every series", () => {
    render(<AreaChart series={series} labels={labels} />);
    const slider = screen.getByRole("slider", { name: "Cargo, Crew" });
    expect(slider.getAttribute("aria-valuemax")).toBe("4");
    expect(slider.getAttribute("aria-valuetext")).toBe("Apr: Cargo 61, Crew 30");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Jan: Cargo 40, Crew 20");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Feb: Cargo 52, Crew 24");
    expect(slots("area-chart-tooltip")[0]!.textContent).toContain("Crew24");
  });

  it("snaps the cursor to the position nearest the pointer", () => {
    const onIndexChange = vi.fn();
    render(<AreaChart series={series} labels={labels} onIndexChange={onIndexChange} />);
    const slider = screen.getByRole("slider");
    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 100));
    fireEvent.pointerMove(slider, { clientX: 110 });
    expect(slider.getAttribute("aria-valuenow")).toBe("2");
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });

  it("stacks series on the running total", () => {
    const firstY = (index: number) => ys(slots("area-chart-line")[index]!.getAttribute("d")!)[0]!;
    const { rerender } = render(<AreaChart series={series} />);
    // Overlapping, the smaller series sits lower.
    expect(firstY(1)).toBeGreaterThan(firstY(0));
    rerender(<AreaChart series={series} stacked />);
    // Stacked, it sits on top of the first.
    expect(firstY(1)).toBeLessThan(firstY(0));
    expect(slots("area-chart")[0]!.hasAttribute("data-stacked")).toBe(true);
  });

  it("fills each series with its own gradient, unique across charts", () => {
    render(
      <>
        <AreaChart series={series} />
        <AreaChart series={series} />
      </>
    );
    const ids = [...document.querySelectorAll("linearGradient")].map((gradient) => gradient.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    const fills = slots("area-chart-area").map((area) => area.getAttribute("fill"));
    expect(fills).toEqual(ids.map((id) => `url(#${id})`));
  });

  it("uses the primary colour and lighter mixes of it unless given colours", () => {
    render(<AreaChart series={[...series, { name: "Guns", data: [1, 2], color: "teal" }]} />);
    expect(slots("area-chart-line").map((line) => line.getAttribute("stroke"))).toEqual([
      "var(--primary)",
      "color-mix(in oklab, var(--primary) 70%, var(--background))",
      "teal",
    ]);
  });

  it("shows a legend when there is more than one series", () => {
    const { rerender } = render(<AreaChart series={series} />);
    const legend = screen.getByRole("list");
    expect([...legend.querySelectorAll("li")].map((item) => item.textContent)).toEqual([
      "Cargo",
      "Crew",
    ]);
    rerender(<AreaChart series={[series[0]!]} />);
    expect(screen.queryByRole("list")).toBeNull();
    rerender(<AreaChart series={[series[0]!]} showLegend />);
    expect(screen.getByRole("list")).toBeTruthy();
  });

  it("draws in from the left when it comes into view, not on the server", () => {
    expect(renderToString(<AreaChart series={series} />)).toContain('data-state="static"');
    render(<AreaChart series={series} />);
    const slider = screen.getByRole("slider");
    const clip = document.querySelector<SVGRectElement>("clipPath rect")!;
    expect(clip.style.transform).toBe("scaleX(0)");
    expect(clip.getAttribute("class")).toContain("motion-reduce:![transform:none]");
    act(() => io.intersect(slider, true));
    expect(clip.style.transform).toBe("");
    expect(clip.style.transition).toContain("900ms");
  });
});

describe("DonutChart", () => {
  const data = [
    { label: "Fore", value: 50 },
    { label: "Main", value: 30 },
    { label: "Aft", value: 20 },
  ];

  it("lists each part with its value and share, and shows the total in the hole", () => {
    render(<DonutChart name="Cargo by hold" data={data} />);
    const legend = screen.getByRole("list", { name: "Cargo by hold" });
    expect(legend.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Fore 50 50%" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aft 20 20%" })).toBeTruthy();
    expect(slots("donut-chart-center")[0]!.textContent).toBe("Total 100");
    expect(slots("donut-chart-segment")).toHaveLength(3);
  });

  it("moves between parts with the arrow keys, one tab stop for the list", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(<DonutChart data={data} onIndexChange={onIndexChange} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1]);
    await user.tab();
    expect(document.activeElement).toBe(buttons[0]);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(buttons[1]);
    expect(buttons[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(buttons.map((button) => button.tabIndex)).toEqual([-1, 0, -1]);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    const segments = slots("donut-chart-segment");
    expect(segments[1]!.hasAttribute("data-active")).toBe(true);
    expect(segments.filter((segment) => segment.hasAttribute("data-dimmed"))).toHaveLength(2);
    expect(slots("donut-chart-center")[0]!.textContent).toBe("Main 30");
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(buttons[2]);
    await user.keyboard("{Escape}");
    expect(onIndexChange).toHaveBeenLastCalledWith(null);
    expect(buttons[2]!.getAttribute("aria-pressed")).toBe("false");
    expect(slots("donut-chart-center")[0]!.textContent).toBe("Total 100");
  });

  it("pins a part on click and releases it on a second click", async () => {
    const user = userEvent.setup();
    render(<DonutChart data={data} />);
    const main = screen.getByRole("button", { name: /^Main/ });
    await user.click(main);
    expect(main.getAttribute("aria-pressed")).toBe("true");
    await user.click(main);
    expect(main.getAttribute("aria-pressed")).toBe("false");
  });

  it("highlights the segment under the pointer", () => {
    render(<DonutChart data={data} />);
    const ring = slots("donut-chart-ring")[0] as HTMLElement;
    vi.spyOn(ring, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 200));
    // Three quarters of the way round, on the ring: the second part (50% to 80%).
    fireEvent.pointerMove(ring, { clientX: 12, clientY: 100 });
    expect(slots("donut-chart-segment")[1]!.hasAttribute("data-active")).toBe(true);
    // In the hole: nothing.
    fireEvent.pointerMove(ring, { clientX: 100, clientY: 100 });
    expect(slots("donut-chart-segment").some((s) => s.hasAttribute("data-active"))).toBe(false);
  });

  it("takes a custom centre and formats values", () => {
    render(
      <DonutChart
        data={data}
        centerLabel="Tonnes"
        centerValue="1.2k"
        numberFormat={{ style: "unit", unit: "kilogram" }}
      />
    );
    expect(slots("donut-chart-center")[0]!.textContent).toBe("Tonnes 1.2k");
    expect(screen.getByRole("button", { name: /^Fore 50\skg 50%$/ })).toBeTruthy();
  });

  it("counts negative values as zero and shows an empty ring for a zero total", () => {
    const { rerender } = render(<DonutChart data={[{ label: "Lost", value: -5 }, ...data]} />);
    expect(slots("donut-chart-center")[0]!.textContent).toBe("Total 100");
    expect(slots("donut-chart-segment")).toHaveLength(3);
    rerender(<DonutChart data={[{ label: "None", value: 0 }]} />);
    expect(slots("donut-chart-track")).toHaveLength(1);
    expect(slots("donut-chart-segment")).toHaveLength(0);
  });

  it("sweeps the segments in when it comes into view, not on the server", () => {
    expect(renderToString(<DonutChart data={data} />)).toContain('data-state="static"');
    render(<DonutChart data={data} />);
    const ring = slots("donut-chart-ring")[0] as HTMLElement;
    const sweep = document.querySelector<SVGCircleElement>("mask circle")!;
    expect(ring.getAttribute("data-state")).toBe("armed");
    expect(Number(sweep.style.strokeDashoffset)).toBeGreaterThan(0);
    expect(sweep.getAttribute("class")).toContain("motion-reduce:![stroke-dashoffset:0]");
    act(() => io.intersect(ring, true));
    expect(ring.getAttribute("data-state")).toBe("play");
    expect(Number(sweep.style.strokeDashoffset)).toBe(0);
  });
});
