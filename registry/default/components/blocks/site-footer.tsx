import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import { Separator } from "@/registry/default/ui/separator";

interface SiteFooterLink {
  /** React key; falls back to the index. */
  id?: string;
  label: ReactNode;
  href: string;
}

interface SiteFooterColumn {
  /** React key; falls back to the index. */
  id?: string;
  /** Column heading, rendered as an `<h2>`. */
  title: ReactNode;
  links: SiteFooterLink[];
}

interface SiteFooterSocialLink {
  /** React key; falls back to the index. */
  id?: string;
  /** Accessible name of the icon link, such as "Follow us on Mastodon". */
  label: string;
  href: string;
  /** Decorative icon; it is hidden from assistive tech. */
  icon: ReactNode;
}

const defaultColumns: SiteFooterColumn[] = [
  {
    id: "product",
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Integrations", href: "#integrations" },
      { label: "Changelog", href: "#changelog" },
    ],
  },
  {
    id: "company",
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Careers", href: "#careers" },
      { label: "Blog", href: "#blog" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    id: "resources",
    title: "Resources",
    links: [
      { label: "Documentation", href: "#docs" },
      { label: "Guides", href: "#guides" },
      { label: "Help center", href: "#help" },
    ],
  },
];

const linkClassName = cn(
  "text-muted-foreground hover:text-foreground rounded-md text-sm outline-none",
  "transition-colors motion-reduce:transition-none",
  "focus-visible:ring-ring/50 focus-visible:ring-[3px]"
);

interface SiteFooterProps extends ComponentProps<"footer"> {
  /** Logo or wordmark at the top left. */
  brand?: ReactNode;
  /** A sentence under the brand. Pass `null` to hide it. */
  description?: ReactNode;
  /** Link columns, all inside one navigation landmark. */
  columns?: SiteFooterColumn[];
  /** Icon links in the bottom row. Each needs a `label`, since the icon has no text. */
  social?: SiteFooterSocialLink[];
  /** Text on the left of the bottom row, such as the copyright. */
  bottom?: ReactNode;
  /** Accessible name of the navigation landmark around the columns. */
  navLabel?: string;
}

/**
 * The footer at the end of a page: brand and a short description on the
 * left, link columns on the right, then a separator and a bottom row with
 * the copyright and optional social icon links (stacked on small screens).
 * It is a `<footer>` (the contentinfo landmark when it is not inside another
 * section). The columns share one `<nav>` named by `navLabel`; each column
 * title is an `<h2>` and its links a list. Social links are named by their
 * `label` and their icons are hidden from assistive tech. Nothing is
 * computed at runtime, so pass the year in `bottom` if you want one.
 *
 * @example
 * <SiteFooter
 *   brand={<a href="/">Acme</a>}
 *   columns={[{ title: "Product", links: [{ label: "Pricing", href: "/pricing" }] }]}
 *   social={[{ label: "RSS feed", href: "/rss.xml", icon: <RssIcon /> }]}
 *   bottom="© 2025 Acme Inc."
 * />
 */
function SiteFooter({
  brand = <span className="font-semibold">Acme</span>,
  description = "Plan, build and ship your work in one place, with tools the whole team can use.",
  columns = defaultColumns,
  social = [],
  bottom = "© Acme Inc. All rights reserved.",
  navLabel = "Footer",
  className,
  ...props
}: SiteFooterProps) {
  return (
    <footer data-slot="site-footer" className={cn("border-t py-16 sm:py-24", className)} {...props}>
      <div data-slot="site-footer-container" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div data-slot="site-footer-main" className="grid gap-12 lg:grid-cols-[2fr_3fr]">
          <div data-slot="site-footer-intro" className="min-w-0">
            <div data-slot="site-footer-brand">{brand}</div>
            {description ? (
              <p
                data-slot="site-footer-description"
                className="text-muted-foreground mt-4 max-w-xs text-sm text-pretty"
              >
                {description}
              </p>
            ) : null}
          </div>
          {columns.length > 0 ? (
            <nav
              data-slot="site-footer-nav"
              aria-label={navLabel}
              className="grid grid-cols-2 gap-8 sm:grid-cols-3"
            >
              {columns.map((column, columnIndex) => (
                <div
                  key={column.id ?? columnIndex}
                  data-slot="site-footer-column"
                  className="min-w-0"
                >
                  <h2 data-slot="site-footer-column-title" className="text-sm font-medium">
                    {column.title}
                  </h2>
                  <ul data-slot="site-footer-links" className="mt-4 flex flex-col gap-3">
                    {column.links.map((link, linkIndex) => (
                      <li key={link.id ?? linkIndex}>
                        <a data-slot="site-footer-link" href={link.href} className={linkClassName}>
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          ) : null}
        </div>
        <Separator className="my-8" />
        <div
          data-slot="site-footer-bottom"
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {bottom ? (
            <div data-slot="site-footer-legal" className="text-muted-foreground text-sm">
              {bottom}
            </div>
          ) : null}
          {social.length > 0 ? (
            <ul data-slot="site-footer-social" className="-mx-2 flex flex-wrap items-center gap-1">
              {social.map((item, index) => (
                <li key={item.id ?? index}>
                  <Button asChild variant="ghost" size="icon-sm">
                    <a data-slot="site-footer-social-link" href={item.href} aria-label={item.label}>
                      <span aria-hidden="true" className="contents">
                        {item.icon}
                      </span>
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

export {
  SiteFooter,
  type SiteFooterColumn,
  type SiteFooterLink,
  type SiteFooterProps,
  type SiteFooterSocialLink,
};
