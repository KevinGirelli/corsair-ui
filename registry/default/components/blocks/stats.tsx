import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import { NumberTicker } from "@/registry/default/ui/number-ticker";
import {
  Stat,
  StatCaption,
  StatGroup,
  StatLabel,
  StatValue,
  type StatTrend,
} from "@/registry/default/ui/stat";

interface StatsItem {
  /** Stable React key. Falls back to the index. */
  id?: string;
  label: ReactNode;
  /** A number counts up when it scrolls into view; anything else renders as is. */
  value: number | ReactNode;
  /** Shown before the value, outside the counting number ("$"). */
  prefix?: ReactNode;
  /** Shown after the value, outside the counting number ("+", "%"). */
  suffix?: ReactNode;
  /** `Intl.NumberFormat` options for a numeric value: compact notation, digits, currency… */
  format?: Intl.NumberFormatOptions;
  /** A note under the value: a comparison, a period. */
  caption?: ReactNode;
  /** Adds an arrow for the direction of change next to the caption. */
  trend?: StatTrend;
}

type StatsVariant = "plain" | "cards";

interface StatsProps extends Omit<ComponentProps<"section">, "title"> {
  /** Small line above the title; pass `null` to hide it. */
  eyebrow?: ReactNode;
  /** Section title, rendered in an `<h2>`. */
  title?: ReactNode;
  description?: ReactNode;
  stats?: StatsItem[];
  /** Plain figures, or each figure in a bordered box. */
  variant?: StatsVariant;
  /** Locale for numeric values. Defaults to the one NumberTicker uses. */
  locale?: string;
  /** Read to screen readers before a caption with a trend, since the arrow is only a picture. */
  trendLabels?: Partial<Record<StatTrend, string>>;
}

const defaultTrendLabels: Record<StatTrend, string> = {
  up: "Increase",
  down: "Decrease",
  flat: "No change",
};

const defaultStats: StatsItem[] = [
  {
    id: "teams",
    label: "Teams on Acme",
    value: 12000,
    suffix: "+",
    caption: "18% more than last year",
    trend: "up",
  },
  { id: "uptime", label: "Uptime", value: 99.9, suffix: "%", caption: "Over the last 12 months" },
  {
    id: "requests",
    label: "Requests a day",
    value: 150,
    suffix: "M",
    caption: "Handled across 30 regions",
  },
  {
    id: "response",
    label: "Median response",
    value: 42,
    suffix: " ms",
    caption: "Measured at the edge",
  },
];

/**
 * A row of key figures under an optional centred header. Built on
 * StatGroup and Stat, so each value is read together with its label (a
 * description list). `<Stats />` renders four example figures.
 *
 * A numeric `value` uses NumberTicker: it counts up once when it scrolls
 * into view and shows the final value at once with `prefers-reduced-motion`.
 * `prefix` and `suffix` sit outside the counting number; `format` and
 * `locale` control how the number is written. Any other value (a string,
 * an element) renders as is. Two columns on mobile, four on large screens;
 * `variant="cards"` puts each figure in a bordered box. The variant is
 * exposed as `data-variant`.
 *
 * Accessibility: screen readers only hear the final number, never the
 * moving digits. Trend arrows are hidden and replaced by `trendLabels`.
 *
 * @example
 * <Stats
 *   title="Growing every day"
 *   variant="cards"
 *   stats={[
 *     { label: "Revenue", value: 48200, prefix: "$", caption: "12% since last month", trend: "up" },
 *     { label: "Customers", value: 1200, suffix: "+" },
 *     { label: "Rating", value: "4.9 / 5" },
 *   ]}
 * />
 */
function Stats({
  eyebrow = "By the numbers",
  title = "Trusted by teams that move fast",
  description = "Acme runs quietly in the background while thousands of teams ship every day.",
  stats = defaultStats,
  variant = "plain",
  locale,
  trendLabels,
  className,
  ...props
}: StatsProps) {
  const hasHeader = eyebrow != null || title != null || description != null;
  const labels = { ...defaultTrendLabels, ...trendLabels };

  return (
    <section
      data-slot="stats"
      data-variant={variant}
      className={cn("py-16 sm:py-24", className)}
      {...props}
    >
      <div data-slot="stats-container" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {hasHeader ? (
          <div data-slot="stats-header" className="mx-auto max-w-2xl text-center">
            {eyebrow != null ? (
              <p data-slot="stats-eyebrow" className="text-muted-foreground text-sm font-medium">
                {eyebrow}
              </p>
            ) : null}
            {title != null ? (
              <h2
                data-slot="stats-title"
                className={cn(
                  "text-3xl font-semibold tracking-tight text-balance sm:text-4xl",
                  eyebrow != null && "mt-2"
                )}
              >
                {title}
              </h2>
            ) : null}
            {description != null ? (
              <p
                data-slot="stats-description"
                className="text-muted-foreground mt-4 text-lg text-pretty"
              >
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        <StatGroup
          className={cn(
            "grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4",
            variant === "cards" && "gap-y-6",
            hasHeader && "mt-12"
          )}
        >
          {stats.map((stat, index) => (
            <Stat
              key={stat.id ?? index}
              className={cn(
                "min-w-0 gap-2",
                variant === "cards" && "bg-card rounded-xl border p-6"
              )}
            >
              <StatLabel>{stat.label}</StatLabel>
              <StatValue className="text-3xl break-words sm:text-4xl">
                {typeof stat.value === "number" ? (
                  <>
                    {stat.prefix != null ? (
                      <span data-slot="stats-prefix">{stat.prefix}</span>
                    ) : null}
                    <NumberTicker value={stat.value} format={stat.format} locale={locale} />
                    {stat.suffix != null ? (
                      <span data-slot="stats-suffix">{stat.suffix}</span>
                    ) : null}
                  </>
                ) : (
                  <>
                    {stat.prefix}
                    {stat.value}
                    {stat.suffix}
                  </>
                )}
              </StatValue>
              {stat.caption != null || stat.trend ? (
                <StatCaption
                  trend={stat.trend}
                  trendLabel={stat.trend ? labels[stat.trend] : undefined}
                  className="text-sm"
                >
                  {stat.caption}
                </StatCaption>
              ) : null}
            </Stat>
          ))}
        </StatGroup>
      </div>
    </section>
  );
}

export { Stats, type StatsItem, type StatsProps, type StatsVariant };
