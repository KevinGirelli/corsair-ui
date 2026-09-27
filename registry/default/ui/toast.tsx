"use client";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CircleAlertIcon, CircleCheckIcon, XIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useSyncExternalStore } from "react";
import { cn } from "@/registry/default/lib/utils";

type ToastVariant = "default" | "success" | "destructive";

interface ToastAction {
  /** Visible text of the action button. */
  label: string;
  onClick: () => void;
  /**
   * Tells screen reader users how to do the same thing without the toast,
   * since it may disappear before they reach it ("Undo from the Trash page").
   */
  altText: string;
}

interface ToastOptions {
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastAction;
  variant?: ToastVariant;
  /** Milliseconds before it closes on its own. Overrides the Toaster's `duration`; `Infinity` keeps it open. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  /** False while the toast plays its exit animation, just before it is removed. */
  open: boolean;
}

interface ToastHandle {
  id: string;
  dismiss: () => void;
  update: (options: ToastOptions) => void;
}

/** How many toasts are open at once; a new one closes the oldest. */
const MAX_VISIBLE = 3;
/** How long a closed toast stays in the list so its exit animation can finish. */
const REMOVE_DELAY = 1000;

let toasts: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const removeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const EMPTY: ToastItem[] = [];

function emit(next: ToastItem[]) {
  toasts = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function scheduleRemoval(id: string) {
  if (removeTimers.has(id)) return;
  removeTimers.set(
    id,
    setTimeout(() => {
      removeTimers.delete(id);
      emit(toasts.filter((item) => item.id !== id));
    }, REMOVE_DELAY)
  );
}

function dismiss(id?: string) {
  const closing = toasts.filter((item) => item.open && (id === undefined || item.id === id));
  if (closing.length === 0) return;
  emit(toasts.map((item) => (closing.includes(item) ? { ...item, open: false } : item)));
  for (const item of closing) scheduleRemoval(item.id);
}

function update(id: string, options: ToastOptions) {
  emit(toasts.map((item) => (item.id === id ? { ...item, ...options } : item)));
}

/**
 * Shows a toast in the mounted `Toaster` and returns a handle to update or
 * dismiss it. Works anywhere, including outside React components.
 *
 * @example
 * const saved = toast({ title: "Saved", variant: "success" });
 * saved.update({ description: "All changes are synced." });
 * toast.dismiss(); // closes every toast
 */
function toast(options: ToastOptions): ToastHandle {
  counter += 1;
  const id = `toast-${counter}`;
  const next = [...toasts, { ...options, id, open: true }];
  emit(next);
  // Keep at most MAX_VISIBLE open: close the oldest ones.
  const open = next.filter((item) => item.open);
  for (const item of open.slice(0, Math.max(0, open.length - MAX_VISIBLE))) dismiss(item.id);
  return {
    id,
    dismiss: () => dismiss(id),
    update: (changes) => update(id, changes),
  };
}

/** Closes one toast by id, or every toast when called without one. */
toast.dismiss = dismiss;

/** The current toasts, including ones that are closing. Re-renders when the list changes. */
function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY
  );
}

type ToasterPosition =
  "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

const viewportPosition: Record<ToasterPosition, string> = {
  "top-left": "top-0 left-0 flex-col-reverse",
  "top-center": "top-0 left-1/2 -translate-x-1/2 flex-col-reverse",
  "top-right": "top-0 right-0 flex-col-reverse",
  "bottom-left": "bottom-0 left-0 flex-col",
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 flex-col",
  "bottom-right": "bottom-0 right-0 flex-col",
};

const swipeDirection: Record<ToasterPosition, "up" | "down" | "left" | "right"> = {
  "top-left": "left",
  "top-center": "up",
  "top-right": "right",
  "bottom-left": "left",
  "bottom-center": "down",
  "bottom-right": "right",
};

// Full class names (not built from parts) so Tailwind finds them in the source.
const toastMotion: Record<ToasterPosition, string> = {
  "top-left": "data-[state=open]:slide-in-from-top-full data-[state=closed]:slide-out-to-left-full",
  "top-center":
    "data-[state=open]:slide-in-from-top-full data-[state=closed]:slide-out-to-top-full",
  "top-right":
    "data-[state=open]:slide-in-from-top-full data-[state=closed]:slide-out-to-right-full",
  "bottom-left":
    "data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-left-full",
  "bottom-center":
    "data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full",
  "bottom-right":
    "data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-right-full",
};

const toastVariant: Record<ToastVariant, string> = {
  default: "bg-background text-foreground border",
  success: "bg-background text-foreground border-success/50 border",
  destructive: "bg-destructive text-destructive-foreground border-destructive border",
};

interface ToasterProps extends Omit<ComponentProps<typeof ToastPrimitive.Viewport>, "label"> {
  /** Corner or edge of the screen the toasts stack in. */
  position?: ToasterPosition;
  /** Milliseconds before a toast closes on its own. */
  duration?: number;
  /**
   * Accessible name of the notifications region. `{hotkey}` is replaced by the
   * keyboard shortcut that moves focus to it ("Notifications ({hotkey})").
   */
  label?: string;
  /** Accessible name of each toast's close button. */
  closeLabel?: string;
  /** Word screen readers say before each announced toast. */
  toastLabel?: string;
}

/**
 * Renders the toasts created with `toast()`. Mount it once, near the root of
 * the app. At most three are open at a time. Each toast is announced to screen
 * readers when it appears (destructive ones interrupt, others wait their turn);
 * F8 moves focus to the stack, Tab reaches the action and close buttons, and
 * Escape closes the focused toast. The timer pauses while the pointer is over
 * a toast, while one has focus, and while the window is in the background.
 * Toasts can be swiped away towards the nearest edge. With reduced motion they
 * appear and disappear without sliding.
 *
 * @example
 * <Toaster position="top-center" />
 * // anywhere:
 * toast({
 *   title: "File deleted",
 *   action: { label: "Undo", onClick: restore, altText: "Restore it from the Trash" },
 * });
 */
function Toaster({
  position = "bottom-right",
  duration = 5000,
  label = "Notifications",
  closeLabel = "Close",
  toastLabel = "Notification",
  className,
  ...props
}: ToasterProps) {
  const items = useToasts();
  return (
    <ToastPrimitive.Provider
      duration={duration}
      label={toastLabel}
      swipeDirection={swipeDirection[position]}
    >
      {items.map(({ id, open, title, description, action, variant = "default", duration }) => (
        <ToastPrimitive.Root
          key={id}
          data-slot="toast"
          data-variant={variant}
          open={open}
          onOpenChange={(next) => {
            if (!next) dismiss(id);
          }}
          duration={duration}
          type={variant === "destructive" ? "foreground" : "background"}
          className={cn(
            "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md p-4 pr-10 shadow-lg",
            toastVariant[variant],
            "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=move]:transition-none",
            "data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:translate-y-0 data-[swipe=cancel]:transition-transform motion-reduce:transition-none",
            "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)]",
            // animate-in/out sit behind motion-safe: so reduced motion really turns them off.
            "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-80",
            toastMotion[position]
          )}
        >
          {variant === "success" ? (
            <CircleCheckIcon
              aria-hidden="true"
              data-slot="toast-icon"
              className="text-success mt-0.5 size-4 shrink-0"
            />
          ) : variant === "destructive" ? (
            <CircleAlertIcon
              aria-hidden="true"
              data-slot="toast-icon"
              className="mt-0.5 size-4 shrink-0"
            />
          ) : null}
          <div data-slot="toast-body" className="grid flex-1 gap-1">
            {title ? (
              <ToastPrimitive.Title data-slot="toast-title" className="text-sm font-semibold">
                {title}
              </ToastPrimitive.Title>
            ) : null}
            {description ? (
              <ToastPrimitive.Description
                data-slot="toast-description"
                className="text-sm opacity-90"
              >
                {description}
              </ToastPrimitive.Description>
            ) : null}
          </div>
          {action ? (
            <ToastPrimitive.Action
              data-slot="toast-action"
              altText={action.altText}
              onClick={action.onClick}
              className={cn(
                "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center self-center rounded-md border bg-transparent px-3 text-sm font-medium",
                "hover:bg-accent hover:text-accent-foreground transition-colors motion-reduce:transition-none",
                "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
                "group-data-[variant=destructive]:border-destructive-foreground/40 group-data-[variant=destructive]:hover:bg-destructive-foreground/10 group-data-[variant=destructive]:hover:text-destructive-foreground"
              )}
            >
              {action.label}
            </ToastPrimitive.Action>
          ) : null}
          <ToastPrimitive.Close
            data-slot="toast-close"
            aria-label={closeLabel}
            className={cn(
              "absolute top-2 right-2 inline-flex size-6 cursor-pointer items-center justify-center rounded-md opacity-70",
              "transition-opacity outline-none hover:opacity-100 motion-reduce:transition-none",
              "focus-visible:ring-ring/50 focus-visible:opacity-100 focus-visible:ring-[3px]",
              "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            )}
          >
            <XIcon aria-hidden="true" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport
        data-slot="toaster"
        data-position={position}
        label={label}
        className={cn(
          "fixed z-[100] flex max-h-screen w-full gap-2 p-4 outline-none sm:max-w-[420px]",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          viewportPosition[position],
          className
        )}
        {...props}
      />
    </ToastPrimitive.Provider>
  );
}

export {
  toast,
  Toaster,
  useToasts,
  type ToastAction,
  type ToasterPosition,
  type ToasterProps,
  type ToastHandle,
  type ToastItem,
  type ToastOptions,
  type ToastVariant,
};
