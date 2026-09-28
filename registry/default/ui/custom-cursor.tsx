"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";

const INTERACTIVE =
  "a[href], button, [role=button], input, select, textarea, label, summary, [data-cursor]";

const HIDE_NATIVE_CURSOR =
  "html[data-custom-cursor], html[data-custom-cursor] * { cursor: none !important; }";

type CustomCursorState = "default" | "hover" | "pressed" | "hidden";

interface CustomCursorProps extends Omit<ComponentProps<"div">, "children"> {
  /** Diameter of the ring at rest, in px. */
  size?: number;
  /** Diameter of the ring over something interactive, in px. */
  hoverSize?: number;
  /** Diameter of the dot that sits exactly on the pointer, in px. 0 leaves it out. */
  dotSize?: number;
  /** From 0 to 1: how much of the way to the pointer the ring catches up each frame. 1 sticks to it. */
  smoothing?: number;
  /** Invert what is underneath (`mix-blend-difference`), so it shows on light and dark alike. */
  blend?: boolean;
  /** Hide the system cursor while this one is shown. */
  hideNativeCursor?: boolean;
  /** What counts as interactive: the ring grows over it. */
  interactiveSelector?: string;
  /** Content shown inside the ring over an element with `data-cursor="<key>"`. */
  labels?: Record<string, ReactNode>;
}

/**
 * A cursor of your own: a dot that sits on the pointer and a ring that
 * trails it, growing over links and buttons and showing a label over
 * elements marked `data-cursor`. It only appears for a mouse or trackpad
 * (`(hover: hover) and (pointer: fine)`) without `prefers-reduced-motion`;
 * everyone else keeps the system cursor, untouched. It is decorative and
 * hidden from screen readers, never takes pointer events, and moves by
 * writing transforms once per frame, stopping when the pointer rests.
 * `data-state` is "default", "hover", "pressed", or "hidden" while the
 * pointer is outside the window.
 *
 * @example
 * <CustomCursor labels={{ view: "View" }} />
 * <a href="/work/1" data-cursor="view">…</a>
 */
function CustomCursor(props: CustomCursorProps) {
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  if (!fine || reduced) return null;
  return <CursorFollower {...props} />;
}

function CursorFollower({
  size = 12,
  hoverSize = 40,
  dotSize = 4,
  smoothing = 0.2,
  blend = true,
  hideNativeCursor = true,
  interactiveSelector = INTERACTIVE,
  labels,
  className,
  ...props
}: CustomCursorProps) {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [labelKey, setLabelKey] = useState<string | null>(null);

  const settings = useRef({ smoothing, interactiveSelector });
  useEffect(() => {
    settings.current = { smoothing, interactiveSelector };
  });

  useEffect(() => {
    if (!hideNativeCursor) return;
    const html = document.documentElement;
    html.setAttribute("data-custom-cursor", "");
    return () => html.removeAttribute("data-custom-cursor");
  }, [hideNativeCursor]);

  useEffect(() => {
    const target = { x: 0, y: 0 };
    const trail = { x: 0, y: 0 };
    let seen = false;
    let frame = 0;

    const place = () => {
      if (dot.current) {
        dot.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
      }
      if (ring.current) {
        ring.current.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0) translate(-50%, -50%)`;
      }
    };
    const tick = () => {
      const factor = Math.min(Math.max(settings.current.smoothing, 0.01), 1);
      trail.x += (target.x - trail.x) * factor;
      trail.y += (target.y - trail.y) * factor;
      const resting = Math.abs(target.x - trail.x) < 0.1 && Math.abs(target.y - trail.y) < 0.1;
      if (resting) {
        trail.x = target.x;
        trail.y = target.y;
      }
      place();
      frame = resting ? 0 : requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        setVisible(false);
        return;
      }
      target.x = event.clientX;
      target.y = event.clientY;
      if (!seen) {
        // Start on the pointer instead of flying in from the corner.
        seen = true;
        trail.x = target.x;
        trail.y = target.y;
      }
      setVisible(true);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onOver = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const interactive = element?.closest(settings.current.interactiveSelector);
      // A data-cursor on <html> or <body> sets a page-wide label; it does not make
      // the whole page interactive.
      setHovering(
        Boolean(interactive) &&
          interactive !== document.body &&
          interactive !== document.documentElement
      );
      setLabelKey(element?.closest("[data-cursor]")?.getAttribute("data-cursor") ?? null);
    };
    const onOut = (event: PointerEvent) => {
      // No element to go to: the pointer left the window.
      if (!event.relatedTarget) setVisible(false);
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onBlur = () => {
      setVisible(false);
      setPressed(false);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("blur", onBlur);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const state: CustomCursorState = !visible
    ? "hidden"
    : pressed
      ? "pressed"
      : hovering
        ? "hover"
        : "default";
  const label = labelKey !== null ? labels?.[labelKey] : undefined;
  // The ring is drawn at its hover size and scaled down, so it grows with a
  // transform; the border is scaled back up to stay 1px.
  const scale = (hovering ? 1 : size / Math.max(hoverSize, 1)) * (pressed ? 0.8 : 1);

  return createPortal(
    <div
      aria-hidden="true"
      data-slot="custom-cursor"
      data-state={state}
      data-label={label !== undefined ? labelKey : undefined}
      className={cn(
        "pointer-events-none fixed top-0 left-0 z-[9999] transition-opacity data-[state=hidden]:opacity-0 motion-reduce:transition-none",
        blend ? "text-white mix-blend-difference" : "text-foreground",
        className
      )}
      {...props}
    >
      {hideNativeCursor ? <style>{HIDE_NATIVE_CURSOR}</style> : null}
      <div ref={ring} data-slot="custom-cursor-ring" className="absolute top-0 left-0">
        <div
          data-slot="custom-cursor-ring-shape"
          className="grid place-items-center rounded-full border border-current transition-[transform,border-width] duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: hoverSize,
            height: hoverSize,
            transform: `scale(${scale})`,
            borderWidth: `${1 / scale}px`,
          }}
        >
          {label !== undefined ? (
            <span data-slot="custom-cursor-label" className="text-xs font-medium">
              {label}
            </span>
          ) : null}
        </div>
      </div>
      {dotSize > 0 ? (
        <div
          ref={dot}
          data-slot="custom-cursor-dot"
          className="absolute top-0 left-0 rounded-full bg-current transition-opacity motion-reduce:transition-none"
          style={{ width: dotSize, height: dotSize, opacity: hovering ? 0 : 1 }}
        />
      ) : null}
    </div>,
    document.body
  );
}

export { CustomCursor, type CustomCursorProps, type CustomCursorState };
