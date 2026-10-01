"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type Ref,
} from "react";
import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";

// Measuring has to happen before paint in the browser; on the server there is nothing to measure.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const segmentedControlItemVariants = cva(
  [
    "relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap",
    "text-muted-foreground hover:text-foreground data-[state=on]:text-foreground",
    "transition-[color,background-color,box-shadow] outline-none motion-reduce:transition-none",
    "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "disabled:pointer-events-none disabled:opacity-50",
    // Before the thumb is measured (no JavaScript yet), the active item paints the pill itself.
    "data-[state=on]:bg-background data-[state=on]:shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]",
    "group-data-[ready]/segmented:data-[state=on]:bg-transparent group-data-[ready]/segmented:data-[state=on]:shadow-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      size: {
        sm: "h-7 px-2.5 text-xs",
        default: "h-8 px-3 text-sm",
        lg: "h-10 px-4 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

type SegmentedControlSize = NonNullable<VariantProps<typeof segmentedControlItemVariants>["size"]>;

interface SegmentedControlContextValue {
  size: SegmentedControlSize;
  /** Watches an item's size, so a label or font change moves the thumb. Returns the cleanup. */
  register: (item: HTMLElement) => () => void;
}

const SegmentedControlContext = createContext<SegmentedControlContextValue>({
  size: "default",
  register: () => () => {},
});

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ThumbMotion {
  animate: boolean;
  duration: number;
  easing: string;
}

/** Where the thumb is drawn right now, mid-transition included, read from its computed transform. */
function visibleBox(thumb: HTMLElement, fallback: Box): Box {
  const match = /^matrix(3d)?\((.+)\)$/.exec(getComputedStyle(thumb).transform);
  if (!match?.[2]) return fallback;
  const values = match[2].split(",").map(Number);
  const scaleX = values[0];
  const x = match[1] ? values[12] : values[4];
  if (scaleX === undefined || x === undefined || !Number.isFinite(scaleX + x)) return fallback;
  return { ...fallback, x, width: fallback.width * scaleX };
}

function activeItem(root: HTMLElement) {
  for (const item of root.querySelectorAll<HTMLElement>(
    '[data-slot="segmented-control-item"][data-state="on"]'
  )) {
    if (item.closest('[data-slot="segmented-control"]') === root) return item;
  }
  return null;
}

/**
 * Puts the thumb over the active item. Size changes are applied at once;
 * position changes animate by FLIP: the thumb takes its new size and place,
 * is transformed back onto the old box with no transition, and then
 * transitions the transform to identity. Only `transform` ever animates.
 */
function placeThumb(
  root: HTMLElement,
  thumb: HTMLElement,
  last: { current: Box | null },
  { animate, duration, easing }: ThumbMotion
) {
  const item = activeItem(root);
  if (!item) {
    last.current = null;
    root.removeAttribute("data-ready");
    return;
  }
  // Layout offsets, not client rects: they ignore transforms on ancestors (a dialog zooming in).
  const next: Box = {
    x: item.offsetLeft,
    y: item.offsetTop,
    width: item.offsetWidth,
    height: item.offsetHeight,
  };
  const previous = last.current;
  last.current = next;
  const from = previous && visibleBox(thumb, previous);
  const rest = `translate3d(${next.x}px, ${next.y}px, 0)`;

  thumb.style.width = `${next.width}px`;
  thumb.style.height = `${next.height}px`;
  root.setAttribute("data-ready", "");

  const moves = from && (from.x !== next.x || from.width !== next.width);
  if (!animate || !from || !moves || from.width <= 0 || next.width <= 0 || duration <= 0) {
    thumb.style.transition = "none";
    thumb.style.transform = rest;
    return;
  }
  thumb.style.transition = "none";
  thumb.style.transform = `translate3d(${from.x}px, ${next.y}px, 0) scaleX(${from.width / next.width})`;
  // Reading layout commits the inverted transform, so the transition starts from it.
  thumb.getBoundingClientRect();
  thumb.style.transition = `transform ${duration}ms ${easing}`;
  thumb.style.transform = rest;
}

interface SegmentedControlProps
  extends
    Omit<
      ToggleGroupPrimitive.ToggleGroupSingleProps,
      "type" | "value" | "defaultValue" | "onValueChange" | "orientation"
    >,
    VariantProps<typeof segmentedControlItemVariants> {
  /** The active item, controlled. */
  value?: string;
  /** The active item at first, uncontrolled. Give one: the control is never empty once chosen. */
  defaultValue?: string;
  /** Called with the newly active item's value. Pressing the active item again does nothing. */
  onValueChange?: (value: string) => void;
  /** Classes for the sliding thumb, e.g. `bg-primary` (pair with item text colours). */
  thumbClassName?: string;
  /** How long the thumb takes to slide, in ms. */
  duration?: number;
  /** Timing function for the slide, any CSS easing. */
  easing?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A switch between two or more options with one thumb that slides to the
 * active one: "Monthly | Yearly", "For players | For venues". Built on the
 * Radix toggle group (single): it is one Tab stop, the arrow keys move
 * between items and Space or Enter picks one. It never goes empty: pressing
 * the active item again keeps it. Give it an `aria-label`.
 *
 * The thumb moves by transform only (FLIP), and jumps instead with
 * `prefers-reduced-motion` and when the control or a label resizes. Until it
 * has been measured (server HTML, no JavaScript) the active item paints the
 * pill itself, so there is no flash and no layout shift. Horizontal only.
 * For a pill fixed at the bottom on phones, position it with `className`.
 *
 * @example
 * <SegmentedControl
 *   aria-label="Audience"
 *   defaultValue="players"
 *   className="max-md:fixed max-md:inset-x-0 max-md:bottom-4 max-md:mx-auto max-md:shadow-lg"
 * >
 *   <SegmentedControlItem value="players">For players</SegmentedControlItem>
 *   <SegmentedControlItem value="venues">For venues</SegmentedControlItem>
 * </SegmentedControl>
 */
function SegmentedControl({
  value,
  defaultValue,
  onValueChange,
  size,
  thumbClassName,
  duration = 320,
  easing = "cubic-bezier(0.16, 1, 0.3, 1)",
  className,
  children,
  ref,
  ...props
}: SegmentedControlProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value ?? uncontrolled;
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  const root = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const last = useRef<Box | null>(null);
  const items = useRef(new Set<HTMLElement>());
  const observer = useRef<ResizeObserver | null>(null);
  const motion = useRef({ reduced, duration, easing });
  const mergedRef = useMemo(() => mergeRefs(ref, root), [ref]);

  useIsomorphicLayoutEffect(() => {
    motion.current = { reduced, duration, easing };
  });

  const place = useCallback((animate: boolean) => {
    if (!root.current || !thumb.current) return;
    const { reduced, duration, easing } = motion.current;
    placeThumb(root.current, thumb.current, last, {
      animate: animate && !reduced,
      duration,
      easing,
    });
  }, []);

  const register = useCallback((item: HTMLElement) => {
    items.current.add(item);
    observer.current?.observe(item);
    return () => {
      items.current.delete(item);
      observer.current?.unobserve(item);
    };
  }, []);

  // Resizes of the control or of any item (labels, fonts) jump the thumb, never animate it.
  useIsomorphicLayoutEffect(() => {
    if (!root.current || typeof ResizeObserver === "undefined") return;
    const resizes = new ResizeObserver(() => place(false));
    resizes.observe(root.current);
    for (const item of items.current) resizes.observe(item);
    observer.current = resizes;
    return () => {
      resizes.disconnect();
      observer.current = null;
    };
  }, [place]);

  // A new value slides the thumb; the first placement jumps.
  useIsomorphicLayoutEffect(() => {
    place(true);
  }, [current, place]);

  const context = useMemo(() => ({ size: size ?? "default", register }), [size, register]);

  return (
    <ToggleGroupPrimitive.Root
      ref={mergedRef}
      type="single"
      orientation="horizontal"
      value={current ?? ""}
      onValueChange={(next) => {
        // Radix reports "" when the active item is pressed again: stay on it.
        if (!next) return;
        if (value === undefined) setUncontrolled(next);
        onValueChange?.(next);
      }}
      data-slot="segmented-control"
      data-size={size ?? "default"}
      className={cn(
        "group/segmented bg-muted relative isolate inline-flex w-fit items-center rounded-full p-1",
        className
      )}
      {...props}
    >
      <span
        ref={thumb}
        aria-hidden
        data-slot="segmented-control-thumb"
        className={cn(
          "bg-background pointer-events-none absolute top-0 left-0 z-0 origin-left rounded-full shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]",
          "opacity-0 group-data-[ready]/segmented:opacity-100",
          thumbClassName
        )}
      />
      <SegmentedControlContext.Provider value={context}>
        {children}
      </SegmentedControlContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

type SegmentedControlItemProps = ComponentProps<typeof ToggleGroupPrimitive.Item>;

/** One option of a `SegmentedControl`. Its `value` is what `onValueChange` reports. */
function SegmentedControlItem({ className, ref, ...props }: SegmentedControlItemProps) {
  const { size, register } = useContext(SegmentedControlContext);
  const item = useRef<HTMLButtonElement>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, item), [ref]);

  useIsomorphicLayoutEffect(() => {
    if (!item.current) return;
    return register(item.current);
  }, [register]);

  return (
    <ToggleGroupPrimitive.Item
      ref={mergedRef}
      data-slot="segmented-control-item"
      data-size={size}
      className={cn(segmentedControlItemVariants({ size }), className)}
      {...props}
    />
  );
}

export {
  SegmentedControl,
  SegmentedControlItem,
  segmentedControlItemVariants,
  type SegmentedControlProps,
  type SegmentedControlItemProps,
};
