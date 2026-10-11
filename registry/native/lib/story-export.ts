import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { createContext, createElement, useContext, type ReactNode } from "react";
import { PixelRatio, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";

/** Instagram, TikTok and WhatsApp stories: 9:16, in pixels of the exported image. */
const STORY_SIZE = { width: 1080, height: 1920 } as const;

/**
 * Where the apps draw over a story, in px of the 1080 × 1920 image: the
 * profile bar at the top, the reply field at the bottom and a side margin.
 * The same values as the web `story-export` item.
 */
const STORY_SAFE_AREA = { top: 250, bottom: 340, side: 64 } as const;

/** dp per story px. Inside a StoryFrame it is set so the story is laid out at its full pixel size. */
const StoryScaleContext = createContext<number | null>(null);

interface StoryScaleProps {
  /** dp per story px. */
  scale: number;
  children?: ReactNode;
}

/** Lays the stories inside out at a scale: `StoryFrame` uses it, so templates rarely need it. */
function StoryScale({ scale, children }: StoryScaleProps) {
  return createElement(StoryScaleContext.Provider, { value: scale }, children);
}

/** The dp size that gives the story its full pixel size on this screen. */
function fullStorySize() {
  const ratio = PixelRatio.get();
  return { width: STORY_SIZE.width / ratio, height: STORY_SIZE.height / ratio };
}

/**
 * Converts story px (of the 1080 × 1920 image) to dp, so a template written
 * once in story px comes out at the same place on every screen and in the
 * export. Outside a StoryFrame it lays the story out at its full size.
 *
 * @example
 * const px = useStoryUnit();
 * <Text style={{ fontSize: px(96) }} allowFontScaling={false}>Free today</Text>
 */
function useStoryUnit() {
  const scale = useContext(StoryScaleContext) ?? 1 / PixelRatio.get();
  return (px: number) => px * scale;
}

/** The capture result as a URI share sheets accept: iOS returns a bare path. */
function asFileUri(uri: string) {
  return uri.startsWith("/") ? `file://${uri}` : uri;
}

interface CaptureStoryOptions {
  format?: "png" | "jpg";
  /** From 0 to 1, for `jpg`. */
  quality?: number;
}

/**
 * Captures a view laid out at the story's full size (see `fullStorySize`)
 * as a 1080 × 1920 image, and returns its file URI (a data URI on the web).
 * iOS sizes the capture in points and Android in pixels; this handles both.
 * Wait for images in the view to load before capturing.
 */
async function captureStory(
  view: Parameters<typeof captureRef>[0],
  { format = "png", quality = 1 }: CaptureStoryOptions = {}
): Promise<string> {
  const ratio = Platform.OS === "ios" ? PixelRatio.get() : 1;
  const uri = await captureRef(view, {
    format,
    quality,
    width: STORY_SIZE.width / ratio,
    height: STORY_SIZE.height / ratio,
    result: Platform.OS === "web" ? "data-uri" : "tmpfile",
  });
  return asFileUri(uri);
}

type StoryShareResult = "shared" | "cancelled" | "unavailable";

interface ShareStoryOptions {
  /** The captured image: a file URI, or a data URI on the web. */
  uri: string;
  /** Put on the clipboard before the share sheet opens, ready for a link sticker. */
  link?: string;
  /** Android's share sheet title, and the web share title. */
  dialogTitle?: string;
  mimeType?: "image/png" | "image/jpeg";
}

/** The browser's Web Share API, typed here because React Native has no DOM types. */
interface WebShareGlobals {
  navigator?: {
    canShare?: (data: { files: unknown[] }) => boolean;
    share?: (data: { files: unknown[]; title?: string }) => Promise<void>;
  };
  File?: new (parts: unknown[], name: string, options: { type: string }) => unknown;
}

async function shareOnWeb({ uri, dialogTitle, mimeType = "image/png" }: ShareStoryOptions) {
  const web = globalThis as WebShareGlobals;
  if (!web.File || !web.navigator?.share) return "unavailable";
  const blob = await (await fetch(uri)).blob();
  const file = new web.File([blob], mimeType === "image/png" ? "story.png" : "story.jpg", {
    type: mimeType,
  });
  if (!web.navigator.canShare?.({ files: [file] })) return "unavailable";
  try {
    await web.navigator.share({ files: [file], title: dialogTitle });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    throw error;
  }
}

/**
 * Opens the share sheet with the story, where Instagram (Story, Feed or
 * Messages), WhatsApp and Save Image are. With a `link`, it goes on the
 * clipboard first: Instagram takes no links from other apps, so the person
 * adds a link sticker and pastes it.
 *
 * On iOS and Android the sheet does not say whether something was posted,
 * so closing it reports `shared`. On the web it uses the Web Share API.
 * Saving to the photo library from the iOS sheet needs
 * `NSPhotoLibraryAddUsageDescription` in the app's Info.plist.
 */
async function shareStory(options: ShareStoryOptions): Promise<StoryShareResult> {
  const { uri, link, dialogTitle, mimeType = "image/png" } = options;
  if (link) {
    try {
      await Clipboard.setStringAsync(link);
    } catch {
      // The story still goes out; the link button is the fallback.
    }
  }
  if (Platform.OS === "web") return shareOnWeb(options);
  if (!(await Sharing.isAvailableAsync())) return "unavailable";
  // The capture stays in the cache folder: the receiving app may read it after the sheet closes.
  await Sharing.shareAsync(uri, {
    mimeType,
    UTI: mimeType === "image/png" ? "public.png" : "public.jpeg",
    dialogTitle,
  });
  return "shared";
}

/** Puts a link on the clipboard. Resolves false when the platform refused. */
async function copyStoryLink(link: string) {
  try {
    return await Clipboard.setStringAsync(link);
  } catch {
    return false;
  }
}

export {
  captureStory,
  copyStoryLink,
  fullStorySize,
  shareStory,
  STORY_SAFE_AREA,
  STORY_SIZE,
  StoryScale,
  useStoryUnit,
  type CaptureStoryOptions,
  type ShareStoryOptions,
  type StoryScaleProps,
  type StoryShareResult,
};
