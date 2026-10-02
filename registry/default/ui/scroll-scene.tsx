"use client";

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { useScrollSpy } from "@/registry/default/hooks/use-scroll-spy";
import { cn } from "@/registry/default/lib/utils";

// Registering the progress as a number lets the scroll-driven animation
// interpolate it; an unregistered custom property would jump from 0 to 1
// halfway through. It inherits, so every part of the scene can read it, and
// it rests at 1 (the finished state) wherever the animation does not run.
if (typeof CSS !== "undefined" && "registerProperty" in CSS) {
  try {
    CSS.registerProperty({
      name: "--scroll-scene-progress",
      syntax: "<number>",
      inherits: true,
      initialValue: "1",
    });
  } catch {
    // Already registered by another copy of the component.
  }
}

type ScrollScenePinFrom = "sm" | "md" | "lg" | "xl" | false;
type ScrollSceneStageSide = "start" | "end";
type LayoutKey = "sm" | "md" | "lg" | "xl" | "always";

interface Layout {
  root: string;
  stage: string;
  stageStart: string;
  stageEnd: string;
  steps: string;
  stepsStart: string;
  stepsEnd: string;
  step: string;
  inline: string;
}

// Literal class strings, one set per breakpoint, so Tailwind finds every one
// of them when it scans this file.
const LAYOUTS: Record<LayoutKey, Layout> = {
  sm: {
    root: "sm:grid sm:grid-cols-2 sm:items-start sm:gap-x-12",
    stage:
      "hidden sm:sticky sm:row-start-1 sm:grid sm:h-[var(--scroll-scene-stage-height)] sm:place-items-center sm:top-[var(--scroll-scene-top)]",
    stageStart: "sm:col-start-1",
    stageEnd: "sm:col-start-2",
    steps: "flex flex-col gap-16 sm:row-start-1 sm:gap-0",
    stepsStart: "sm:col-start-2",
    stepsEnd: "sm:col-start-1",
    step: "sm:flex sm:min-h-[70svh] sm:flex-col sm:justify-center",
    inline: "mt-8 flex justify-center sm:hidden",
  },
  md: {
    root: "md:grid md:grid-cols-2 md:items-start md:gap-x-12",
    stage:
      "hidden md:sticky md:row-start-1 md:grid md:h-[var(--scroll-scene-stage-height)] md:place-items-center md:top-[var(--scroll-scene-top)]",
    stageStart: "md:col-start-1",
    stageEnd: "md:col-start-2",
    steps: "flex flex-col gap-16 md:row-start-1 md:gap-0",
    stepsStart: "md:col-start-2",
    stepsEnd: "md:col-start-1",
    step: "md:flex md:min-h-[70svh] md:flex-col md:justify-center",
    inline: "mt-8 flex justify-center md:hidden",
  },
  lg: {
    root: "lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12",
    stage:
      "hidden lg:sticky lg:row-start-1 lg:grid lg:h-[var(--scroll-scene-stage-height)] lg:place-items-center lg:top-[var(--scroll-scene-top)]",
    stageStart: "lg:col-start-1",
    stageEnd: "lg:col-start-2",
    steps: "flex flex-col gap-16 lg:row-start-1 lg:gap-0",
    stepsStart: "lg:col-start-2",
    stepsEnd: "lg:col-start-1",
    step: "lg:flex lg:min-h-[70svh] lg:flex-col lg:justify-center",
    inline: "mt-8 flex justify-center lg:hidden",
  },
  xl: {
    root: "xl:grid xl:grid-cols-2 xl:items-start xl:gap-x-12",
    stage:
      "hidden xl:sticky xl:row-start-1 xl:grid xl:h-[var(--scroll-scene-stage-height)] xl:place-items-center xl:top-[var(--scroll-scene-top)]",
    stageStart: "xl:col-start-1",
    stageEnd: "xl:col-start-2",
    steps: "flex flex-col gap-16 xl:row-start-1 xl:gap-0",
    stepsStart: "xl:col-start-2",
    stepsEnd: "xl:col-start-1",
    step: "xl:flex xl:min-h-[70svh] xl:flex-col xl:justify-center",
    inline: "mt-8 flex justify-center xl:hidden",
  },
  always: {
    root: "grid grid-cols-2 items-start gap-x-12",
    stage:
      "sticky row-start-1 grid h-[var(--scroll-scene-stage-height)] place-items-center top-[var(--scroll-scene-top)]",
    stageStart: "col-start-1",
    stageEnd: "col-start-2",
    steps: "flex flex-col row-start-1",
    stepsStart: "col-start-2",
    stepsEnd: "col-start-1",
    step: "flex min-h-[70svh] flex-col justify-center",
    inline: "hidden",
  },
};

interface ScrollSceneContextValue {
  activeStep: number;
  stepCount: number;
  sceneId: string;
  layout: Layout;
  stageSide: ScrollSceneStageSide;
  /** Slides from the stage by step, rendered again inside the steps below the breakpoint. */
  inlineSlides: ReadonlyMap<number, ReactElement<ScrollSceneSlideProps>> | null;
  register: (step: number, id: string) => () => void;
}

const ScrollSceneContext = createContext<ScrollSceneContextValue | null>(null);

// True for the copy of a slide rendered inside its step, for small screens.
const InlineSlideContext = createContext(false);

function useScrollSceneContext(part: string) {
  const context = useContext(ScrollSceneContext);
  if (!context) throw new Error(`${part} must be used inside <ScrollScene>.`);
  return context;
}

interface ScrollSceneState {
  /** The step on the line, or the controlled `step`. */
  activeStep: number;
  /** How many `ScrollSceneStep`s the scene has. */
  stepCount: number;
}

/**
 * The scene's active step and step count, for custom parts inside a
 * `ScrollScene`: a "2 / 3" counter, a progress dot row, a caption.
 *
 * @example
 * function Counter() {
 *   const { activeStep, stepCount } = useScrollScene();
 *   return <p className="text-muted-foreground text-sm">{activeStep + 1} / {stepCount}</p>;
 * }
 */
function useScrollScene(): ScrollSceneState {
  const { activeStep, stepCount } = useScrollSceneContext("useScrollScene");
  return { activeStep, stepCount };
}

interface ScrollSceneProps extends ComponentProps<"div"> {
  /** The active step, controlled. Takes over from the scroll position. */
  step?: number;
  /** The active step before any step reaches the line, and in the server HTML. */
  defaultStep?: number;
  /** Called when a different step reaches the line. */
  onStepChange?: (step: number) => void;
  /**
   * The breakpoint from which the stage is pinned beside the steps. Below it
   * the scene is a plain sequence, each step followed by its own slide.
   * `false` pins it at every width.
   */
  pinFrom?: ScrollScenePinFrom;
  /** Which column the stage sits in when pinned. */
  stageSide?: ScrollSceneStageSide;
  /** Where the pinned stage sticks, as a CSS length (below a fixed header: "4rem"). */
  stickyTop?: string;
  /** The pinned stage's height, as a CSS length. Slides are centred in it. */
  stageHeight?: string;
  /**
   * The line across the viewport that decides the active step, as an
   * IntersectionObserver root margin. The default is the viewport's middle.
   */
  rootMargin?: string;
  /** How far, in px, an incoming slide rises while it fades in. */
  distance?: number;
  /** Length of the slide crossfade, in ms. */
  duration?: number;
  /** Timing function of the slide crossfade. */
  easing?: string;
  /**
   * The CSS `animation-range` that `--scroll-scene-progress` runs 0 to 1 over.
   * The default goes from the scene's top reaching the viewport's top to its
   * bottom reaching the viewport's bottom: the stretch the stage is pinned.
   */
  progressRange?: string;
}

/** Slides found in the stage, by step. The stage must be a direct child, its slides direct children of it. */
function collectInlineSlides(children: ReactNode) {
  const slides = new Map<number, ReactElement<ScrollSceneSlideProps>>();
  for (const child of Children.toArray(children)) {
    if (!isValidElement<ScrollSceneStageProps>(child) || child.type !== ScrollSceneStage) continue;
    for (const slide of Children.toArray(child.props.children)) {
      if (isValidElement<ScrollSceneSlideProps>(slide) && slide.type === ScrollSceneSlide) {
        slides.set(slide.props.step, slide);
      }
    }
  }
  return slides;
}

/** How many steps sit directly in a direct `ScrollSceneSteps` child, known on the server too. */
function countSteps(children: ReactNode) {
  let count = 0;
  for (const child of Children.toArray(children)) {
    if (!isValidElement<ScrollSceneStepsProps>(child) || child.type !== ScrollSceneSteps) continue;
    for (const step of Children.toArray(child.props.children)) {
      if (isValidElement(step) && step.type === ScrollSceneStep) count++;
    }
  }
  return count;
}

/**
 * A scrollytelling scene: a stage pinned beside steps of text, showing the
 * slide of the step crossing the middle of the viewport. Slides crossfade and
 * rise into place on a CSS transition; one IntersectionObserver picks the
 * step, so there are no scroll listeners.
 *
 * Below `pinFrom` nothing is pinned: the stage is hidden and every step shows
 * its own slide after its text. Each slide is rendered twice (once in the
 * stage, once in its step) and CSS shows one copy or the other, so the server
 * HTML matches every screen and nothing shifts on hydration. The hidden copy
 * is `display: none`, out of the accessibility tree. Images inside slides
 * with `loading="lazy"` are only fetched for the copy that shows.
 *
 * `ScrollSceneStage` must be a direct child of `ScrollScene`, and its
 * `ScrollSceneSlide`s direct children of the stage, for the small-screen
 * copies to be found. Inactive slides are `inert` and hidden from screen
 * readers; the steps carry the story. Without JavaScript the steps read in
 * order and the stage shows `defaultStep`'s slide.
 *
 * `--scroll-scene-progress` runs from 0 to 1 while the scene scrolls past,
 * on a CSS scroll-driven animation, for parts that scrub with the scroll.
 * Read it as `var(--scroll-scene-progress, 1)`: browsers without scroll
 * timelines, and `prefers-reduced-motion`, keep it at 1, the finished state.
 * With reduced motion slides swap with a short fade and no movement.
 *
 * Sticky needs a scrolling ancestor that is not `overflow: hidden`; clip a
 * wrapper with `overflow: clip` (`overflow-clip`) instead.
 *
 * @example
 * <ScrollScene pinFrom="md" onStepChange={setStep}>
 *   <ScrollSceneStage>
 *     <ScrollSceneSlide step={0}><Phone screen="inbox" /></ScrollSceneSlide>
 *     <ScrollSceneSlide step={1}>
 *       <div style={{ transform: "translateY(calc((1 - var(--scroll-scene-progress, 1)) * 40px))" }}>
 *         <Phone screen="chat" />
 *       </div>
 *     </ScrollSceneSlide>
 *   </ScrollSceneStage>
 *   <ScrollSceneSteps>
 *     <ScrollSceneStep step={0}><h3>Every message in one place</h3></ScrollSceneStep>
 *     <ScrollSceneStep step={1}><h3>Reply without switching apps</h3></ScrollSceneStep>
 *   </ScrollSceneSteps>
 * </ScrollScene>
 */
function ScrollScene({
  step,
  defaultStep = 0,
  onStepChange,
  pinFrom = "md",
  stageSide = "start",
  stickyTop = "0px",
  stageHeight = "100svh",
  rootMargin = "-50% 0px -50% 0px",
  distance = 24,
  duration = 320,
  easing = "cubic-bezier(0.16, 1, 0.3, 1)",
  progressRange = "contain 0% contain 100%",
  className,
  style,
  children,
  ...props
}: ScrollSceneProps) {
  const sceneId = useId();
  const layout = LAYOUTS[pinFrom === false ? "always" : pinFrom];

  // Steps register their ids once mounted, so a step's own `id` is kept.
  const [registered, setRegistered] = useState<Readonly<Record<number, string>>>({});
  const register = useCallback((index: number, id: string) => {
    setRegistered((current) => (current[index] === id ? current : { ...current, [index]: id }));
    return () =>
      setRegistered((current) => {
        if (current[index] !== id) return current;
        const next = { ...current };
        delete next[index];
        return next;
      });
  }, []);

  const order = useMemo(
    () =>
      Object.keys(registered)
        .map(Number)
        .sort((a, b) => a - b),
    [registered]
  );
  const ids = useMemo(() => order.map((index) => registered[index]!), [order, registered]);
  const spyId = useScrollSpy(ids, { rootMargin });
  // Without IntersectionObserver the hook falls back to the first id; keep
  // `defaultStep` instead. On the server and while hydrating `spyId` is unset.
  const spyStep =
    typeof IntersectionObserver === "undefined" || spyId === undefined
      ? undefined
      : order[ids.indexOf(spyId)];
  const activeStep = step ?? spyStep ?? defaultStep;

  // The last step reported, to call `onStepChange` once per change of step.
  const reported = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (spyStep === undefined || spyStep === reported.current) return;
    const previous = step ?? reported.current ?? defaultStep;
    reported.current = spyStep;
    if (spyStep !== previous) onStepChange?.(spyStep);
  }, [spyStep, step, defaultStep, onStepChange]);

  const inlineSlides = useMemo(
    () => (pinFrom === false ? null : collectInlineSlides(children)),
    [pinFrom, children]
  );
  const scannedSteps = useMemo(() => countSteps(children), [children]);
  const stepCount = Math.max(scannedSteps, order.length);

  const context = useMemo<ScrollSceneContextValue>(
    () => ({ activeStep, stepCount, sceneId, layout, stageSide, inlineSlides, register }),
    [activeStep, stepCount, sceneId, layout, stageSide, inlineSlides, register]
  );

  return (
    <div
      data-slot="scroll-scene"
      data-active-step={activeStep}
      data-pin-from={pinFrom === false ? "always" : pinFrom}
      data-stage-side={stageSide}
      className={cn(
        layout.root,
        "supports-[animation-timeline:view()]:animate-scroll-scene-progress motion-reduce:!animate-none",
        className
      )}
      style={
        {
          "--scroll-scene-distance": `${distance}px`,
          "--scroll-scene-duration": `${duration}ms`,
          "--scroll-scene-easing": easing,
          "--scroll-scene-top": stickyTop,
          "--scroll-scene-stage-height": stageHeight,
          // After the utility's shorthand, which would reset them.
          animationTimeline: "view()",
          animationRange: progressRange,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <ScrollSceneContext.Provider value={context}>{children}</ScrollSceneContext.Provider>
    </div>
  );
}

type ScrollSceneStageProps = ComponentProps<"div">;

/**
 * The pinned column that shows the active step's slide. Put it directly in
 * `ScrollScene`, with `ScrollSceneSlide`s directly in it. Slides share one
 * grid cell, so the stage is as big as the largest one and nothing shifts
 * when they swap. Hidden below the scene's `pinFrom` breakpoint.
 *
 * @example
 * <ScrollSceneStage>
 *   <ScrollSceneSlide step={0}>…</ScrollSceneSlide>
 *   <ScrollSceneSlide step={1}>…</ScrollSceneSlide>
 * </ScrollSceneStage>
 */
function ScrollSceneStage({ className, ...props }: ScrollSceneStageProps) {
  const { layout, stageSide } = useScrollSceneContext("ScrollSceneStage");
  return (
    <div
      data-slot="scroll-scene-stage"
      className={cn(
        layout.stage,
        stageSide === "start" ? layout.stageStart : layout.stageEnd,
        className
      )}
      {...props}
    />
  );
}

interface ScrollSceneSlideProps extends ComponentProps<"div"> {
  /** The step this slide belongs to, the same number as its `ScrollSceneStep`. */
  step: number;
}

/**
 * What the stage shows for one step: a phone screen, a picture, a card.
 * Inactive slides are transparent, lowered by the scene's `distance`,
 * `inert` and hidden from screen readers. Below the breakpoint a copy of it
 * (`data-slot="scroll-scene-inline-slide"`, without its `id` and `ref`)
 * follows its step's text instead.
 *
 * @example
 * <ScrollSceneSlide step={0}>
 *   <img src="/screens/inbox.png" alt="The inbox, with three unread threads" loading="lazy" />
 * </ScrollSceneSlide>
 */
function ScrollSceneSlide({ step, className, id, ref, ...props }: ScrollSceneSlideProps) {
  const { activeStep, layout } = useScrollSceneContext("ScrollSceneSlide");
  const inline = useContext(InlineSlideContext);
  const active = activeStep === step;
  const state = active ? "active" : "inactive";

  if (inline) {
    return (
      <div
        data-slot="scroll-scene-inline-slide"
        data-state={state}
        data-step={step}
        className={cn(layout.inline, className)}
        {...props}
      />
    );
  }

  return (
    <div
      ref={ref}
      id={id}
      data-slot="scroll-scene-slide"
      data-state={state}
      data-step={step}
      aria-hidden={active ? undefined : true}
      inert={!active}
      className={cn(
        "[--scroll-scene-shift:var(--scroll-scene-distance)] [grid-area:1/1] motion-reduce:[--scroll-scene-shift:0px]",
        "[transition:opacity_var(--scroll-scene-duration)_var(--scroll-scene-easing),transform_var(--scroll-scene-duration)_var(--scroll-scene-easing)] motion-reduce:[transition:opacity_150ms_linear]",
        "data-[state=inactive]:[transform:translate3d(0,var(--scroll-scene-shift),0)] data-[state=inactive]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

type ScrollSceneStepsProps = ComponentProps<"div">;

/**
 * The column of steps beside the stage. Below the breakpoint it is the whole
 * scene: the steps in order, each with its slide.
 *
 * @example
 * <ScrollSceneSteps>
 *   <ScrollSceneStep step={0}>…</ScrollSceneStep>
 *   <ScrollSceneStep step={1}>…</ScrollSceneStep>
 * </ScrollSceneSteps>
 */
function ScrollSceneSteps({ className, ...props }: ScrollSceneStepsProps) {
  const { layout, stageSide } = useScrollSceneContext("ScrollSceneSteps");
  return (
    <div
      data-slot="scroll-scene-steps"
      className={cn(
        layout.steps,
        stageSide === "start" ? layout.stepsStart : layout.stepsEnd,
        className
      )}
      {...props}
    />
  );
}

interface ScrollSceneStepProps extends ComponentProps<"div"> {
  /** Its number in the scene, from 0, matching a `ScrollSceneSlide`. */
  step: number;
}

/**
 * One step of the story. It becomes the active step when it crosses the
 * scene's line (the middle of the viewport by default). When pinned it is at
 * least 70% of the viewport tall with its content centred; change that with
 * the same breakpoint prefix as `pinFrom` (`md:min-h-[50svh]`). Below the
 * breakpoint its slide follows its content. It gets an id if it has none.
 *
 * @example
 * <ScrollSceneStep step={1}>
 *   <h3 className="text-2xl font-semibold">Reply without switching apps</h3>
 *   <p className="text-muted-foreground">Every channel lands in the same thread.</p>
 * </ScrollSceneStep>
 */
function ScrollSceneStep({ step, id, className, children, ...props }: ScrollSceneStepProps) {
  const { activeStep, sceneId, layout, inlineSlides, register } =
    useScrollSceneContext("ScrollSceneStep");
  const stepId = id ?? `${sceneId}-step-${step}`;
  useEffect(() => register(step, stepId), [register, step, stepId]);
  const slide = inlineSlides?.get(step);

  return (
    <div
      id={stepId}
      data-slot="scroll-scene-step"
      data-state={activeStep === step ? "active" : "inactive"}
      data-step={step}
      className={cn(layout.step, className)}
      {...props}
    >
      {children}
      {slide ? <InlineSlideContext.Provider value>{slide}</InlineSlideContext.Provider> : null}
    </div>
  );
}

export {
  ScrollScene,
  ScrollSceneSlide,
  ScrollSceneStage,
  ScrollSceneStep,
  ScrollSceneSteps,
  useScrollScene,
  type ScrollScenePinFrom,
  type ScrollSceneProps,
  type ScrollSceneSlideProps,
  type ScrollSceneStageProps,
  type ScrollSceneStageSide,
  type ScrollSceneState,
  type ScrollSceneStepProps,
  type ScrollSceneStepsProps,
};
