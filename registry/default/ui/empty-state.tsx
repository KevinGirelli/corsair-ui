import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

const emptyStateVariants = cva(
  "flex w-full flex-col items-center justify-center gap-2 rounded-lg p-8 text-center",
  {
    variants: {
      variant: {
        plain: "",
        dashed: "border border-dashed",
      },
    },
    defaultVariants: {
      variant: "dashed",
    },
  }
);

interface EmptyStateProps extends ComponentProps<"div">, VariantProps<typeof emptyStateVariants> {}

/**
 * What a list, table or page shows when there is nothing in it yet: an icon,
 * a title, a line of explanation and the action that fills it. It is a plain
 * block, not a live region, so it is read in page order like the rest of the
 * content; the title is a real heading, so it shows up in the headings list.
 * `variant="dashed"` (the default) draws a dashed border around it,
 * `variant="plain"` leaves it bare. Nothing animates.
 *
 * @example
 * <EmptyState>
 *   <EmptyStateIcon>
 *     <InboxIcon />
 *   </EmptyStateIcon>
 *   <EmptyStateTitle>No messages</EmptyStateTitle>
 *   <EmptyStateDescription>New messages from your crew show up here.</EmptyStateDescription>
 *   <EmptyStateActions>
 *     <Button>Write a message</Button>
 *   </EmptyStateActions>
 * </EmptyState>
 */
function EmptyState({ className, variant, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      data-variant={variant ?? "dashed"}
      className={cn(emptyStateVariants({ variant }), className)}
      {...props}
    />
  );
}

/** A round muted badge around an icon. Decorative: it is hidden from screen readers. */
function EmptyStateIcon({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-icon"
      aria-hidden="true"
      className={cn(
        "bg-muted text-muted-foreground mb-2 flex size-12 shrink-0 items-center justify-center rounded-full",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
        className
      )}
      {...props}
    />
  );
}

interface EmptyStateTitleProps extends ComponentProps<"h2"> {
  /** Heading level, to fit the outline of the page it sits in. */
  as?: "h2" | "h3" | "h4";
}

/** The heading of the empty state: an `<h2>` unless `as` picks another level. */
function EmptyStateTitle({ as: Comp = "h2", className, ...props }: EmptyStateTitleProps) {
  return (
    <Comp
      data-slot="empty-state-title"
      className={cn("text-lg font-semibold tracking-tight text-balance", className)}
      {...props}
    />
  );
}

function EmptyStateDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn("text-muted-foreground max-w-sm text-sm text-balance", className)}
      {...props}
    />
  );
}

/** A row of buttons or links below the text, wrapping on narrow screens. */
function EmptyStateActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-actions"
      className={cn("mt-4 flex flex-wrap items-center justify-center gap-2", className)}
      {...props}
    />
  );
}

export {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  emptyStateVariants,
  type EmptyStateProps,
  type EmptyStateTitleProps,
};
