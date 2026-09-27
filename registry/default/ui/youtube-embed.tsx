"use client";

import { PlayIcon } from "lucide-react";
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type Ref,
} from "react";
import { preconnect } from "react-dom";

import { useInView } from "@/registry/default/hooks/use-in-view";
import { cn } from "@/registry/default/lib/utils";

type YouTubePoster = "maxresdefault" | "sddefault" | "hqdefault";

/**
 * - `idle`: the poster and play button, no iframe yet.
 * - `loading`: the iframe is on its way.
 * - `ready`: the player is loaded and waiting.
 * - `playing`, `paused`, `ended`: reported by the player.
 */
type YouTubeEmbedState = "idle" | "loading" | "ready" | "playing" | "paused" | "ended";

/** Controls for the player, through `ref`. Calls made before it loads wait for it. */
interface YouTubeEmbedHandle {
  /** Loads the player if needed and starts the video. */
  play(): void;
  pause(): void;
  mute(): void;
  unmute(): void;
  /** Jumps to a time, in seconds. */
  seekTo(seconds: number): void;
  /** Loads the player without starting it (unless `autoplay` is on). */
  load(): void;
}

type PlayerState = Exclude<YouTubeEmbedState, "idle">;

const PLAYER_ORIGIN = /^https:\/\/www\.youtube(-nocookie)?\.com$/;

// The player's numeric states. Buffering (3) keeps whatever came before.
const PLAYER_STATES: Record<number, PlayerState> = {
  [-1]: "ready",
  0: "ended",
  1: "playing",
  2: "paused",
  5: "ready",
};

/** The player state carried by a message from the iframe, if any. */
function readPlayerState(data: unknown): PlayerState | undefined {
  if (!data || typeof data !== "object") return undefined;
  const { event, info } = data as { event?: unknown; info?: unknown };
  if (event === "onReady") return "ready";
  if (event === "onStateChange" && typeof info === "number") return PLAYER_STATES[info];
  if (
    (event === "infoDelivery" || event === "initialDelivery") &&
    info &&
    typeof info === "object" &&
    typeof (info as { playerState?: unknown }).playerState === "number"
  ) {
    return PLAYER_STATES[(info as { playerState: number }).playerState];
  }
  return undefined;
}

function parseMessage(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

// Embeds that share a `group`: starting one pauses the others.
const players = new Set<{ group: string; pause: () => void }>();

const subscribe = () => () => {};

interface YouTubeEmbedProps extends Omit<
  ComponentProps<"div">,
  "ref" | "children" | "title" | "onPlay" | "onPause"
> {
  /** The id in the video's URL: `youtube.com/watch?v=<videoId>`. */
  videoId: string;
  /** What the video is: the iframe's title and the play button's name. */
  title: string;
  /** Which of YouTube's thumbnails to show before it loads. Not every video has "maxresdefault". */
  poster?: YouTubePoster;
  /** A poster image of your own, in place of YouTube's thumbnail. */
  posterSrc?: string;
  /** Where the video starts, in seconds. */
  start?: number;
  /** Extra player parameters, e.g. `{ rel: "0" }`. They override the ones set from props. */
  params?: Record<string, string>;
  /** Load from youtube-nocookie.com, which sets no cookies until the video plays. */
  noCookie?: boolean;
  /** Width to height, as CSS `aspect-ratio`. */
  aspectRatio?: string;
  /** Name of the play button. Defaults to "Play: <title>". */
  playLabel?: string;
  /**
   * When the player loads: "click" waits for the play button, "in-view"
   * loads it once it scrolls near, "eager" as soon as the page runs.
   */
  load?: "click" | "in-view" | "eager";
  /**
   * For "in-view" and "eager": start playing once loaded. Browsers only
   * allow that without sound, so it also mutes. A click always plays.
   */
  autoplay?: boolean;
  /** Start without sound. */
  muted?: boolean;
  /** Start over at the end. */
  loop?: boolean;
  /** Show the player's controls. */
  controls?: boolean;
  /** Embeds with the same group pause when another one in it starts. */
  group?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  /** Receives the player controls: play, pause, mute, unmute, seekTo and load. */
  ref?: Ref<YouTubeEmbedHandle>;
}

/**
 * A YouTube video that costs one image until it is wanted: a poster and a
 * play button stand in for the player, and the iframe only loads when the
 * button is pressed (or when it scrolls into view, or right away, with
 * `load`). Nothing from YouTube runs before then, and no API script is
 * loaded: `ref` controls the player through messages to the iframe, and its
 * state comes back in `data-state` and the `onPlay` / `onPause` / `onEnd`
 * callbacks.
 *
 * The play button is a real button named after the video. Pressing it moves
 * focus into the player, so keyboard users land on its controls. With
 * `prefers-reduced-motion` the button does not grow on hover.
 *
 * @example
 * <YouTubeEmbed videoId="dQw4w9WgXcQ" title="Launch recap" className="max-w-2xl" />
 */
function YouTubeEmbed({
  videoId,
  title,
  poster = "hqdefault",
  posterSrc,
  start,
  params,
  noCookie = true,
  aspectRatio = "16 / 9",
  playLabel,
  load = "click",
  autoplay = false,
  muted = false,
  loop = false,
  controls = true,
  group,
  onPlay,
  onPause,
  onEnd,
  className,
  style,
  ref,
  ...props
}: YouTubeEmbedProps) {
  const channel = useId();
  const iframe = useRef<HTMLIFrameElement>(null);
  const [activation, setActivation] = useState<"play" | "load" | null>(null);
  const browser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const [observe, inView] = useInView<HTMLDivElement>({
    once: true,
    rootMargin: "200px",
  });

  const mounted =
    activation !== null ||
    (load === "eager" && browser) ||
    (load === "in-view" && browser && inView);
  const autoplayNow = activation === "play" || autoplay;
  // Autoplay that nobody asked for with a click has to be silent.
  const muteNow = muted || (autoplayNow && activation !== "play");

  const host = noCookie ? "https://www.youtube-nocookie.com" : "https://www.youtube.com";
  let src = "";
  if (mounted) {
    const search = new URLSearchParams({
      enablejsapi: "1",
      playsinline: "1",
      origin: window.location.origin,
    });
    if (autoplayNow) search.set("autoplay", "1");
    if (muteNow) search.set("mute", "1");
    if (loop) {
      // Looping a single video needs it as its own playlist.
      search.set("loop", "1");
      search.set("playlist", videoId);
    }
    if (!controls) search.set("controls", "0");
    if (start) search.set("start", String(Math.max(0, Math.floor(start))));
    for (const [key, value] of Object.entries(params ?? {})) search.set(key, value);
    src = `${host}/embed/${encodeURIComponent(videoId)}?${search.toString()}`;
  }

  const [player, setPlayer] = useState<{ src: string; state: PlayerState }>({
    src: "",
    state: "loading",
  });
  const state: YouTubeEmbedState = !mounted
    ? "idle"
    : player.src === src
      ? player.state
      : "loading";

  const callbacks = useRef({ onPlay, onPause, onEnd });
  useEffect(() => {
    callbacks.current = { onPlay, onPause, onEnd };
  });

  // Commands wait here until the iframe has loaded.
  const queue = useRef<string[]>([]);
  const loaded = useRef(false);
  const lastState = useRef<PlayerState>("loading");

  const send = (func: string, args: unknown[] = []) => {
    const message = JSON.stringify({
      event: "command",
      func,
      args,
      id: channel,
      channel: "widget",
    });
    const target = iframe.current?.contentWindow;
    if (loaded.current && target) target.postMessage(message, host);
    else queue.current.push(message);
  };
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });

  // Listen to the player: only messages from this iframe, from YouTube.
  useEffect(() => {
    if (!src) return;
    loaded.current = false;
    lastState.current = "loading";
    const onMessage = (event: MessageEvent) => {
      const target = iframe.current?.contentWindow;
      if (!target || event.source !== target || !PLAYER_ORIGIN.test(event.origin)) return;
      const next = readPlayerState(parseMessage(event.data));
      if (!next || next === lastState.current) return;
      const previous = lastState.current;
      lastState.current = next;
      setPlayer({ src, state: next });
      if (next === "playing") {
        callbacks.current.onPlay?.();
      } else if (next === "paused" && previous === "playing") {
        callbacks.current.onPause?.();
      } else if (next === "ended") {
        callbacks.current.onEnd?.();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [src]);

  // Pause the rest of the group when this one starts.
  const self = useRef({
    group: "",
    pause: () => {
      if (loaded.current) sendRef.current("pauseVideo");
    },
  });
  useEffect(() => {
    if (!group) return;
    const entry = self.current;
    entry.group = group;
    players.add(entry);
    return () => {
      players.delete(entry);
    };
  }, [group]);
  useEffect(() => {
    if (state !== "playing" || !group) return;
    for (const other of players) {
      if (other !== self.current && other.group === group) other.pause();
    }
  }, [state, group]);

  // A click swaps the button for the player: keep focus with it.
  useEffect(() => {
    if (mounted && activation === "play") iframe.current?.focus();
  }, [mounted, activation]);

  const onLoad = () => {
    const target = iframe.current?.contentWindow;
    if (!target) return;
    loaded.current = true;
    // Ask the player to report its state, then send anything that was waiting.
    target.postMessage(
      JSON.stringify({ event: "listening", id: channel, channel: "widget" }),
      host
    );
    for (const message of queue.current.splice(0)) target.postMessage(message, host);
    if (lastState.current === "loading") {
      lastState.current = "ready";
      setPlayer({ src, state: "ready" });
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      play: () => {
        if (mounted) sendRef.current("playVideo");
        else setActivation("play");
      },
      pause: () => sendRef.current("pauseVideo"),
      mute: () => sendRef.current("mute"),
      unmute: () => sendRef.current("unMute"),
      seekTo: (seconds: number) => sendRef.current("seekTo", [seconds, true]),
      load: () => {
        if (!mounted) setActivation("load");
      },
    }),
    [mounted]
  );

  const warm = () => preconnect(host);

  return (
    <div
      ref={observe}
      data-slot="youtube-embed"
      data-state={state}
      className={cn("bg-muted relative isolate w-full overflow-hidden rounded-lg", className)}
      style={{ aspectRatio, ...style }}
      {...props}
    >
      <img
        data-slot="youtube-embed-poster"
        src={posterSrc ?? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${poster}.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      {mounted ? (
        <iframe
          ref={iframe}
          data-slot="youtube-embed-iframe"
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={onLoad}
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          data-slot="youtube-embed-play"
          aria-label={playLabel ?? `Play: ${title}`}
          onClick={() => setActivation("play")}
          onPointerEnter={warm}
          onFocus={warm}
          className="group/youtube-play absolute inset-0 grid cursor-pointer place-items-center outline-none"
        >
          <span
            aria-hidden="true"
            className={cn(
              "bg-background/90 text-foreground grid size-16 place-items-center rounded-full shadow-lg",
              "transition-transform group-hover/youtube-play:scale-105 motion-reduce:transition-none",
              "group-focus-visible/youtube-play:ring-ring/50 group-focus-visible/youtube-play:ring-[3px]"
            )}
          >
            <PlayIcon className="size-7 translate-x-0.5 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}

export { YouTubeEmbed, type YouTubeEmbedHandle, type YouTubeEmbedProps, type YouTubeEmbedState };
