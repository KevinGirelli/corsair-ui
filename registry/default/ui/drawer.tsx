"use client";

import * as DrawerPrimitive from "@radix-ui/react-dialog";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent,
  type Ref,
} from "react";

import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

interface DrawerContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

interface DrawerDragHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
}

/** Drag handlers from DrawerContent, picked up by DrawerHeader. */
const DrawerDragContext = createContext<DrawerDragHandlers | null>(null);

/** Elements inside the drag area that keep their own pointer behaviour. */
const INTERACTIVE = "a, button, input, select, textarea, label, [role=button], [contenteditable]";

/**
 * A panel that slides up from the bottom of the screen, for actions and
 * short forms on phones. It is a Radix dialog: focus moves into it and stays
 * trapped, Escape and a click on the overlay close it, and focus returns to
 * the trigger; screen readers announce it as a dialog named by
 * `DrawerTitle`. Pointer users can also drag it down by the handle or the
 * header to close it; that is an extra, never the only way out. With reduced
 * motion it appears without sliding and does not spring back. Controlled
 * with `open` / `onOpenChange` or uncontrolled with `defaultOpen`.
 *
 * @example
 * <Drawer>
 *   <DrawerTrigger asChild>
 *     <Button variant="outline">Share</Button>
 *   </DrawerTrigger>
 *   <DrawerContent>
 *     <DrawerHeader>
 *       <DrawerTitle>Share this page</DrawerTitle>
 *       <DrawerDescription>Anyone with the link can view it.</DrawerDescription>
 *     </DrawerHeader>
 *     <DrawerFooter>
 *       <DrawerClose asChild>
 *         <Button variant="outline">Done</Button>
 *       </DrawerClose>
 *     </DrawerFooter>
 *   </DrawerContent>
 * </Drawer>
 */
function Drawer({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Root>) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange]
  );
  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return (
    <DrawerContext.Provider value={value}>
      <DrawerPrimitive.Root data-slot="drawer" open={open} onOpenChange={setOpen} {...props} />
    </DrawerContext.Provider>
  );
}

function DrawerTrigger(props: ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(props: ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

/** Closes the drawer. Use `asChild` to turn your own button into a close button. */
function DrawerClose(props: ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
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

interface DrawerContentProps extends ComponentProps<typeof DrawerPrimitive.Content> {
  /**
   * Classes for the overlay behind the drawer: opacity, blur, z-index. The
   * overlay is also `data-slot="drawer-overlay"` for styling from outside.
   */
  overlayClassName?: string;
  /** Shows the grab handle at the top. It is decorative: hidden from screen readers. */
  showHandle?: boolean;
  /** Share of the drawer's height (0 to 1) it has to be dragged down to close on release. */
  closeThreshold?: number;
}

/**
 * The panel itself, rendered in a portal above an overlay, fixed to the
 * bottom of the screen and at most 85% of its height. It needs a
 * `DrawerTitle`; hide it with `sr-only` if the design has no visible
 * heading. While dragged it has `data-dragging="true"` and the offset in
 * the `--drawer-drag` CSS variable. For long content, put it in a
 * `div className="overflow-y-auto"` below the header.
 */
function DrawerContent({
  className,
  children,
  overlayClassName,
  showHandle = true,
  closeThreshold = 0.25,
  ref,
  ...props
}: DrawerContentProps) {
  const drawer = useContext(DrawerContext);
  const content = useRef<HTMLDivElement>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, content), [ref]);
  const drag = useRef<{ pointerId: number; startY: number; height: number; offset: number } | null>(
    null
  );
  const frame = useRef(0);

  const write = useCallback((offset: number) => {
    const element = content.current;
    if (element) element.style.setProperty("--drawer-drag", `${offset}px`);
  }, []);

  const end = useCallback(
    (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      drag.current = null;
      cancelAnimationFrame(frame.current);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      content.current?.removeAttribute("data-dragging");
      const threshold = Math.min(Math.max(closeThreshold, 0), 1) * current.height;
      if (!cancelled && current.offset > 0 && current.offset >= threshold && drawer) {
        // Leave the offset in place so the exit animation starts where the finger let go.
        write(current.offset);
        drawer.setOpen(false);
      } else {
        // Spring back: the transition runs now that data-dragging is gone.
        write(0);
      }
    },
    [closeThreshold, drawer, write]
  );

  const handlers = useMemo<DrawerDragHandlers>(
    () => ({
      onPointerDown(event) {
        if (event.button !== 0 || !content.current) return;
        const target = event.target as Element;
        if (target !== event.currentTarget && target.closest(INTERACTIVE)) return;
        drag.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          height: content.current.getBoundingClientRect().height,
          offset: 0,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        content.current.setAttribute("data-dragging", "true");
      },
      onPointerMove(event) {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        current.offset = Math.max(0, event.clientY - current.startY);
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => write(current.offset));
      },
      onPointerUp(event) {
        end(event, false);
      },
      onPointerCancel(event) {
        end(event, true);
      },
    }),
    [end, write]
  );

  return (
    <DrawerPortal>
      <DrawerOverlay className={overlayClassName} />
      <DrawerPrimitive.Content
        ref={mergedRef}
        data-slot="drawer-content"
        className={cn(
          "bg-background fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col rounded-t-xl border-t shadow-lg outline-none",
          "[transform:translate3d(0,var(--drawer-drag,0px),0)]",
          "transition-transform ease-out data-[dragging=true]:transition-none motion-reduce:transition-none",
          "motion-safe:data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
          "motion-safe:data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
          className
        )}
        {...props}
      >
        {showHandle ? (
          <div
            aria-hidden="true"
            data-slot="drawer-handle"
            className="flex shrink-0 cursor-grab touch-none justify-center pt-4 pb-2 select-none active:cursor-grabbing"
            {...handlers}
          >
            <div className="bg-muted h-1.5 w-12 rounded-full" />
          </div>
        ) : null}
        <DrawerDragContext.Provider value={handlers}>{children}</DrawerDragContext.Provider>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

/**
 * The top of the drawer, with the title and description. Dragging it down
 * with a pointer moves the drawer, like the handle; buttons and links inside
 * keep working.
 */
function DrawerHeader({
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: ComponentProps<"div">) {
  const handlers = useContext(DrawerDragContext);
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-1.5 p-4 text-center sm:text-left",
        handlers && "touch-none",
        className
      )}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!event.defaultPrevented) handlers?.onPointerDown(event);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        handlers?.onPointerMove(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        handlers?.onPointerUp(event);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        handlers?.onPointerCancel(event);
      }}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

/** Names the drawer for screen readers. */
function DrawerTitle({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

/** Read out after the title when the drawer opens. */
function DrawerDescription({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  type DrawerContentProps,
};
