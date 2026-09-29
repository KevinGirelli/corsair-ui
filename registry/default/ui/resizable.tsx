"use client";

import { GripVerticalIcon } from "lucide-react";
import type { Ref } from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/registry/default/lib/utils";

interface ResizablePanelGroupProps extends Omit<ResizablePrimitive.GroupProps, "elementRef"> {
  /** "horizontal" puts the panels side by side, "vertical" stacks them. */
  orientation?: "horizontal" | "vertical";
  ref?: Ref<HTMLDivElement>;
}

/**
 * Panels whose sizes the user can change: a file tree beside an editor, a
 * preview under a form. Put `ResizablePanel`s in it with a
 * `ResizableHandle` between each pair. A handle is a focusable separator:
 * Tab reaches it, the arrow keys resize the panels on either side (Left and
 * Right side by side, Up and Down when stacked), Home and End move it to the
 * limits, Enter collapses or restores a collapsible panel, and screen readers
 * hear its position as a value between the panels' limits. Dragging with a
 * pointer works too. Sizes change instantly; nothing animates. Built on
 * `react-resizable-panels`: sizes such as `defaultSize="30"` are percentages,
 * plain numbers are pixels.
 *
 * @example
 * <ResizablePanelGroup orientation="horizontal" className="min-h-64 rounded-lg border">
 *   <ResizablePanel defaultSize="30" minSize="20">
 *     Charts
 *   </ResizablePanel>
 *   <ResizableHandle withHandle aria-label="Resize charts" />
 *   <ResizablePanel>Log</ResizablePanel>
 * </ResizablePanelGroup>
 */
function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  ref,
  ...props
}: ResizablePanelGroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      data-orientation={orientation}
      orientation={orientation}
      elementRef={ref}
      className={cn("size-full", className)}
      {...props}
    />
  );
}

interface ResizablePanelProps extends Omit<ResizablePrimitive.PanelProps, "elementRef"> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * One resizable area. Size it with `defaultSize`, `minSize` and `maxSize`;
 * `collapsible` lets it shrink to `collapsedSize`. Control it from code with
 * `panelRef` (`usePanelRef` from `react-resizable-panels`).
 */
function ResizablePanel({ ref, ...props }: ResizablePanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" elementRef={ref} {...props} />;
}

interface ResizableHandleProps extends Omit<ResizablePrimitive.SeparatorProps, "elementRef"> {
  /** Shows a grip on the line, so the handle is easier to find and to grab. */
  withHandle?: boolean;
  /** Accessible name of the separator. Name it after the panel it resizes when there are several. */
  "aria-label"?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The line between two panels that resizes them. Its state is in
 * `data-separator` ("inactive", "hover", "active", "focus", "disabled") and
 * its direction in `aria-orientation`, for your own styles.
 */
function ResizableHandle({
  withHandle = false,
  "aria-label": label = "Resize",
  className,
  ref,
  ...props
}: ResizableHandleProps) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      aria-label={label}
      elementRef={ref}
      className={cn(
        "bg-border relative flex w-px shrink-0 items-center justify-center",
        // A wider invisible hit area centred on the 1px line.
        "after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
        "transition-[background-color,box-shadow] outline-none motion-reduce:transition-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "data-[separator=active]:bg-ring data-[separator=hover]:bg-ring/50",
        "aria-[disabled=true]:cursor-not-allowed aria-[disabled=true]:opacity-50",
        // aria-orientation="horizontal" is the line between stacked panels.
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
        "aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:inset-y-auto aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2",
        "[&[aria-orientation=horizontal]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div
          data-slot="resizable-handle-grip"
          aria-hidden="true"
          className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-[4px] border"
        >
          <GripVerticalIcon className="size-2.5" />
        </div>
      ) : null}
    </ResizablePrimitive.Separator>
  );
}

export {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ResizableHandleProps,
  type ResizablePanelGroupProps,
  type ResizablePanelProps,
};
