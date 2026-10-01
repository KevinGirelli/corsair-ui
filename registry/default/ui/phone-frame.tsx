import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/registry/default/lib/utils";

type PhoneFrameNotch = "island" | "notch" | "none";

interface PhoneFrameProps extends ComponentProps<"div"> {
  /** Cut-out at the top of the screen: a floating pill, a classic notch, or nothing. */
  notch?: PhoneFrameNotch;
  /**
   * Width / height of the whole frame, as a number (`0.5`) or a CSS ratio
   * (`"9 / 19.5"`). The frame reserves this box before anything loads.
   */
  aspect?: number | string;
  /**
   * Space between the body edge and the screen. Any CSS length; `cqw` units
   * are relative to the frame's width, so the default scales with it.
   */
  bezel?: string;
  /** Corner radius of the body. The screen's radius is this minus the bezel. */
  radius?: string;
  /** Draw the decorative side buttons on the edges of the body. */
  buttons?: boolean;
  /** Classes for the screen element that holds the children. */
  screenClassName?: string;
}

/** Decorative side buttons: [side, top, height], in percentages of the frame height. */
const BUTTONS = [
  ["left", "18%", "5%"],
  ["left", "26%", "9%"],
  ["left", "37%", "9%"],
  ["right", "28%", "13%"],
] as const;

/**
 * A generic phone drawn in CSS around a screenshot or any content. Set the
 * width with a class (`w-64`, `w-72`…): the bezel, corners and cut-out are in
 * container units, so they scale with it, and the height follows `aspect`, so
 * the frame takes its final size at first paint. The body, cut-out and side
 * buttons are decoration hidden from screen readers; the children keep their
 * own semantics, so give images their `alt`. A server component with no
 * motion; it works inside parallax, magnetic or tilt wrappers. For a shadow
 * that follows the rounded body, use a `drop-shadow-*` class.
 *
 * @example
 * <PhoneFrame className="w-72 drop-shadow-xl">
 *   <Image src="/screens/home.png" alt="The home screen" fill className="object-cover" />
 * </PhoneFrame>
 */
function PhoneFrame({
  notch = "island",
  aspect = "9 / 19.5",
  bezel = "3.5cqw",
  radius = "14cqw",
  buttons = true,
  screenClassName,
  className,
  style,
  children,
  ...props
}: PhoneFrameProps) {
  return (
    <div
      data-slot="phone-frame"
      data-notch={notch}
      className={cn("[container-type:inline-size] relative isolate w-64 shrink-0", className)}
      style={
        {
          aspectRatio: String(aspect),
          "--phone-frame-bezel": bezel,
          "--phone-frame-radius": radius,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {buttons &&
        BUTTONS.map(([side, top, height]) => (
          <span
            key={`${side}-${top}`}
            aria-hidden="true"
            data-slot="phone-frame-button"
            data-side={side}
            className={cn(
              "bg-border pointer-events-none absolute w-[1.2cqw]",
              side === "left" ? "left-[-1cqw] rounded-l-[1cqw]" : "right-[-1cqw] rounded-r-[1cqw]"
            )}
            style={{ top, height }}
          />
        ))}
      <span
        aria-hidden="true"
        data-slot="phone-frame-body"
        className="bg-card border-border ring-foreground/10 pointer-events-none absolute inset-0 rounded-[var(--phone-frame-radius)] border ring-1 ring-inset"
      />
      <div
        data-slot="phone-frame-screen"
        className={cn(
          "bg-background absolute inset-[var(--phone-frame-bezel)] overflow-hidden",
          "rounded-[max(0px,calc(var(--phone-frame-radius)_-_var(--phone-frame-bezel)))]",
          screenClassName
        )}
      >
        {children}
        {notch === "island" && (
          <span
            aria-hidden="true"
            data-slot="phone-frame-notch"
            className="bg-card ring-border pointer-events-none absolute top-[2.5cqw] left-1/2 z-10 h-[8cqw] w-[28cqw] -translate-x-1/2 rounded-full ring-1"
          />
        )}
        {notch === "notch" && (
          <span
            aria-hidden="true"
            data-slot="phone-frame-notch"
            className="bg-card border-border pointer-events-none absolute top-0 left-1/2 z-10 h-[6.5cqw] w-[42cqw] -translate-x-1/2 rounded-b-[4.5cqw] border border-t-0"
          />
        )}
      </div>
    </div>
  );
}

export { PhoneFrame, type PhoneFrameNotch, type PhoneFrameProps };
