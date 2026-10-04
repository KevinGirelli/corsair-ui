"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";
import { Rating, RatingStar, ratingVariants, type RatingProps } from "@/registry/default/ui/rating";

interface WaveRatingProps extends RatingProps {
  /** Shows a label over the star under the pointer while it sweeps or hovers. */
  showTip?: boolean;
  /** Text of that label. Defaults to `starLabel` ("3 stars"). */
  tipLabel?: (stars: number, max: number) => string;
  /** A short vibration as each star lights up under a finger, where the browser supports it. */
  haptics?: boolean;
}

/** How many stars behind the crest the wave reaches. */
const SPREAD = 3;
/** Delay between neighbouring stars as the wave travels, in ms. */
const STAGGER = 30;
/** Overshoots a little before settling, like a spring. */
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const POP: Keyframe[] = [
  { transform: "scale(1)" },
  { transform: "scale(1.35)" },
  { transform: "scale(1)" },
];
const HOP: Keyframe[] = [
  { transform: "translateY(0)" },
  { transform: "translateY(-4px)" },
  { transform: "translateY(0)" },
];

const defaultStarLabel = (stars: number) => `${stars} ${stars === 1 ? "star" : "stars"}`;

function play(element: Element | null | undefined, keyframes: Keyframe[], duration: number) {
  if (element && typeof element.animate === "function") {
    element.animate(keyframes, { duration, easing: SPRING });
  }
}

/** 0 to 1: how high a star rises, highest under the pointer and fading out behind it. */
function liftOf(star: number, crest: number | null) {
  if (crest === null || star > crest) return 0;
  return Math.max(0, 1 - (crest - star) / SPREAD);
}

/**
 * The rating, animated: sweep a finger, pen or mouse across the stars and they
 * rise in a wave that crests under it, while a tip above shows the score; let
 * go (or click) and the chosen star pops. It takes the same props as `rating`
 * and keeps everything else about it: a radio group for the keyboard and
 * screen readers, form submission under `name`, and the read-only image (which
 * does not move). The tip is decorative, since each radio already says its
 * score. Vertical swipes still scroll the page. With `prefers-reduced-motion`
 * the stars light up without rising, popping or travelling.
 *
 * Each rising star exposes its height as `--wave-rating-lift` (0 to 1) on
 * `data-slot="wave-rating-lift"`, for a glow or a colour of your own.
 *
 * @example
 * <WaveRating
 *   defaultValue={4}
 *   onValueChange={setScore}
 *   aria-label="Rate the court"
 *   tipLabel={(stars) => ["Bad", "Meh", "OK", "Good", "Great"][stars - 1] ?? ""}
 * />
 */
function WaveRating({ showTip, tipLabel, haptics, ...props }: WaveRatingProps) {
  if (props.readOnly) return <Rating {...props} />;
  return (
    <InteractiveWaveRating showTip={showTip} tipLabel={tipLabel} haptics={haptics} {...props} />
  );
}

function InteractiveWaveRating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  max = 5,
  disabled,
  required,
  size = "default",
  name,
  dir,
  "aria-label": label = "Rating",
  starLabel = defaultStarLabel,
  showTip = true,
  tipLabel,
  haptics = true,
  getValueLabel: _getValueLabel,
  readOnly: _readOnly,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onClickCapture,
  ...props
}: WaveRatingProps) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [internal, setInternal] = useState(defaultValue);
  const [preview, setPreview] = useState<number | null>(null);
  const [tip, setTip] = useState<{ star: number; x: number; moving: boolean } | null>(null);
  const count = Math.max(1, Math.floor(max));
  const value = Math.min(Math.max(valueProp ?? internal, 0), count);
  const picked = Math.round(value);
  const shown = preview ?? picked;
  const stars = Array.from({ length: count }, (_, index) => index + 1);

  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const pops = useRef<(HTMLSpanElement | null)[]>([]);
  const bubble = useRef<HTMLSpanElement>(null);
  const crest = useRef<number | null>(null);
  const sweep = useRef<number | null>(null);
  const swallowClick = useRef(false);

  /** The star nearest to the pointer, so sweeping past either end keeps the first or last. */
  const starAt = (clientX: number) => {
    let nearest: number | null = null;
    let distance = Infinity;
    items.current.forEach((item, index) => {
      if (!item) return;
      const { left, right } = item.getBoundingClientRect();
      const away = clientX < left ? left - clientX : clientX > right ? clientX - right : 0;
      if (away < distance) {
        distance = away;
        nearest = index + 1;
      }
    });
    return nearest;
  };

  const show = (star: number, pointerType: string) => {
    if (crest.current === star) return;
    const moving = crest.current !== null;
    crest.current = star;
    setPreview(star);
    const item = items.current[star - 1];
    if (item) setTip({ star, x: item.offsetLeft + item.offsetWidth / 2, moving });
    if (moving && !reduced) play(bubble.current, HOP, 200);
    if (haptics && pointerType === "touch" && typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
    }
  };

  const hide = () => {
    crest.current = null;
    setPreview(null);
  };

  const commit = (star: number) => {
    if (valueProp === undefined) setInternal(star);
    if (star !== picked) onValueChange?.(star);
    if (!reduced) play(pops.current[star - 1], POP, 360);
  };

  const begin = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented || disabled || event.button !== 0) return;
    // The star pressed is the one under the pointer; assistive tech may not send coordinates.
    const pressed = items.current.findIndex(
      (item) => item !== null && item.contains(event.target as Node)
    );
    const star = pressed >= 0 ? pressed + 1 : starAt(event.clientX);
    if (star === null) return;
    sweep.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    show(star, event.pointerType);
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (disabled) return;
    if (sweep.current === null ? event.pointerType === "touch" : sweep.current !== event.pointerId)
      return;
    const star = starAt(event.clientX);
    if (star !== null) show(star, event.pointerType);
  };

  const end = (event: PointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event);
    if (sweep.current !== event.pointerId) return;
    sweep.current = null;
    const star = crest.current;
    // A mouse is still over the stars, so its preview stays until it leaves.
    if (event.pointerType !== "mouse") hide();
    if (star === null) return;
    // The click that follows the release would pick the radio under the pointer again.
    swallowClick.current = true;
    setTimeout(() => {
      swallowClick.current = false;
    });
    commit(star);
    if (event.currentTarget.contains(document.activeElement)) items.current[star - 1]?.focus();
  };

  const cancel = (event: PointerEvent<HTMLDivElement>) => {
    onPointerCancel?.(event);
    if (sweep.current !== event.pointerId) return;
    sweep.current = null;
    hide();
  };

  const leave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    if (sweep.current === null) hide();
  };

  const swallow = (event: MouseEvent<HTMLDivElement>) => {
    onClickCapture?.(event);
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <RadioGroupPrimitive.Root
      data-slot="wave-rating"
      data-size={size}
      data-value={picked}
      data-previewing={preview !== null ? "" : undefined}
      aria-label={label}
      value={picked > 0 ? String(picked) : ""}
      onValueChange={(next) => commit(Number(next))}
      orientation="horizontal"
      loop={false}
      disabled={disabled}
      required={required}
      name={name}
      dir={dir}
      className={cn(ratingVariants({ size }), "relative touch-pan-y select-none", className)}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={cancel}
      onPointerLeave={leave}
      onClickCapture={swallow}
      {...props}
    >
      {stars.map((star) => {
        const lift = reduced ? 0 : liftOf(star, preview);
        return (
          <RadioGroupPrimitive.Item
            key={star}
            ref={(node) => {
              items.current[star - 1] = node;
            }}
            value={String(star)}
            aria-label={starLabel(star)}
            data-slot="wave-rating-item"
            data-previewed={preview !== null && star <= preview ? "" : undefined}
            className={cn(
              "inline-flex cursor-pointer rounded-[4px] outline-none",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <span
              data-slot="wave-rating-lift"
              className="inline-flex transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
              style={
                {
                  "--wave-rating-lift": lift,
                  transform:
                    lift > 0 ? `translateY(${-lift * 35}%) scale(${1 + lift * 0.2})` : undefined,
                  // The wave travels: stars further behind the crest move a moment later.
                  transitionDelay:
                    lift > 0 && preview !== null ? `${(preview - star) * STAGGER}ms` : "0ms",
                } as CSSProperties
              }
            >
              <span
                ref={(node) => {
                  pops.current[star - 1] = node;
                }}
                className="inline-flex"
              >
                <RatingStar fill={star <= shown ? 1 : 0} />
              </span>
            </span>
          </RadioGroupPrimitive.Item>
        );
      })}
      {showTip && tip ? (
        <span
          aria-hidden="true"
          data-slot="wave-rating-tip"
          className={cn(
            "pointer-events-none absolute bottom-full left-0 mb-2 ease-out motion-reduce:transition-none",
            tip.moving
              ? "transition-[transform,opacity] duration-200"
              : "transition-opacity duration-200",
            preview === null ? "opacity-0" : "opacity-100"
          )}
          style={{ transform: `translateX(${tip.x}px) translateX(-50%)` }}
        >
          <span
            ref={bubble}
            className="bg-foreground text-background block rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap shadow-md"
          >
            {(tipLabel ?? starLabel)(tip.star, count)}
          </span>
        </span>
      ) : null}
    </RadioGroupPrimitive.Root>
  );
}

export { WaveRating, type WaveRatingProps };
