import { useEffect, useState, useSyncExternalStore } from "react";

export interface UseScrollSpyOptions {
  /**
   * The line across the viewport that decides the active section, as an
   * IntersectionObserver root margin. The default shrinks the viewport to a
   * line through its middle: the section crossing it is the active one.
   */
  rootMargin?: string;
  /** The active id on the server and before any section has been reached. */
  defaultValue?: string;
  /**
   * A scrolling element to watch the sections in, instead of the viewport,
   * for a table of contents inside a scroll box. `rootMargin` then applies
   * to it. Pass the element (from state or a callback ref), not a ref object.
   */
  root?: Element | null;
}

// Joins ids into one dependency, so an inline array does not rebuild the observer on every render.
const SEPARATOR = "\u0000";

const subscribe = () => () => {};

/**
 * The id of the section currently on screen, for a table of contents or a
 * page nav that follows the reader. One IntersectionObserver watches every
 * section, so there are no scroll listeners and no work between crossings.
 *
 * Between two sections, and above the first one, the last active id stays
 * (`defaultValue` until a section is reached). When several sections cross
 * the line at once, the one that comes first in `ids` wins. Ids missing from
 * the DOM when the hook runs are skipped; the sections should be rendered by
 * the time the effect runs (they usually are, in the same tree).
 *
 * On the server it returns `defaultValue`, so hydration has no mismatch.
 * Browsers without IntersectionObserver keep `defaultValue`, or the first id.
 *
 * @example
 * const sections = ["intro", "usage", "api"];
 * const active = useScrollSpy(sections, { defaultValue: "intro" });
 * return (
 *   <nav aria-label="On this page">
 *     {sections.map((id) => (
 *       <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}>
 *         {id}
 *       </a>
 *     ))}
 *   </nav>
 * );
 */
export function useScrollSpy(
  ids: string[],
  { rootMargin = "-50% 0px -50% 0px", defaultValue, root }: UseScrollSpyOptions = {}
): string | undefined {
  const [active, setActive] = useState<string | undefined>(defaultValue);
  // True on the server and while hydrating, so both render `defaultValue`.
  const supported = useSyncExternalStore(
    subscribe,
    () => typeof IntersectionObserver !== "undefined",
    () => true
  );
  const key = ids.join(SEPARATOR);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !key) return;
    const order = key.split(SEPARATOR);
    const idOf = new Map<Element, string>();
    for (const id of order) {
      const element = document.getElementById(id);
      if (element) idOf.set(element, id);
    }
    // Sections across the line right now, kept across callbacks: a callback
    // only reports the sections that changed.
    const intersecting = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = idOf.get(entry.target);
          if (id === undefined) continue;
          if (entry.isIntersecting) intersecting.add(id);
          else intersecting.delete(id);
        }
        const first = order.find((id) => intersecting.has(id));
        // None on the line: between sections or above the first, keep the last one.
        if (first !== undefined) setActive(first);
      },
      { root: root ?? null, rootMargin }
    );
    for (const element of idOf.keys()) observer.observe(element);
    return () => observer.disconnect();
  }, [key, rootMargin, root]);

  if (active === undefined && !supported) return ids[0];
  return active;
}
