"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
} from "react";

import { useInView } from "@/registry/default/hooks/use-in-view";
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

/** How far, in px, the pointer moves before a press becomes a drag, so taps and clicks on links still work. */
const DRAG_THRESHOLD = 5;

interface MarqueeProps extends Omit<ComponentProps<"div">, "draggable"> {
  /** Which way the content travels. */
  direction?: "left" | "right" | "up" | "down";
  /** Seconds for the content to travel its own length. */
  duration?: number;
  /** Space between items, and between the end of the content and its next copy. Any CSS length. */
  gap?: string;
  /** Hold still while the pointer is over it. */
  pauseOnHover?: boolean;
  /** Fade the content out at both edges. */
  fade?: boolean;
  /** How much of each edge the fade covers, in percent. */
  fadeAmount?: number;
  /**
   * Copies of the content in the loop. Two are enough when the content is
   * at least as long as the marquee; raise it for short content in a wide one.
   */
  repeat?: number;
  /**
   * Names the marquee for screen readers when `prefers-reduced-motion` turns
   * it into a box you scroll by hand: it then becomes a focusable region, so
   * keyboard users can scroll it too.
   */
  label?: string;
  /**
   * Let the pointer grab the loop and drag it either way; it carries on from
   * where it is let go. A press that moves less than a few pixels is still a
   * click, so links inside keep working. With `prefers-reduced-motion` the
   * marquee is a scroll box instead, and this does nothing.
   */
  draggable?: boolean;
}

/** The loop's CSS animation on the track, where the browser supports looking it up. */
function loopAnimation(track: HTMLElement | null) {
  return track
    ?.getAnimations?.()
    .find((animation) => (animation as CSSAnimation).animationName?.startsWith("marquee"));
}

/**
 * Content that scrolls in an endless loop: logos, quotes, ports of call.
 * It is one CSS animation of a transform. The copies that make the loop
 * seamless are hidden from screen readers and cannot take focus; the loop
 * stops while a link inside has keyboard focus, and pauses off screen.
 * With `prefers-reduced-motion` it holds still and scrolls by hand instead.
 * With `draggable`, the pointer can grab the loop: dragging seeks the same
 * CSS animation, so the loop stays seamless and there are no scroll listeners.
 *
 * @example
 * <Marquee pauseOnHover gap="3rem">
 *   <span>Salvador</span>
 *   <span>Cartagena</span>
 *   <span>Havana</span>
 * </Marquee>
 */
function Marquee({
  direction = "left",
  duration = 20,
  gap = "1rem",
  pauseOnHover = false,
  fade = true,
  fadeAmount = 10,
  repeat = 2,
  label = "Scrolling content",
  draggable = false,
  className,
  style,
  ref,
  children,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClickCapture,
  onDragStart,
  ...props
}: MarqueeProps) {
  const [observe, inView] = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const root = useRef<HTMLDivElement>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, observe, root), [ref, observe]);
  // A scroll box has to be reachable from the keyboard. Set on the element, and
  // only while it is one, so the moving marquee stays out of the tab order.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    if (reduced) element.tabIndex = 0;
    else element.removeAttribute("tabindex");
  }, [reduced]);

  const vertical = direction === "up" || direction === "down";
  const reversed = direction === "right" || direction === "down";
  const copies = Math.max(2, Math.floor(repeat));

  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; start: number; last: number; moving: boolean }>(null);
  // Set when a drag ends, so the click the browser fires after it does not follow a link.
  const dragged = useRef(false);
  const position = (event: PointerEvent<HTMLElement>) => (vertical ? event.clientY : event.clientX);

  // Moves the loop by `distance` px by seeking its animation. Setting the
  // time (rather than calling pause or play) keeps CSS in charge of pausing.
  const seek = (distance: number) => {
    const animation = loopAnimation(track.current);
    if (!animation || !track.current) return;
    const box = track.current.getBoundingClientRect();
    const length = (vertical ? box.height : box.width) / copies;
    const period = Number(animation.effect?.getComputedTiming().duration);
    if (!length || !period) return;
    // Forwards, the track moves towards the start as time runs; reversed, away from it.
    const time =
      Number(animation.currentTime ?? 0) + (distance / length) * period * (reversed ? 1 : -1);
    animation.currentTime = ((time % period) + period) % period;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!current.moving) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.currentTarget.removeAttribute("data-dragging");
    dragged.current = !cancelled;
  };

  const dragHandlers = draggable
    ? {
        onPointerDown(event: PointerEvent<HTMLDivElement>) {
          onPointerDown?.(event);
          dragged.current = false;
          if (event.defaultPrevented || event.button !== 0 || drag.current) return;
          const start = position(event);
          drag.current = { pointerId: event.pointerId, start, last: start, moving: false };
        },
        onPointerMove(event: PointerEvent<HTMLDivElement>) {
          onPointerMove?.(event);
          const current = drag.current;
          if (!current || current.pointerId !== event.pointerId) return;
          const now = position(event);
          if (!current.moving) {
            if (Math.abs(now - current.start) < DRAG_THRESHOLD) return;
            // Only now, so a plain click still lands on the link under the pointer.
            current.moving = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.setAttribute("data-dragging", "true");
            // Pressing a link focuses it, and focus inside pauses the loop; a drag is not a visit.
            const focused = document.activeElement;
            if (focused instanceof HTMLElement && event.currentTarget.contains(focused)) {
              focused.blur();
            }
          }
          seek(now - current.last);
          current.last = now;
        },
        onPointerUp(event: PointerEvent<HTMLDivElement>) {
          onPointerUp?.(event);
          endDrag(event, false);
        },
        onPointerCancel(event: PointerEvent<HTMLDivElement>) {
          onPointerCancel?.(event);
          endDrag(event, true);
        },
        onClickCapture(event: MouseEvent<HTMLDivElement>) {
          onClickCapture?.(event);
          if (!dragged.current) return;
          dragged.current = false;
          event.preventDefault();
          event.stopPropagation();
        },
        // Links and images would otherwise start a native drag and steal the pointer.
        onDragStart(event: DragEvent<HTMLDivElement>) {
          onDragStart?.(event);
          event.preventDefault();
        },
      }
    : { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture, onDragStart };
  const edge = Math.min(Math.max(fadeAmount, 0), 50);
  const mask = fade
    ? `linear-gradient(to ${vertical ? "bottom" : "right"}, transparent, #000 ${edge}%, #000 ${100 - edge}%, transparent)`
    : undefined;

  return (
    <div
      ref={mergedRef}
      data-slot="marquee"
      data-direction={direction}
      data-draggable={draggable ? "" : undefined}
      // Still, it scrolls by hand: a named region, focusable (set below) for the keyboard.
      role={reduced ? "region" : undefined}
      aria-label={reduced ? label : undefined}
      className={cn(
        "group/marquee flex overflow-hidden motion-reduce:overflow-auto",
        vertical && "flex-col",
        // Touch pans across the loop go to the drag; the page still scrolls the other way.
        draggable && "motion-safe:cursor-grab motion-safe:select-none",
        draggable && (vertical ? "motion-safe:touch-pan-x" : "motion-safe:touch-pan-y"),
        draggable && "data-[dragging=true]:cursor-grabbing",
        className
      )}
      style={
        {
          "--marquee-gap": gap,
          "--marquee-copies": copies,
          maskImage: mask,
          WebkitMaskImage: mask,
          ...style,
        } as CSSProperties
      }
      {...props}
      {...dragHandlers}
    >
      <div
        ref={track}
        data-slot="marquee-track"
        className={cn(
          "flex w-max shrink-0 group-focus-within/marquee:[animation-play-state:paused]",
          // Held while dragged; the drag moves it by seeking the animation.
          "group-data-[dragging=true]/marquee:[animation-play-state:paused]",
          vertical
            ? "motion-safe:animate-marquee-y h-max w-full flex-col"
            : "motion-safe:animate-marquee-x",
          pauseOnHover && "group-hover/marquee:[animation-play-state:paused]"
        )}
        style={{
          // Each loop moves the track by one copy of the content.
          animationDuration: `${duration}s`,
          animationDirection: reversed ? "reverse" : undefined,
          // Inline only when off screen, so hover and focus can still pause it.
          animationPlayState: inView ? undefined : "paused",
        }}
      >
        {Array.from({ length: copies }, (_, copy) => (
          <div
            key={copy}
            data-slot="marquee-group"
            aria-hidden={copy > 0 ? true : undefined}
            inert={copy > 0 ? true : undefined}
            className={cn(
              "flex shrink-0 gap-[var(--marquee-gap)]",
              // Trailing space the size of the gap, so every copy is the same length and the loop has no seam.
              vertical
                ? "flex-col pb-[var(--marquee-gap)]"
                : "items-center pr-[var(--marquee-gap)]",
              copy > 0 && "motion-reduce:hidden"
            )}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}

export { Marquee, type MarqueeProps };
