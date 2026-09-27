"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps } from "react";

import type { SpotifyTrack } from "@/registry/default/lib/spotify-track";
import { cn } from "@/registry/default/lib/utils";

// The Spotify logo, from Simple Icons (CC0).
const SPOTIFY_LOGO =
  "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z";

// One preview at a time: starting a card stops whichever was playing.
let current: HTMLAudioElement | null = null;

interface SpotifyCardProps extends Omit<ComponentProps<"article">, "children"> {
  /** Track details, e.g. from `getSpotifyTrack` on the server. */
  track: SpotifyTrack;
  /** Preview volume, from 0 to 1. */
  volume?: number;
}

/**
 * A compact card for a Spotify track: cover art over a glow of its own
 * colours, title and artist, and a link to open it in Spotify. When the
 * track has a preview clip, the cover plays it: a record slides out and
 * turns while it plays, and only one card plays at a time. The data comes
 * in as props, so fetch it on the server with `getSpotifyTrack`.
 *
 * @example
 * const track = await getSpotifyTrack("https://open.spotify.com/track/…");
 * return <SpotifyCard track={track} />;
 */
/** Plays or pauses a preview, making sure it is the only one playing. */
function playOrPause(player: HTMLAudioElement, volume: number, onRefused: () => void) {
  player.volume = Math.min(Math.max(volume, 0), 1);
  if (!player.paused) {
    player.pause();
    return;
  }
  if (current && current !== player) current.pause();
  current = player;
  void player.play().catch(onRefused);
}

function SpotifyCard({ track, volume = 0.4, className, ...props }: SpotifyCardProps) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const stop = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Silence the preview when the card goes away.
  useEffect(() => () => stop.current(), []);

  const toggle = () => {
    if (!track.audio) return;
    if (!audio.current) {
      const player = new Audio(track.audio);
      player.addEventListener("play", () => setPlaying(true));
      player.addEventListener("pause", () => setPlaying(false));
      player.addEventListener("ended", () => setProgress(0));
      player.addEventListener("timeupdate", () =>
        setProgress(player.duration ? player.currentTime / player.duration : 0)
      );
      stop.current = () => {
        player.pause();
        if (current === player) current = null;
      };
      audio.current = player;
    }
    playOrPause(audio.current, volume, () => setPlaying(false));
  };

  const cover = track.image ? (
    <img
      src={track.image}
      alt=""
      width={80}
      height={80}
      className={cn(
        "relative z-10 size-20 rounded-lg object-cover shadow-lg transition-transform duration-300 ease-out motion-reduce:transition-none",
        playing && "-translate-x-1"
      )}
    />
  ) : (
    <span className="bg-muted relative z-10 size-20 rounded-lg" />
  );

  return (
    <article
      data-slot="spotify-card"
      data-state={playing ? "playing" : "idle"}
      aria-label={`${track.title} by ${track.artist}`}
      className={cn(
        "relative isolate flex w-full max-w-sm items-center gap-4 overflow-hidden rounded-2xl border bg-neutral-950 p-3 pr-4 text-white",
        className
      )}
      {...props}
    >
      {track.image ? (
        // The cover itself, blurred into a glow of its colours.
        <img
          src={track.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 size-full scale-150 object-cover opacity-60 blur-2xl saturate-150"
        />
      ) : null}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[image:linear-gradient(90deg,rgb(0_0_0/0.15),rgb(0_0_0/0.7))]"
      />

      <div className="group/cover relative shrink-0">
        {track.audio ? (
          <>
            {/* The record: grooves are a repeating radial gradient, so there is nothing to load. */}
            <span aria-hidden="true" className="absolute inset-y-0 left-1.5 flex items-center">
              <span
                data-slot="spotify-card-record"
                className={cn(
                  "size-[4.4rem] transition-transform duration-500 ease-out motion-reduce:transition-none",
                  // Behind the cover at rest, peeking out on hover, half out while it plays.
                  playing
                    ? "translate-x-6"
                    : "translate-x-0 group-focus-within/cover:translate-x-3 group-hover/cover:translate-x-3"
                )}
              >
                <span
                  className={cn(
                    "relative block size-full rounded-full bg-[image:repeating-radial-gradient(circle,#111_0,#111_2px,#1d1d1d_3px,#111_4px)] shadow-md motion-safe:animate-spin",
                    !playing && "[animation-play-state:paused]"
                  )}
                  style={{ animationDuration: "2.4s" }}
                >
                  <span className="absolute inset-[34%] rounded-full bg-[image:radial-gradient(circle,#0b0b0b_0_18%,var(--spotify-card-label,#d9b06a)_19%)]" />
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={toggle}
              aria-pressed={playing}
              aria-label={`Play preview of ${track.title}`}
              className="relative block cursor-pointer rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
            >
              {cover}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 z-20 grid place-items-center rounded-lg bg-black/35 opacity-0 transition-opacity duration-200 group-focus-within/cover:opacity-100 group-hover/cover:opacity-100",
                  playing && "opacity-100"
                )}
              >
                <span className="grid size-9 place-items-center rounded-full bg-white text-black shadow">
                  {playing ? (
                    <PauseIcon className="size-4 fill-current" />
                  ) : (
                    <PlayIcon className="size-4 translate-x-px fill-current" />
                  )}
                </span>
              </span>
            </button>
          </>
        ) : (
          cover
        )}
      </div>

      <div className="relative z-10 grid min-w-0 flex-1 gap-0.5">
        <p className="truncate text-sm font-semibold">{track.title}</p>
        <p className="truncate text-sm text-white/70">{track.artist}</p>
        {track.audio ? (
          <span
            aria-hidden="true"
            className="mt-2 block h-0.5 overflow-hidden rounded-full bg-white/20"
          >
            <span
              className="block h-full origin-left rounded-full bg-white/80"
              style={{ transform: `scaleX(${progress})` }}
            />
          </span>
        ) : null}
      </div>

      <a
        href={track.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open in Spotify"
        className="relative z-10 shrink-0 self-start rounded-full text-white/80 outline-none hover:text-white focus-visible:ring-[3px] focus-visible:ring-white/60"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
          <path d={SPOTIFY_LOGO} />
        </svg>
      </a>
    </article>
  );
}

/** The card's size and shape while a track loads. */
function SpotifyCardSkeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="status"
      aria-label="Loading track"
      data-slot="spotify-card-skeleton"
      className={cn("flex w-full max-w-sm items-center gap-4 rounded-2xl border p-3", className)}
      {...props}
    >
      <div className="bg-muted size-20 shrink-0 animate-pulse rounded-lg" />
      <div className="grid flex-1 gap-2">
        <div className="bg-muted h-3.5 w-32 animate-pulse rounded" />
        <div className="bg-muted h-3.5 w-20 animate-pulse rounded" />
      </div>
    </div>
  );
}

export { SpotifyCard, SpotifyCardSkeleton, type SpotifyCardProps };
