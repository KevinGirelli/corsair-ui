import { getTweet } from "react-tweet/api";

import {
  TweetCard,
  TweetCardUnavailable,
  type TweetCardProps,
} from "@/registry/default/ui/tweet-card";

interface TweetProps extends Omit<TweetCardProps, "tweet"> {
  /** The id at the end of the post's URL. */
  id: string;
  /** Passed to `fetch`, e.g. `{ next: { revalidate: 3600 } }` to cache it in Next.js. */
  fetchOptions?: RequestInit;
}

/**
 * A server component that fetches a post from X's syndication API while
 * the page renders and shows it with TweetCard: nothing is fetched in the
 * browser and no third-party script loads. Wrap it in `<Suspense>` with a
 * `TweetCardSkeleton` fallback to stream the rest of the page first. In
 * client components, use `ClientTweet` instead.
 *
 * @example
 * <Suspense fallback={<TweetCardSkeleton />}>
 *   <Tweet id="1628832338187636740" />
 * </Suspense>
 */
async function Tweet({ id, fetchOptions, ...props }: TweetProps) {
  const tweet = await getTweet(id, fetchOptions).catch(() => undefined);
  if (!tweet) return <TweetCardUnavailable className={props.className} />;
  return <TweetCard tweet={tweet} {...props} />;
}

export { Tweet, type TweetProps };
