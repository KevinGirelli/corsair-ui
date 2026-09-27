"use client";

import Lenis, { type LenisOptions } from "lenis";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useMediaQuery } from "@/registry/default/hooks/use-media-query";

type ScrollTarget = number | string | HTMLElement;

interface SmoothScrollToOptions {
  /** Added to the target position, in px: negative stops short, e.g. under a sticky header. */
  offset?: number;
  /** Jump there without animating. */
  immediate?: boolean;
}

interface SmoothScrollValue {
  /** The Lenis instance, or `null` when scrolling is native (reduced motion, no provider). */
  lenis: Lenis | null;
  /** Scrolls the page to a position, a selector or an element, with or without Lenis. */
  scrollTo: (target: ScrollTarget, options?: SmoothScrollToOptions) => void;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

const EDGES: Record<string, "top" | "bottom"> = {
  top: "top",
  start: "top",
  left: "top",
  bottom: "bottom",
  end: "bottom",
  right: "bottom",
};

/** The same targets as Lenis, with the browser's own scrolling. */
function nativeScrollTo(target: ScrollTarget, { offset = 0, immediate = false } = {}) {
  const behavior: ScrollBehavior = immediate
    ? "instant"
    : prefersReducedMotion()
      ? "auto"
      : "smooth";
  if (typeof target === "number") {
    window.scrollTo({ top: target + offset, behavior });
    return;
  }
  const edge = typeof target === "string" ? EDGES[target] : undefined;
  if (edge) {
    const top = edge === "top" ? 0 : document.documentElement.scrollHeight;
    window.scrollTo({ top: top + offset, behavior });
    return;
  }
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) return;
  if (offset === 0) {
    // Also scrolls any scrolling container the element sits in.
    element.scrollIntoView({ behavior, block: "start" });
    return;
  }
  const top = element.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior });
}

const SmoothScrollContext = createContext<SmoothScrollValue>({
  lenis: null,
  scrollTo: nativeScrollTo,
});

/** Holds the Lenis instance outside React, so the effect that makes it can hand it over. */
function createLenisStore() {
  let current: Lenis | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(next: Lenis | null) {
      current = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const getServerLenis = () => null;

interface SmoothScrollProps {
  /**
   * Lenis options, over the defaults `{ autoRaf: true, anchors: true }`.
   * They are read when Lenis starts; change the provider's `key` to apply new ones.
   */
  options?: LenisOptions;
  children?: ReactNode;
}

/**
 * Smooths wheel and trackpad scrolling of the page with Lenis, while the
 * page keeps scrolling natively underneath: position: sticky, scroll-driven
 * animations, IntersectionObserver, keyboard scrolling and find-in-page all
 * behave as usual, and in-page anchor links glide to their target. With
 * `prefers-reduced-motion` Lenis is not started at all.
 *
 * Nested scrolling areas (popovers, selects, dialogs with long content)
 * need `data-lenis-prevent` so they scroll themselves instead of the page.
 * `useSmoothScroll()` scrolls from code, with Lenis when it runs and the
 * browser otherwise.
 *
 * @example
 * <SmoothScroll options={{ lerp: 0.1 }}>
 *   <main>…</main>
 * </SmoothScroll>
 */
function SmoothScroll({ options, children }: SmoothScrollProps) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [store] = useState(createLenisStore);
  const lenis = useSyncExternalStore(store.subscribe, store.get, getServerLenis);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (reduced) return;
    const instance = new Lenis({ autoRaf: true, anchors: true, ...optionsRef.current });
    store.set(instance);
    return () => {
      store.set(null);
      instance.destroy();
    };
  }, [reduced, store]);

  const value = useMemo<SmoothScrollValue>(
    () => ({
      lenis,
      scrollTo: (target, scrollOptions = {}) => {
        if (lenis) lenis.scrollTo(target, scrollOptions);
        else nativeScrollTo(target, scrollOptions);
      },
    }),
    [lenis]
  );

  return <SmoothScrollContext.Provider value={value}>{children}</SmoothScrollContext.Provider>;
}

/**
 * The Lenis instance and a `scrollTo` that works with or without it.
 * Outside a `SmoothScroll` it scrolls natively.
 *
 * @example
 * const { scrollTo } = useSmoothScroll();
 * <Button onClick={() => scrollTo("#pricing", { offset: -64 })}>See pricing</Button>
 */
function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export {
  SmoothScroll,
  useSmoothScroll,
  type SmoothScrollProps,
  type SmoothScrollToOptions,
  type SmoothScrollValue,
};
