import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Marquee } from "@/registry/default/ui/marquee";

interface LogoCloudLogo {
  /** Stable React key. Falls back to the index. */
  id?: string;
  /** The accessible name of the logo. Shown as a text wordmark when there is no `logo`. */
  name: string;
  /** An image or SVG. Its own text is replaced by `name` for screen readers. */
  logo?: ReactNode;
  /** Makes the logo a link. */
  href?: string;
}

type LogoCloudVariant = "grid" | "marquee";

interface LogoCloudProps extends Omit<ComponentProps<"section">, "title"> {
  /** Small centred line above the logos, rendered in an `<h2>`; pass `null` to hide it. */
  title?: ReactNode;
  logos?: LogoCloudLogo[];
  /** A static grid, or a row that scrolls in a loop. */
  variant?: LogoCloudVariant;
}

const defaultLogos: LogoCloudLogo[] = [
  { id: "northwind", name: "Northwind" },
  { id: "lumen", name: "Lumen Labs" },
  { id: "quanta", name: "Quanta" },
  { id: "evergreen", name: "Evergreen" },
  { id: "polaris", name: "Polaris" },
  { id: "brightpath", name: "Brightpath" },
];

function LogoCloudMark({ name, logo, href }: LogoCloudLogo) {
  if (href) {
    return (
      <a
        href={href}
        aria-label={logo != null ? name : undefined}
        data-slot="logo-cloud-link"
        className="group/logo focus-visible:ring-ring/50 flex items-center rounded-md outline-none focus-visible:ring-[3px]"
      >
        {logo ?? <LogoCloudWordmark name={name} />}
      </a>
    );
  }
  if (logo != null) {
    return (
      <span role="img" aria-label={name} data-slot="logo-cloud-image" className="flex items-center">
        {logo}
      </span>
    );
  }
  return <LogoCloudWordmark name={name} />;
}

function LogoCloudWordmark({ name }: { name: string }) {
  return (
    <span
      data-slot="logo-cloud-wordmark"
      className="text-muted-foreground group-hover/logo:text-foreground text-lg font-semibold tracking-tight whitespace-nowrap transition-colors motion-reduce:transition-none"
    >
      {name}
    </span>
  );
}

/**
 * A row of customer or partner logos under a small centred title. With no
 * props it shows six fictional names as text wordmarks; pass `logos` with an
 * image or SVG in `logo` for real marks, and `href` to make them links.
 *
 * `variant="grid"` (the default) lays them out in two to six columns;
 * `variant="marquee"` scrolls them in an endless loop that pauses on hover
 * and holds still with `prefers-reduced-motion`. The variant is exposed as
 * `data-variant`.
 *
 * Accessibility: every logo is named by `name`: a custom `logo` is wrapped
 * in `role="img"` with that name, or the link gets it as its `aria-label`.
 * The logos are a list. In the marquee, the copies that make the loop are
 * hidden from screen readers and the keyboard.
 *
 * @example
 * <LogoCloud
 *   variant="marquee"
 *   logos={[
 *     { name: "Northwind", logo: <img src="/northwind.svg" alt="" className="h-8" /> },
 *     { name: "Quanta", href: "#customers" },
 *   ]}
 * />
 */
function LogoCloud({
  title = "Trusted by teams at",
  logos = defaultLogos,
  variant = "grid",
  className,
  ...props
}: LogoCloudProps) {
  const items = logos.map((logo, index) => (
    <li
      key={logo.id ?? index}
      data-slot="logo-cloud-item"
      className={cn("flex items-center", variant === "marquee" && "shrink-0")}
    >
      <LogoCloudMark {...logo} />
    </li>
  ));

  return (
    <section
      data-slot="logo-cloud"
      data-variant={variant}
      className={cn("py-16 sm:py-24", className)}
      {...props}
    >
      <div data-slot="logo-cloud-container" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {title != null ? (
          <h2
            data-slot="logo-cloud-title"
            className="text-muted-foreground text-center text-sm font-medium"
          >
            {title}
          </h2>
        ) : null}
        {variant === "marquee" ? (
          <Marquee pauseOnHover gap="3rem" className={cn(title != null && "mt-8")}>
            {/* One list per copy, spaced like the gap between copies, so the loop has no seam. */}
            <ul data-slot="logo-cloud-list" className="flex items-center gap-12">
              {items}
            </ul>
          </Marquee>
        ) : (
          <ul
            data-slot="logo-cloud-list"
            className={cn(
              "grid grid-cols-2 items-center justify-items-center gap-8 sm:grid-cols-3 lg:grid-cols-6",
              title != null && "mt-8"
            )}
          >
            {items}
          </ul>
        )}
      </div>
    </section>
  );
}

export { LogoCloud, type LogoCloudLogo, type LogoCloudProps, type LogoCloudVariant };
