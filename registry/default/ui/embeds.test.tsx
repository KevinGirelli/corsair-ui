import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { Tweet } from "react-tweet/api";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSpotifyTrack } from "@/registry/default/lib/spotify-track";
import { LineChart } from "@/registry/default/ui/line-chart";
import { QRCode } from "@/registry/default/ui/qr-code";
import { SpotifyCard } from "@/registry/default/ui/spotify-card";
import { TweetCard } from "@/registry/default/ui/tweet-card";

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
