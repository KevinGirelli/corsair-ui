import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  canShareStory,
  downloadStory,
  loadFont,
  renderStorySvg,
  setStoryWasm,
  shareStory,
  STORY_SAFE_AREA,
  STORY_SIZE,
} from "@/registry/default/lib/story-export";

const require = createRequire(import.meta.url);
const bold = readFileSync(path.join(process.cwd(), "test-utils", "fonts", "Barlow-Bold.ttf"));
const file = new File(["png"], "story.png", { type: "image/png" });

beforeAll(() => {
  setStoryWasm(readFileSync(require.resolve("satori/layout.wasm")));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sizes", () => {
  it("is a 9:16 story with room for the apps' bars", () => {
    expect(STORY_SIZE.width / STORY_SIZE.height).toBeCloseTo(9 / 16);
    expect(STORY_SAFE_AREA.top + STORY_SAFE_AREA.bottom).toBeLessThan(STORY_SIZE.height / 2);
  });
});

describe("renderStorySvg", () => {
  it("draws a story at the story size, with text as outlines", async () => {
    const svg = await renderStorySvg(
      createElement("div", { style: { display: "flex", fontSize: 80 } }, "Free today"),
      { fonts: [{ name: "Barlow", data: bold, weight: 700 }] }
    );
    expect(svg).toMatch(/^<svg width="1080" height="1920"/);
    expect(svg).toContain("<path");
    expect(svg).not.toContain("Free today");
  });

  it("takes another size", async () => {
    const svg = await renderStorySvg(createElement("div", { style: { display: "flex" } }), {
      fonts: [
        {
          name: "Barlow",
          data: bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength),
        },
      ],
      width: 720,
      height: 1280,
    });
    expect(svg).toMatch(/^<svg width="720" height="1280"/);
  });

  it("needs a font", async () => {
    await expect(renderStorySvg(createElement("div"), { fonts: [] })).rejects.toThrow(/font/);
  });
});

describe("loadFont", () => {
  it("returns the font's bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(bold))
    );
    const data = await loadFont("/fonts/Barlow-Bold.ttf");
    expect(data.byteLength).toBe(bold.byteLength);
  });

  it("says why a WOFF2 file cannot be used, and when the request failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new TextEncoder().encode("wOF2rest")))
    );
    await expect(loadFont("/fonts/x.woff2")).rejects.toThrow(/WOFF2/);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 }))
    );
    await expect(loadFont("/fonts/missing.ttf")).rejects.toThrow(/404/);
  });
});

describe("sharing", () => {
  it("is unsupported where files cannot be shared", async () => {
    vi.stubGlobal("navigator", { ...navigator, canShare: undefined, share: undefined });
    expect(canShareStory(file)).toBe(false);
    await expect(shareStory({ file })).resolves.toBe("unsupported");
  });

  it("hands only the file to the share sheet", async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal("navigator", { ...navigator, canShare: () => true, share });
    await expect(shareStory({ file, title: "Free today" })).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [file], title: "Free today" });
  });

  it("tells a cancelled share from a failed one", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      canShare: () => true,
      share: async () => {
        throw new DOMException("closed", "AbortError");
      },
    });
    await expect(shareStory({ file })).resolves.toBe("cancelled");
    vi.stubGlobal("navigator", {
      ...navigator,
      canShare: () => true,
      share: async () => {
        throw new DOMException("no", "NotAllowedError");
      },
    });
    await expect(shareStory({ file })).rejects.toThrow("no");
  });
});

describe("downloadStory", () => {
  it("clicks a temporary link with the file name and removes it", () => {
    vi.useFakeTimers();
    const created = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:story");
    const revoked = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clicks: { download: string; href: string }[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicks.push({ download: this.download, href: this.href });
    });

    downloadStory(file, "free-today.png");
    expect(clicks).toEqual([{ download: "free-today.png", href: "blob:story" }]);
    expect(document.querySelector("a[download]")).toBeNull();
    vi.runAllTimers();
    expect(revoked).toHaveBeenCalledWith("blob:story");

    created.mockRestore();
    revoked.mockRestore();
    click.mockRestore();
    vi.useRealTimers();
  });
});
