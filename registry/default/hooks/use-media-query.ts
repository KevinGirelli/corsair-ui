import { useCallback, useSyncExternalStore } from "react";

export interface UseMediaQueryOptions {
  /**
   * What to render before the browser can answer: on the server and during
   * hydration. Pick the value that matches your most common viewport to avoid
   * a visible swap after hydration.
   */
  defaultValue?: boolean;
}

/**
 * Tracks whether a CSS media query currently matches.
 *
 * Built on `useSyncExternalStore`, so hydration uses `defaultValue` and then
 * re-renders with the real match, instead of starting at `false` and flashing
 * the wrong layout the way a `useState` + `useEffect` version does.
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 768px)");
 * const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
 */
export function useMediaQuery(query: string, { defaultValue = false }: UseMediaQueryOptions = {}) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => defaultValue;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
