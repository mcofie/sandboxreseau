/**
 * Fetches and parses The Reverb's Substack RSS feed. Shared by the site build (src/lib/podcast.ts)
 * and `npm run podcast:refresh`, which rewrites src/data/cached-episodes.json.
 */
import Parser from 'rss-parser';

export interface PodcastEpisode {
  title: string;
  guid: string;
  pubDate: string;
  link: string;
  description: string;
  audioUrl: string;
  duration: string;
  thumb: string;
}

export const RSS_FEED_URL = 'https://api.substack.com/feed/podcast/7581260.rss';

type CustomFeed = {};
type CustomItem = {
  itunes?: {
    duration?: string;
    image?: string;
    author?: string;
    explicit?: string;
  };
  enclosure?: {
    url?: string;
    length?: string;
    type?: string;
  };
};

function formatDuration(raw: string | undefined): string {
  if (!raw) return '5:00';
  const trimmed = raw.trim();
  if (trimmed.includes(':')) return trimmed;
  const totalSeconds = parseInt(trimmed, 10);
  if (isNaN(totalSeconds)) return '5:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

/** Throws if the feed can't be fetched or has no episodes. */
export async function fetchLiveEpisodes(): Promise<PodcastEpisode[]> {
  const parser: Parser<CustomFeed, CustomItem> = new Parser({
    customFields: {
      item: [
        ['itunes:duration', 'itunes.duration'],
        ['itunes:image', 'itunes.image', { keepArray: false }],
        ['itunes:author', 'itunes.author'],
        ['itunes:explicit', 'itunes.explicit'],
      ],
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
    requestOptions: {
      timeout: 10000,
    },
  });

  const feed = await parser.parseURL(RSS_FEED_URL);
  if (!feed.items || feed.items.length === 0) throw new Error('RSS feed has no items');

  const episodes: PodcastEpisode[] = feed.items.map((item) => {
    const rawDesc = item.contentSnippet || item.content || item.summary || '';
    const cleanDesc = stripHtml(rawDesc).substring(0, 250);

    // Extract itunes:image href - rss-parser stores it as an object with $ attrs
    let thumb = '/assets/img/podcast-logo.webp';
    const itunesImage = (item as any)['itunes:image'] || (item as any).itunes?.image;
    if (itunesImage) {
      if (typeof itunesImage === 'string') {
        thumb = itunesImage;
      } else if (itunesImage.$ && itunesImage.$.href) {
        thumb = itunesImage.$.href;
      } else if (itunesImage.href) {
        thumb = itunesImage.href;
      }
    }

    // Extract duration
    const rawDuration = (item as any)['itunes:duration'] || (item as any).itunes?.duration;
    let durationStr = '5:00';
    if (rawDuration) {
      if (typeof rawDuration === 'string') {
        durationStr = formatDuration(rawDuration);
      } else if (rawDuration._) {
        durationStr = formatDuration(rawDuration._);
      }
    }

    return {
      title: item.title || 'The Reverb Episode',
      guid: item.guid || (item as any).id || '',
      pubDate: item.pubDate || '',
      link: item.link || '#',
      description: cleanDesc,
      audioUrl: item.enclosure?.url || '',
      duration: durationStr,
      thumb,
    };
  });

  return episodes;
}
