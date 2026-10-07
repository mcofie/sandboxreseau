/**
 * Podcast episodes for the site, read from the Substack RSS feed at build time.
 * Substack blocks GitHub Actions, so production builds usually fall back to
 * src/data/cached-episodes.json. Run `npm run podcast:refresh` and commit after each new episode.
 */
import cachedEpisodes from '../data/cached-episodes.json';
import { fetchLiveEpisodes, RSS_FEED_URL, type PodcastEpisode } from './podcast-feed';

export type { PodcastEpisode };

/** Site copy avoids em dashes (U+2014): "#30 <dash> Title" becomes "#30: Title", any others become commas. */
function withoutEmDashes(text: string): string {
  return text.replace(/^(#\d+)\s*[\u2014\u2013-]\s*/, '$1: ').replace(/\s*\u2014\s*/g, ', ');
}

function cleanEpisode(episode: PodcastEpisode): PodcastEpisode {
  return { ...episode, title: withoutEmDashes(episode.title), description: withoutEmDashes(episode.description) };
}

// Every page's player needs the episode list, so fetch the feed once per build.
let episodesPromise: Promise<PodcastEpisode[]> | undefined;

export function fetchPodcastEpisodes(): Promise<PodcastEpisode[]> {
  episodesPromise ??= loadEpisodes();
  return episodesPromise;
}

async function loadEpisodes(): Promise<PodcastEpisode[]> {
  try {
    console.log(`[podcast] Fetching RSS from ${RSS_FEED_URL}...`);
    const episodes = await fetchLiveEpisodes();
    console.log(`[podcast] Successfully parsed ${episodes.length} episodes from live RSS.`);
    return episodes.map(cleanEpisode);
  } catch (e) {
    console.warn(`[podcast] Live RSS fetch failed (${(e as Error)?.message || e}). Falling back to ${cachedEpisodes.length} cached episodes. Run \`npm run podcast:refresh\` locally to update them.`);
    return (cachedEpisodes as PodcastEpisode[]).map(cleanEpisode);
  }
}
