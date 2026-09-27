import * as spotifyUrlInfo from "spotify-url-info";
import type { SpotifyUrlInfoModule } from "spotify-url-info";

export interface SpotifyTrack {
  title: string;
  artist: string;
  /** Cover art URL. */
  image?: string;
  /** Opens it in Spotify. */
  link: string;
  /** A short preview clip, when Spotify has one. */
  audio?: string;
}

// The package is CommonJS and its types only describe the default export,
// so take whichever shape the bundler hands over.
const createClient = ((spotifyUrlInfo as unknown as { default?: unknown }).default ??
  spotifyUrlInfo) as unknown as SpotifyUrlInfoModule;

/** Only links on open.spotify.com are fetched; regional paths (`/intl-pt/`) are dropped. */
function normalize(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "open.spotify.com") {
    throw new Error(`Not an open.spotify.com link: ${url}`);
  }
  parsed.pathname = parsed.pathname.replace(/^\/intl-[a-z]{2}(?:-[a-z]{2})?\//i, "/");
  parsed.search = "";
  return parsed.toString();
}

/**
 * Title, artist, cover art and a preview clip for a Spotify track, album,
 * playlist or episode link, read from Spotify's public embed page. Call it
 * on the server (a server component, a route handler, a build script):
 * Spotify does not allow it from the browser, and it keeps the scraping
 * library out of your bundle.
 *
 * @example
 * const track = await getSpotifyTrack("https://open.spotify.com/track/…");
 * return <SpotifyCard track={track} />;
 */
export async function getSpotifyTrack(url: string, init?: RequestInit): Promise<SpotifyTrack> {
  const { getPreview } = createClient(fetch);
  const preview = await getPreview(normalize(url), init);
  return {
    title: preview.title,
    artist: preview.artist,
    image: preview.image,
    link: preview.link,
    audio: preview.audio || undefined,
  };
}
