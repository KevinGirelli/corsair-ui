"use client";

import { CheckIcon, DownloadIcon, LinkIcon, ShareIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";

import {
  canShareStory,
  downloadStory,
  loadFont,
  renderStorySvg,
  shareStory,
  STORY_SAFE_AREA,
  STORY_SIZE,
  svgToPng,
  type StoryFont,
  type StoryShareResult,
} from "@/registry/default/lib/story-export";
import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";

/** A font to fetch for a story: where it is, and how the story names it. */
interface StoryFontSource extends Omit<StoryFont, "data"> {
  url: string;
}

/**
 * Fetches the fonts a story uses, once. `fonts` is null until all of them
 * have loaded, which is what `StoryFrame` waits for.
 *
 * @example
 * const { fonts } = useStoryFonts([
 *   { name: "Barlow", url: "/fonts/Barlow-Regular.ttf", weight: 400 },
 *   { name: "Barlow", url: "/fonts/Barlow-Bold.ttf", weight: 700 },
 * ]);
 */
function useStoryFonts(sources: StoryFontSource[]) {
  const [state, setState] = useState<{
    key: string;
    fonts: StoryFont[] | null;
    error: Error | null;
  }>({ key: "", fonts: null, error: null });
  // A new array each render must not refetch: the sources themselves decide.
  const key = JSON.stringify(sources);

  useEffect(() => {
    let active = true;
    const wanted: StoryFontSource[] = JSON.parse(key);
    Promise.all(
      wanted.map(async ({ url, ...font }) => ({ ...font, data: await loadFont(url) }))
    ).then(
      (fonts) => {
        if (active) setState({ key, fonts, error: null });
      },
      (error: unknown) => {
        if (active) setState({ key, fonts: null, error: toError(error) });
      }
    );
    return () => {
      active = false;
    };
  }, [key]);

  return state.key === key
    ? { fonts: state.fonts, error: state.error }
    : { fonts: null, error: null };
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

type StoryImageStatus = "rendering" | "ready" | "error";

interface StoryImage {
  status: StoryImageStatus;
  /** The latest PNG, kept while a newer one renders. */
  blob: Blob | null;
  /** An object URL for `blob`, revoked when it is replaced or on unmount. */
  url: string | null;
  error: Error | null;
}

/**
 * Renders a story to a PNG whenever it changes, a moment after the last
 * change. Unchanged stories are not drawn again. For a layout of your own
 * around the image; `StoryFrame` uses it.
 */
function useStoryImage(
  story: ReactNode,
  {
    fonts,
    width = STORY_SIZE.width,
    height = STORY_SIZE.height,
    delay = 120,
  }: { fonts: StoryFont[] | null | undefined; width?: number; height?: number; delay?: number }
): StoryImage {
  const [image, setImage] = useState<StoryImage>({
    status: "rendering",
    blob: null,
    url: null,
    error: null,
  });
  const drawn = useRef<string | null>(null);
  const current = useRef<string | null>(null);

  useEffect(() => {
    if (!fonts) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const svg = await renderStorySvg(story, { fonts, width, height });
        if (cancelled || svg === drawn.current) return;
        setImage((previous) => ({ ...previous, status: "rendering" }));
        const blob = await svgToPng(svg, width, height);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const previous = current.current;
        drawn.current = svg;
        current.current = url;
        setImage({ status: "ready", blob, url, error: null });
        if (previous) URL.revokeObjectURL(previous);
      } catch (error) {
        if (!cancelled)
          setImage((previous) => ({ ...previous, status: "error", error: toError(error) }));
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [story, fonts, width, height, delay]);

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current);
    },
    []
  );

  return image;
}

interface StoryFrameLabels {
  share: string;
  download: string;
  copyLink: string;
  copied: string;
  safeArea: string;
  /** Announced while the image is drawn. */
  rendering: string;
  /** Announced once the image is ready. */
  ready: string;
  error: string;
  shared: string;
  downloaded: string;
  /** Under the buttons when there is a link: how to put it on the story. */
  linkHint: string;
}

const DEFAULT_LABELS: StoryFrameLabels = {
  share: "Share",
  download: "Download",
  copyLink: "Copy link",
  copied: "Link copied",
  safeArea: "Safe area",
  rendering: "Drawing the story",
  ready: "Story ready",
  error: "The story could not be drawn.",
  shared: "Story shared",
  downloaded: "Story downloaded",
  linkHint: "Sharing copies the link too: add a link sticker to the story and paste it.",
};

type StoryFrameResult = StoryShareResult | "downloaded";

interface StoryFrameProps extends Omit<ComponentProps<"div">, "children" | "onError"> {
  /**
   * The story: an element in the subset Satori supports (inline styles,
   * flexbox), such as a `Story`.
   */
  story: ReactNode;
  /** The fonts the story uses. Null or undefined while they load. */
  fonts: StoryFont[] | null | undefined;
  /** What the image shows, for screen readers. */
  alt: string;
  /** Put on the clipboard when sharing, and copied by its own button. */
  link?: string;
  /** Name of the shared or downloaded file. */
  fileName?: string;
  /** Title some share sheets show. */
  shareTitle?: string;
  width?: number;
  height?: number;
  /** Shows the bands apps draw over at first. */
  defaultShowSafeArea?: boolean;
  labels?: Partial<StoryFrameLabels>;
  onShare?: (result: StoryFrameResult) => void;
  onError?: (error: Error) => void;
  /** More buttons, after the built-in ones. */
  children?: ReactNode;
}

/**
 * A story preview with what it takes to post it: on phones, Share opens the
 * share sheet with the PNG (Instagram, WhatsApp, the photo library); where
 * sharing files is not possible, Download saves it. With a `link`, sharing
 * also puts it on the clipboard, ready for a link sticker, since Instagram
 * does not take links from other apps.
 *
 * The preview is the exported image itself, drawn with Satori a moment after
 * the story changes, so what you see is what gets posted. The image is ready
 * before Share is pressed, as browsers only open the share sheet straight
 * from a tap. "Safe area" shows the bands the apps draw over.
 *
 * `data-state` is `rendering`, `ready` or `error`; the parts are
 * `story-frame-preview`, `story-frame-safe-area` and `story-frame-actions`.
 *
 * @example
 * const story = useMemo(() => <Story theme="midnight">…</Story>, []);
 * <StoryFrame
 *   story={story}
 *   alt={storyAlt(story)}
 *   fonts={fonts}
 *   link="https://example.com/book?via=story"
 *   fileName="free-today.png"
 * />
 */
function StoryFrame({
  story,
  fonts,
  alt,
  link,
  fileName = "story.png",
  shareTitle,
  width = STORY_SIZE.width,
  height = STORY_SIZE.height,
  defaultShowSafeArea = false,
  labels: labelsProp,
  onShare,
  onError,
  className,
  children,
  ...props
}: StoryFrameProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const image = useStoryImage(story, { fonts, width, height });
  const [showSafeArea, setShowSafeArea] = useState(defaultShowSafeArea);
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reported = useRef<Error | null>(null);

  const file = useMemo(
    () => (image.blob ? new File([image.blob], fileName, { type: "image/png" }) : null),
    [image.blob, fileName]
  );
  const canShare = useMemo(() => (file ? canShareStory(file) : false), [file]);
  const status: StoryImageStatus = fonts ? image.status : "rendering";

  useEffect(() => {
    if (image.error && reported.current !== image.error) {
      reported.current = image.error;
      onError?.(image.error);
    }
  }, [image.error, onError]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const markCopied = () => {
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  const copyLink = async () => {
    if (!link) return false;
    try {
      await navigator.clipboard.writeText(link);
      markCopied();
      return true;
    } catch {
      return false;
    }
  };

  const download = () => {
    if (!image.blob) return;
    downloadStory(image.blob, fileName);
    setAnnouncement(labels.downloaded);
    onShare?.("downloaded");
  };

  const share = async () => {
    if (!file) return;
    // Started first and not awaited: the share sheet has to open within the tap.
    const copying = link ? copyLink() : Promise.resolve(false);
    try {
      const result = await shareStory({ file, title: shareTitle });
      await copying;
      if (result === "unsupported") {
        download();
        return;
      }
      if (result === "shared") setAnnouncement(labels.shared);
      onShare?.(result);
    } catch (error) {
      onError?.(toError(error));
    }
  };

  const copy = async () => {
    if (await copyLink()) setAnnouncement(labels.copied);
  };

  const safe = {
    top: `${(STORY_SAFE_AREA.top / STORY_SIZE.height) * 100}%`,
    bottom: `${(STORY_SAFE_AREA.bottom / STORY_SIZE.height) * 100}%`,
    side: `${(STORY_SAFE_AREA.side / STORY_SIZE.width) * 100}%`,
  };

  return (
    <div
      data-slot="story-frame"
      data-state={status}
      className={cn("flex w-full max-w-xs flex-col items-center gap-4", className)}
      {...props}
    >
      <div
        data-slot="story-frame-preview"
        aria-busy={status === "rendering" || undefined}
        className="bg-muted relative w-full overflow-hidden rounded-2xl border"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {image.url ? (
          <img
            src={image.url}
            alt={alt}
            width={width}
            height={height}
            className={cn(
              "block size-full object-cover",
              status === "rendering" && "opacity-70 motion-safe:transition-opacity"
            )}
          />
        ) : (
          <div aria-hidden="true" className="bg-muted size-full motion-safe:animate-pulse" />
        )}
        {showSafeArea ? (
          <div
            data-slot="story-frame-safe-area"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div
              className="bg-destructive/25 border-destructive/60 absolute inset-x-0 top-0 border-b border-dashed"
              style={{ height: safe.top }}
            />
            <div
              className="bg-destructive/25 border-destructive/60 absolute inset-x-0 bottom-0 border-t border-dashed"
              style={{ height: safe.bottom }}
            />
            <div
              className="border-destructive/60 absolute border-x border-dashed"
              style={{ top: safe.top, bottom: safe.bottom, left: safe.side, right: safe.side }}
            />
          </div>
        ) : null}
        {status === "error" ? (
          <p
            role="alert"
            className="bg-background/90 text-destructive absolute inset-x-3 bottom-3 rounded-md px-3 py-2 text-sm"
          >
            {labels.error}
          </p>
        ) : null}
      </div>

      <div
        data-slot="story-frame-actions"
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {canShare ? (
          <Button type="button" onClick={share} disabled={!file}>
            <ShareIcon aria-hidden="true" />
            {labels.share}
          </Button>
        ) : null}
        <Button
          type="button"
          // A Button variant, not a class.
          // tailwind-compat-ignore-next-line
          variant={canShare ? "outline" : "default"}
          onClick={download}
          disabled={!image.blob}
        >
          <DownloadIcon aria-hidden="true" />
          {labels.download}
        </Button>
        {link ? (
          <Button
            type="button"
            variant="outline"
            onClick={copy}
            data-state={copied ? "copied" : "idle"}
          >
            {copied ? <CheckIcon aria-hidden="true" /> : <LinkIcon aria-hidden="true" />}
            {copied ? labels.copied : labels.copyLink}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          aria-pressed={showSafeArea}
          onClick={() => setShowSafeArea((shown) => !shown)}
        >
          {labels.safeArea}
        </Button>
        {children}
      </div>

      {link && canShare ? (
        <p className="text-muted-foreground text-center text-sm text-pretty">{labels.linkHint}</p>
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {announcement ||
          (status === "ready" ? labels.ready : status === "rendering" ? labels.rendering : "")}
      </span>
    </div>
  );
}

export {
  StoryFrame,
  useStoryFonts,
  useStoryImage,
  type StoryFontSource,
  type StoryFrameLabels,
  type StoryFrameProps,
  type StoryFrameResult,
  type StoryImage,
  type StoryImageStatus,
};
