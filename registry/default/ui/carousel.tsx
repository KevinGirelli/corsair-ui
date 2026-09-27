"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type Ref,
} from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// How much of a slide has to be visible before it can become the active one.
const VISIBLE = 0.6;

type CarouselAlign = "start" | "center";
type CarouselVariant = "default" | "coverflow";

interface CarouselApi {
  /** The active slide. */
  index: number;
  /** How many slides there are. */
  count: number;
  /** Scrolls to a slide. */
  scrollTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  canPrevious: boolean;
  canNext: boolean;
}

interface CarouselContextValue extends CarouselApi {
  align: CarouselAlign;
  variant: CarouselVariant;
  setViewport: (node: HTMLDivElement | null) => void;
  setCount: (count: number) => void;
}

const CarouselContext = createContext<CarouselContextValue | null>(null);
const CarouselSlideContext = createContext<{ index: number; count: number } | null>(null);

function useCarouselContext(part: string) {
  const context = useContext(CarouselContext);
  if (!context) throw new Error(`${part} has to be inside <Carousel>.`);
  return context;
}

/**
 * The carousel's state and controls, for parts of your own inside `<Carousel>`.
 *
 * @example
 * const { index, count } = useCarousel();
 * return <p aria-hidden="true">{index + 1} / {count}</p>;
 */
function useCarousel(): CarouselApi {
  const { index, count, scrollTo, next, previous, canPrevious, canNext } =
    useCarouselContext("useCarousel");
  return { index, count, scrollTo, next, previous, canPrevious, canNext };
}

/**
 * Where a slide is and whether it is the active one, from inside a
 * `CarouselItem`. Handy to play a video only on the active slide.
 *
 * @example
 * const { active } = useCarouselItem();
 * return active ? <video autoPlay muted src="…" /> : <img src="…" alt="…" />;
 */
function useCarouselItem() {
  const context = useCarouselContext("useCarouselItem");
  const slide = useContext(CarouselSlideContext);
  if (!slide) throw new Error("useCarouselItem has to be inside <CarouselContent>.");
  return { index: slide.index, active: slide.index === context.index };
}

/**
 * Of the slides at least 60% visible, the one nearest the alignment point:
 * the viewport's left edge for "start", its middle for "center".
 */
function mostVisible(
  slides: HTMLElement[],
  ratios: Map<Element, number>,
  viewport: HTMLElement,
  align: CarouselAlign
) {
  const candidates = slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => (ratios.get(slide) ?? 0) >= VISIBLE);
  if (candidates.length <= 1) return candidates[0]?.index ?? -1;
  const box = viewport.getBoundingClientRect();
  const anchor = align === "center" ? box.left + box.width / 2 : box.left;
  let best = -1;
  let distance = Infinity;
  for (const { slide, index } of candidates) {
    const rect = slide.getBoundingClientRect();
    const point = align === "center" ? rect.left + rect.width / 2 : rect.left;
    const gap = Math.abs(point - anchor);
    if (gap < distance) {
      distance = gap;
      best = index;
    }
  }
  return best;
}

interface CarouselProps extends ComponentProps<"div"> {
  /** The active slide, for a controlled carousel. */
  index?: number;
  /** The slide it starts on. */
  defaultIndex?: number;
  /** Called when the active slide changes, by scrolling, swiping or the controls. */
  onIndexChange?: (index: number) => void;
  /** Previous on the first slide goes to the last one, and next on the last to the first. */
  loop?: boolean;
  /** Where slides come to rest: the left edge or the middle. */
  align?: CarouselAlign;
  /** "coverflow" centres the active slide and shrinks and dims the others. */
  variant?: CarouselVariant;
}

/**
 * A row of slides on a native CSS scroll-snap track, so swiping, trackpads,
 * the mouse wheel and scroll bars all work as they do anywhere else, with no
 * dependency. The active slide is the one most in view (IntersectionObserver,
 * no scroll listener), shown in `data-active` and through `useCarousel`.
 *
 * It is a region named "Carousel" (`aria-label`) with each slide a group
 * named "2 of 5". The track takes focus and moves with the arrow keys, Home
 * and End; the previous/next buttons and dots are real buttons. With
 * `prefers-reduced-motion` the controls jump instead of gliding and the
 * coverflow effect does not animate.
 *
 * @example
 * <Carousel aria-label="Featured work" loop>
 *   <CarouselContent trackClassName="gap-4">
 *     <CarouselItem className="md:basis-1/3">…</CarouselItem>
 *     <CarouselItem className="md:basis-1/3">…</CarouselItem>
 *   </CarouselContent>
 *   <div className="mt-4 flex items-center justify-between">
 *     <CarouselPrevious />
 *     <CarouselDots />
 *     <CarouselNext />
 *   </div>
 * </Carousel>
 */
function Carousel({
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  align = "start",
  variant = "default",
  "aria-label": label = "Carousel",
  className,
  ...props
}: CarouselProps) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [count, setCount] = useState(0);
  const [internal, setInternal] = useState(defaultIndex);
  const raw = indexProp ?? internal;
  const current = count > 0 ? clamp(raw, 0, count - 1) : Math.max(0, raw);
  const alignment: CarouselAlign = variant === "coverflow" ? "center" : align;

  const onIndexChangeRef = useRef(onIndexChange);
  useEffect(() => {
    onIndexChangeRef.current = onIndexChange;
  });

  // The slide the scroll position shows, or is gliding to.
  const shown = useRef(0);
  // While the controls glide to a slide, the slides passed on the way are ignored.
  const pending = useRef<number | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const settled = useRef(false);

  const slides = useCallback(
    () =>
      viewport
        ? Array.from(viewport.querySelectorAll<HTMLElement>("[data-slot=carousel-item]")).filter(
            (slide) => slide.closest("[data-slot=carousel-content]") === viewport
          )
        : [],
    [viewport]
  );

  const glideTo = useCallback(
    (target: number, instant: boolean) => {
      const slide = slides()[target];
      if (!viewport || !slide) return;
      pending.current = target;
      clearTimeout(pendingTimer.current);
      pendingTimer.current = setTimeout(() => {
        pending.current = null;
      }, 1000);
      const left =
        alignment === "center"
          ? slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2
          : slide.offsetLeft;
      viewport.scrollTo({
        left,
        behavior: instant || prefersReducedMotion() ? "instant" : "smooth",
      });
    },
    [slides, viewport, alignment]
  );

  useEffect(() => () => clearTimeout(pendingTimer.current), []);

  const scrollTo = useCallback(
    (target: number) => {
      if (count === 0) return;
      const next = loop ? ((target % count) + count) % count : clamp(target, 0, count - 1);
      shown.current = next;
      glideTo(next, false);
      setInternal(next);
      if (next !== current) onIndexChangeRef.current?.(next);
    },
    [count, loop, glideTo, current]
  );

  // Follow `index` when the parent changes it, and start on `defaultIndex`.
  useEffect(() => {
    if (!viewport || count === 0) return;
    const first = !settled.current;
    settled.current = true;
    if (current === shown.current) return;
    shown.current = current;
    glideTo(current, first);
  }, [current, viewport, count, glideTo]);

  // The active slide follows the scroll position.
  useEffect(() => {
    if (!viewport || count === 0 || typeof IntersectionObserver === "undefined") return;
    const elements = slides();
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
        const best = mostVisible(elements, ratios, viewport, alignment);
        if (best < 0) return;
        if (pending.current !== null) {
          if (best !== pending.current) return;
          pending.current = null;
        }
        if (best === shown.current) return;
        shown.current = best;
        setInternal(best);
        onIndexChangeRef.current?.(best);
      },
      { root: viewport, threshold: [0, VISIBLE, 1] }
    );
    for (const element of elements) observer.observe(element);
    // A swipe or a wheel takes over from a glide in progress.
    const release = () => {
      pending.current = null;
    };
    viewport.addEventListener("pointerdown", release, { passive: true });
    viewport.addEventListener("wheel", release, { passive: true });
    viewport.addEventListener("touchstart", release, { passive: true });
    return () => {
      observer.disconnect();
      viewport.removeEventListener("pointerdown", release);
      viewport.removeEventListener("wheel", release);
      viewport.removeEventListener("touchstart", release);
    };
  }, [viewport, count, slides, alignment]);

  const canPrevious = count > 1 && (loop || current > 0);
  const canNext = count > 1 && (loop || current < count - 1);

  const context = useMemo<CarouselContextValue>(
    () => ({
      index: current,
      count,
      scrollTo,
      next: () => scrollTo(current + 1),
      previous: () => scrollTo(current - 1),
      canPrevious,
      canNext,
      align: alignment,
      variant,
      setViewport,
      setCount,
    }),
    [current, count, scrollTo, canPrevious, canNext, alignment, variant]
  );

  return (
    <CarouselContext.Provider value={context}>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        data-slot="carousel"
        data-variant={variant}
        data-align={alignment}
        className={cn("relative", className)}
        {...props}
      />
    </CarouselContext.Provider>
  );
}

interface CarouselContentProps extends ComponentProps<"div"> {
  /** Classes for the flex row that holds the slides, e.g. a `gap-*`. */
  trackClassName?: string;
}

/**
 * The scrolling viewport and the row of slides. Put the `CarouselItem`s
 * directly inside it. It takes keyboard focus: ArrowLeft and ArrowRight
 * move one slide, Home and End go to the first and last. The scroll bar is
 * hidden; swiping, the wheel and the keys still scroll it.
 */
function CarouselContent({
  className,
  trackClassName,
  children,
  onKeyDown,
  ref,
  ...props
}: CarouselContentProps) {
  const { setViewport, setCount, scrollTo, index, count, variant } =
    useCarouselContext("CarouselContent");
  const slides = Children.toArray(children).filter(isValidElement);
  const total = slides.length;
  useEffect(() => {
    setCount(total);
  }, [total, setCount]);
  const mergedRef = useMemo(() => mergeRefs(ref, setViewport), [ref, setViewport]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    // Keys inside a slide (a form field, a link) keep their own meaning.
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    const target =
      event.key === "ArrowLeft"
        ? index - 1
        : event.key === "ArrowRight"
          ? index + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : null;
    if (target === null) return;
    event.preventDefault();
    scrollTo(target);
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the keys add slide steps to a scroll region that already scrolls with them
    <div
      ref={mergedRef}
      data-slot="carousel-content"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region has to be reachable from the keyboard
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-md motion-safe:scroll-smooth",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        className
      )}
      {...props}
    >
      <div
        data-slot="carousel-track"
        className={cn(
          "flex",
          // Room either side so the first and last slides can reach the middle.
          variant === "coverflow" &&
            "before:shrink-0 before:basis-[20%] after:shrink-0 after:basis-[20%]",
          trackClassName
        )}
      >
        {slides.map((slide, position) => (
          <CarouselSlideContext.Provider
            key={slide.key ?? position}
            value={{ index: position, count: total }}
          >
            {slide}
          </CarouselSlideContext.Provider>
        ))}
      </div>
    </div>
  );
}

interface CarouselItemProps extends ComponentProps<"div"> {
  /** Accessible name of the slide. Defaults to "2 of 5". */
  slideLabel?: (index: number, count: number) => string;
}

/**
 * One slide. It fills the viewport by default; set its size with a `basis-*`
 * class (`md:basis-1/3`) to show several at once. `data-active` marks the
 * active slide.
 */
function CarouselItem({
  slideLabel = (index, count) => `${index + 1} of ${count}`,
  className,
  ...props
}: CarouselItemProps) {
  const { align, variant } = useCarouselContext("CarouselItem");
  const slide = useContext(CarouselSlideContext);
  const { active } = useCarouselItem();
  const index = slide?.index ?? 0;
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={slideLabel(index, slide?.count ?? 0)}
      data-slot="carousel-item"
      data-active={active}
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        align === "center" ? "snap-center" : "snap-start",
        variant === "coverflow" &&
          "basis-3/5 transition-[transform,opacity] duration-500 ease-out data-[active=false]:scale-[0.85] data-[active=false]:opacity-50 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
}

interface CarouselButtonProps extends ComponentProps<typeof Button> {
  /** Accessible name of the button. */
  label?: string;
}

/** Goes back one slide. Disabled on the first slide unless the carousel loops. */
function CarouselPrevious({
  label = "Previous slide",
  className,
  onClick,
  children,
  ...props
}: CarouselButtonProps) {
  const { previous, canPrevious } = useCarouselContext("CarouselPrevious");
  return (
    <Button
      data-slot="carousel-previous"
      variant="outline"
      size="icon"
      aria-label={label}
      disabled={!canPrevious}
      className={cn("rounded-full", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) previous();
      }}
      {...props}
    >
      {children ?? <ChevronLeftIcon aria-hidden="true" />}
    </Button>
  );
}

/** Goes forward one slide. Disabled on the last slide unless the carousel loops. */
function CarouselNext({
  label = "Next slide",
  className,
  onClick,
  children,
  ...props
}: CarouselButtonProps) {
  const { next, canNext } = useCarouselContext("CarouselNext");
  return (
    <Button
      data-slot="carousel-next"
      variant="outline"
      size="icon"
      aria-label={label}
      disabled={!canNext}
      className={cn("rounded-full", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) next();
      }}
      {...props}
    >
      {children ?? <ChevronRightIcon aria-hidden="true" />}
    </Button>
  );
}

interface CarouselDotsProps extends ComponentProps<"div"> {
  /** Accessible name of the group of dots. */
  label?: string;
  /** Accessible name of each dot. Defaults to "Go to slide 2". */
  dotLabel?: (index: number, count: number) => string;
}

/** One button per slide; the active one has `aria-current` and `data-active`. */
function CarouselDots({
  label = "Choose a slide",
  dotLabel = (index) => `Go to slide ${index + 1}`,
  className,
  ...props
}: CarouselDotsProps) {
  const { index, count, scrollTo } = useCarouselContext("CarouselDots");
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="carousel-dots"
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      {Array.from({ length: count }, (_, dot) => (
        <button
          key={dot}
          type="button"
          data-slot="carousel-dot"
          data-active={dot === index}
          aria-label={dotLabel(dot, count)}
          aria-current={dot === index ? "true" : undefined}
          onClick={() => scrollTo(dot)}
          className="group/dot focus-visible:ring-ring/50 grid size-6 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-[3px]"
        >
          <span
            aria-hidden="true"
            className="bg-foreground/25 group-data-[active=true]/dot:bg-foreground block size-2 rounded-full transition-colors motion-reduce:transition-none"
          />
        </button>
      ))}
    </div>
  );
}

export {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
  useCarouselItem,
  type CarouselApi,
  type CarouselContentProps,
  type CarouselDotsProps,
  type CarouselItemProps,
  type CarouselProps,
};
