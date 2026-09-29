import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";

interface NotFoundProps extends Omit<ComponentProps<"section">, "title"> {
  /** The large error code above the title. It is decorative; pass `null` to hide it. */
  code?: ReactNode;
  /** The page heading, rendered as an `<h1>`. */
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons or links. Defaults to "Go home" and "Contact support"; pass `null` to hide them. */
  actions?: ReactNode;
  /** Optional slot between the description and the actions, such as a search form. */
  search?: ReactNode;
}

const defaultActions = (
  <>
    <Button asChild size="lg">
      <a href="/">Go home</a>
    </Button>
    <Button asChild size="lg" variant="outline">
      <a href="#contact">Contact support</a>
    </Button>
  </>
);

/**
 * A "page not found" section: a large error code, the page title, a short
 * description, an optional `search` slot and actions, centred.
 * `<NotFound />` renders a complete 404 example.
 *
 * Accessibility: the code ("404") is decorative and hidden from screen
 * readers with `aria-hidden`; the real heading is the `title` `<h1>`
 * ("Page not found"), so assistive tech hears a meaningful page title.
 * The default actions are links styled as buttons, reachable with Tab.
 * Nothing animates. It is a server component: no client code.
 *
 * @example
 * <NotFound
 *   code="410"
 *   title="This page is gone"
 *   description="The project was archived."
 *   actions={
 *     <Button asChild>
 *       <a href="/projects">All projects</a>
 *     </Button>
 *   }
 * />
 */
function NotFound({
  code = "404",
  title = "Page not found",
  description = "Sorry, we couldn't find the page you're looking for. It may have been moved or deleted.",
  actions = defaultActions,
  search,
  className,
  ...props
}: NotFoundProps) {
  return (
    <section data-slot="not-found" className={cn("py-16 sm:py-24", className)} {...props}>
      <div
        data-slot="not-found-container"
        className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 text-center sm:px-6"
      >
        {code != null ? (
          <p
            aria-hidden="true"
            data-slot="not-found-code"
            className="text-primary text-7xl leading-none font-bold tracking-tight sm:text-9xl"
          >
            {code}
          </p>
        ) : null}
        <h1
          data-slot="not-found-title"
          className={cn(
            "max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl",
            code != null && "mt-6"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            data-slot="not-found-description"
            className="text-muted-foreground mt-4 max-w-xl text-lg text-pretty"
          >
            {description}
          </p>
        ) : null}
        {search ? (
          <div data-slot="not-found-search" className="mt-8 w-full max-w-md">
            {search}
          </div>
        ) : null}
        {actions ? (
          <div
            data-slot="not-found-actions"
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { NotFound, type NotFoundProps };
