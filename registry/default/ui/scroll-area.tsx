"use client";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";
/**
 * A box that scrolls its content with thin, themed scrollbars instead of the
 * platform ones, while keeping native scrolling: wheel, touch, and the arrow
 * and Page keys once focus is inside. The scrollbars show on hover by
 * default; `type` switches to "always", "scroll" (while scrolling) or
 * "auto" (when the content overflows). The viewport shows a focus ring when
 * it takes keyboard focus: current Chrome and Firefox put an overflowing
 * scroll container in the Tab order on their own, Safari does not, so keep
 * something focusable inside (links, buttons) when keyboard users must reach
 * all of the content, and wrap it in a labelled `<section>` when it needs a
 * name. Scrolling itself has no animation.
 *
 * @example
 * <ScrollArea className="h-72 w-48 rounded-md border">
 *   <div className="p-4">{tags.map((tag) => <p key={tag}>{tag}</p>)}</div>
 * </ScrollArea>
 *
 * <ScrollArea className="w-96 whitespace-nowrap">
 *   <div className="flex gap-4">…</div>
 *   <ScrollBar orientation="horizontal" />
 * </ScrollArea>
 */
function ScrollArea({
  className,
  children,
  type = "hover",
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      type={type}
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full rounded-[inherit] outline-none",
          "transition-[color,box-shadow] motion-reduce:transition-none",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  );
}
/**
 * A scrollbar for one direction. ScrollArea already has a vertical one; add
 * `<ScrollBar orientation="horizontal" />` inside it for sideways content.
 * The thumb can be dragged; it is hidden from screen readers, which scroll
 * the content directly.
 */
function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none motion-reduce:transition-none",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-l-transparent",
        "data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}
export { ScrollArea, ScrollBar };
