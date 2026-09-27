import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";

// The surface of the band for each variant. The variant names come from its keys.
const BAND = {
  muted: "bg-muted",
  primary: "bg-primary text-primary-foreground",
  outline: "border",
};

type CallToActionVariant = keyof typeof BAND;
type CallToActionAlign = "center" | "start";

interface CallToActionProps extends Omit<ComponentProps<"section">, "title"> {
  /** Rendered in an `<h2>`. */
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons or links. Defaults to "Start for free" and "Talk to sales"; pass `null` to hide them. */
  actions?: ReactNode;
  /** The band's surface: muted, the primary colour, or a border. */
  variant?: CallToActionVariant;
  /** Centred, or text on the start side with the actions on the other (from `md`). */
  align?: CallToActionAlign;
}

function defaultActions(variant: CallToActionVariant) {
  // On the primary colour, secondary and ghost buttons stay readable.
  if (variant === "primary") {
    return (
      <>
        <Button asChild size="lg" variant="secondary">
          <a href="#get-started">Start for free</a>
        </Button>
        <Button
          asChild
          size="lg"
          variant="ghost"
          className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-primary-foreground/50"
        >
          <a href="#contact">Talk to sales</a>
        </Button>
      </>
    );
  }
  return (
    <>
      <Button asChild size="lg">
        <a href="#get-started">Start for free</a>
      </Button>
      <Button asChild size="lg" variant="outline">
        <a href="#contact">Talk to sales</a>
      </Button>
    </>
  );
}

/**
 * A closing call to action: a title, a short description and one or two
 * actions in a rounded band. `<CallToAction />` renders a complete example.
 *
 * `variant` picks the band's surface: `muted` (the default), `primary`
 * (the default buttons switch to secondary and ghost, so they stay
 * readable on the primary colour) or `outline`. With `align="start"` the
 * text sits on the start side and the actions on the other side from
 * `md` up. Both are exposed as `data-variant` and `data-align`.
 *
 * Accessibility: the title is an `<h2>`. When you pass your own actions on
 * the primary band, pick button variants with enough contrast against it.
 *
 * @example
 * <CallToAction
 *   variant="primary"
 *   align="start"
 *   title="Ready to get started?"
 *   description="Create an account in under a minute."
 *   actions={
 *     <Button asChild variant="secondary">
 *       <a href="#signup">Sign up</a>
 *     </Button>
 *   }
 * />
 */
function CallToAction({
  title = "Start building with Acme today",
  description = "Set up your workspace in minutes. No credit card needed, and you can cancel at any time.",
  actions,
  variant = "muted",
  align = "center",
  className,
  ...props
}: CallToActionProps) {
  const centered = align === "center";
  const content = actions === undefined ? defaultActions(variant) : actions;

  return (
    <section
      data-slot="cta"
      data-variant={variant}
      data-align={align}
      className={cn("py-16 sm:py-24", className)}
      {...props}
    >
      <div data-slot="cta-container" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div
          data-slot="cta-band"
          className={cn(
            "flex flex-col gap-8 rounded-xl px-6 py-12 sm:px-12 sm:py-16",
            BAND[variant],
            centered ? "items-center text-center" : "md:flex-row md:items-center md:justify-between"
          )}
        >
          <div data-slot="cta-content" className={cn("max-w-2xl", centered && "mx-auto")}>
            {title != null ? (
              <h2
                data-slot="cta-title"
                className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
              >
                {title}
              </h2>
            ) : null}
            {description != null ? (
              <p
                data-slot="cta-description"
                className={cn(
                  "mt-4 text-lg text-pretty",
                  variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          {content != null ? (
            <div
              data-slot="cta-actions"
              className={cn("flex flex-wrap gap-3", centered ? "justify-center" : "md:shrink-0")}
            >
              {content}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export { CallToAction, type CallToActionAlign, type CallToActionProps, type CallToActionVariant };
