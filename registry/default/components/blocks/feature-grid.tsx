import {
  GaugeIcon,
  LayersIcon,
  PuzzleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Card } from "@/registry/default/ui/card";

interface FeatureGridFeature {
  /** Stable React key. Falls back to the index. */
  id?: string;
  /** Shown in a small bordered box above the title. Hidden from screen readers. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Turns the title into a link that covers the whole card. */
  href?: string;
}

type FeatureGridColumns = 2 | 3 | 4;

interface FeatureGridProps extends Omit<ComponentProps<"section">, "title"> {
  /** Small line above the title; pass `null` to hide it. */
  eyebrow?: ReactNode;
  /** Section title, rendered in an `<h2>`. */
  title?: ReactNode;
  description?: ReactNode;
  features?: FeatureGridFeature[];
  /** Columns on large screens. Always one on mobile and two from `sm`. */
  columns?: FeatureGridColumns;
}

// Full class names, so Tailwind finds them in the source.
const COLUMNS: Record<FeatureGridColumns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

const defaultFeatures: FeatureGridFeature[] = [
  {
    id: "fast",
    icon: <ZapIcon />,
    title: "Fast by default",
    description: "Pages load in milliseconds, with caching and prefetching set up for you.",
  },
  {
    id: "secure",
    icon: <ShieldCheckIcon />,
    title: "Secure from day one",
    description: "Single sign-on, audit logs and encryption at rest come with every plan.",
  },
  {
    id: "composable",
    icon: <LayersIcon />,
    title: "Composable",
    description: "Start with the pieces you need and add more as your product grows.",
  },
  {
    id: "integrations",
    icon: <PuzzleIcon />,
    title: "Integrations",
    description: "Connect the tools your team already uses in a few clicks.",
  },
  {
    id: "insights",
    icon: <GaugeIcon />,
    title: "Real-time insights",
    description: "See how people use your product as it happens, not a day later.",
  },
  {
    id: "automation",
    icon: <SparklesIcon />,
    title: "Smart automation",
    description: "Hand repetitive work to workflows that run on their own.",
  },
];

/**
 * A grid of features, each with an icon, a title and a short description,
 * under an optional centred header (eyebrow, `<h2>` title, description).
 * `<FeatureGrid />` renders six example features.
 *
 * Pass `features` to replace them and `columns` (2, 3 or 4) for the number
 * of columns on large screens. With `href`, a feature's title becomes a link
 * stretched over the whole card, and the card shows the focus ring.
 *
 * Accessibility: the features are a list; each title is an `<h3>` under the
 * section's `<h2>`. Icons are decorative and hidden from screen readers, so
 * the title has to say what the feature is.
 *
 * @example
 * <FeatureGrid
 *   title="Everything you need"
 *   columns={2}
 *   features={[
 *     { icon: <ZapIcon />, title: "Fast", description: "Loads in milliseconds.", href: "#speed" },
 *     { icon: <LockIcon />, title: "Private", description: "Your data stays yours." },
 *   ]}
 * />
 */
function FeatureGrid({
  eyebrow = "Features",
  title = "Everything your team needs to ship",
  description = "A focused set of tools that work together, so you can spend your time on the product instead of the plumbing.",
  features = defaultFeatures,
  columns = 3,
  className,
  ...props
}: FeatureGridProps) {
  const hasHeader = eyebrow != null || title != null || description != null;

  return (
    <section data-slot="feature-grid" className={cn("py-16 sm:py-24", className)} {...props}>
      <div data-slot="feature-grid-container" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {hasHeader ? (
          <div data-slot="feature-grid-header" className="mx-auto max-w-2xl text-center">
            {eyebrow != null ? (
              <p
                data-slot="feature-grid-eyebrow"
                className="text-muted-foreground text-sm font-medium"
              >
                {eyebrow}
              </p>
            ) : null}
            {title != null ? (
              <h2
                data-slot="feature-grid-title"
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
                data-slot="feature-grid-description"
                className="text-muted-foreground mt-4 text-lg text-pretty"
              >
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        <ul
          data-slot="feature-grid-list"
          data-columns={columns}
          className={cn("grid gap-6", COLUMNS[columns], hasHeader && "mt-12")}
        >
          {features.map((feature, index) => (
            <li key={feature.id ?? index} data-slot="feature-grid-item" className="flex">
              <Card
                data-linked={feature.href ? true : undefined}
                className={cn(
                  "relative w-full gap-4 px-6",
                  feature.href &&
                    "hover:bg-muted/50 has-[a:focus-visible]:border-ring has-[a:focus-visible]:ring-ring/50 transition-[color,background-color,border-color,box-shadow] has-[a:focus-visible]:ring-[3px] motion-reduce:transition-none"
                )}
              >
                {feature.icon != null ? (
                  <div
                    aria-hidden="true"
                    data-slot="feature-grid-icon"
                    className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border [&_svg]:size-5 [&_svg]:shrink-0"
                  >
                    {feature.icon}
                  </div>
                ) : null}
                <div className="flex flex-col gap-2">
                  <h3 data-slot="feature-grid-item-title" className="font-semibold">
                    {feature.href ? (
                      <a
                        href={feature.href}
                        className="outline-none after:absolute after:inset-0 after:rounded-xl"
                      >
                        {feature.title}
                      </a>
                    ) : (
                      feature.title
                    )}
                  </h3>
                  {feature.description != null ? (
                    <p
                      data-slot="feature-grid-item-description"
                      className="text-muted-foreground text-sm text-pretty"
                    >
                      {feature.description}
                    </p>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { FeatureGrid, type FeatureGridColumns, type FeatureGridFeature, type FeatureGridProps };
