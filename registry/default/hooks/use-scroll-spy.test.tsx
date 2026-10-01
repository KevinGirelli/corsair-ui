import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollSpy, type UseScrollSpyOptions } from "@/registry/default/hooks/use-scroll-spy";
import { installIntersectionObserver } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Page({
  ids,
  sections = ids,
  options,
}: {
  ids: string[];
  sections?: string[];
  options?: UseScrollSpyOptions;
}) {
  const active = useScrollSpy(ids, options);
  return (
    <>
      <output data-testid="active">{active ?? "none"}</output>
      {sections.map((id) => (
        <section key={id} id={id}>
          {id}
        </section>
      ))}
    </>
  );
}

const section = (id: string) => document.getElementById(id)!;
const active = () => screen.getByTestId("active").textContent;

describe("useScrollSpy", () => {
  it("follows the section crossing the line", () => {
    render(<Page ids={["intro", "usage", "api"]} />);
    expect(active()).toBe("none");
    act(() => io.intersect(section("intro"), true));
    expect(active()).toBe("intro");
    act(() => {
      io.intersect(section("intro"), false);
      io.intersect(section("usage"), true);
    });
    expect(active()).toBe("usage");
  });

  it("keeps the last active section when none crosses the line", () => {
    render(<Page ids={["intro", "usage"]} options={{ defaultValue: "intro" }} />);
    expect(active()).toBe("intro");
    act(() => io.intersect(section("usage"), true));
    act(() => io.intersect(section("usage"), false));
    expect(active()).toBe("usage");
  });

  it("prefers the first id in order among the sections on the line", () => {
    render(<Page ids={["intro", "usage", "api"]} />);
    act(() => io.intersect(section("api"), true));
    expect(active()).toBe("api");
    act(() => io.intersect(section("usage"), true));
    expect(active()).toBe("usage");
    act(() => io.intersect(section("usage"), false));
    expect(active()).toBe("api");
  });

  it("observes every section with one observer and skips ids not in the DOM", () => {
    render(<Page ids={["intro", "missing", "usage"]} sections={["intro", "usage"]} />);
    expect(io.observers(section("intro"))).toBe(1);
    expect(io.observers(section("usage"))).toBe(1);
  });

  it("keeps the observer for an equal inline list and rebuilds it for new ids", () => {
    const Observer = globalThis.IntersectionObserver;
    const created = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class extends Observer {
        constructor(...args: ConstructorParameters<typeof IntersectionObserver>) {
          super(...args);
          created();
        }
      }
    );
    const all = ["intro", "usage", "api"];
    const { rerender } = render(<Page ids={["intro", "usage"]} sections={all} />);
    rerender(<Page ids={["intro", "usage"]} sections={all} />);
    expect(created).toHaveBeenCalledTimes(1);

    rerender(<Page ids={["api"]} sections={all} />);
    expect(created).toHaveBeenCalledTimes(2);
    expect(io.observers(section("intro"))).toBe(0);
    expect(io.observers(section("usage"))).toBe(0);
    expect(io.observers(section("api"))).toBe(1);
  });

  it("disconnects on unmount", () => {
    const { unmount } = render(<Page ids={["intro"]} />);
    const intro = section("intro");
    expect(io.observers(intro)).toBe(1);
    unmount();
    expect(io.observers(intro)).toBe(0);
  });

  it("renders defaultValue on the server", () => {
    const html = renderToString(
      <Page ids={["intro", "usage"]} options={{ defaultValue: "usage" }} />
    );
    expect(html).toContain(">usage</output>");
  });

  it("falls back to defaultValue, or the first id, without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { unmount } = render(
      <Page ids={["intro", "usage"]} options={{ defaultValue: "usage" }} />
    );
    expect(active()).toBe("usage");
    unmount();
    render(<Page ids={["intro", "usage"]} />);
    expect(active()).toBe("intro");
  });
});

describe("useScrollSpy root", () => {
  it("watches the sections inside the given scroll box", () => {
    const Observer = globalThis.IntersectionObserver;
    const options: (IntersectionObserverInit | undefined)[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class extends Observer {
        constructor(callback: IntersectionObserverCallback, init?: IntersectionObserverInit) {
          super(callback, init);
          options.push(init);
        }
      }
    );
    const box = document.createElement("div");
    render(<Page ids={["a", "b"]} options={{ root: box, rootMargin: "0px" }} />);
    expect(options.at(-1)?.root).toBe(box);
    act(() => io.intersect(section("b"), true));
    expect(active()).toBe("b");
  });
});
