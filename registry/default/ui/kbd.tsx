import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

const kbdVariants = cva(
  [
    "bg-muted text-muted-foreground inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded border px-1.5 font-mono text-xs font-medium whitespace-nowrap select-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  ],
  {
    variants: {
      size: {
        sm: "h-5 min-w-5 px-1 text-[0.625rem]",
        default: "h-6 min-w-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

interface KbdProps extends ComponentProps<"kbd">, VariantProps<typeof kbdVariants> {}

/**
 * A key or key combination to press, shown as a small keycap. It is a native
 * `<kbd>`, so screen readers read its text as is. A symbol alone (⌘, ⇧) is
 * read by its Unicode name or not at all: add the word in an `sr-only` span
 * (`<Kbd>⌘<span className="sr-only">Command</span></Kbd>`). Nothing animates.
 *
 * @example
 * <p>
 *   Press <Kbd>Esc</Kbd> to close.
 * </p>
 */
function Kbd({ className, size, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      data-size={size ?? "default"}
      className={cn(kbdVariants({ size }), className)}
      {...props}
    />
  );
}

/**
 * Keys pressed together, laid out in a row. Put the separator you want
 * between the keys yourself (`+`, or nothing).
 *
 * @example
 * <KbdGroup>
 *   <Kbd>Ctrl</Kbd>
 *   <span>+</span>
 *   <Kbd>K</Kbd>
 * </KbdGroup>
 */
function KbdGroup({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup, kbdVariants, type KbdProps };
