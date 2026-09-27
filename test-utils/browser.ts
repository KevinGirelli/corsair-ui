/**
 * Stand-ins for browser APIs jsdom leaves out, with handles for tests to drive
 * them. Install them in a `beforeEach`; they replace the globals for that test
 * file only.
 */
import { vi } from "vitest";

interface ObservedEntry {
  callback: IntersectionObserverCallback;
  observer: IntersectionObserver;
}

/**
 * IntersectionObserver that never fires on its own: call `intersect(element,
 * true)` to report the element entering the viewport, `false` for leaving.
 */
export function installIntersectionObserver() {
  const observed = new Map<Element, Set<ObservedEntry>>();

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin: string;
    readonly scrollMargin = "0px";
    readonly thresholds: readonly number[];
    private readonly callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
      this.callback = callback;
      this.rootMargin = options.rootMargin ?? "0px";
      const threshold = options.threshold ?? 0;
      this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
    }
    observe(element: Element) {
      if (!observed.has(element)) observed.set(element, new Set());
      observed.get(element)!.add({ callback: this.callback, observer: this });
    }
    unobserve(element: Element) {
      for (const entry of observed.get(element) ?? []) {
        if (entry.observer === this) observed.get(element)!.delete(entry);
      }
    }
    disconnect() {
      for (const entries of observed.values()) {
        for (const entry of entries) if (entry.observer === this) entries.delete(entry);
      }
    }
    takeRecords() {
      return [];
    }
  }

  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

  return {
    /** Reports `element` entering (`true`) or leaving (`false`) the viewport. */
    intersect(element: Element, isIntersecting: boolean) {
      for (const { callback, observer } of [...(observed.get(element) ?? [])]) {
        callback(
          [
            {
              target: element,
              isIntersecting,
              intersectionRatio: isIntersecting ? 1 : 0,
              time: performance.now(),
              boundingClientRect: element.getBoundingClientRect(),
              intersectionRect: element.getBoundingClientRect(),
              rootBounds: null,
            },
          ],
          observer
        );
      }
    },
    /** How many observers are watching `element` right now. */
    observers(element: Element) {
      return observed.get(element)?.size ?? 0;
    },
  };
}

/** matchMedia where the listed queries match and every other one does not. */
export function installMatchMedia(matching: string[] = []) {
  const matchMedia = vi.fn((query: string) => ({
    media: query,
    matches: matching.includes(query),
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", matchMedia);
  return matchMedia;
}

/** Runs pending animation frames, so rAF-batched DOM writes land before asserting. */
export function flushFrames() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
