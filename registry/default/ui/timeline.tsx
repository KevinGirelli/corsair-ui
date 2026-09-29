import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

type TimelineStatus = "default" | "success" | "warning" | "destructive";

/**
 * A vertical list of events in order: a ship's log, an order's history, a
 * deploy log. It is an ordered list (`<ol>`), so screen readers announce how
 * many events there are and where each one sits. Each `TimelineItem` has a
 * `status` that colours its dot; the dot and the line joining the dots are
 * decorative, so when the status matters, say it in the title or the
 * description too. Dates go in `TimelineTime`, a `<time>` with a
 * machine-readable `dateTime`; format the visible text for your locale.
 * Nothing animates.
 *
 * @example
 * <Timeline>
 *   <TimelineItem status="success">
 *     <TimelineDot />
 *     <TimelineConnector />
 *     <TimelineContent>
 *       <TimelineTitle>Left port</TimelineTitle>
 *       <TimelineTime dateTime="2025-03-02T08:00">2 March, 08:00</TimelineTime>
 *       <TimelineDescription>Cleared the harbour with a fair wind.</TimelineDescription>
 *     </TimelineContent>
 *   </TimelineItem>
 *   <TimelineItem>
 *     <TimelineDot />
 *     <TimelineConnector />
 *     <TimelineContent>
 *       <TimelineTitle>At sea</TimelineTitle>
 *     </TimelineContent>
 *   </TimelineItem>
 * </Timeline>
 */
function Timeline({ className, ...props }: ComponentProps<"ol">) {
  return <ol data-slot="timeline" className={cn("flex flex-col", className)} {...props} />;
}

interface TimelineItemProps extends ComponentProps<"li"> {
  /** Colours the dot, and is exposed as `data-status` for your own styles. */
  status?: TimelineStatus;
}

/** One event. Holds a `TimelineDot`, a `TimelineConnector` and a `TimelineContent`. */
function TimelineItem({ className, status = "default", ...props }: TimelineItemProps) {
  return (
    <li
      data-slot="timeline-item"
      data-status={status}
      className={cn("group/timeline-item relative flex gap-3 pb-6 last:pb-0", className)}
      {...props}
    />
  );
}

/** The marker of an event, coloured by the item's `status`. Decorative: hidden from screen readers. */
function TimelineDot({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="timeline-dot"
      aria-hidden="true"
      className={cn(
        "bg-primary ring-background relative z-[1] mt-1.5 size-3 shrink-0 rounded-full ring-4",
        "group-data-[status=success]/timeline-item:bg-success",
        "group-data-[status=warning]/timeline-item:bg-warning",
        "group-data-[status=destructive]/timeline-item:bg-destructive",
        className
      )}
      {...props}
    />
  );
}

/**
 * The line from this event's dot down to the next one. Decorative: hidden
 * from screen readers, and not drawn on the last item.
 */
function TimelineConnector({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="timeline-connector"
      aria-hidden="true"
      className={cn(
        "bg-border absolute top-6 bottom-0 left-[calc(0.375rem-0.5px)] w-px group-last/timeline-item:hidden",
        className
      )}
      {...props}
    />
  );
}

function TimelineContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}
      {...props}
    />
  );
}

function TimelineTitle({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="timeline-title"
      className={cn("text-sm leading-6 font-medium", className)}
      {...props}
    />
  );
}

interface TimelineTimeProps extends ComponentProps<"time"> {
  /** The moment in a machine-readable format (`2025-03-02`, `2025-03-02T08:00Z`). */
  dateTime: string;
}

/** When the event happened: a `<time>`; its text is yours to format for the reader's locale. */
function TimelineTime({ className, ...props }: TimelineTimeProps) {
  return (
    <time
      data-slot="timeline-time"
      className={cn("text-muted-foreground text-xs", className)}
      {...props}
    />
  );
}

function TimelineDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="timeline-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineDot,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
  type TimelineItemProps,
  type TimelineStatus,
  type TimelineTimeProps,
};
