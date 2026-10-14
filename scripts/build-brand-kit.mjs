/**
 * Builds the downloadable brand kit served from /brand.
 * Writes recoloured logo files, PNG exports, graphics and photos into public/brand/,
 * then zips them into public/brand/sandbox-reseau-brand-kit.zip.
 * Run `npm run brand:kit` after changing any source asset, and commit the output.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const pub = (path) => fileURLToPath(new URL(`public/${path}`, root));
const out = (path) => fileURLToPath(new URL(`public/brand/kit/${path}`, root));

const INK = '#0a0a0a';
const WHITE = '#ffffff';

rmSync(fileURLToPath(new URL('public/brand', root)), { recursive: true, force: true });
for (const dir of ['logo', 'monogram', 'graphics', 'photos']) mkdirSync(out(dir), { recursive: true });

// Wordmark: the source SVG is filled black; write ink and white versions plus transparent PNGs.
const wordmark = readFileSync(pub('assets/img/logo.svg'), 'utf8');
for (const [name, colour] of [['black', INK], ['white', WHITE]]) {
    const svg = wordmark.replaceAll('fill="#000000"', `fill="${colour}"`);
    writeFileSync(out(`logo/sandbox-reseau-wordmark-${name}.svg`), svg);
    await sharp(Buffer.from(svg), { density: 300 }).resize({ width: 2400 }).png().toFile(out(`logo/sandbox-reseau-wordmark-${name}.png`));
}

// Monogram: the favicon "S" on a rounded square, in dark (as shipped) and light versions.
const monogram = readFileSync(pub('favicon.svg'), 'utf8');
const monogramLight = monogram.replace(`fill="${INK}"`, 'fill="__BG__"').replace(`fill="${WHITE}"`, `fill="${INK}"`).replace('fill="__BG__"', `fill="${WHITE}"`);
for (const [name, svg] of [['dark', monogram], ['light', monogramLight]]) {
    writeFileSync(out(`monogram/sandbox-reseau-monogram-${name}.svg`), svg);
    await sharp(Buffer.from(svg), { density: 300 }).resize(1024, 1024).png().toFile(out(`monogram/sandbox-reseau-monogram-${name}.png`));
}

// Graphics and photography, copied as-is.
copyFileSync(pub('assets/img/cta-doodle-sweep.svg'), out('graphics/doodle-sweep.svg'));
copyFileSync(pub('assets/img/cta-doodle-spiral.svg'), out('graphics/doodle-spiral.svg'));
// The site's default link-preview (Open Graph) image, as set in src/layouts/Layout.astro.
copyFileSync(pub('assets/img/hero-poster.jpg'), out('graphics/link-preview-1280x720.jpg'));
// Recent photography: the two latest edition group shots, then speakers and panelists from the newest gallery set.
// Order matters: /brand shows the first two as landscape tiles and the rest as portraits.
const photos = ['vol5-pivoting', 'vol4-scaling', 'gallery-v4-6', 'gallery-v4-7', 'gallery-v3-5', 'gallery-v4-2'];
for (const [i, file] of photos.entries()) {
    copyFileSync(pub(`assets/img/${file}.jpg`), out(`photos/sandbox-reseau-photo-${i + 1}.jpg`));
}

// One zip with everything, for "download all".
execFileSync('zip', ['-rqX', '../sandbox-reseau-brand-kit.zip', '.'], { cwd: out('') });
console.log('[brand] Wrote public/brand/kit and public/brand/sandbox-reseau-brand-kit.zip');
