"use client";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

/**
 * A dialog that slides in from an edge of the screen: navigation menus,
 * filters, detail panels. Focus moves into the panel when it opens, stays
 * trapped inside, and returns to the trigger when it closes; Escape and a
 * click on the overlay close it, and the page behind it does not scroll.
 * Screen readers announce it as a dialog named by `SheetTitle`. With reduced
 * motion it appears and disappears without sliding.
 *
 * @example
 * <Sheet>
 *   <SheetTrigger asChild>
 *     <Button variant="outline">Filters</Button>
 *   </SheetTrigger>
 *   <SheetContent side="left">
 *     <SheetHeader>
 *       <SheetTitle>Filters</SheetTitle>
 *       <SheetDescription>Narrow down the results.</SheetDescription>
 *     </SheetHeader>
 *   </SheetContent>
 * </Sheet>
 */
function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

/** Closes the sheet. Wrap a link with `asChild` so following it closes the panel. */
function SheetClose(props: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal(props: ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50",
        // animate-in/out sit behind motion-safe: so reduced motion really turns them off.
        "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

const sheetContentVariants = cva(
  [
    "bg-background fixed z-50 flex flex-col gap-4 shadow-lg outline-none",
    "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
  ],
  {
    variants: {
      side: {
        top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
        right:
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
        bottom:
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
        left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetContentProps extends ComponentProps<typeof SheetPrimitive.Content> {
  /** The edge the panel slides in from. */
  side?: SheetSide;
  /** Renders an icon button in the top corner that closes the sheet. */
  showCloseButton?: boolean;
  /** Accessible name of the close button. */
  closeLabel?: string;
}

/**
 * The panel itself, rendered in a portal above an overlay. It needs a
 * `SheetTitle`; hide it with `sr-only` if the design has no visible heading.
 */
function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  closeLabel = "Close",
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(sheetContentVariants({ side }), className)}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close
            data-slot="sheet-close-button"
            aria-label={closeLabel}
            className={cn(
              "absolute top-4 right-4 inline-flex size-6 cursor-pointer items-center justify-center rounded-md opacity-70",
              "transition-opacity outline-none hover:opacity-100 motion-reduce:transition-none",
              "focus-visible:ring-ring/50 focus-visible:opacity-100 focus-visible:ring-[3px]",
              "disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            )}
          >
            <XIcon aria-hidden="true" />
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

/** Names the sheet for screen readers. */
function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

/** Read out after the title when the sheet opens. */
function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
  type SheetContentProps,
  type SheetSide,
};
