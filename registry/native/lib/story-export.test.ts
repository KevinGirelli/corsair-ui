import { renderHook } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { createElement, type ReactNode } from "react";
import { PixelRatio, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";

import {
  captureStory,
  copyStoryLink,
  fullStorySize,
  shareStory,
  STORY_SAFE_AREA,
  STORY_SIZE,
  StoryScale,
  useStoryUnit,
} from "@/registry/native/lib/story-export";

const os = Platform.OS;
const capture = jest.mocked(captureRef);
const sharing = jest.mocked(Sharing);
const clipboard = jest.mocked(Clipboard);

let ratio: jest.SpyInstance;

beforeEach(() => {
  ratio = jest.spyOn(PixelRatio, "get").mockReturnValue(3);
});

afterEach(() => {
  Platform.OS = os;
  // Only the spy: restoring every mock would drop the module stand-ins' implementations.
  ratio.mockRestore();
  jest.clearAllMocks();
});

describe("sizes", () => {
  it("matches the web item: 1080 × 1920 with the same safe area", () => {
    expect(STORY_SIZE).toEqual({ width: 1080, height: 1920 });
    expect(STORY_SAFE_AREA).toEqual({ top: 250, bottom: 340, side: 64 });
  });

  it("lays the story out at its full pixel size on the screen's density", () => {
    expect(fullStorySize()).toEqual({ width: 360, height: 640 });
  });

  it("converts story px to dp, at full size outside a frame and at the frame's scale inside", async () => {
    const outside = await renderHook(() => useStoryUnit());
    expect(outside.result.current(1080)).toBe(360);

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StoryScale, { scale: 0.25 }, children);
    const inside = await renderHook(() => useStoryUnit(), { wrapper });
    expect(inside.result.current(1080)).toBe(270);
  });
});

describe("captureStory", () => {
  it("sizes the capture in points on iOS and returns a file URI", async () => {
    Platform.OS = "ios";
    const view = { current: null };
    await expect(captureStory(view)).resolves.toBe("file:///tmp/ReactNative/story.png");
    expect(capture).toHaveBeenCalledWith(view, {
      format: "png",
      quality: 1,
      width: 360,
      height: 640,
      result: "tmpfile",
    });
  });

  it("sizes the capture in pixels on Android", async () => {
    Platform.OS = "android";
    capture.mockResolvedValueOnce("file:///data/cache/story.jpg");
    await expect(captureStory({ current: null }, { format: "jpg", quality: 0.9 })).resolves.toBe(
      "file:///data/cache/story.jpg"
    );
    expect(capture).toHaveBeenCalledWith(expect.anything(), {
      format: "jpg",
      quality: 0.9,
      width: 1080,
      height: 1920,
      result: "tmpfile",
    });
  });

  it("returns a data URI on the web", async () => {
    Platform.OS = "web";
    capture.mockResolvedValueOnce("data:image/png;base64,AAAA");
    await expect(captureStory({ current: null })).resolves.toBe("data:image/png;base64,AAAA");
    expect(capture.mock.calls[0]?.[1]).toMatchObject({ result: "data-uri", width: 1080 });
  });
});

describe("shareStory", () => {
  it("copies the link, then opens the share sheet with the PNG", async () => {
    Platform.OS = "ios";
    await expect(
      shareStory({ uri: "file:///story.png", link: "https://example.com", dialogTitle: "Share" })
    ).resolves.toBe("shared");
    expect(clipboard.setStringAsync).toHaveBeenCalledWith("https://example.com");
    expect(sharing.shareAsync).toHaveBeenCalledWith("file:///story.png", {
      mimeType: "image/png",
      UTI: "public.png",
      dialogTitle: "Share",
    });
    expect(clipboard.setStringAsync.mock.invocationCallOrder[0]).toBeLessThan(
      sharing.shareAsync.mock.invocationCallOrder[0] ?? 0
    );
  });

  it("shares a JPEG with its type and no link", async () => {
    await shareStory({ uri: "file:///story.jpg", mimeType: "image/jpeg" });
    expect(clipboard.setStringAsync).not.toHaveBeenCalled();
    expect(sharing.shareAsync).toHaveBeenCalledWith("file:///story.jpg", {
      mimeType: "image/jpeg",
      UTI: "public.jpeg",
      dialogTitle: undefined,
    });
  });

  it("still shares when the clipboard refuses", async () => {
    clipboard.setStringAsync.mockRejectedValueOnce(new Error("denied"));
    await expect(
      shareStory({ uri: "file:///story.png", link: "https://example.com" })
    ).resolves.toBe("shared");
    expect(sharing.shareAsync).toHaveBeenCalled();
  });

  it("reports unavailable when the device has no share sheet", async () => {
    sharing.isAvailableAsync.mockResolvedValueOnce(false);
    await expect(shareStory({ uri: "file:///story.png" })).resolves.toBe("unavailable");
    expect(sharing.shareAsync).not.toHaveBeenCalled();
  });

  it("passes share sheet errors on", async () => {
    sharing.shareAsync.mockRejectedValueOnce(new Error("no activity"));
    await expect(shareStory({ uri: "file:///story.png" })).rejects.toThrow("no activity");
  });
});

describe("shareStory on the web", () => {
  const globals = globalThis as unknown as Record<string, unknown>;
  const saved = { navigator: globals.navigator, fetch: globals.fetch };
  const share = jest.fn<Promise<void>, [unknown]>();
  const canShare = jest.fn<boolean, [unknown]>();

  beforeEach(() => {
    Platform.OS = "web";
    share.mockResolvedValue(undefined);
    canShare.mockReturnValue(true);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { share, canShare },
    });
    globals.fetch = jest.fn(async () => ({ blob: async () => new Blob(["png"]) }));
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: saved.navigator });
    globals.fetch = saved.fetch;
    share.mockReset();
    canShare.mockReset();
  });

  it("shares the image as a file with the Web Share API", async () => {
    await expect(
      shareStory({
        uri: "data:image/png;base64,AAAA",
        link: "https://example.com",
        dialogTitle: "Story",
      })
    ).resolves.toBe("shared");
    expect(clipboard.setStringAsync).toHaveBeenCalledWith("https://example.com");
    const data = share.mock.calls[0]?.[0] as { files: File[]; title?: string };
    expect(data.title).toBe("Story");
    expect(data.files[0]?.name).toBe("story.png");
    expect(data.files[0]?.type).toBe("image/png");
    expect(sharing.shareAsync).not.toHaveBeenCalled();
  });

  it("reports a closed sheet as cancelled", async () => {
    share.mockRejectedValueOnce(Object.assign(new Error("closed"), { name: "AbortError" }));
    await expect(shareStory({ uri: "data:image/png;base64,AAAA" })).resolves.toBe("cancelled");
  });

  it("reports unavailable where files cannot be shared, as on most desktops", async () => {
    canShare.mockReturnValue(false);
    await expect(shareStory({ uri: "data:image/png;base64,AAAA" })).resolves.toBe("unavailable");
    expect(share).not.toHaveBeenCalled();
  });
});

describe("copyStoryLink", () => {
  it("resolves whether the link went on the clipboard", async () => {
    await expect(copyStoryLink("https://example.com")).resolves.toBe(true);
    clipboard.setStringAsync.mockRejectedValueOnce(new Error("denied"));
    await expect(copyStoryLink("https://example.com")).resolves.toBe(false);
  });
});
