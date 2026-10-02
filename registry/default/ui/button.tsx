import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircleIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap select-none",
    "transition-[color,background-color,border-color,box-shadow,opacity] outline-none motion-reduce:transition-none",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border-input bg-field hover:bg-accent hover:text-accent-foreground border",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
        // A face on a 4 px base that it sinks into while pressed. Both are
        // pseudo-elements in the button's own stacking context, below the
        // label: only the button's transform moves, and the base is moved
        // back so it stays put. mb-[4px] keeps it clear of what sits below.
        raised: [
          "text-primary-foreground relative isolate mb-[4px] bg-transparent hover:brightness-105",
          "transition-[color,background-color,border-color,box-shadow,opacity,transform,translate] duration-100",
          // The face (::after) sits on the base (::before), both under the label.
          "after:bg-primary after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]",
          "before:bg-primary before:absolute before:inset-0 before:-z-20 before:translate-y-[4px] before:rounded-[inherit] before:brightness-75",
          "active:translate-y-[4px] active:before:translate-y-0",
        ],
      },
      size: {
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        lg: "h-10 px-6 has-[>svg]:px-4",
        "icon-sm": "size-8",
        icon: "size-9",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Render the single child element (a link, for example) with the button styles instead. */
  asChild?: boolean;
  /** Shows a spinner and blocks interaction while an action is running. */
  loading?: boolean;
}

/**
 * `variant="raised"` stands on a 4 px base, darker than the face, and sinks
 * into it while pressed, like a key. It takes 4 px of margin below for the
 * base. With `prefers-reduced-motion` the press still moves, without a
 * transition.
 *
 * The icon sizes render a square button: give it an `aria-label`, since there
 * is no visible text to name it.
 *
 * Icons inside without a `size-*` class are set to `size-4`; give an icon its
 * own `size-*` (`size-5`, `size-[18px]`) to change it. `w-*` / `h-*` alone are
 * overridden.
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const inactive = disabled || loading;

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      // A native button can be disabled; any other element only announces it.
      disabled={asChild ? undefined : inactive}
      aria-disabled={asChild && inactive ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircleIcon
          aria-hidden="true"
          data-slot="button-spinner"
          className="animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]"
        />
      ) : null}
      <Slottable>{children}</Slottable>
    </Comp>
  );
}

export { Button, buttonVariants, type ButtonProps };
