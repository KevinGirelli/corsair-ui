import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ScrollScene,
  ScrollSceneSlide,
  ScrollSceneStage,
  ScrollSceneStep,
  ScrollSceneSteps,
  useScrollScene,
  type ScrollSceneProps,
} from "@/registry/default/ui/scroll-scene";
import { installIntersectionObserver } from "@/test-utils/browser";

// jsdom has no CSS.registerProperty; the module registers the progress on
// import. A plain array, since `restoreMocks` clears mock calls between tests.
const registered = vi.hoisted(() => {
  const calls: unknown[] = [];
  const registerProperty = (definition: unknown) => void calls.push(definition);
  const scope = globalThis as { CSS?: Record<string, unknown> };
  if (scope.CSS) scope.CSS.registerProperty = registerProperty;
  else scope.CSS = { registerProperty };
  return calls;
});

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Counter() {
  const { activeStep, stepCount } = useScrollScene();
  return (
    <output data-testid="counter">
      {activeStep + 1} / {stepCount}
    </output>
  );
}

function Scene(props: Partial<ScrollSceneProps>) {
  return (
    <ScrollScene aria-label="Tour" {...props}>
      <ScrollSceneStage>
        <ScrollSceneSlide step={0}>Screen one</ScrollSceneSlide>
        <ScrollSceneSlide step={1}>Screen two</ScrollSceneSlide>
        <ScrollSceneSlide step={2}>Screen three</ScrollSceneSlide>
      </ScrollSceneStage>
      <ScrollSceneSteps>
        <ScrollSceneStep step={0}>Step one</ScrollSceneStep>
        <ScrollSceneStep step={1} id="custom-step">
          Step two
        </ScrollSceneStep>
        <ScrollSceneStep step={2}>Step three</ScrollSceneStep>
      </ScrollSceneSteps>
      <Counter />
    </ScrollScene>
  );
}

const root = () => document.querySelector<HTMLElement>("[data-slot=scroll-scene]")!;
const steps = () => [...document.querySelectorAll<HTMLElement>("[data-slot=scroll-scene-step]")];
const slides = () => [...document.querySelectorAll<HTMLElement>("[data-slot=scroll-scene-slide]")];
const inlineSlides = () => [
  ...document.querySelectorAll<HTMLElement>("[data-slot=scroll-scene-inline-slide]"),
];

describe("ScrollScene", () => {
  it("follows the step crossing the line and reports each change", () => {
    const onStepChange = vi.fn();
    render(<Scene onStepChange={onStepChange} />);

    expect(root().dataset.activeStep).toBe("0");
    expect(steps().map((step) => step.dataset.state)).toEqual(["active", "inactive", "inactive"]);
    expect(slides().map((slide) => slide.dataset.state)).toEqual([
      "active",
      "inactive",
      "inactive",
    ]);

    act(() => io.intersect(steps()[0]!, true));
    // Step 0 was already active: nothing to report.
    expect(onStepChange).not.toHaveBeenCalled();

    act(() => {
      io.intersect(steps()[0]!, false);
      io.intersect(steps()[1]!, true);
    });
    expect(root().dataset.activeStep).toBe("1");
    expect(steps()[1]!.dataset.state).toBe("active");
    expect(slides()[1]!.dataset.state).toBe("active");
    expect(slides()[0]!.dataset.state).toBe("inactive");
    expect(inlineSlides()[1]!.dataset.state).toBe("active");
    expect(onStepChange).toHaveBeenLastCalledWith(1);

    act(() => {
      io.intersect(steps()[1]!, false);
      io.intersect(steps()[2]!, true);
    });
    expect(root().dataset.activeStep).toBe("2");
    expect(onStepChange).toHaveBeenLastCalledWith(2);
    expect(onStepChange).toHaveBeenCalledTimes(2);
  });

  it("gives steps an id when they have none and keeps the consumer's", () => {
    render(<Scene />);
    const [first, second] = steps();
    expect(first!.id).toMatch(/-step-0$/);
    expect(second!.id).toBe("custom-step");
    expect(io.observers(first!)).toBe(1);
    expect(io.observers(second!)).toBe(1);
  });

  it("makes inactive stage slides inert and hidden from screen readers", () => {
    render(<Scene defaultStep={1} />);
    const [first, second, third] = slides();
    expect(second!.hasAttribute("inert")).toBe(false);
    expect(second!.getAttribute("aria-hidden")).toBeNull();
    for (const slide of [first!, third!]) {
      expect(slide.hasAttribute("inert")).toBe(true);
      expect(slide.getAttribute("aria-hidden")).toBe("true");
    }
    expect(second!.className).toContain("[grid-area:1/1]");
  });

  it("lets a controlled step win over the scroll position", () => {
    const onStepChange = vi.fn();
    render(<Scene step={2} onStepChange={onStepChange} />);
    expect(root().dataset.activeStep).toBe("2");

    act(() => io.intersect(steps()[1]!, true));
    expect(onStepChange).toHaveBeenCalledWith(1);
    expect(root().dataset.activeStep).toBe("2");
    expect(slides()[2]!.dataset.state).toBe("active");
  });

  it("follows the step a parent keeps in state", () => {
    function Controlled() {
      const [step, setStep] = useState(0);
      return <Scene step={step} onStepChange={setStep} />;
    }
    render(<Controlled />);
    act(() => io.intersect(steps()[2]!, true));
    expect(root().dataset.activeStep).toBe("2");
  });

  it("exposes the active step and the step count through useScrollScene", () => {
    render(<Scene />);
    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
    act(() => io.intersect(steps()[1]!, true));
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
  });

  it("passes native props, refs and classes to the parts", () => {
    let node: HTMLDivElement | null = null;
    render(
      <ScrollScene ref={(element) => void (node = element)} className="gap-x-24" id="tour">
        <ScrollSceneStage className="bg-muted" data-testid="stage">
          <ScrollSceneSlide step={0}>Screen</ScrollSceneSlide>
        </ScrollSceneStage>
        <ScrollSceneSteps data-testid="steps">
          <ScrollSceneStep step={0} className="md:min-h-[50svh]">
            Step
          </ScrollSceneStep>
        </ScrollSceneSteps>
      </ScrollScene>
    );
    expect(node).toBe(root());
    expect(root().id).toBe("tour");
    expect(root().className).toContain("gap-x-24");
    expect(screen.getByTestId("stage").dataset.slot).toBe("scroll-scene-stage");
    expect(screen.getByTestId("stage").className).toContain("bg-muted");
    expect(screen.getByTestId("steps").dataset.slot).toBe("scroll-scene-steps");
    expect(steps()[0]!.className).toContain("md:min-h-[50svh]");
    expect(steps()[0]!.className).not.toContain("md:min-h-[70svh]");
  });

  it("puts the stage in the end column with stageSide='end'", () => {
    render(<Scene stageSide="end" pinFrom="lg" />);
    expect(root().dataset.stageSide).toBe("end");
    expect(document.querySelector("[data-slot=scroll-scene-stage]")!.className).toContain(
      "lg:col-start-2"
    );
    expect(document.querySelector("[data-slot=scroll-scene-steps]")!.className).toContain(
      "lg:col-start-1"
    );
  });

  it("drives --scroll-scene-progress with a registered property and a view timeline", () => {
    expect(registered).toContainEqual({
      name: "--scroll-scene-progress",
      syntax: "<number>",
      inherits: true,
      initialValue: "1",
    });
    const html = renderToString(<Scene progressRange="cover 10% cover 90%" />);
    expect(html).toContain("supports-[animation-timeline:view()]:animate-scroll-scene-progress");
    expect(html).toContain("motion-reduce:!animate-none");
    expect(html).toContain("animation-timeline:view()");
    expect(html).toContain("animation-range:cover 10% cover 90%");
    expect(renderToString(<Scene />)).toContain("animation-range:contain 0% contain 100%");
  });

  it("sets the timing and layout variables on the root", () => {
    const html = renderToString(
      <Scene distance={40} duration={500} stickyTop="4rem" stageHeight="80svh" easing="linear" />
    );
    expect(html).toContain("--scroll-scene-distance:40px");
    expect(html).toContain("--scroll-scene-duration:500ms");
    expect(html).toContain("--scroll-scene-easing:linear");
    expect(html).toContain("--scroll-scene-top:4rem");
    expect(html).toContain("--scroll-scene-stage-height:80svh");
  });

  it("renders step 0 active on the server, with an inline copy of each slide for small screens", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Scene />);
    const scene = container.querySelector<HTMLElement>("[data-slot=scroll-scene]")!;
    expect(scene.dataset.activeStep).toBe("0");
    expect(scene.className).toContain("md:grid");

    const stage = container.querySelector<HTMLElement>("[data-slot=scroll-scene-stage]")!;
    expect(stage.className).toContain("hidden");
    expect(stage.className).toContain("md:sticky");

    const serverSteps = [
      ...container.querySelectorAll<HTMLElement>("[data-slot=scroll-scene-step]"),
    ];
    expect(serverSteps[0]!.dataset.state).toBe("active");
    const copies = serverSteps.map((step) =>
      step.querySelector<HTMLElement>("[data-slot=scroll-scene-inline-slide]")
    );
    expect(copies.map((copy) => copy?.textContent)).toEqual([
      "Screen one",
      "Screen two",
      "Screen three",
    ]);
    for (const copy of copies) {
      expect(copy!.className).toContain("md:hidden");
      expect(copy!.hasAttribute("inert")).toBe(false);
    }
    const stageSlides = [
      ...container.querySelectorAll<HTMLElement>("[data-slot=scroll-scene-slide]"),
    ];
    expect(stageSlides[0]!.dataset.state).toBe("active");
    expect(stageSlides[1]!.hasAttribute("inert")).toBe(true);
  });

  it("hydrates the server HTML without a mismatch", async () => {
    const onRecoverableError = vi.fn();
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Scene />);
    document.body.append(container);
    const { hydrateRoot } = await import("react-dom/client");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = await act(async () => hydrateRoot(container, <Scene />, { onRecoverableError }));
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
    act(() => app.unmount());
    container.remove();
  });

  it("pins at every width with pinFrom={false}, without inline copies", () => {
    render(<Scene pinFrom={false} />);
    expect(root().dataset.pinFrom).toBe("always");
    expect(inlineSlides()).toHaveLength(0);
    const stage = document.querySelector<HTMLElement>("[data-slot=scroll-scene-stage]")!;
    expect(stage.className).toContain("sticky");
    expect(stage.className).not.toContain("hidden");
    expect(renderToString(<Scene pinFrom={false} />)).not.toContain("scroll-scene-inline-slide");
  });

  it("throws a clear error for parts outside a scene", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ScrollSceneStep step={0}>Alone</ScrollSceneStep>)).toThrow(
      "ScrollSceneStep must be used inside <ScrollScene>."
    );
    consoleError.mockRestore();
  });
});
