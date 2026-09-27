import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarouselItem,
} from "@/registry/default/ui/carousel";
import { YouTubeEmbed, type YouTubeEmbedHandle } from "@/registry/default/ui/youtube-embed";
import { installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

let io: ReturnType<typeof installIntersectionObserver>;

beforeEach(() => {
  io = installIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const NOCOOKIE = "https://www.youtube-nocookie.com";

function iframeOf(container: HTMLElement) {
  return container.querySelector<HTMLIFrameElement>("[data-slot=youtube-embed-iframe]");
}

/** A message from the player inside `iframe`, as YouTube sends it. */
function fromPlayer(iframe: HTMLIFrameElement, data: object, origin = NOCOOKIE) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(data),
        origin,
        source: iframe.contentWindow,
      })
    );
  });
}

function loadPlayer(iframe: HTMLIFrameElement) {
  const post = vi.spyOn(iframe.contentWindow!, "postMessage");
  fireEvent.load(iframe);
  return post;
}

interface PlayerMessage {
  event: string;
  func?: string;
  args?: unknown[];
}

function sent(post: ReturnType<typeof loadPlayer>): PlayerMessage[] {
  return post.mock.calls.map(([message]) => JSON.parse(String(message)) as PlayerMessage);
}

describe("YouTubeEmbed", () => {
  it("shows a poster and a named play button, and no iframe, until pressed", () => {
    const { container } = render(<YouTubeEmbed videoId="abc123" title="Harbour tour" />);
    const root = container.querySelector("[data-slot=youtube-embed]")!;
    expect(root.getAttribute("data-state")).toBe("idle");
    expect(screen.getByRole("button", { name: "Play: Harbour tour" })).toBeTruthy();
    const poster = container.querySelector("img")!;
    expect(poster.getAttribute("src")).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    expect(poster.getAttribute("alt")).toBe("");
    expect(poster.getAttribute("loading")).toBe("lazy");
    expect(iframeOf(container)).toBeNull();
  });

  it("renders the facade on the server", () => {
    const html = renderToString(
      <YouTubeEmbed videoId="abc123" title="Harbour tour" load="eager" />
    );
    expect(html).toContain('data-state="idle"');
    expect(html).not.toContain("<iframe");
  });

  it("loads an autoplaying, privacy-enhanced player on click and moves focus into it", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <YouTubeEmbed videoId="abc123" title="Harbour tour" start={42.8} playLabel="Watch" />
    );
    await user.click(screen.getByRole("button", { name: "Watch" }));
    const iframe = iframeOf(container)!;
    const url = new URL(iframe.src);
    expect(url.origin).toBe(NOCOOKIE);
    expect(url.pathname).toBe("/embed/abc123");
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("enablejsapi")).toBe("1");
    expect(url.searchParams.get("origin")).toBe(window.location.origin);
    expect(url.searchParams.get("start")).toBe("42");
    expect(url.searchParams.has("mute")).toBe(false);
    expect(iframe.title).toBe("Harbour tour");
    expect(document.activeElement).toBe(iframe);
    expect(container.firstElementChild?.getAttribute("data-state")).toBe("loading");
  });

  it("asks the player for its state and follows it, calling back on play, pause and end", () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    const onEnd = vi.fn();
    const { container } = render(
      <YouTubeEmbed
        videoId="abc123"
        title="Harbour tour"
        onPlay={onPlay}
        onPause={onPause}
        onEnd={onEnd}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    const iframe = iframeOf(container)!;
    const post = loadPlayer(iframe);
    expect(sent(post)[0]).toMatchObject({ event: "listening" });
    const root = container.firstElementChild!;
    expect(root.getAttribute("data-state")).toBe("ready");

    fromPlayer(iframe, { event: "onStateChange", info: 1 });
    expect(root.getAttribute("data-state")).toBe("playing");
    expect(onPlay).toHaveBeenCalledTimes(1);
    fromPlayer(iframe, { event: "infoDelivery", info: { playerState: 2 } });
    expect(root.getAttribute("data-state")).toBe("paused");
    expect(onPause).toHaveBeenCalledTimes(1);
    fromPlayer(iframe, { event: "onStateChange", info: 0 });
    expect(root.getAttribute("data-state")).toBe("ended");
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("ignores messages from other frames and other origins", () => {
    const onPlay = vi.fn();
    const { container } = render(
      <YouTubeEmbed videoId="abc123" title="Harbour tour" onPlay={onPlay} />
    );
    fireEvent.click(screen.getByRole("button"));
    const iframe = iframeOf(container)!;
    loadPlayer(iframe);
    fromPlayer(iframe, { event: "onStateChange", info: 1 }, "https://evil.example");
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify({ event: "onStateChange", info: 1 }),
          origin: NOCOOKIE,
          source: window,
        })
      );
    });
    expect(onPlay).not.toHaveBeenCalled();
    expect(container.firstElementChild?.getAttribute("data-state")).toBe("ready");
  });

  it("is controlled through its ref, queueing commands until the player has loaded", () => {
    const ref = createRef<YouTubeEmbedHandle>();
    const { container } = render(<YouTubeEmbed ref={ref} videoId="abc123" title="Harbour tour" />);
    act(() => ref.current!.play());
    const iframe = iframeOf(container)!;
    expect(new URL(iframe.src).searchParams.get("autoplay")).toBe("1");
    act(() => ref.current!.seekTo(30));
    const post = loadPlayer(iframe);
    act(() => {
      ref.current!.pause();
      ref.current!.mute();
    });
    const commands = sent(post)
      .filter((message) => message.event === "command")
      .map(({ func, args }) => [func, args]);
    expect(commands).toEqual([
      ["seekTo", [30, true]],
      ["pauseVideo", []],
      ["mute", []],
    ]);
  });

  it("loads in view without playing, or muted when it autoplays", () => {
    const { container, rerender } = render(
      <YouTubeEmbed videoId="abc123" title="Harbour tour" load="in-view" />
    );
    const root = container.firstElementChild!;
    expect(iframeOf(container)).toBeNull();
    act(() => io.intersect(root, true));
    const quiet = new URL(iframeOf(container)!.src).searchParams;
    expect(quiet.has("autoplay")).toBe(false);
    expect(screen.queryByRole("button")).toBeNull();

    rerender(<YouTubeEmbed videoId="abc123" title="Harbour tour" load="in-view" autoplay />);
    const loud = new URL(iframeOf(container)!.src).searchParams;
    expect(loud.get("autoplay")).toBe("1");
    expect(loud.get("mute")).toBe("1");
  });

  it("maps loop, controls, host and extra params onto the player URL", () => {
    const { container } = render(
      <YouTubeEmbed
        videoId="abc123"
        title="Harbour tour"
        load="eager"
        loop
        controls={false}
        noCookie={false}
        params={{ rel: "0" }}
      />
    );
    const url = new URL(iframeOf(container)!.src);
    expect(url.origin).toBe("https://www.youtube.com");
    expect(url.searchParams.get("loop")).toBe("1");
    expect(url.searchParams.get("playlist")).toBe("abc123");
    expect(url.searchParams.get("controls")).toBe("0");
    expect(url.searchParams.get("rel")).toBe("0");
  });

  it("pauses the other players of its group when it starts", () => {
    const { container } = render(
      <>
        <YouTubeEmbed videoId="one" title="One" load="eager" group="talks" />
        <YouTubeEmbed videoId="two" title="Two" load="eager" group="talks" />
        <YouTubeEmbed videoId="three" title="Three" load="eager" />
      </>
    );
    const [one, two, three] = [
      ...container.querySelectorAll<HTMLIFrameElement>("[data-slot=youtube-embed-iframe]"),
    ];
    loadPlayer(one!);
    const second = loadPlayer(two!);
    const third = loadPlayer(three!);
    fromPlayer(one!, { event: "onStateChange", info: 1 });
    expect(sent(second).some((message) => message.func === "pauseVideo")).toBe(true);
    expect(sent(third).some((message) => message.func === "pauseVideo")).toBe(false);
  });
});

describe("Carousel", () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollTo = vi.fn();
    HTMLElement.prototype.scrollTo = scrollTo as unknown as HTMLElement["scrollTo"];
  });

  afterEach(() => {
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
  });

  function Gallery(props: Partial<Parameters<typeof Carousel>[0]>) {
    return (
      <Carousel aria-label="Gallery" {...props}>
        <CarouselContent>
          <CarouselItem>Bow</CarouselItem>
          <CarouselItem>Mast</CarouselItem>
          <CarouselItem>Stern</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselDots />
        <CarouselNext />
      </Carousel>
    );
  }

  const activeSlide = () =>
    document.querySelector("[data-slot=carousel-item][data-active=true]")?.textContent;

  it("is a named carousel region of labelled slides", () => {
    render(<Gallery />);
    const region = screen.getByRole("region", { name: "Gallery" });
    expect(region.getAttribute("aria-roledescription")).toBe("carousel");
    const items = document.querySelectorAll("[data-slot=carousel-item]");
    expect([...items].map((item) => item.getAttribute("aria-label"))).toEqual([
      "1 of 3",
      "2 of 3",
      "3 of 3",
    ]);
    expect(items[0]?.getAttribute("aria-roledescription")).toBe("slide");
    expect(activeSlide()).toBe("Bow");
  });

  it("labels slides on the server", () => {
    const html = renderToString(<Gallery />);
    expect(html).toContain('aria-label="2 of 3"');
  });

  it("steps with the buttons, disabled at the ends, and scrolls the viewport to the slide", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(<Gallery onIndexChange={onIndexChange} />);
    const items = document.querySelectorAll<HTMLElement>("[data-slot=carousel-item]");
    Object.defineProperty(items[1], "offsetLeft", { value: 300 });
    const previous = screen.getByRole("button", { name: "Previous slide" });
    const next = screen.getByRole("button", { name: "Next slide" });
    expect(previous).toHaveProperty("disabled", true);

    await user.click(next);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: "smooth" });
    expect(activeSlide()).toBe("Mast");
    expect(screen.getByRole("button", { name: "Go to slide 2" }).getAttribute("aria-current")).toBe(
      "true"
    );

    await user.click(next);
    expect(next).toHaveProperty("disabled", true);
    expect(previous).toHaveProperty("disabled", false);
  });

  it("wraps around when it loops", async () => {
    const user = userEvent.setup();
    render(<Gallery loop />);
    await user.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(activeSlide()).toBe("Stern");
    await user.click(screen.getByRole("button", { name: "Next slide" }));
    expect(activeSlide()).toBe("Bow");
  });

  it("moves with the arrow keys, Home and End on the focused track", async () => {
    const user = userEvent.setup();
    render(<Gallery />);
    const track = document.querySelector<HTMLElement>("[data-slot=carousel-content]")!;
    await user.tab();
    expect(document.activeElement).toBe(track);
    await user.keyboard("{ArrowRight}");
    expect(activeSlide()).toBe("Mast");
    await user.keyboard("{End}");
    expect(activeSlide()).toBe("Stern");
    await user.keyboard("{ArrowRight}");
    expect(activeSlide()).toBe("Stern");
    await user.keyboard("{Home}");
    expect(activeSlide()).toBe("Bow");
  });

  it("goes to a slide from its dot", async () => {
    const user = userEvent.setup();
    render(<Gallery />);
    expect(screen.getByRole("group", { name: "Choose a slide" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Go to slide 3" }));
    expect(activeSlide()).toBe("Stern");
  });

  it("makes the slide most in view the active one", () => {
    const onIndexChange = vi.fn();
    render(<Gallery onIndexChange={onIndexChange} />);
    const items = document.querySelectorAll("[data-slot=carousel-item]");
    act(() => io.intersect(items[2]!, true));
    expect(activeSlide()).toBe("Stern");
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it("jumps instead of gliding with reduced motion", async () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    const user = userEvent.setup();
    render(<Gallery />);
    await user.click(screen.getByRole("button", { name: "Next slide" }));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "instant" }));
  });

  it("follows a controlled index and starts on the default one", () => {
    const { rerender } = render(<Gallery index={0} />);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<Gallery index={2} />);
    expect(activeSlide()).toBe("Stern");
    expect(scrollTo).toHaveBeenCalledTimes(1);

    scrollTo.mockClear();
    const { unmount } = render(<Gallery defaultIndex={1} aria-label="Second" />);
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "instant" }));
    unmount();
  });

  it("tells each slide whether it is active", async () => {
    function Slide({ name }: { name: string }) {
      const { index, active } = useCarouselItem();
      return <span>{`${name} ${index} ${active ? "on" : "off"}`}</span>;
    }
    const user = userEvent.setup();
    render(
      <Carousel variant="coverflow">
        <CarouselContent>
          <CarouselItem>
            <Slide name="Bow" />
          </CarouselItem>
          <CarouselItem>
            <Slide name="Mast" />
          </CarouselItem>
        </CarouselContent>
        <CarouselNext />
      </Carousel>
    );
    expect(screen.getByText("Bow 0 on")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByText("Mast 1 on")).toBeTruthy();
    expect(screen.getByText("Bow 0 off")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Carousel" }).dataset.align).toBe("center");
  });
});
