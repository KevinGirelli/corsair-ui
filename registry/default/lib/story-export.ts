import type { ReactNode } from "react";
import type satori from "satori/standalone";

/** Instagram, TikTok and WhatsApp stories: 9:16, at the size they are shown. */
const STORY_SIZE = { width: 1080, height: 1920 } as const;

/**
 * Where the apps draw over a story, in px of a 1080 × 1920 image: the profile
 * bar and progress lines at the top, the reply field at the bottom, and a
 * margin at the sides. Keep text, faces and calls to action inside.
 */
const STORY_SAFE_AREA = { top: 250, bottom: 340, side: 64 } as const;

type StoryFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

interface StoryFont {
  /** The `fontFamily` the story uses for it. */
  name: string;
  /** TTF, OTF or WOFF data (from `loadFont`, or a Node Buffer on a server). WOFF2 is not supported. */
  data: ArrayBuffer | Uint8Array;
  weight?: StoryFontWeight;
  style?: "normal" | "italic";
}

interface StoryRenderOptions {
  /** Every font the story uses. Text is drawn from these, so it looks the same on every device. */
  fonts: StoryFont[];
  width?: number;
  height?: number;
}

/** What the layout engine is loaded from: a URL, or the bytes of `satori/layout.wasm`. */
type StoryWasmSource = string | URL | ArrayBuffer | ArrayBufferView;

type Satori = typeof satori;

let wasmSource: StoryWasmSource | undefined;
let loading: Promise<Satori> | null = null;

/**
 * Where to load Satori's layout engine from, for bundlers that do not turn
 * `new URL("satori/layout.wasm", import.meta.url)` into a file, such as Vite
 * (`import wasm from "satori/layout.wasm?url"`), or to serve it yourself.
 * Next.js and webpack need nothing. Call it before the first render.
 */
function setStoryWasm(source: StoryWasmSource) {
  wasmSource = source;
  loading = null;
}

/** Satori is loaded on first use, so pages that never render a story do not download it. */
function loadSatori(): Promise<Satori> {
  loading ??= (async () => {
    const { default: satori, init } = await import("satori/standalone");
    await init(wasmSource ?? new URL("satori/layout.wasm", import.meta.url));
    return satori;
  })().catch((error: unknown) => {
    loading = null;
    throw new Error(
      "Could not load Satori's layout engine. If your bundler does not handle " +
        '`new URL("satori/layout.wasm", import.meta.url)`, pass the file to setStoryWasm().',
      { cause: error }
    );
  });
  return loading;
}

/**
 * Lays a story out and draws it as SVG, with text turned into outlines.
 * `story` is JSX with inline styles in the subset Satori supports: flexbox
 * with an explicit `display: "flex"` on every element with more than one
 * child, and images as URLs that allow CORS or as data URLs. The same element
 * works with `ImageResponse` from `next/og`, which is Satori too.
 */
async function renderStorySvg(
  story: ReactNode,
  { fonts, width = STORY_SIZE.width, height = STORY_SIZE.height }: StoryRenderOptions
): Promise<string> {
  if (fonts.length === 0) throw new Error("A story needs at least one font.");
  const satori = await loadSatori();
  return satori(story, {
    width,
    height,
    fonts: fonts.map((font) => ({ ...font, data: toArrayBuffer(font.data) })),
  });
}

function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  // isView, not instanceof: buffers from another realm (an iframe, a test DOM) fail instanceof.
  if (!ArrayBuffer.isView(data)) return data;
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

/** Rasterizes an SVG of the given size to a PNG in the browser. */
async function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image(width, height);
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser gave no 2D canvas.");
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("The canvas gave no PNG."))),
        "image/png"
      )
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Renders a story to a PNG in the browser: Satori lays it out, a canvas draws it. */
async function renderStoryPng(story: ReactNode, options: StoryRenderOptions): Promise<Blob> {
  const width = options.width ?? STORY_SIZE.width;
  const height = options.height ?? STORY_SIZE.height;
  return svgToPng(await renderStorySvg(story, options), width, height);
}

/**
 * Fetches a font for a story. Satori reads TTF, OTF and WOFF; a WOFF2 file
 * (what most CSS serves) fails here with a clear message instead of later.
 */
async function loadFont(url: string | URL, init?: RequestInit): Promise<ArrayBuffer> {
  const response = await fetch(url, init);
  if (!response.ok)
    throw new Error(`Could not load the font at ${String(url)}: ${response.status}`);
  const data = await response.arrayBuffer();
  const signature = new TextDecoder().decode(new Uint8Array(data, 0, Math.min(4, data.byteLength)));
  if (signature === "wOF2") {
    throw new Error(
      `${String(url)} is WOFF2, which stories cannot use: load the TTF, OTF or WOFF.`
    );
  }
  return data;
}

type StoryShareResult = "shared" | "cancelled" | "unsupported";

/** Whether the device can hand this file to another app: phones, and some desktops. */
function canShareStory(file: File) {
  return typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] }) === true;
}

/**
 * Opens the device's share sheet with the story, where Instagram, WhatsApp
 * and the photo library are. Only the file is shared: apps such as Instagram
 * drop text and links, so put the link on the clipboard first. Call it
 * straight from a click or tap, with the file already rendered; browsers
 * refuse to share after a long wait.
 */
async function shareStory({
  file,
  title,
}: {
  file: File;
  title?: string;
}): Promise<StoryShareResult> {
  if (!canShareStory(file)) return "unsupported";
  try {
    await navigator.share({ files: [file], title });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    throw error;
  }
}

/** Saves the story through the browser's download, for desktops and anywhere sharing is missing. */
function downloadStory(blob: Blob, fileName = "story.png") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers start the download after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export {
  canShareStory,
  downloadStory,
  loadFont,
  renderStoryPng,
  renderStorySvg,
  setStoryWasm,
  shareStory,
  STORY_SAFE_AREA,
  STORY_SIZE,
  svgToPng,
  type StoryFont,
  type StoryFontWeight,
  type StoryRenderOptions,
  type StoryShareResult,
  type StoryWasmSource,
};
