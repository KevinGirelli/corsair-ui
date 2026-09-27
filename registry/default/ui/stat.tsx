import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

type StatTrend = "up" | "down" | "flat";

const TREND_ICONS = { up: TrendingUpIcon, down: TrendingDownIcon, flat: MinusIcon } as const;

const TREND_LABELS: Record<StatTrend, string> = {
  up: "Increase",
  down: "Decrease",
  flat: "No change",
};

/**
 * A set of key figures, marked up as a description list so each value is
 * read together with its label. Lay it out with grid classes
 * (`sm:grid-cols-3`, …).
 *
 * @example
 * <StatGroup className="sm:grid-cols-3">
 *   <Stat>
 *     <StatLabel>Revenue</StatLabel>
 *     <StatValue>$48,200</StatValue>
 *     <StatCaption trend="up">12% since last month</StatCaption>
 *   </Stat>
 * </StatGroup>
 */
function StatGroup({ className, ...props }: ComponentProps<"dl">) {
  return <dl data-slot="stat-group" className={cn("grid gap-6", className)} {...props} />;
}

/** One figure: a StatLabel, a StatValue and optionally a StatCaption. Put it inside a StatGroup. */
function Stat({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="stat" className={cn("flex flex-col gap-1", className)} {...props} />;
}

function StatLabel({ className, ...props }: ComponentProps<"dt">) {
  return (
    <dt
      data-slot="stat-label"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function StatValue({ className, ...props }: ComponentProps<"dd">) {
  return (
    <dd
      data-slot="stat-value"
      className={cn("text-3xl font-semibold tracking-tight tabular-nums", className)}
      {...props}
    />
  );
}

interface StatCaptionProps extends ComponentProps<"dd"> {
  /** Adds an arrow for the direction of change and exposes it as `data-trend`. */
  trend?: StatTrend;
  /**
   * Read to screen readers before the caption, since the arrow is only a
   * picture. Defaults to "Increase", "Decrease" or "No change".
   */
  trendLabel?: string;
}

/**
 * A note under the value: a comparison, a period. With `trend` it gets an
 * arrow icon (hidden from screen readers, which hear `trendLabel` instead).
 * Up is tinted `text-success` and down `text-destructive`; restyle through
 * `data-trend` where a rise is bad news.
 */
function StatCaption({ className, trend, trendLabel, children, ...props }: StatCaptionProps) {
  const Icon = trend ? TREND_ICONS[trend] : null;

  return (
    <dd
      data-slot="stat-caption"
      data-trend={trend}
      className={cn(
        "text-muted-foreground flex items-center gap-1 text-xs",
        "data-[trend=down]:[&>svg]:text-destructive data-[trend=up]:[&>svg]:text-success [&>svg]:size-3.5 [&>svg]:shrink-0",
        className
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" data-slot="stat-trend-icon" /> : null}
      {trend ? <span className="sr-only">{`${trendLabel ?? TREND_LABELS[trend]}: `}</span> : null}
      {children}
    </dd>
  );
}

export {
  Stat,
  StatCaption,
  StatGroup,
  StatLabel,
  StatValue,
  type StatCaptionProps,
  type StatTrend,
};
