import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { Tweet } from "react-tweet/api";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSpotifyTrack } from "@/registry/default/lib/spotify-track";
import { LineChart } from "@/registry/default/ui/line-chart";
import { QRCode } from "@/registry/default/ui/qr-code";
import { SpotifyCard } from "@/registry/default/ui/spotify-card";
import { TweetCard } from "@/registry/default/ui/tweet-card";
import { installIntersectionObserver, installMatchMedia } from "@/test-utils/browser";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LineChart", () => {
  const data = [12, 18, 15, 24];
  const labels = ["Mon", "Tue", "Wed", "Thu"];

  it("is a slider over the points, starting at the last one", () => {
    render(<LineChart name="Knots" data={data} labels={labels} />);
    const slider = screen.getByRole("slider", { name: "Knots" });
    expect(slider.getAttribute("aria-valuemax")).toBe("4");
    expect(slider.getAttribute("aria-valuenow")).toBe("4");
    expect(slider.getAttribute("aria-valuetext")).toBe("Thu: 24");
  });

  it("moves with the arrow keys, Home and End", () => {
    const onIndexChange = vi.fn();
    render(<LineChart name="Knots" data={data} labels={labels} onIndexChange={onIndexChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Wed: 15");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Mon: 12");
    fireEvent.keyDown(slider, { key: "End" });
    expect(onIndexChange).toHaveBeenLastCalledWith(3);
  });

  it("snaps the cursor to the point nearest the pointer", () => {
    render(<LineChart name="Knots" data={data} labels={labels} />);
    const slider = screen.getByRole("slider");
    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 100));
    fireEvent.pointerMove(slider, { clientX: 110 });
    expect(slider.getAttribute("aria-valuenow")).toBe("2");
  });

  it("formats numbers the same way on the server and in the browser", () => {
    const html = renderToString(
      <LineChart data={[1200, 3400]} numberFormat={{ style: "currency", currency: "USD" }} />
    );
    expect(html).toContain("$3,400.00");
  });

  it("labels the axis at an even step that ends on the latest point", () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const year = [...months, "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const axis = () =>
      [...document.querySelectorAll("[data-slot=line-chart-axis] span")].map(
        (label) => label.textContent
      );
    const { rerender } = render(<LineChart data={year.map((_, index) => index)} labels={year} />);
    expect(axis()).toEqual(["Feb", "Apr", "Jun", "Aug", "Oct", "Dec"]);
    rerender(<LineChart data={year.map((_, index) => index)} labels={year} tickCount={4} />);
    expect(axis()).toEqual(["Mar", "Jun", "Sep", "Dec"]);
    rerender(<LineChart data={[1, 2, 3, 4, 5, 6]} labels={months} />);
    expect(axis()).toEqual(months);
  });
});

describe("QRCode", () => {
  it("renders on the server as a named image with dot modules", () => {
    const html = renderToString(<QRCode value="https://github.com/KevinGirelli/corsair-ui" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="QR code: https://github.com/KevinGirelli/corsair-ui"');
    expect(html).toContain("<circle");
  });

  it("draws square modules in square mode and gives up on data that cannot fit", () => {
    const { container, rerender } = render(<QRCode value="corsair" variant="squares" />);
    expect(container.querySelector("circle")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("shape-rendering")).toBe("crispEdges");
    rerender(<QRCode value={"x".repeat(5000)} errorCorrection="H" />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("draws no mask by default", () => {
    const html = renderToString(<QRCode value="corsair" />);
    expect(html).not.toContain("<mask");
    expect(html).not.toContain("animate-qr-code-reveal");
  });

  it("masks only the modules with a growing circle when reveal is set", () => {
    const { container } = render(
      <>
        <QRCode value="corsair" reveal="load" revealDuration={1200} />
        <QRCode value="corsair" reveal="load" />
      </>
    );
    const [first, second] = [...container.querySelectorAll("svg")];
    const mask = first!.querySelector("mask")!;
    const id = mask.getAttribute("id")!;
    expect(id).toMatch(/^[\w-]+$/);
    expect(second!.querySelector("mask")!.getAttribute("id")).not.toBe(id);
    expect(first!.querySelector(`[mask="url(#${id})"]`)?.querySelector("path")).not.toBeNull();
    // The background rect sits outside the mask, so the quiet zone always shows.
    expect(first!.firstElementChild?.tagName.toLowerCase()).toBe("rect");
    expect(first!.firstElementChild?.closest("[mask]")).toBeNull();
    const shape = mask.querySelector<SVGCircleElement>("[data-slot=qr-code-reveal-shape]")!;
    expect(shape.getAttribute("class")).toContain("motion-safe:animate-qr-code-reveal");
    expect(shape.style.animationDuration).toBe("1200ms");
    expect(shape.style.animationPlayState).toBe("");
  });

  it("keeps the full mask in server HTML for in-view, then arms and plays it", async () => {
    const io = installIntersectionObserver();
    const html = renderToString(<QRCode value="corsair" reveal="in-view" />);
    expect(html).toContain("<mask");
    expect(html).not.toContain("animate-qr-code-reveal");
    expect(html).not.toContain("paused");

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    await act(async () => {
      hydrateRoot(container, <QRCode value="corsair" reveal="in-view" />);
    });
    const group = container.querySelector("[data-slot=qr-code-reveal]")!;
    const shape = container.querySelector<SVGCircleElement>("[data-slot=qr-code-reveal-shape]")!;
    expect(group.getAttribute("data-state")).toBe("static");
    act(() => io.intersect(group, false));
    expect(group.getAttribute("data-state")).toBe("armed");
    expect(shape.style.animationPlayState).toBe("paused");
    act(() => io.intersect(group, true));
    expect(group.getAttribute("data-state")).toBe("play");
    expect(shape.style.animationPlayState).toBe("");
    container.remove();
  });

  it("leaves reduced motion to motion-safe, so the code shows complete", () => {
    installMatchMedia(["(prefers-reduced-motion: reduce)"]);
    const { container } = render(<QRCode value="corsair" reveal="load" />);
    const shape = container.querySelector("[data-slot=qr-code-reveal-shape]")!;
    expect(shape.getAttribute("class")).not.toMatch(/(^|\s)animate-qr-code-reveal/);
    expect(shape.getAttribute("class")).toContain("motion-safe:animate-qr-code-reveal");
    expect(Number(shape.getAttribute("r"))).toBeGreaterThanOrEqual(
      Number(shape.getAttribute("cx")) * Math.SQRT2 - 1e-9
    );
  });
});

function makeTweet(text: string, extra: Partial<Tweet> = {}): Tweet {
  return {
    __typename: "Tweet",
    lang: "en",
    created_at: "2026-09-01T12:30:00.000Z",
    display_text_range: [0, Array.from(text).length],
    entities: { hashtags: [], urls: [], user_mentions: [], symbols: [] },
    id_str: "1",
    text,
    user: {
      id_str: "7",
      name: "Anne Bonny",
      profile_image_url_https: "https://pbs.twimg.com/profile_images/anne.jpg",
      profile_image_shape: "Circle",
      screen_name: "anne",
      verified: false,
      is_blue_verified: true,
    },
    edit_control: {
      edit_tweet_ids: ["1"],
      editable_until_msecs: "0",
      is_edit_eligible: false,
      edits_remaining: "0",
    },
    isEdited: false,
    isStaleEdit: false,
    favorite_count: 1530,
    conversation_count: 3,
    news_action_type: "conversation",
    ...extra,
  } as Tweet;
}

describe("TweetCard", () => {
  it("renders the post in the theme, with links for entities", () => {
    const text = "Fair winds &amp; seas #sail";
    render(
      <TweetCard
        tweet={makeTweet(text, {
          entities: {
            hashtags: [{ indices: [22, 27], text: "sail" }],
            urls: [],
            user_mentions: [],
            symbols: [],
          },
        })}
      />
    );
    const post = screen.getByRole("article", { name: "Post by Anne Bonny" });
    expect(post.textContent).toContain("Fair winds & seas");
    expect(screen.getByRole("link", { name: "#sail" }).getAttribute("href")).toContain(
      "hashtag/sail"
    );
    expect(screen.getByLabelText("Verified")).toBeTruthy();
    expect(post.querySelector("time")?.textContent).toBe("Sep 1, 2026, 12:30 PM");
    expect(post.textContent).toContain("1.5K");
  });

  it("decodes the text as text, never as markup", () => {
    const { container } = render(
      <TweetCard tweet={makeTweet("&lt;img src=x onerror=alert(1)&gt; ahoy")} />
    );
    expect(container.querySelector("img[src=x]")).toBeNull();
    expect(container.textContent).toContain("<img src=x onerror=alert(1)> ahoy");
  });
});

describe("SpotifyCard", () => {
  const track = {
    title: "Sea Shanty",
    artist: "The Crew",
    image: "https://i.scdn.co/image/cover",
    link: "https://open.spotify.com/track/abc",
    audio: "https://p.scdn.co/mp3-preview/abc",
  };

  class FakeAudio extends EventTarget {
    paused = true;
    volume = 1;
    currentTime = 0;
    duration = 30;
    src: string;
    constructor(src: string) {
      super();
      this.src = src;
    }
    play() {
      this.paused = false;
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    }
    pause() {
      if (this.paused) return;
      this.paused = true;
      this.dispatchEvent(new Event("pause"));
    }
  }

  it("plays the preview from the cover, one card at a time", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    render(
      <>
        <SpotifyCard track={track} />
        <SpotifyCard track={{ ...track, title: "Second Shanty" }} />
      </>
    );
    const first = screen.getByRole("button", { name: "Play preview of Sea Shanty" });
    const second = screen.getByRole("button", { name: "Play preview of Second Shanty" });
    fireEvent.click(first);
    await waitFor(() => expect(first.getAttribute("aria-pressed")).toBe("true"));
    fireEvent.click(second);
    await waitFor(() => expect(second.getAttribute("aria-pressed")).toBe("true"));
    expect(first.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getAllByRole("link", { name: "Open in Spotify" })[0]?.getAttribute("href")).toBe(
      track.link
    );
  });

  it("shows the cover without a button when there is no preview", () => {
    render(<SpotifyCard track={{ ...track, audio: undefined }} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("article", { name: "Sea Shanty by The Crew" })).toBeTruthy();
  });
});

describe("getSpotifyTrack", () => {
  it("refuses links that are not on open.spotify.com, before fetching anything", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(getSpotifyTrack("https://example.com/track/abc")).rejects.toThrow(
      "Not an open.spotify.com link"
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
