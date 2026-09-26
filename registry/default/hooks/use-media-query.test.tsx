import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "@/registry/default/hooks/use-media-query";

/**
 * jsdom ships without matchMedia. This stand-in keeps one shared state per
 * query so a test can flip a match and every subscriber hears about it.
 */
function installMatchMedia() {
  const matches = new Map<string, boolean>();
  const listeners = new Map<string, Set<() => void>>();

  const matchMedia = vi.fn((query: string) => ({
    media: query,
    get matches() {
      return matches.get(query) ?? false;
    },
    onchange: null,
    addEventListener: (_type: "change", listener: () => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)?.add(listener);
    },
    removeEventListener: (_type: "change", listener: () => void) => {
      listeners.get(query)?.delete(listener);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });

  return {
    matchMedia,
    setMatches(query: string, value: boolean) {
      matches.set(query, value);
      listeners.get(query)?.forEach((listener) => listener());
    },
    listenerCount(query: string) {
      return listeners.get(query)?.size ?? 0;
    },
  };
}

const DESKTOP = "(min-width: 768px)";
const WIDE = "(min-width: 1280px)";

describe("useMediaQuery", () => {
  let media: ReturnType<typeof installMatchMedia>;

  beforeEach(() => {
    media = installMatchMedia();
  });

  it("returns the current match on the client", () => {
    media.setMatches(DESKTOP, true);
    const { result } = renderHook(() => useMediaQuery(DESKTOP));
    expect(result.current).toBe(true);
  });

  it("updates when the media query starts or stops matching", () => {
    const { result } = renderHook(() => useMediaQuery(DESKTOP));
    expect(result.current).toBe(false);

    act(() => media.setMatches(DESKTOP, true));
    expect(result.current).toBe(true);

    act(() => media.setMatches(DESKTOP, false));
    expect(result.current).toBe(false);
  });

  it("moves its subscription when the query changes", () => {
    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: DESKTOP },
    });
    expect(media.listenerCount(DESKTOP)).toBe(1);

    media.setMatches(WIDE, true);
    rerender({ query: WIDE });

    expect(result.current).toBe(true);
    expect(media.listenerCount(DESKTOP)).toBe(0);
    expect(media.listenerCount(WIDE)).toBe(1);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useMediaQuery(DESKTOP));
    unmount();
    expect(media.listenerCount(DESKTOP)).toBe(0);
  });

  it("renders defaultValue on the server without touching matchMedia", () => {
    function Probe() {
      return <span>{String(useMediaQuery(DESKTOP, { defaultValue: true }))}</span>;
    }

    expect(renderToString(<Probe />)).toBe("<span>true</span>");
    expect(media.matchMedia).not.toHaveBeenCalled();
  });
});
