/**
 * Fetches and parses podcast episodes from the Substack RSS feed at build time.
 * This runs server-side during `astro build` so there are no CORS issues.
 */

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

const RSS_FEED_URL = 'https://api.substack.com/feed/podcast/7581260.rss';

function formatDuration(raw: string): string {
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

export async function fetchPodcastEpisodes(): Promise<PodcastEpisode[]> {
  try {
    const response = await fetch(RSS_FEED_URL);
    if (!response.ok) {
      console.error(`RSS fetch failed: ${response.status}`);
      return [];
    }

    const xml = await response.text();

    // Parse XML manually since we're in Node (no DOMParser)
    const episodes: PodcastEpisode[] = [];
    const items = xml.split('<item>').slice(1); // Skip channel header

    for (const item of items) {
      const getTag = (tag: string): string => {
        // Handle CDATA sections
        const cdataMatch = item.match(new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`));
        if (cdataMatch) return cdataMatch[1].trim();
        const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
        return match ? match[1].trim() : '';
      };

      const getAttr = (tag: string, attr: string): string => {
        const match = item.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };

      const title = getTag('title');
      const guid = getTag('guid');
      const pubDate = getTag('pubDate');
      const link = getTag('link');
      const rawDesc = getTag('description');
      const audioUrl = getAttr('enclosure', 'url');
      const rawDuration = getTag('itunes:duration');
      const thumb = getAttr('itunes:image', 'href');

      const cleanDesc = stripHtml(rawDesc)
        .replace(/"([A-Z])/g, '" $1')
        .substring(0, 250);

      episodes.push({
        title,
        guid,
        pubDate,
        link,
        description: cleanDesc,
        audioUrl,
        duration: formatDuration(rawDuration || '300'),
        thumb: thumb || '/assets/img/podcast-logo.png',
      });
    }

    return episodes;
  } catch (e) {
    console.error('Failed to fetch podcast RSS:', e);
    return [];
  }
}
