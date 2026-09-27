"use client";

import { BadgeCheckIcon, CheckIcon, HeartIcon, LinkIcon } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { enrichTweet, useTweet, type EnrichedTweet } from "react-tweet";
import type { Tweet, TweetEntities } from "react-tweet/api";

import { cn } from "@/registry/default/lib/utils";

// The X logo, from Simple Icons (CC0).
const X_LOGO =
  "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

/** X sends tweet text HTML-escaped. Decode it as text, never as markup. */
function decode(text: string) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function compact(count: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    count
  );
}

/**
 * The syndication API leaves out empty entity lists, and older versions of
 * the enricher assumed they were there. Fill them in, and fall back to
 * nothing rather than throwing on a tweet shape nobody expected.
 */
function enrich(tweet: Tweet): EnrichedTweet | null {
  try {
    const entities: Partial<TweetEntities> = tweet.entities ?? {};
    return enrichTweet({
      ...tweet,
      entities: {
        ...entities,
        hashtags: entities.hashtags ?? [],
        urls: entities.urls ?? [],
        user_mentions: entities.user_mentions ?? [],
        symbols: entities.symbols ?? [],
      },
    });
  } catch {
    return null;
  }
}

const frame = "w-full max-w-xl rounded-xl border bg-card p-4 text-card-foreground shadow";

/** The card's size and shape while a tweet loads. */
function TweetCardSkeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="status"
      aria-label="Loading post"
      data-slot="tweet-card-skeleton"
      className={cn(frame, className)}
      {...props}
    >
      <div className="flex items-center gap-2.5">
        <div className="bg-muted size-10 shrink-0 animate-pulse rounded-full" />
        <div className="grid gap-1.5">
          <div className="bg-muted h-3.5 w-28 animate-pulse rounded" />
          <div className="bg-muted h-3 w-20 animate-pulse rounded" />
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <div className="bg-muted h-3.5 w-full animate-pulse rounded" />
        <div className="bg-muted h-3.5 w-3/4 animate-pulse rounded" />
      </div>
    </div>
  );
}

/** What shows when a tweet is deleted, private or could not be fetched. */
function TweetCardUnavailable({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="tweet-card-unavailable"
      className={cn(frame, "text-muted-foreground py-6 text-center text-sm", className)}
      {...props}
    >
      This post is unavailable.
    </div>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-1.5 rounded-md transition-colors outline-none focus-visible:ring-[3px]"
    >
      {copied ? (
        <CheckIcon aria-hidden="true" className="text-success size-4" />
      ) : (
        <LinkIcon aria-hidden="true" className="size-4" />
      )}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}

interface TweetCardProps extends Omit<ComponentProps<"article">, "children"> {
  /** The tweet as the syndication API returns it: from `getTweet`, `useTweet` or your own fetch. */
  tweet: Tweet;
  showDate?: boolean;
  showLikes?: boolean;
  showCopyLink?: boolean;
  /** Locale for the date. A fixed default keeps the server and the browser in agreement. */
  locale?: string;
  /** Time zone for the date. */
  timeZone?: string;
}

/**
 * A post from X, drawn with your theme instead of an embed: no iframe, no
 * third-party script, and text you can select. Mentions, hashtags and links
 * are real links; the text is decoded as text, never injected as HTML.
 * Photos carry their alt text and videos have controls rather than
 * autoplaying. For server components, `Tweet` fetches by id and renders
 * this card.
 *
 * @example
 * const { data } = useTweet(id);
 * return data ? <TweetCard tweet={data} /> : <TweetCardSkeleton />;
 */
function TweetCard({
  tweet: raw,
  showDate = true,
  showLikes = true,
  showCopyLink = true,
  locale = "en-US",
  timeZone = "UTC",
  className,
  ...props
}: TweetCardProps) {
  const tweet = enrich(raw);
  if (!tweet) return <TweetCardUnavailable className={className} />;

  const date = new Date(tweet.created_at);
  const photos = tweet.mediaDetails?.filter((media) => media.type === "photo") ?? [];
  const video = tweet.video;
  const source =
    video?.variants.find((variant) => variant.type === "video/mp4") ?? video?.variants[0];

  return (
    <article
      data-slot="tweet-card"
      aria-label={`Post by ${tweet.user.name}`}
      className={cn(frame, className)}
      {...props}
    >
      <header className="flex items-start justify-between gap-3">
        <a
          href={tweet.user.url}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-visible:ring-ring/50 flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px]"
        >
          <img
            src={tweet.user.profile_image_url_https}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            className={cn(
              "size-10 shrink-0 object-cover",
              tweet.user.profile_image_shape === "Square" ? "rounded-md" : "rounded-full"
            )}
          />
          <span className="grid min-w-0">
            <span className="flex items-center gap-1 truncate text-sm font-semibold">
              {tweet.user.name}
              {tweet.user.verified || tweet.user.is_blue_verified ? (
                <BadgeCheckIcon aria-label="Verified" className="size-4 shrink-0 text-sky-500" />
              ) : null}
            </span>
            <span className="text-muted-foreground truncate text-sm">
              @{tweet.user.screen_name}
            </span>
          </span>
        </a>
        <a
          href={tweet.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on X"
          className="text-foreground focus-visible:ring-ring/50 shrink-0 rounded-md outline-none hover:opacity-70 focus-visible:ring-[3px]"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
            <path d={X_LOGO} />
          </svg>
        </a>
      </header>

      <p className="mt-3 text-[15px] leading-6 break-words whitespace-pre-wrap">
        {tweet.entities.map((entity, index) =>
          entity.type === "text" ? (
            <span key={index}>{decode(entity.text)}</span>
          ) : entity.type === "media" ? null : (
            <a
              key={index}
              href={entity.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:underline dark:text-sky-400"
            >
              {decode(entity.text)}
            </a>
          )
        )}
      </p>

      {photos.length > 0 ? (
        <div
          className={cn(
            "mt-3 grid gap-1 overflow-hidden rounded-lg",
            photos.length > 1 && "grid-cols-2"
          )}
        >
          {photos.map((photo, index) => (
            <img
              key={photo.media_url_https}
              src={photo.media_url_https}
              alt={photo.type === "photo" ? (photo.ext_alt_text ?? "") : ""}
              width={photo.original_info.width}
              height={photo.original_info.height}
              loading="lazy"
              className={cn(
                "size-full object-cover",
                photos.length === 3 && index === 0 && "row-span-2"
              )}
            />
          ))}
        </div>
      ) : null}

      {video && source ? (
        <video
          poster={video.poster}
          controls
          muted
          playsInline
          preload="metadata"
          className="mt-3 w-full rounded-lg"
        >
          <source src={source.src} type={source.type} />
        </video>
      ) : null}

      {showDate ? (
        <time dateTime={tweet.created_at} className="text-muted-foreground mt-3 block text-sm">
          {new Intl.DateTimeFormat(locale, {
            hour: "numeric",
            minute: "2-digit",
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone,
          }).format(date)}
        </time>
      ) : null}

      {showLikes || showCopyLink ? (
        <footer className="mt-3 flex items-center gap-5 border-t pt-3 text-sm">
          {showLikes ? (
            <a
              href={tweet.like_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/like text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-[3px]"
            >
              <HeartIcon
                aria-hidden="true"
                className="size-4 transition-colors group-hover/like:fill-rose-500 group-hover/like:text-rose-500"
              />
              <span>
                {compact(tweet.favorite_count)}
                <span className="sr-only"> likes, like on X</span>
              </span>
            </a>
          ) : null}
          {showCopyLink ? <CopyLink url={tweet.url} /> : null}
        </footer>
      ) : null}
    </article>
  );
}

/**
 * Fetches a tweet in the browser and renders it. It uses react-tweet's
 * `useTweet`, which by default asks react-tweet's public endpoint; pass
 * `apiUrl` to go through your own route instead.
 */
function ClientTweet({
  id,
  apiUrl,
  ...props
}: Omit<TweetCardProps, "tweet"> & { id: string; apiUrl?: string }) {
  const { data, isLoading } = useTweet(id, apiUrl);
  if (isLoading) return <TweetCardSkeleton className={props.className} />;
  if (!data) return <TweetCardUnavailable className={props.className} />;
  return <TweetCard tweet={data} {...props} />;
}

export { ClientTweet, TweetCard, TweetCardSkeleton, TweetCardUnavailable, type TweetCardProps };
