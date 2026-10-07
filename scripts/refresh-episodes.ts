/**
 * Rewrites src/data/cached-episodes.json from the live Substack feed.
 * Production builds on GitHub Actions can't reach Substack and use this cache instead,
 * so run `npm run podcast:refresh` and commit the result whenever a new episode goes out.
 */
import { writeFileSync } from 'node:fs';
import { fetchLiveEpisodes } from '../src/lib/podcast-feed.ts';

const episodes = await fetchLiveEpisodes();
const file = new URL('../src/data/cached-episodes.json', import.meta.url);
writeFileSync(file, JSON.stringify(episodes, null, 2) + '\n');
console.log(`[podcast] Cached ${episodes.length} episodes, latest: ${episodes[0].title}`);
