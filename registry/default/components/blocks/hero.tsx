import { ArrowRightIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";

type HeroAlign = "center" | "start";

interface HeroProps extends Omit<ComponentProps<"section">, "title"> {
  /** Small line above the title. Defaults to a pill link to `#changelog`; pass `null` to hide it. */
  eyebrow?: ReactNode;
  /** The page title, rendered in the `<h1>`. */
  title?: ReactNode;
  /** A sentence or two under the title. */
  description?: ReactNode;
  /** Buttons or links under the description. Defaults to "Get started" and "Learn more"; pass `null` to hide them. */
  actions?: ReactNode;
  /** An image, screenshot or illustration. Beside the text with `align="start"` (on large screens), under it when centred. */
  media?: ReactNode;
  /** Centred text, or text on the start side. */
  align?: HeroAlign;
}

const defaultEyebrow = (
  <Badge asChild variant="outline" className="rounded-full px-3 py-1">
    <a href="#changelog">
      New · Version 2 is here
      <ArrowRightIcon aria-hidden="true" />
    </a>
  </Badge>
);

const defaultActions = (
  <>
    <Button asChild size="lg">
      <a href="#get-started">Get started</a>
    </Button>
    <Button asChild size="lg" variant="outline">
      <a href="#features">Learn more</a>
    </Button>
  </>
);

/**
 * The opening section of a landing page: an optional eyebrow, the page
 * title (the only `<h1>` among the blocks), a description, actions and an
 * optional media slot. Every piece of content is a prop with a neutral
 * default, so `<Hero />` renders a complete example.
 *
 * With `media` and `align="start"` the text and the media sit side by side
 * on large screens; centred, the media goes under the text in a rounded,
 * bordered frame. The alignment is exposed as `data-align` for restyling.
 *
 * Accessibility: keep one `<h1>` per page, so use a single Hero. Give
 * images in `media` an `alt` text, or `alt=""` when they are decorative.
 *
 * @example
 * <Hero
 *   title="Plan, track and ship"
 *   description="One place for your roadmap, issues and releases."
 *   media={<img src="/screenshot.png" alt="The Acme dashboard" />}
 *   align="start"
 * />
 */
function Hero({
  eyebrow = defaultEyebrow,
  title = "Build, launch and grow your product in one place",
  description = "Acme brings your planning, analytics and customer feedback together, so your team spends less time switching tools and more time shipping.",
  actions = defaultActions,
  media,
  align = "center",
  className,
  ...props
}: HeroProps) {
  const centered = align === "center";
  const split = !centered && media != null;

  return (
    <section
      data-slot="hero"
      data-align={align}
      className={cn("py-16 sm:py-24", className)}
      {...props}
    >
      <div
        data-slot="hero-container"
        className={cn(
          "mx-auto w-full max-w-6xl px-4 sm:px-6",
          split && "grid gap-12 lg:grid-cols-2 lg:items-center"
        )}
      >
        <div
          data-slot="hero-content"
          className={cn(
            "flex flex-col",
            centered ? "mx-auto max-w-3xl items-center text-center" : "max-w-2xl items-start"
          )}
        >
          {eyebrow != null ? (
            <div
              data-slot="hero-eyebrow"
              className="text-muted-foreground mb-6 text-sm font-medium"
            >
              {eyebrow}
            </div>
          ) : null}
          <h1
            data-slot="hero-title"
            className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            {title}
          </h1>
          {description != null ? (
            <p
              data-slot="hero-description"
              className="text-muted-foreground mt-6 text-lg text-pretty sm:text-xl"
            >
              {description}
            </p>
          ) : null}
          {actions != null ? (
            <div
              data-slot="hero-actions"
              className={cn("mt-10 flex flex-wrap gap-3", centered && "justify-center")}
            >
              {actions}
            </div>
          ) : null}
        </div>
        {media != null ? (
          <div
            data-slot="hero-media"
            className={cn(
              "min-w-0",
              centered && "bg-muted mt-16 overflow-hidden rounded-xl border"
            )}
          >
            {media}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { Hero, type HeroAlign, type HeroProps };
