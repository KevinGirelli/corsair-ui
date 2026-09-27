"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cva } from "class-variance-authority";
import { StarIcon } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

const ratingVariants = cva("inline-flex w-fit items-center", {
  variants: {
    size: {
      sm: "gap-0.5 [&_[data-slot=rating-star]]:size-4",
      default: "gap-0.5 [&_[data-slot=rating-star]]:size-5",
      lg: "gap-1 [&_[data-slot=rating-star]]:size-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

type RatingSize = "sm" | "default" | "lg";

const defaultValueLabel = (value: number, max: number) => `${value} out of ${max}`;
const defaultStarLabel = (stars: number) => `${stars} ${stars === 1 ? "star" : "stars"}`;

/**
 * One star. `fill` goes from 0 to 1: the filled copy is clipped to that
 * share of the width, over an empty star. Both copies carry `data-filled`
 * so their colours can be changed from the Rating's className.
 */
function Star({ fill, className }: { fill: number; className?: string }) {
  return (
    <span
      data-slot="rating-star"
      data-fill={fill >= 1 ? "full" : fill > 0 ? "partial" : "empty"}
      className={cn("relative inline-flex shrink-0", className)}
    >
      <StarIcon
        aria-hidden="true"
        data-filled="false"
        className="text-muted-foreground/40 size-full fill-current"
      />
      {fill > 0 ? (
        <StarIcon
          aria-hidden="true"
          data-filled="true"
          className="text-warning absolute inset-0 size-full fill-current"
          style={fill < 1 ? { clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` } : undefined}
        />
      ) : null}
    </span>
  );
}

interface RatingProps extends Omit<
  ComponentProps<"div">,
  "defaultValue" | "onChange" | "dir" | "children"
> {
  /** Number of stars picked (controlled). Read-only ratings can be fractional, like 4.5. */
  value?: number;
  /** Number of stars picked at first (uncontrolled). */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Number of stars. */
  max?: number;
  /** Show the value without letting it change. */
  readOnly?: boolean;
  disabled?: boolean;
  required?: boolean;
  size?: RatingSize;
  /** Submits the value with a form under this name. */
  name?: string;
  dir?: "ltr" | "rtl";
  /** Accessible name of the rating. */
  "aria-label"?: string;
  /** Read-only: how the value is read to screen readers. */
  getValueLabel?: (value: number, max: number) => string;
  /** Interactive: the accessible name of each star. */
  starLabel?: (stars: number) => string;
}

/**
 * Stars for giving or showing a score. Interactive, it is a radio group
 * with one radio per star: Tab reaches it, arrow keys change the score,
 * and each star is read as "3 stars"; pointing at a star previews it
 * (`data-hovered`). With `readOnly` it is a single image read as
 * "Rating: 4.5 out of 5", and fractional values fill part of a star.
 * Filled stars use `text-warning`, empty ones `text-muted-foreground/40`;
 * restyle them with `[&_[data-filled=true]]:text-primary` on the Rating.
 * Nothing moves, so there is nothing to reduce for reduced motion.
 *
 * @example
 * <Rating defaultValue={3} onValueChange={setScore} aria-label="Your rating" />
 * <Rating readOnly value={4.5} />
 */
function Rating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  max = 5,
  readOnly = false,
  disabled,
  required,
  size = "default",
  name,
  dir,
  "aria-label": label = "Rating",
  getValueLabel = defaultValueLabel,
  starLabel = defaultStarLabel,
  className,
  ...props
}: RatingProps) {
  const [internal, setInternal] = useState(defaultValue);
  const [hovered, setHovered] = useState<number | null>(null);
  const count = Math.max(1, Math.floor(max));
  const value = Math.min(Math.max(valueProp ?? internal, 0), count);
  const stars = Array.from({ length: count }, (_, index) => index + 1);

  if (readOnly) {
    return (
      <div
        role="img"
        aria-label={`${label}: ${getValueLabel(value, count)}`}
        data-slot="rating"
        data-readonly=""
        data-size={size}
        data-value={value}
        dir={dir}
        className={cn(ratingVariants({ size }), className)}
        {...props}
      >
        {stars.map((star) => (
          <Star key={star} fill={Math.min(Math.max(value - (star - 1), 0), 1)} />
        ))}
      </div>
    );
  }

  const picked = Math.round(value);
  const shown = hovered ?? picked;

  const change = (next: string) => {
    const number = Number(next);
    if (valueProp === undefined) setInternal(number);
    onValueChange?.(number);
  };

  return (
    <RadioGroupPrimitive.Root
      data-slot="rating"
      data-size={size}
      data-value={picked}
      data-hovered={hovered !== null ? "" : undefined}
      aria-label={label}
      value={picked > 0 ? String(picked) : ""}
      onValueChange={change}
      orientation="horizontal"
      loop={false}
      disabled={disabled}
      required={required}
      name={name}
      dir={dir}
      className={cn(ratingVariants({ size }), className)}
      onPointerLeave={() => setHovered(null)}
      {...props}
    >
      {stars.map((star) => (
        <RadioGroupPrimitive.Item
          key={star}
          value={String(star)}
          aria-label={starLabel(star)}
          data-slot="rating-item"
          data-hovered={hovered !== null && star <= hovered ? "" : undefined}
          className={cn(
            "inline-flex cursor-pointer rounded-[4px] outline-none",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse" && !disabled) setHovered(star);
          }}
        >
          <Star fill={star <= shown ? 1 : 0} />
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

export { Rating, ratingVariants, type RatingProps, type RatingSize };
