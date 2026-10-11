import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StoryLib from "@/registry/default/lib/story-export";
import { StoryFrame, useStoryFonts } from "@/registry/default/ui/story-frame";

// Satori and the canvas are tested in lib/story-export and in the browser; here the
// image is a stand-in, so the frame's own behaviour can be checked.
const render$ = vi.hoisted(() => ({
  svg: vi.fn(async (story: unknown) => `<svg>${JSON.stringify(story)}</svg>`),
  png: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
  download: vi.fn(),
}));

vi.mock("@/registry/default/lib/story-export", async (importOriginal) => {
  const actual = await importOriginal<typeof StoryLib>();
  return {
    ...actual,
    renderStorySvg: render$.svg,
    svgToPng: render$.png,
    downloadStory: render$.download,
  };
});

const fonts = [{ name: "Barlow", data: new ArrayBuffer(8) }];
let urls = 0;

beforeEach(() => {
  urls = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:story-${++urls}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  render$.svg.mockClear();
  render$.png.mockClear();
  render$.download.mockClear();
});

function stubNavigator({
  share,
  writeText,
}: {
  share?: () => Promise<void>;
  writeText?: () => Promise<void>;
}) {
  vi.stubGlobal("navigator", {
    ...navigator,
    canShare: share ? () => true : undefined,
    share: share ? vi.fn(share) : undefined,
    clipboard: { writeText: vi.fn(writeText ?? (async () => {})) },
  });
  return navigator as unknown as {
    share: ReturnType<typeof vi.fn>;
    clipboard: { writeText: ReturnType<typeof vi.fn> };
  };
}

const story = <div style={{ display: "flex" }}>Free today</div>;

describe("StoryFrame", () => {
  it("waits for the fonts, then shows the exported image with its text alternative", async () => {
    const { rerender, container } = render(
      <StoryFrame story={story} fonts={null} alt="Free today: 18h, 20h" />
    );
    expect(container.firstElementChild?.getAttribute("data-state")).toBe("rendering");
    expect(screen.queryByRole("img")).toBeNull();
    expect(render$.svg).not.toHaveBeenCalled();

    rerender(<StoryFrame story={story} fonts={fonts} alt="Free today: 18h, 20h" />);
    const image = await screen.findByRole("img", { name: "Free today: 18h, 20h" });
    expect(image.getAttribute("src")).toBe("blob:story-1");
    expect(container.firstElementChild?.getAttribute("data-state")).toBe("ready");
    expect(screen.getByRole("status").textContent).toBe("Story ready");
  });

  it("draws again when the story changes, but not when it renders the same", async () => {
    const { rerender } = render(<StoryFrame story={story} fonts={fonts} alt="a" />);
    await screen.findByRole("img");
    rerender(
      <StoryFrame story={<div style={{ display: "flex" }}>Free today</div>} fonts={fonts} alt="a" />
    );
    await waitFor(() => expect(render$.svg).toHaveBeenCalledTimes(2));
    expect(render$.png).toHaveBeenCalledTimes(1);

    rerender(
      <StoryFrame
        story={<div style={{ display: "flex" }}>Free tomorrow</div>}
        fonts={fonts}
        alt="b"
      />
    );
    await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toBe("blob:story-2"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:story-1");
  });

  it("shares the PNG and puts the link on the clipboard in the same tap", async () => {
    const nav = stubNavigator({ share: async () => {} });
    const onShare = vi.fn();
    render(
      <StoryFrame
        story={story}
        fonts={fonts}
        alt="a"
        link="https://example.com/book"
        fileName="today.png"
        onShare={onShare}
      />
    );
    await screen.findByRole("img");
    expect(screen.getByText(/add a link sticker/)).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Share" })));
    expect(nav.clipboard.writeText).toHaveBeenCalledWith("https://example.com/book");
    const shared = nav.share.mock.calls[0]![0] as { files: File[] };
    expect(shared.files[0]!.name).toBe("today.png");
    expect(shared.files[0]!.type).toBe("image/png");
    expect(onShare).toHaveBeenCalledWith("shared");
    expect(screen.getByRole("status").textContent).toBe("Story shared");
  });

  it("offers a download where files cannot be shared", async () => {
    stubNavigator({});
    const onShare = vi.fn();
    render(
      <StoryFrame story={story} fonts={fonts} alt="a" fileName="today.png" onShare={onShare} />
    );
    await screen.findByRole("img");
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(render$.download).toHaveBeenCalledWith(expect.any(Blob), "today.png");
    expect(onShare).toHaveBeenCalledWith("downloaded");
  });

  it("copies the link on its own and says so", async () => {
    const nav = stubNavigator({});
    render(<StoryFrame story={story} fonts={fonts} alt="a" link="https://example.com/book" />);
    await screen.findByRole("img");
    const copy = screen.getByRole("button", { name: "Copy link" });
    await act(async () => fireEvent.click(copy));
    expect(nav.clipboard.writeText).toHaveBeenCalledWith("https://example.com/book");
    expect(copy.getAttribute("data-state")).toBe("copied");
    expect(screen.getByRole("status").textContent).toBe("Link copied");
  });

  it("shows the safe area bands on demand, hidden from screen readers", async () => {
    const { container } = render(<StoryFrame story={story} fonts={fonts} alt="a" />);
    await screen.findByRole("img");
    const toggle = screen.getByRole("button", { name: "Safe area" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    const bands = container.querySelector("[data-slot=story-frame-safe-area]");
    expect(bands?.getAttribute("aria-hidden")).toBe("true");
  });

  it("reports a failed render and shows it", async () => {
    render$.svg.mockRejectedValueOnce(new Error("no layout engine"));
    const onError = vi.fn();
    const { container } = render(
      <StoryFrame story={story} fonts={fonts} alt="a" onError={onError} />
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not be drawn/);
    expect(container.firstElementChild?.getAttribute("data-state")).toBe("error");
    // Reported from an effect after the alert renders, so it can land a tick later.
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "no layout engine" }))
    );
  });

  it("takes labels in another language", async () => {
    stubNavigator({ share: async () => {} });
    render(
      <StoryFrame
        story={story}
        fonts={fonts}
        alt="a"
        link="https://example.com"
        labels={{
          share: "Compartilhar",
          download: "Baixar",
          copyLink: "Copiar link",
          safeArea: "Zona segura",
        }}
      />
    );
    await screen.findByRole("img");
    for (const name of ["Compartilhar", "Baixar", "Copiar link", "Zona segura"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });
});

describe("useStoryFonts", () => {
  function Fonts({ sources }: { sources: Parameters<typeof useStoryFonts>[0] }) {
    const { fonts: loaded, error } = useStoryFonts(sources);
    return (
      <p>
        {error
          ? `error: ${error.message}`
          : loaded
            ? loaded.map((font) => `${font.name} ${font.weight}`).join(", ")
            : "loading"}
      </p>
    );
  }

  it("loads every font once, however often the list is recreated", async () => {
    const fetch = vi.fn(async () => new Response(new Uint8Array([0, 1, 0, 0, 9])));
    vi.stubGlobal("fetch", fetch);
    const { rerender } = render(
      <Fonts
        sources={[
          { name: "Barlow", url: "/regular.ttf", weight: 400 },
          { name: "Barlow", url: "/bold.ttf", weight: 700 },
        ]}
      />
    );
    expect(screen.getByText("loading")).toBeTruthy();
    expect(await screen.findByText("Barlow 400, Barlow 700")).toBeTruthy();
    rerender(
      <Fonts
        sources={[
          { name: "Barlow", url: "/regular.ttf", weight: 400 },
          { name: "Barlow", url: "/bold.ttf", weight: 700 },
        ]}
      />
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reports a font that failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 }))
    );
    render(<Fonts sources={[{ name: "Barlow", url: "/missing.ttf" }]} />);
    expect(await screen.findByText(/error: .*404/)).toBeTruthy();
  });
});
