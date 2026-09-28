"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

/**
 * A modal window centred over the page. Focus moves into it when it opens,
 * stays trapped inside, and returns to the trigger when it closes; Escape and
 * a click on the overlay close it, and the page behind it does not scroll.
 * Screen readers announce it as a dialog named by `DialogTitle` and described
 * by `DialogDescription`. With reduced motion it appears without fading or
 * zooming.
 *
 * @example
 * <Dialog>
 *   <DialogTrigger asChild>
 *     <Button>Edit profile</Button>
 *   </DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Edit profile</DialogTitle>
 *       <DialogDescription>Changes are saved when you press Save.</DialogDescription>
 *     </DialogHeader>
 *     <DialogFooter>
 *       <DialogClose asChild>
 *         <Button variant="outline">Cancel</Button>
 *       </DialogClose>
 *       <Button>Save</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 */
function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/** Closes the dialog. Use `asChild` to turn your own button into a close button. */
function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
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

interface DialogContentProps extends ComponentProps<typeof DialogPrimitive.Content> {
  /** Renders an icon button in the top corner that closes the dialog. */
  showCloseButton?: boolean;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /**
   * Classes for the overlay behind the window: opacity, blur, z-index. The
   * overlay is also `data-slot="dialog-overlay"` for styling from outside.
   */
  overlayClassName?: string;
}

/**
 * The window itself, rendered in a portal above an overlay. It needs a
 * `DialogTitle`; hide it with `sr-only` if the design has no visible heading.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = "Close",
  overlayClassName,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border p-6 shadow-lg outline-none sm:max-w-lg",
          "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close-button"
            aria-label={closeLabel}
            className={cn(
              "absolute top-4 right-4 inline-flex size-6 cursor-pointer items-center justify-center rounded-md opacity-70",
              "transition-opacity outline-none hover:opacity-100 motion-reduce:transition-none",
              "focus-visible:ring-ring/50 focus-visible:opacity-100 focus-visible:ring-[3px]",
              "disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            )}
          >
            <XIcon aria-hidden="true" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

/** Names the dialog for screen readers. */
function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

/** Read out after the title when the dialog opens. */
function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  type DialogContentProps,
};
