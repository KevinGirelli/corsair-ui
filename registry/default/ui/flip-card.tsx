"use client";

import { Slot } from "@radix-ui/react-slot";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type MouseEvent,
  type Ref,
} from "react";

import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

type FlipCardTriggerMode = "hover" | "click" | "manual";
type FlipCardAxis = "x" | "y";
type FlipCardSide = "front" | "back";

interface FlipCardContextValue {
  flipped: boolean;
  toggle: () => void;
  trigger: FlipCardTriggerMode;
  axis: FlipCardAxis;
  duration: number;
  easing: string;
  id: string;
}

const FlipCardContext = createContext<FlipCardContextValue | null>(null);

function useFlipCard(part: string) {
  const context = useContext(FlipCardContext);
  if (!context) throw new Error(`${part} must be used inside <FlipCard>.`);
  return context;
}

// A tap on one of these is the control's own business, not a request to flip.
const INTERACTIVE =
  "a[href], button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";
const TABBABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** The face of this card (not of a nested one) on the given side. */
function faceOf(root: HTMLElement, side: FlipCardSide) {
  return root.querySelector<HTMLElement>(`:scope > [data-slot="flip-card-${side}"]`);
}

/** Where focus goes when the face holding it turns away: a trigger first, then anything tabbable. */
function focusTarget(root: HTMLElement, face: HTMLElement) {
  const own = (element: Element) => element.closest('[data-slot="flip-card"]') === root;
  const triggers = [...face.querySelectorAll<HTMLElement>('[data-slot="flip-card-trigger"]')];
  return triggers.find(own) ?? [...face.querySelectorAll<HTMLElement>(TABBABLE)].find(own) ?? null;
}

interface FlipCardProps extends ComponentProps<"div"> {
  /** Whether the back is showing (controlled). */
  flipped?: boolean;
  /** Whether the back shows at first (uncontrolled). */
  defaultFlipped?: boolean;
  /** Called with the next value whenever a trigger, or a tap in hover mode, asks to flip. */
  onFlippedChange?: (flipped: boolean) => void;
  /**
   * What turns the card. "hover": the pointer over it or focus inside it, with
   * CSS alone; on touch screens a tap toggles. "click": only a FlipCardTrigger.
   * "manual": nothing on the card itself, drive it with `flipped`.
   */
  trigger?: FlipCardTriggerMode;
  /** "y" turns it like a page, "x" tips it over its horizontal axis. */
  axis?: FlipCardAxis;
  /** How long the turn takes, in ms. */
  duration?: number;
  /** Distance to the viewer, in px: lower values give a deeper 3D turn. */
  perspective?: number;
  /** CSS timing function of the turn. */
  easing?: string;
}

/**
 * A card with two faces that turns over in 3D: stickers that flip on hover,
 * a weekly grid whose cells turn one after another, tiles in a bento. Both
 * faces sit in the same grid cell, so the card takes the size of the larger
 * one and does not jump. Only `transform` and `opacity` animate; with
 * `prefers-reduced-motion` the faces crossfade instead of turning.
 *
 * `trigger="hover"` (default) is CSS: the card turns while the pointer is
 * over it or focus is inside it, so it works without JavaScript. On touch
 * screens (`hover: none`) a tap on the card toggles it; taps on links and
 * buttons inside are left alone. Both faces stay readable and focusable in
 * this mode, since hovering only changes how they are shown: screen readers
 * read the front then the back, and tabbing to a link on the back turns the
 * card so it is visible. Put links and buttons on the back, not the front: a
 * focused control on the front would turn away. `data-state` follows the
 * tap / `flipped` state, not the hover.
 *
 * `trigger="click"` and `"manual"` are state driven: the face turned away is
 * `inert` and `aria-hidden`, so it cannot be reached or read, and when it held
 * focus, focus moves to the first trigger (or control) on the face that
 * turned up. In "click" mode give each face a FlipCardTrigger. In "manual"
 * mode the card listens to nothing: set `flipped` yourself (a
 * FlipCardTrigger still reports through `onFlippedChange`).
 *
 * @example
 * // Hover
 * <FlipCard className="size-40">
 *   <FlipCardFront className="bg-card rounded-xl border">
 *     <img src="/sticker.png" alt="Parrot sticker" className="size-full object-contain" />
 *   </FlipCardFront>
 *   <FlipCardBack className="bg-primary text-primary-foreground rounded-xl p-4">
 *     <a href="/stickers/parrot">Get this sticker</a>
 *   </FlipCardBack>
 * </FlipCard>
 *
 * @example
 * // Click, with a trigger on each face
 * <FlipCard trigger="click" className="w-72">
 *   <FlipCardFront asChild>
 *     <Card>
 *       <CardHeader><CardTitle>Plan</CardTitle></CardHeader>
 *       <CardFooter>
 *         <FlipCardTrigger asChild><Button variant="outline">Show details</Button></FlipCardTrigger>
 *       </CardFooter>
 *     </Card>
 *   </FlipCardFront>
 *   <FlipCardBack asChild>
 *     <Card>
 *       <CardContent>Everything in the plan…</CardContent>
 *       <CardFooter>
 *         <FlipCardTrigger asChild><Button variant="ghost">Back</Button></FlipCardTrigger>
 *       </CardFooter>
 *     </Card>
 *   </FlipCardBack>
 * </FlipCard>
 *
 * @example
 * // Manual: a weekly grid the consumer staggers
 * const [revealed, setRevealed] = useState(0);
 * useEffect(() => {
 *   if (revealed >= days.length) return;
 *   const timer = setTimeout(() => setRevealed((count) => count + 1), 120);
 *   return () => clearTimeout(timer);
 * }, [revealed]);
 * <div className="grid grid-cols-7 gap-2">
 *   {days.map((day, index) => (
 *     <FlipCard key={day.label} trigger="manual" flipped={index < revealed}>
 *       <FlipCardFront className="bg-muted rounded-md p-2">{day.label}</FlipCardFront>
 *       <FlipCardBack className="bg-card rounded-md border p-2">{day.value}</FlipCardBack>
 *     </FlipCard>
 *   ))}
 * </div>
 */
function FlipCard({
  flipped: flippedProp,
  defaultFlipped = false,
  onFlippedChange,
  trigger = "hover",
  axis = "y",
  duration = 600,
  perspective = 1000,
  easing = "cubic-bezier(0.16, 1, 0.3, 1)",
  id: idProp,
  className,
  style,
  ref,
  children,
  ...props
}: FlipCardProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [uncontrolled, setUncontrolled] = useState(defaultFlipped);
  const controlled = flippedProp !== undefined;
  const flipped = controlled ? flippedProp : uncontrolled;

  const root = useRef<HTMLDivElement>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, root), [ref]);
  // Set when a flip is requested while focus is inside, so a face that turns
  // away does not strand it even if the browser has already blurred it.
  const focusWasInside = useRef(false);

  const toggle = useCallback(() => {
    focusWasInside.current = root.current?.contains(document.activeElement) ?? false;
    const next = !flipped;
    if (!controlled) setUncontrolled(next);
    onFlippedChange?.(next);
  }, [controlled, flipped, onFlippedChange]);

  // Touch screens have no hover: a tap on the card toggles it instead. A
  // listener rather than onClick, since the card itself is not a control;
  // keyboard users turn it through focus.
  const cannotHover = useMediaQuery("(hover: none)");
  useEffect(() => {
    const node = root.current;
    if (trigger !== "hover" || !cannotHover || !node) return;
    const handleClick = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented) return;
      const control = (event.target as Element | null)?.closest(INTERACTIVE);
      if (control && node.contains(control)) return;
      toggle();
    };
    node.addEventListener("click", handleClick);
    return () => node.removeEventListener("click", handleClick);
  }, [trigger, cannotHover, toggle]);

  // When the face holding focus turns away (and becomes inert), move focus to the one that turned up.
  useLayoutEffect(() => {
    const wasInside = focusWasInside.current;
    focusWasInside.current = false;
    const node = root.current;
    if (trigger === "hover" || !node) return;
    const hidden = faceOf(node, flipped ? "front" : "back");
    const visible = faceOf(node, flipped ? "back" : "front");
    if (!hidden || !visible) return;
    const active = document.activeElement;
    const stranded =
      (active !== null && hidden.contains(active)) ||
      (wasInside && (active === null || active === document.body));
    if (stranded) focusTarget(node, visible)?.focus();
  }, [flipped, trigger]);

  const context = useMemo(
    () => ({ flipped, toggle, trigger, axis, duration, easing, id }),
    [flipped, toggle, trigger, axis, duration, easing, id]
  );

  return (
    <FlipCardContext.Provider value={context}>
      <div
        ref={mergedRef}
        id={id}
        data-slot="flip-card"
        data-state={flipped ? "flipped" : "unflipped"}
        data-trigger={trigger}
        data-axis={axis}
        className={cn(
          // --flip-card-turn is 0 for the front and 1 for the back; the faces turn,
          // fade and stack from it. `perspective` also makes the root a stacking
          // context, so the faces' z-index stays inside the card.
          "group/flip-card grid [--flip-card-turn:0] data-[state=flipped]:[--flip-card-turn:1]",
          trigger === "hover" &&
            "focus-within:[--flip-card-turn:1] [@media(hover:hover)]:hover:[--flip-card-turn:1]",
          className
        )}
        style={{ perspective: `${perspective}px`, ...style }}
        {...props}
      >
        {children}
      </div>
    </FlipCardContext.Provider>
  );
}

// Whole class names, so Tailwind finds them. The front turns 0 → 180deg, the
// back -180 → 0deg, both the same way round.
const ROTATION: Record<FlipCardAxis, Record<FlipCardSide, string>> = {
  y: {
    front: "motion-safe:[transform:rotateY(calc(var(--flip-card-turn)*180deg))]",
    back: "motion-safe:[transform:rotateY(calc(var(--flip-card-turn)*180deg_-_180deg))]",
  },
  x: {
    front: "motion-safe:[transform:rotateX(calc(var(--flip-card-turn)*180deg))]",
    back: "motion-safe:[transform:rotateX(calc(var(--flip-card-turn)*180deg_-_180deg))]",
  },
};

// Reduced motion: no turn, the face that is away fades out instead.
const CROSSFADE: Record<FlipCardSide, string> = {
  front: "motion-reduce:[opacity:calc(1_-_var(--flip-card-turn))]",
  back: "motion-reduce:[opacity:var(--flip-card-turn)]",
};

// The face towards the reader sits on top, so it takes the clicks even when
// the other one is only faded out (reduced motion) or turned by hover.
const STACKING: Record<FlipCardSide, string> = {
  front: "[z-index:calc(1_-_var(--flip-card-turn))]",
  back: "[z-index:var(--flip-card-turn)]",
};

interface FlipCardFaceProps extends ComponentProps<"div"> {
  /** Render the single child element (a Card, for example) as the face instead of a div. */
  asChild?: boolean;
}

function FlipCardFace({
  side,
  asChild = false,
  className,
  style,
  ...props
}: FlipCardFaceProps & { side: FlipCardSide }) {
  const { flipped, trigger, axis, duration, easing } = useFlipCard(
    side === "front" ? "FlipCardFront" : "FlipCardBack"
  );
  // Only state-driven modes hide the face that is away; in hover mode both stay readable.
  const away = trigger !== "hover" && flipped === (side === "front");
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot={`flip-card-${side}`}
      data-side={side}
      data-state={flipped ? "flipped" : "unflipped"}
      aria-hidden={away || undefined}
      inert={away || undefined}
      className={cn(
        "col-start-1 row-start-1 transition-[transform,opacity] [backface-visibility:hidden]",
        ROTATION[axis][side],
        CROSSFADE[side],
        STACKING[side],
        className
      )}
      style={
        {
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: easing,
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}

/** The side that shows first. */
function FlipCardFront(props: FlipCardFaceProps) {
  return <FlipCardFace side="front" {...props} />;
}

/** The side that turns up when the card flips. */
function FlipCardBack(props: FlipCardFaceProps) {
  return <FlipCardFace side="back" {...props} />;
}

interface FlipCardTriggerProps extends ComponentProps<"button"> {
  /** Render the single child element (your own Button) as the trigger. */
  asChild?: boolean;
}

/**
 * A button that turns the card over. `aria-pressed` says whether the back is
 * showing and `aria-controls` points at the card (pass your own to change it).
 * With `trigger="click"`, put one on each face ("Show details" / "Back").
 */
function FlipCardTrigger({ asChild = false, onClick, ...props }: FlipCardTriggerProps) {
  const { flipped, toggle, id } = useFlipCard("FlipCardTrigger");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : "button"}
      aria-controls={id}
      {...props}
      data-slot="flip-card-trigger"
      data-state={flipped ? "flipped" : "unflipped"}
      aria-pressed={flipped}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) toggle();
      }}
    />
  );
}

export {
  FlipCard,
  FlipCardBack,
  FlipCardFront,
  FlipCardTrigger,
  type FlipCardFaceProps,
  type FlipCardProps,
  type FlipCardTriggerProps,
};
