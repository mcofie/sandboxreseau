/**
 * One-click PDF export for the Metrics Check, drawn with jsPDF in the Sandbox Réseau report
 * house style (Ink on Paper, Inter, lime accent, brush doodles), mirroring the Startup Metrics
 * Cheat Sheet. Loaded on demand from /tools/metrics; fonts and images come from
 * /tools/metrics-pdf/ (Inter and Libre Baskerville subset to Latin plus currency symbols and →).
 *
 * Laid out like the playbooks and the cheat sheet itself: cover · the verdict (headline with a
 * serif accent and a stat band) · fix these first (numbered like "The golden rules") · the metrics
 * map (Figure 0.1) · one part per area (opener, a "What good looks like" style table, then the
 * metrics that need attention in the cheat sheet's metric format) · back cover.
 */
import { jsPDF } from 'jspdf';
import { BUCKETS, RATES_DATE, SIGNALS, STAGES, currencyOf, money, verdict, type MetricResult, type Report } from './metrics';

const ASSETS = '/tools/metrics-pdf';
const W = 595.28;
const H = 841.89;
const M = 48;
const CW = W - M * 2;
const TOP = 88;
const BOTTOM = H - 72;

const INK = '#0a0a0a';
const BODY = '#2a2a2a';
const MUTED = '#6b6b6b';
const FAINT = '#a1a1a1';
const LINE = '#e4e4e4';
const MIST = '#f5f5f5';
const LIME = '#d3fa69';
const GREEN_DOT = '#8fbf24';
const RED = '#d93a3a';
const RED_TINT = '#fbecec';

type Font = 'regular' | 'medium' | 'semibold' | 'bold' | 'serif';
const FONTS: Record<Font, [file: string, family: string]> = {
    regular: ['Inter-Regular.ttf', 'Inter'],
    medium: ['Inter-Medium.ttf', 'InterMedium'],
    semibold: ['Inter-SemiBold.ttf', 'InterSemiBold'],
    bold: ['Inter-Bold.ttf', 'InterBold'],
    serif: ['LibreBaskerville-Italic.ttf', 'Baskerville'],
};
type Img = { data: string; w: number; h: number };

async function base64(url: string) {
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
}
async function image(url: string): Promise<Img> {
    const data = `data:image/png;base64,${await base64(url)}`;
    const el = new Image();
    el.src = data;
    await el.decode();
    return { data, w: el.naturalWidth, h: el.naturalHeight };
}

/** Metrics that earn a full write-up: anything not yet strong, or carrying a red flag. */
const needsAttention = (m: MetricResult) => (m.signal !== null && m.signal !== 'strong') || Boolean(m.redFlag);

export async function downloadReport(report: Report) {
    const [fonts, logoWhite, doodleWhite] = await Promise.all([
        Promise.all(Object.values(FONTS).map(([file]) => base64(`${ASSETS}/${file}`))),
        image(`${ASSETS}/logo-white.png`),
        image(`${ASSETS}/doodle-white.png`),
    ]);

    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    Object.values(FONTS).forEach(([file, family], i) => {
        doc.addFileToVFS(file, fonts[i]);
        doc.addFont(file, family, 'normal');
    });

    const r = report;
    const cur = r.inputs.currency ?? 'GHS';
    const currency = currencyOf(cur);
    const name = r.inputs.name?.trim() || 'Your startup';
    const stage = STAGES.find((s) => s.id === r.inputs.stage) ?? STAGES[2];
    const today = new Date();
    const date = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const monthYear = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const pad = (n: number) => String(n).padStart(2, '0');
    const leadMove = (m: MetricResult) => m.moves[m.id === 1 ? 1 : 0];
    const shortName = (m: MetricResult) => m.name.split(' (')[0];

    // ---------- drawing helpers ----------
    const fill = (c: string) => doc.setFillColor(c);
    const stroke = (c: string, w = 0.6) => {
        doc.setDrawColor(c);
        doc.setLineWidth(w);
    };
    function font(f: Font, size: number, colour = INK) {
        doc.setFont(FONTS[f][1], 'normal');
        doc.setFontSize(size);
        doc.setTextColor(colour);
    }
    function text(t: string, x: number, y: number, f: Font, size: number, colour = INK, align: 'left' | 'right' | 'center' = 'left') {
        font(f, size, colour);
        doc.text(t, x, y, { baseline: 'top', align });
        return doc.getTextWidth(t);
    }
    /** Wrapped text from the top-left corner. Returns the height used; draws only when draw is true. */
    function para(t: string, x: number, y: number, w: number, f: Font, size: number, colour = INK, opts: { lh?: number; draw?: boolean } = {}) {
        const { lh = 1.45, draw = true } = opts;
        font(f, size, colour);
        const lines = doc.splitTextToSize(t, w) as string[];
        if (draw) lines.forEach((line, i) => doc.text(line, x, y + i * size * lh, { baseline: 'top' }));
        return lines.length * size * lh;
    }
    /** Wrapped text mixing fonts and colours, e.g. a bold lead-in or a serif accent. Returns the height used. */
    type Seg = [t: string, f: Font, colour?: string];
    function rich(segs: Seg[], x: number, y: number, w: number, size: number, opts: { lh?: number; draw?: boolean; colour?: string } = {}) {
        const { lh = 1.45, draw = true, colour = INK } = opts;
        let cx = 0;
        let line = 0;
        for (const [t, f, c] of segs) {
            font(f, size, c ?? colour);
            const space = doc.getTextWidth(' ');
            for (const word of t.split(/\s+/)) {
                if (!word) continue;
                const ww = doc.getTextWidth(word);
                if (cx > 0 && cx + ww > w) {
                    line++;
                    cx = 0;
                }
                if (draw) doc.text(word, x + cx, y + line * size * lh, { baseline: 'top' });
                cx += ww + space;
            }
        }
        return (line + 1) * size * lh;
    }
    /** Spaced small caps label. Returns the x where it ends. */
    function kicker(t: string, x: number, y: number, colour: string, dot?: string, size = 7.5) {
        if (dot) {
            fill(dot);
            doc.circle(x + 3, y + size * 0.45, 2.6, 'F');
            x += 12;
        }
        const up = t.toUpperCase();
        font('semibold', size, colour);
        doc.text(up, x, y, { baseline: 'top', charSpace: 1.2 });
        return x + doc.getTextWidth(up) + up.length * 1.2;
    }
    const sigColour = (m: MetricResult) => (m.signal ? SIGNALS[m.signal].colour : '#c8c8c8');
    const sigLabel = (m: MetricResult) => (m.signal ? SIGNALS[m.signal].label : 'For reference');
    const dot = (colour: string, x: number, y: number, rad = 2.8) => {
        fill(colour);
        doc.circle(x, y, rad, 'F');
    };
    /** "Map the drop-off. Where exactly…" → bold lead sentence, regular rest, as in the cheat sheet. */
    function leadSegs(t: string): Seg[] {
        const i = t.search(/[.:!?]\s/);
        return i > 0 && i < 70 ? [[t.slice(0, i + 1), 'semibold'], [t.slice(i + 1), 'regular', BODY]] : [[t, 'regular', BODY]];
    }
    /** "FIGURE 1.1 │ Title / subtitle", the playbooks' figure caption. Returns the height used. */
    function figure(label: string, title: string, sub: string, top: number) {
        kicker(label, M, top + 3, MUTED, undefined, 7);
        stroke(INK, 0.8);
        doc.line(M + 76, top, M + 76, top + 30);
        text(title, M + 88, top, 'semibold', 12);
        para(sub, M + 88, top + 17, CW - 88, 'regular', 8.5, MUTED);
        return 42;
    }

    // ---------- page furniture ----------
    let y = 0;
    let section = '';
    let sectionColour = GREEN_DOT;
    const furnished: { n: number; section: string; part?: string; colour: string; dark?: boolean }[] = [];
    let part: string | undefined;
    function newPage(title = section, colour = sectionColour, dark = false) {
        doc.addPage();
        section = title;
        sectionColour = colour;
        furnished.push({ n: doc.getNumberOfPages(), section, part, colour, dark });
        y = TOP;
    }
    function ensure(h: number) {
        if (y + h > BOTTOM) newPage();
    }
    function furnish() {
        for (const f of furnished) {
            doc.setPage(f.n);
            const w = text('Sandbox Réseau', M, 36, 'semibold', 7.5);
            text('Startup Metrics Check', M + w + 8, 36, 'regular', 7.5, MUTED);
            const sw = text(f.section, W - M, 36, 'semibold', 7.5, INK, 'right');
            const pw = f.part ? text(`${f.part} · `, W - M - sw, 36, 'regular', 7.5, MUTED, 'right') : 0;
            dot(f.colour, W - M - sw - pw - 8, 39.2, 2.6);
            text(pad(f.n), M, H - 40, 'semibold', 9, f.dark ? '#ffffff' : INK);
            text(`${monthYear} · Prepared for ${name}`, W - M, H - 39, 'regular', 7.5, f.dark ? '#bdbdbd' : MUTED, 'right');
        }
    }
    const dw = 300;
    const doodle = (x: number, top: number, width = dw) => doc.addImage(doodleWhite.data, 'PNG', x, top, width, (width * doodleWhite.h) / doodleWhite.w);

    /** Default alive or default dead: revenue at today's growth against flat spend. Returns the height used. */
    let chartShown = false;
    function chartFigure(label: string, top: number, ch: number) {
        const p = r.projection!;
        const colour = BUCKETS[4].colour;
        let y = top;
        y += figure(
            label,
            p.alive ? (p.month === 0 ? 'Default alive: already profitable' : `Default alive: profitable in month ${p.month}`) : `Default dead: cash runs out in month ${p.month ?? '60+'}`,
            `Monthly revenue growing at ${(p.growth * 100).toFixed(1).replace(/\.0$/, '')}% against flat monthly spend of ${money(p.series[0].expenses, cur)}.`,
            y,
        );
        y += 8;
        const pts = p.series;
        const last = pts[pts.length - 1].month || 1;
        // Round gridlines: a 1, 2, 2.5 or 5 step that gives about four lines.
        const peak = Math.max(...pts.map((d) => Math.max(d.revenue, d.expenses))) * 1.1;
        const pow = 10 ** Math.floor(Math.log10(peak / 4));
        const step = ([1, 2, 2.5, 5, 10].find((n) => n * pow >= peak / 4) ?? 10) * pow;
        const maxY = step * Math.ceil(peak / step);
        const gx = M + 44;
        const gw = CW - 44 - 92;
        const px = (mo: number) => gx + (mo / last) * gw;
        const py2 = (v: number) => y + (1 - v / maxY) * ch;
        doc.setLineDashPattern([2, 2], 0);
        stroke(LINE, 0.6);
        for (let v = step; v <= maxY + 1e-6; v += step) {
            doc.line(gx, py2(v), gx + gw, py2(v));
            text(money(v, cur), gx - 6, py2(v) - 3.5, 'regular', 6.5, FAINT, 'right');
        }
        doc.setLineDashPattern([], 0);
        stroke('#c8c8c8', 0.8);
        doc.line(gx, y + ch, gx + gw, y + ch);
        stroke(INK, 1.4);
        doc.line(px(0), py2(pts[0].expenses), px(last), py2(pts[0].expenses));
        stroke(colour, 2.2);
        for (let k = 1; k < pts.length; k++) doc.line(px(pts[k - 1].month), py2(pts[k - 1].revenue), px(pts[k].month), py2(pts[k].revenue));
        const end = pts[pts.length - 1];
        dot(colour, px(last), py2(end.revenue), 3);
        dot(INK, px(last), py2(end.expenses), 3);
        // End labels, nudged apart when the lines finish close together.
        let rl = py2(end.revenue) - 4;
        let el = py2(end.expenses) - 4;
        if (Math.abs(rl - el) < 12) {
            const mid = (rl + el) / 2;
            [rl, el] = rl <= el ? [mid - 6.5, mid + 6.5] : [mid + 6.5, mid - 6.5];
        }
        text(`Revenue: ${money(end.revenue, cur)}`, px(last) + 8, rl, 'semibold', 7.5, colour);
        text(`Spend: ${money(end.expenses, cur)}`, px(last) + 8, el, 'semibold', 7.5, INK);
        if (!p.alive) {
            stroke(RED, 1);
            doc.setLineDashPattern([3, 3], 0);
            doc.line(px(end.month), y, px(end.month), y + ch);
            doc.setLineDashPattern([], 0);
        }
        [0, Math.round(last / 2), last].forEach((mo) => text(`Month ${mo}`, px(mo), y + ch + 6, 'regular', 7, MUTED, mo === 0 ? 'left' : mo === last ? 'right' : 'center'));
        y += ch + 26;
        stroke(LINE, 0.6);
        doc.line(M, y, W - M, y);
        chartShown = true;
        return y - top;
    }

    // ================= COVER =================
    fill(INK);
    doc.rect(0, 0, W, H, 'F');
    doodle(W - dw + 70, -60);
    doc.addImage(logoWhite.data, 'PNG', M, 46, 84, (84 * logoWhite.h) / logoWhite.w);
    let cy = H - 330;
    kicker('Startup Metrics Check', M, cy, LIME, LIME);
    cy += 24;
    cy += para(name, M, cy, CW - 40, 'semibold', name.length > 18 ? 40 : 56, '#ffffff', { lh: 1.04 });
    cy += 8;
    para('Your numbers, diagnosed.', M, cy, CW, 'serif', 30, LIME, { lh: 1.2 });
    stroke('#2c2c2c', 0.8);
    doc.line(M, H - 120, W - M, H - 120);
    para(`${stage.name}  ·  ${currency.name}  ·  ${date}`, M, H - 104, CW, 'regular', 9.5, '#bdbdbd');
    para('Based on the Startup Metrics Cheat Sheet, Accra Early-Stage Edition', M, H - 86, CW, 'regular', 8, '#8a8a8a');

    // ================= THE VERDICT =================
    // Laid out like "Why this exists": headline with a serif accent, two columns, a stat band.
    newPage('Your Verdict', GREEN_DOT, true);
    const { hero, sub } = verdict(r);
    kicker('Your diagnosis', M, y + 4, MUTED, GREEN_DOT);
    y += 26;
    const accent = hero.toLowerCase();
    const headSegs: Seg[] = r.projection ? [[`${name} is`, 'semibold'], [`${accent}.`, 'serif']] : [[`${name}:`, 'semibold'], [`${accent}.`, 'serif']];
    y += rich(headSegs, M, y, CW - 20, 34, { lh: 1.18 });
    y += 26;
    const colW = (CW - 36) / 2;
    const problems = r.counts.work + r.counts.danger;
    const leftH = para(sub, M, y, colW, 'semibold', 13.5, INK, { lh: 1.4 });
    para(
        problems ? `${problems} of your numbers need work. Fix those first: they’re on the next page, in order.` : 'Nothing is flashing red. Keep the habit of tracking.',
        M,
        y + leftH + 10,
        colW,
        'semibold',
        10.5,
    );
    let ry = y;
    ry += para(
        `This report runs the numbers you shared through the Startup Metrics Cheat Sheet: ${r.computed} of its 16 metrics, each rated against the benchmarks for early-stage startups.`,
        M + colW + 36,
        ry,
        colW,
        'regular',
        10.5,
        BODY,
        { lh: 1.6 },
    ) + 9;
    ry += para(`Your stage: ${stage.name}. ${stage.focus.length < 16 ? 'The metrics that matter most there are marked as focus in the map.' : 'At this stage, every metric matters.'}`, M + colW + 36, ry, colW, 'regular', 10.5, BODY, { lh: 1.6 }) + 9;
    ry += para(`${r.priorities.length ? `Fix the top ${['', 'one', 'two', 'three'][r.priorities.length] ?? 'three'}. ` : ''}Re-run it next month.`, M + colW + 36, ry, colW, 'semibold', 10.5);

    // The verdict's evidence, when there's cash data and room above the stat band.
    const bandTop = H - 220;
    const figTop = Math.max(y + leftH + 60, ry) + 40;
    const figCh = Math.min(150, bandTop - 44 - figTop - 76);
    if (r.projection && r.projection.series.length > 1 && figCh >= 90) chartFigure('Figure 0.1', figTop, figCh);

    // Stat band across the foot of the page.
    fill(INK);
    doc.rect(0, bandTop, W, H - bandTop, 'F');
    doodle(W - 110, bandTop - 6, 150);
    const runway = r.metrics.find((m) => m.id === 15);
    const stats: [string, string][] = [
        [String(r.computed), 'metrics calculated from your numbers'],
        [String(r.counts.strong), r.counts.strong === 1 ? 'already strong' : 'already strong'],
        [String(r.priorities.length), 'to fix first'],
        runway && !runway.missing ? [runway.display.replace(' months', ''), 'months of runway'] : [String(problems), 'need work'],
    ];
    const sw4 = CW / 4;
    stats.forEach(([v, l], i) => {
        let size = 30;
        font('semibold', size);
        while (size > 16 && doc.getTextWidth(v) > sw4 - 14) font('semibold', --size);
        text(v, M + i * sw4, bandTop + 58, 'semibold', size, LIME);
        para(l, M + i * sw4, bandTop + 98, sw4 - 20, 'regular', 8.5, '#bdbdbd');
    });

    // ================= FIX THESE FIRST =================
    // Numbered like the playbooks' "The golden rules".
    newPage('Fix These First', RED);
    y += para('Fix these first', M, y, CW, 'semibold', 26, INK, { lh: 1.15 });
    y += 6;
    y += para(r.priorities.length ? 'Before anything else, work through these, in this order:' : 'Nothing urgent stood out in the numbers you shared.', M, y, CW, 'semibold', 11, INK);
    y += 22;
    const ruleX = M + 64;
    const ruleW = CW - 64;
    r.priorities.forEach((m, i) => {
        const b = BUCKETS.find((x) => x.id === m.bucket)!;
        const move = leadMove(m);
        const measure = (draw: boolean, top: number) => {
            let h = 0;
            if (draw) {
                text(pad(i + 1), M, top - 2, 'regular', 26, b.colour);
                text(shortName(m), ruleX, top + 2, 'semibold', 13);
                const vw = text(sigLabel(m), W - M, top + 4, 'medium', 9, MUTED, 'right');
                dot(sigColour(m), W - M - vw - 8, top + 8.2);
                text(m.display, W - M - vw - 18, top + 2.5, 'semibold', 11, INK, 'right');
            }
            h += 24;
            h += para(m.redFlag ?? m.signalText, ruleX, top + h, ruleW, 'regular', 10, BODY, { draw, lh: 1.55 });
            if (move) h += 6 + rich([['The move:', 'semibold', b.colour], ...leadSegs(move)], ruleX, top + h + 6, ruleW, 10, { draw, lh: 1.55 });
            return h;
        };
        const h = measure(false, 0);
        ensure(h + 34);
        measure(true, y);
        y += h + 18;
        stroke(LINE, 0.8);
        doc.line(M, y, W - M, y);
        y += 18;
    });
    if (!r.priorities.length) para('Keep tracking these numbers weekly, and run this check again next month to compare.', M, y, CW, 'regular', 10.5, BODY);

    // ================= THE METRICS MAP =================
    // Figure 0.1 of the cheat sheet, filled in with your numbers.
    newPage('Your Metrics Map', GREEN_DOT);
    fill(MIST);
    doc.rect(0, 0, W, H, 'F');
    y += figure(chartShown ? 'Figure 0.2' : 'Figure 0.1', 'Your metrics map', 'All sixteen, in five areas, read left to right from your first users to survival.', y);
    y += 8;
    const gap = 7;
    const tw = (CW - gap * 4) / 5;
    BUCKETS.forEach((b, i) => {
        const x = M + i * (tw + gap);
        fill(b.colour);
        doc.roundedRect(x, y, tw, 80, 8, 8, 'F');
        text(pad(i + 1), x + 10, y + 10, 'semibold', 24, '#ffffff');
        const nh = para(b.name, x + 10, y + 46, tw - 16, 'semibold', 9.5, '#ffffff', { lh: 1.15 });
        para(b.question, x + 10, y + 46 + nh + 1, tw - 14, 'regular', 7, '#f2f2f2', { lh: 1.25 });
    });
    const tilesTop = y + 80 + gap;
    let tallest = 0;
    BUCKETS.forEach((b, i) => {
        const x = M + i * (tw + gap);
        r.metrics.filter((m) => m.bucket === b.id).forEach((m, k) => {
            const ty = tilesTop + k * (78 + gap);
            tallest = Math.max(tallest, ty + 78);
            fill('#ffffff');
            doc.roundedRect(x, ty, tw, 78, 7, 7, 'F');
            text(pad(m.id), x + 9, ty + 8, 'regular', 7, MUTED);
            if (m.focus && stage.focus.length < 16) kicker('Focus', x + 24, ty + 8.5, b.colour, undefined, 5.5);
            dot(m.missing ? '#d6d6d6' : sigColour(m), x + tw - 11, ty + 11, 3);
            text(m.short, x + 9, ty + 22, 'semibold', 19, m.missing ? '#c4c4c4' : b.colour);
            let vsize = 10;
            const v = m.missing ? 'No data' : m.display;
            font('semibold', vsize);
            while (vsize > 7 && doc.getTextWidth(v) > tw - 18) font('semibold', --vsize);
            text(v, x + 9, ty + 45, m.missing ? 'regular' : 'semibold', vsize, m.missing ? FAINT : INK);
            para(shortName(m), x + 9, ty + 58, tw - 16, 'regular', 6.8, MUTED, { lh: 1.2 });
        });
    });
    y = tallest + 18;
    kicker('First users', M, y, MUTED, undefined, 6.5);
    kicker('Survival', W - M - 44, y, MUTED, undefined, 6.5);
    stroke(INK, 0.8);
    doc.line(M + 62, y + 3, W - M - 54, y + 3);
    fill(INK);
    doc.triangle(W - M - 54, y + 3, W - M - 59, y + 0.6, W - M - 59, y + 5.4, 'F');
    y += 26;
    let lx = M;
    ([...Object.values(SIGNALS).map((sg) => [sg.colour, sg.label] as const), ['#c8c8c8', 'For reference'] as const, ['#d6d6d6', 'No data yet'] as const]).forEach(([c, l]) => {
        dot(c, lx + 3, y + 4);
        lx += 11 + text(l, lx + 11, y, 'regular', 8.5, BODY) + 16;
    });
    y += 24;
    rich([['How to read this:', 'semibold'], ['each tile is one metric from the cheat sheet, with your number and its rating. At any stage, obsess over three to five of them, not all sixteen.', 'regular', BODY]], M, y, CW, 10, { lh: 1.55 });

    // ================= ONE PART PER AREA =================
    /** The cheat sheet's metric format, filled in: your number, what it says, red flag, the move. */
    const metricBlock = (m: MetricResult, b: (typeof BUCKETS)[number], top: number, draw: boolean) => {
        let h = 0;
        if (draw) {
            fill(b.colour);
            doc.rect(M, top, CW, 2.5, 'F');
        }
        h += 18;
        if (draw) {
            const ex = kicker(`Metric ${pad(m.id)}`, M, top + h, b.colour, b.colour);
            kicker(` · ${b.name}${m.focus && stage.focus.length < 16 ? ' · Focus at your stage' : ''}`, ex, top + h, MUTED);
        }
        h += 16;
        if (draw) text(pad(m.id), M, top + h, 'regular', 20, b.colour);
        font('regular', 20);
        const nx = M + doc.getTextWidth(pad(m.id)) + 9;
        h += para(m.name, nx, top + h, W - M - nx, 'semibold', 20, INK, { draw, lh: 1.2 }) + 10;
        // "Your number" box, styled like "How to calculate it".
        const boxH = 18 + 24 + (m.working ? para(m.working, 0, 0, CW - 44, 'regular', 9.5, BODY, { draw: false }) + 4 : 0) + 12;
        if (draw) {
            fill(b.tint);
            doc.roundedRect(M, top + h, CW, boxH, 8, 8, 'F');
            fill(b.colour);
            doc.rect(M, top + h, 3, boxH, 'F');
            kicker(m.working ? 'Your number · How it was calculated' : 'Your number', M + 22, top + h + 13, b.colour);
            const vw = text(m.display, M + 22, top + h + 28, 'semibold', 17);
            dot(sigColour(m), M + 22 + vw + 14, top + h + 36.5, 3.2);
            text(sigLabel(m), M + 22 + vw + 22, top + h + 31.5, 'semibold', 10);
            if (m.working) para(m.working, M + 22, top + h + 54, CW - 44, 'regular', 9.5, BODY);
        }
        h += boxH + 12;
        h += rich([['What it says:', 'semibold'], [m.signalText, 'regular', BODY]], M, top + h, CW, 10.5, { draw, lh: 1.55 });
        if (m.note) h += 6 + para(m.note, M, top + h + 6, CW, 'regular', 9, MUTED, { draw });
        if (m.redFlag) {
            h += 12;
            const fh = 26 + para(m.redFlag, 0, 0, CW - 150, 'medium', 10.5, INK, { draw: false, lh: 1.45 }) - 10;
            if (draw) {
                fill(RED_TINT);
                doc.roundedRect(M, top + h, CW, fh, 8, 8, 'F');
                kicker('Red flag', M + 14, top + h + 11, RED, RED);
                para(m.redFlag, M + 132, top + h + 9, CW - 150, 'medium', 10.5, INK, { lh: 1.45 });
            }
            h += fh;
        }
        return h + 14;
    };
    /** One move under "The move"; the kicker sits beside the first. Moves may continue overleaf. */
    const moveItem = (m: MetricResult, b: (typeof BUCKETS)[number], i: number, top: number, draw: boolean) => {
        const intro = m.id === 1 && i === 0;
        if (draw && i === 0) kicker('The move', M, top + 2, b.colour, b.colour);
        if (draw && !intro) dot(b.colour, M + 126, top + 7.2, 1.9);
        return rich(intro ? [[m.moves[i], 'semibold']] : leadSegs(m.moves[i]), M + 136, top, CW - 136, 10, { draw, lh: 1.55 }) + 6;
    };

    BUCKETS.forEach((b, bi) => {
        const ms = r.metrics.filter((m) => m.bucket === b.id);
        const done = ms.filter((m) => !m.missing);
        const missing = ms.filter((m) => m.missing);
        const partLabel = `Part ${pad(bi + 1)}`;
        const title = `${b.name}${b.id === 'unit' || b.id === 'runway' ? '' : ' Metrics'}`;
        part = partLabel;
        // Parts flow on from each other; a part starts a fresh page only when its opener and table won't fit.
        const tableH = 33 + ms.reduce((a, m) => a + Math.max(26, para(m.missing ?? m.signalText, 0, 0, W - M - (M + 290) - 12, 'regular', 9, BODY, { draw: false }) + 16), 0);
        if (bi === 0 || y + 40 + 108 + tableH > BOTTOM) newPage(title, b.colour);
        else {
            y += 40;
            section = title;
            sectionColour = b.colour;
        }

        // Opener: big part number with the area name, like the cheat sheet's dividers, kept compact.
        text(pad(bi + 1), M - 3, y - 14, 'semibold', 74, b.colour);
        font('semibold', 74);
        const ox = M + doc.getTextWidth(pad(bi + 1)) + 14;
        text(b.name.toUpperCase(), ox, y + 12, 'bold', 22);
        text(b.question, ox, y + 40, 'regular', 12, BODY);
        y += 86;
        fill(b.colour);
        doc.rect(M, y, CW, 3, 'F');
        y += 22;

        // "What good looks like" style table: every metric in the area, with your number and its signal.
        const c1 = M, c2 = M + 190, c3 = M + 290;
        text('What your numbers look like', M, y, 'semibold', 11);
        y += 20;
        kicker('Metric', c1, y, b.colour, undefined, 7);
        kicker('Yours', c2, y, b.colour, undefined, 7);
        kicker('Signal', c3, y, b.colour, undefined, 7);
        y += 13;
        stroke(b.colour, 0.9);
        doc.line(M, y, W - M, y);
        ms.forEach((m) => {
            const sigText = m.missing ? m.missing : m.signalText;
            const rh = Math.max(26, para(sigText, 0, 0, W - M - c3 - 12, 'regular', 9, BODY, { draw: false }) + 16);
            ensure(rh);
            text(shortName(m), c1, y + 8, 'semibold', 9.5, m.missing ? FAINT : INK);
            if (m.missing) {
                text('No data', c2, y + 8, 'regular', 9.5, FAINT);
                para(sigText, c3, y + 8, W - M - c3, 'regular', 9, FAINT);
            } else {
                text(m.display, c2, y + 8, 'semibold', 9.5);
                dot(sigColour(m), c3 + 3, y + 12.4);
                para(sigText, c3 + 12, y + 8, W - M - c3 - 12, 'regular', 9, BODY);
            }
            y += rh;
            stroke(LINE, 0.6);
            doc.line(M, y, W - M, y);
        });
        y += 26;

        // Then the metrics that need attention, in the cheat sheet's metric format.
        done.filter(needsAttention).forEach((m) => {
            const h = metricBlock(m, b, 0, false);
            const firstMove = m.moves.length ? moveItem(m, b, 0, 0, false) : 0;
            if (y + h + firstMove > BOTTOM) newPage();
            metricBlock(m, b, y, true);
            y += h;
            m.moves.forEach((_, i) => {
                const mh = moveItem(m, b, i, 0, false);
                if (y + mh > BOTTOM) newPage();
                moveItem(m, b, i, y, true);
                y += mh;
            });
            y += 18;
        });
        if (!done.some(needsAttention) && done.length) {
            rich([['All good here.', 'semibold'], ['Nothing in this area needs attention right now. Keep tracking it.', 'regular', BODY]], M, y, CW, 10.5);
            y += 30;
        }

        // Without room for the chart on the verdict page, it closes the runway part instead.
        if (b.id === 'runway' && !chartShown && r.projection && r.projection.series.length > 1) {
            if (BOTTOM - y - 76 - 70 < 110) newPage();
            y += chartFigure('Figure 5.1', y, Math.min(170, BOTTOM - y - 76 - 70));
            y += 10;
            text('Note', M, y, 'semibold', 8.5);
            y += 13;
            y += para('Revenue grows at your current month-over-month rate; spending stays flat. If revenue crosses spend before the cash runs out, you’re default alive.', M, y, CW, 'regular', 8.5, MUTED) + 10;
        }
    });

    // ================= BACK COVER =================
    doc.addPage();
    fill(INK);
    doc.rect(0, 0, W, H, 'F');
    doodle(W - dw + 70, -60);
    kicker('Go deeper', M, H - 330, LIME, LIME);
    rich([['Know your numbers.', 'semibold', '#ffffff'], ['Build intentionally.', 'serif', LIME]], M, H - 306, CW - 120, 30, { lh: 1.2 });
    para('Read the Startup Metrics Cheat Sheet for what every number means and why it matters early, then run this check again next month and compare.', M, H - 216, CW - 150, 'regular', 10.5, '#bdbdbd', { lh: 1.6 });
    para('sandboxreseau.com/reports  ·  sandboxreseau.com/tools/metrics', M, H - 166, CW, 'semibold', 9, '#ffffff');
    stroke('#2c2c2c', 0.8);
    doc.line(M, H - 120, W - M, H - 120);
    const disclaimer = `Benchmarks are guides for early-stage startups and not financial advice.${
        cur === 'USD' ? '' : ` Dollar equivalents use ${currency.name} rates from ${RATES_DATE}.`
    } Your numbers were processed in your browser and never sent to Sandbox Réseau.`;
    para(disclaimer, M, H - 100, CW - 130, 'regular', 7.5, '#8a8a8a', { lh: 1.55 });
    doc.addImage(logoWhite.data, 'PNG', W - M - 80, H - 102, 80, (80 * logoWhite.h) / logoWhite.w);

    furnish();
    doc.setProperties({ title: `${name} · Startup Metrics Check`, author: 'Sandbox Réseau', subject: 'Startup Metrics Check', creator: 'sandboxreseau.com' });
    const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'startup';
    doc.save(`${slug}-metrics-check.pdf`);
}
