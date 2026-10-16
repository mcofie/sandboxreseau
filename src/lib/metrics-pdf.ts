/**
 * One-click PDF export for the Metrics Check, drawn with jsPDF in the Sandbox Réseau report
 * house style (Ink on Paper, Inter, lime accent, brush doodles), mirroring the Startup Metrics
 * Cheat Sheet. Loaded on demand from /tools/metrics; fonts and images come from
 * /tools/metrics-pdf/ (Inter and Libre Baskerville subset to Latin plus currency symbols and →).
 *
 * Structure: cover · where you stand (headline numbers, priorities, scorecard) · the detail
 * (attention metrics in full, healthy ones as compact rows, sections flowing on) · next 30 days ·
 * back cover.
 */
import { jsPDF } from 'jspdf';
import { BUCKETS, RATES_DATE, SIGNALS, STAGES, currencyOf, money, type MetricResult, type Report } from './metrics';

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
    const bucketOf = (id: string) => BUCKETS.find((b) => b.id === id)!;
    const pad = (n: number) => String(n).padStart(2, '0');
    const leadMove = (m: MetricResult) => m.moves[m.id === 1 ? 1 : 0];

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
        const { lh = 1.42, draw = true } = opts;
        font(f, size, colour);
        const lines = doc.splitTextToSize(t, w) as string[];
        if (draw) lines.forEach((line, i) => doc.text(line, x, y + i * size * lh, { baseline: 'top' }));
        return lines.length * size * lh;
    }
    function kicker(t: string, x: number, y: number, colour: string, dot?: string) {
        if (dot) {
            fill(dot);
            doc.circle(x + 3, y + 3.5, 2.5, 'F');
            x += 11;
        }
        font('semibold', 7.5, colour);
        doc.text(t.toUpperCase(), x, y, { baseline: 'top', charSpace: 1.1 });
    }
    /** Signal pill, right-aligned to `right` when given. Returns its width. */
    function pill(m: MetricResult, x: number, y: number, right = false) {
        const label = m.signal ? SIGNALS[m.signal].label : 'Info';
        font('semibold', 8, m.signal ? INK : MUTED);
        const w = doc.getTextWidth(label) + 22;
        const left = right ? x - w : x;
        fill('#ffffff');
        stroke(LINE, 0.8);
        doc.roundedRect(left, y, w, 17, 8.5, 8.5, 'FD');
        fill(m.signal ? SIGNALS[m.signal].colour : '#c8c8c8');
        doc.circle(left + 9.5, y + 8.5, 2.8, 'F');
        doc.text(label, left + 16, y + 4.4, { baseline: 'top' });
        return w;
    }

    // ---------- page furniture ----------
    let y = 0;
    let section = '';
    let sectionColour = GREEN_DOT;
    const furnished: { n: number; section: string; colour: string }[] = [];
    function newPage(title = section, colour = sectionColour) {
        doc.addPage();
        section = title;
        sectionColour = colour;
        furnished.push({ n: doc.getNumberOfPages(), section, colour });
        y = TOP;
    }
    function ensure(h: number) {
        if (y + h > BOTTOM) newPage();
    }
    function furnish() {
        for (const f of furnished) {
            doc.setPage(f.n);
            const w = text('Sandbox Réseau', M, 38, 'semibold', 8);
            text('Startup Metrics Check', M + w + 8, 38, 'regular', 8, MUTED);
            const sw = text(f.section, W - M, 38, 'semibold', 8, INK, 'right');
            fill(f.colour);
            doc.circle(W - M - sw - 8, 41.5, 2.5, 'F');
            stroke(LINE);
            doc.line(M, 56, W - M, 56);
            text(pad(f.n), M, H - 44, 'semibold', 9);
            text(`Prepared for ${name} · ${monthYear}`, W - M, H - 43, 'regular', 8, MUTED, 'right');
        }
    }

    // ================= COVER =================
    fill(INK);
    doc.rect(0, 0, W, H, 'F');
    const dw = 300;
    doc.addImage(doodleWhite.data, 'PNG', W - dw + 70, -60, dw, (dw * doodleWhite.h) / doodleWhite.w);
    doc.addImage(logoWhite.data, 'PNG', M, 52, 96, (96 * logoWhite.h) / logoWhite.w);

    let cy = 340;
    kicker('Startup Metrics Check', M, cy, LIME, LIME);
    cy += 26;
    cy += para(name, M, cy, CW - 40, 'semibold', name.length > 18 ? 40 : 54, '#ffffff', { lh: 1.04 });
    cy += 10;
    cy += para('Your numbers, diagnosed.', M, cy, CW, 'serif', 30, LIME, { lh: 1.2 });
    cy += 24;
    para(`${stage.name}  ·  ${currency.name}  ·  ${date}`, M, cy, CW, 'regular', 10.5, '#b5b5b5');

    stroke('#2c2c2c', 0.8);
    doc.line(M, 618, W - M, 618);
    const colW = CW / 4;
    (Object.keys(SIGNALS) as (keyof typeof SIGNALS)[]).forEach((s, i) => {
        const x = M + i * colW;
        para(String(r.counts[s]), x, 640, colW, 'semibold', 40, SIGNALS[s].colour, { lh: 1 });
        para(SIGNALS[s].label, x, 688, colW - 12, 'regular', 9.5, '#bdbdbd');
    });
    para(`${r.computed} of 16 metrics calculated · Based on the Startup Metrics Cheat Sheet, Accra Early-Stage Edition`, M, H - 60, CW, 'regular', 8, '#8a8a8a');

    // ================= WHERE YOU STAND =================
    newPage('Where You Stand', GREEN_DOT);
    kicker('Your diagnosis', M, y, MUTED, GREEN_DOT);
    y += 18;
    y += para('Where you stand.', M, y, CW, 'semibold', 30, INK, { lh: 1.1 });
    y += 10;
    const focusNames = stage.focus.length < 16 ? r.metrics.filter((m) => m.focus).map((m) => m.name.split(' (')[0].toLowerCase()) : [];
    const stagePhrase: Record<string, string> = { mvp: 'At the MVP stage', pmf: 'With post-PMF signal', scaling: 'At the scaling stage' };
    const focusList = `${focusNames.slice(0, -1).join(', ')}${focusNames.length > 1 ? ' and ' : ''}${focusNames.at(-1)}`;
    y += para(
        `${r.computed === 16 ? 'All 16 metrics' : `${r.computed} of the 16 metrics`} in the cheat sheet were calculated from the numbers you shared. ${
            focusNames.length ? `${stagePhrase[stage.id] ?? 'At your stage'}, focus on ${focusList}.` : 'At the scaling stage, every metric matters.'
        }`,
        M,
        y,
        CW - 60,
        'regular',
        10.5,
        BODY,
        { lh: 1.5 },
    );
    y += 20;

    // Headline numbers: the four that say the most, in this order of preference.
    const headline = [7, 15, 16, 1, 5, 2, 12, 6]
        .map((id) => r.metrics.find((m) => m.id === id)!)
        .filter((m) => !m.missing)
        .slice(0, 4);
    if (headline.length) {
        const gap = 8;
        const bw = (CW - gap * (headline.length - 1)) / headline.length;
        const bh = 74;
        headline.forEach((m, i) => {
            const x = M + i * (bw + gap);
            fill(INK);
            doc.roundedRect(x, y, bw, bh, 12, 12, 'F');
            // Largest size (up to 22pt) that fits the box.
            let size = 22;
            font('semibold', size);
            while (size > 11 && doc.getTextWidth(m.display) > bw - 28) font('semibold', --size);
            text(m.display, x + 14, y + 14, 'semibold', size, '#ffffff');
            fill(m.signal ? SIGNALS[m.signal].colour : '#8a8a8a');
            doc.circle(x + 17, y + bh - 19, 3, 'F');
            para(m.name.split(' (')[0], x + 25, y + bh - 24, bw - 34, 'regular', 8.5, '#bdbdbd', { lh: 1.2 });
        });
        y += bh + 22;
    }

    // Fix these first
    const pr = r.priorities;
    const prItem = (m: MetricResult, i: number, top: number, draw: boolean) => {
        const tx = M + 54;
        const tw = CW - 78;
        if (draw) {
            fill(INK);
            doc.circle(M + 33, top + 8.5, 10, 'F');
            text(String(i + 1), M + 33, top + 4, 'semibold', 9.5, LIME, 'center');
            const nw = text(m.name, tx, top + 2.5, 'semibold', 11);
            const vw = text(m.display, tx + nw + 8, top + 3.5, 'medium', 10, MUTED);
            pill(m, tx + nw + 16 + vw, top);
        }
        let h = 23;
        h += para(m.redFlag ?? m.signalText, tx, top + h, tw, 'regular', 9.5, BODY, { draw });
        const move = leadMove(m);
        if (move) h += 3 + para(`→  ${move}`, tx, top + h + 3, tw, 'medium', 9.5, INK, { draw });
        return h;
    };
    const prHeights = pr.map((m, i) => prItem(m, i, 0, false));
    const boxH = 54 + (pr.length ? prHeights.reduce((a, b) => a + b, 0) + (pr.length - 1) * 14 : 16);
    ensure(boxH);
    fill(MIST);
    doc.roundedRect(M, y, CW, boxH, 14, 14, 'F');
    kicker('Fix these first', M + 22, y + 20, INK, RED);
    let py = y + 40;
    if (pr.length) {
        pr.forEach((m, i) => {
            prItem(m, i, py, true);
            py += prHeights[i] + 14;
        });
    } else para('Nothing urgent in the numbers you shared. Keep tracking them weekly.', M + 22, py, CW - 44, 'regular', 10, BODY);
    y += boxH + 26;

    // Scorecard
    ensure(90);
    y += para('The scorecard', M, y, CW, 'semibold', 14, INK);
    y += 10;
    const col = { name: M + 28, value: M + 300, signal: M + 404 };
    font('semibold', 7, MUTED);
    doc.text('METRIC', col.name, y, { baseline: 'top', charSpace: 1 });
    doc.text('RESULT', col.value, y, { baseline: 'top', charSpace: 1 });
    doc.text('SIGNAL', col.signal, y, { baseline: 'top', charSpace: 1 });
    y += 13;
    stroke(INK, 1);
    doc.line(M, y, W - M, y);
    for (const b of BUCKETS) {
        ensure(20 + 21);
        fill(b.tint);
        doc.rect(M, y, CW, 19, 'F');
        kicker(`${b.name} · ${b.question}`, M + 8, y + 6, b.colour, b.colour);
        y += 19;
        for (const m of r.metrics.filter((x) => x.bucket === b.id)) {
            ensure(21);
            text(pad(m.id), M + 8, y + 6.5, 'semibold', 8.5, b.colour);
            text(m.name, col.name, y + 6, 'medium', 9, m.missing ? FAINT : INK);
            if (m.missing) text('Not enough data', col.value, y + 6, 'regular', 9, FAINT);
            else {
                text(m.display, col.value, y + 6, 'semibold', 9);
                fill(m.signal ? SIGNALS[m.signal].colour : '#c8c8c8');
                doc.circle(col.signal + 4, y + 10.5, 3, 'F');
                text(m.signal ? SIGNALS[m.signal].label : 'Info', col.signal + 12, y + 6, 'regular', 9, m.signal ? INK : MUTED);
            }
            y += 21;
            stroke(LINE);
            doc.line(M, y, W - M, y);
        }
    }

    // ================= THE DETAIL =================
    /** Full write-up for a metric that needs attention. */
    const block = (m: MetricResult, top: number, colour: string, tint: string, draw: boolean) => {
        const focus = m.focus && stage.focus.length < 16;
        let h = 0;
        // The number sits beside the name, so the kicker only appears to flag a focus metric.
        if (focus) {
            if (draw) kicker('Focus at your stage', M, top, colour, colour);
            h += 15;
        }
        // Name on the left; value and signal on the right.
        font('semibold', 20, INK);
        const valueW = doc.getTextWidth(m.display);
        font('semibold', 8, INK);
        const pillW = doc.getTextWidth(m.signal ? SIGNALS[m.signal].label : 'Info') + 22;
        const nameW = CW - valueW - pillW - 52;
        if (draw) {
            text(pad(m.id), M, top + h + 2, 'regular', 15, colour);
            text(m.display, W - M - pillW - 10, top + h, 'semibold', 20, INK, 'right');
            pill(m, W - M, top + h + 3.5, true);
        }
        h += Math.max(26, para(m.name, M + 26, top + h + 1, nameW, 'semibold', 14, INK, { draw, lh: 1.2 }) + 6);
        h += para(m.signalText, M, top + h, CW, 'regular', 10, BODY, { draw });
        if (m.working) {
            h += 8;
            const lw = 92;
            const wh = 14 + para(m.working, M + lw, 0, CW - lw - 14, 'medium', 9.5, INK, { draw: false });
            if (draw) {
                fill(tint);
                doc.roundedRect(M, top + h, CW, wh, 7, 7, 'F');
                fill(colour);
                doc.rect(M, top + h, 3, wh, 'F');
                kicker('Calculation', M + 14, top + h + 8.5, colour);
                para(m.working, M + lw, top + h + 7, CW - lw - 14, 'medium', 9.5, INK);
            }
            h += wh;
        }
        if (m.note) {
            h += 7;
            h += para(m.note, M, top + h, CW, 'regular', 8.5, MUTED, { draw });
        }
        if (m.redFlag) {
            h += 8;
            const fh = 15 + para(m.redFlag, M + 86, 0, CW - 100, 'semibold', 9.5, INK, { draw: false });
            if (draw) {
                fill(RED_TINT);
                doc.roundedRect(M, top + h, CW, fh, 7, 7, 'F');
                kicker('Red flag', M + 14, top + h + 8.5, RED, RED);
                para(m.redFlag, M + 86, top + h + 7.5, CW - 100, 'semibold', 9.5, INK);
            }
            h += fh;
        }
        if (m.moves.length) {
            h += 12;
            if (draw) kicker('The move', M, top + h + 1, colour, colour);
            let mh = 0;
            m.moves.forEach((mv, i) => {
                const intro = m.id === 1 && i === 0;
                const t = para(mv, M + 104, top + h + mh, CW - 104, intro ? 'semibold' : 'regular', 9.5, intro ? INK : BODY, { draw });
                if (draw && !intro) {
                    fill(colour);
                    doc.circle(M + 96, top + h + mh + 6, 1.7, 'F');
                }
                mh += t + 4;
            });
            h += mh;
        }
        return h;
    };

    /** One compact row for a metric that's already healthy (or informational). */
    const row = (m: MetricResult, top: number, colour: string, draw: boolean) => {
        const vx = W - M - 92;
        const tw = vx - (M + 26) - 16;
        let h = 9;
        if (draw) {
            text(pad(m.id), M, top + h + 1, 'semibold', 9, colour);
            text(m.name, M + 26, top + h, 'semibold', 10.5);
            text(m.display, vx, top + h, 'semibold', 10.5, INK, 'right');
            pill(m, W - M, top + h - 3, true);
        }
        h += 16;
        h += para(m.signalText, M + 26, top + h, tw, 'regular', 9, MUTED, { draw });
        return h + 9;
    };

    // The detail follows on from the scorecard only if its intro and the first section fit together.
    const firstBucket = BUCKETS.find((b) => r.metrics.some((m) => m.bucket === b.id && !m.missing));
    const firstMetric = firstBucket && (r.metrics.filter((m) => m.bucket === firstBucket.id && !m.missing).find(needsAttention) ?? r.metrics.find((m) => m.bucket === firstBucket.id && !m.missing));
    const firstH = firstMetric ? (needsAttention(firstMetric) ? block(firstMetric, 0, firstBucket!.colour, firstBucket!.tint, false) : row(firstMetric, 0, firstBucket!.colour, false)) : 0;
    if (y + 36 + 110 + 74 + firstH > BOTTOM) newPage('Your Metrics', BUCKETS[0].colour);
    else y += 36;
    kicker('The detail', M, y, MUTED, GREEN_DOT);
    y += 18;
    y += para('Metric by metric.', M, y, CW, 'semibold', 30, INK, { lh: 1.1 });
    y += 8;
    y += para('Metrics that need attention get the full picture: how they’re calculated, any red flag, and the move. The healthy ones are listed after each section.', M, y, CW - 60, 'regular', 10.5, BODY, { lh: 1.5 });
    y += 24;

    BUCKETS.forEach((b, bi) => {
        const done = r.metrics.filter((m) => m.bucket === b.id && !m.missing);
        if (!done.length) return;
        const attention = done.filter(needsAttention);
        const healthy = done.filter((m) => !needsAttention(m));
        const first = attention[0] ? block(attention[0], 0, b.colour, b.tint, false) : row(healthy[0], 0, b.colour, false);
        // A section never starts at the foot of a page: its header travels with its first metric.
        if (y + 64 + first > BOTTOM) newPage(`Part ${pad(bi + 1)} · ${b.name}`, b.colour);
        else if (y > TOP) y += 10;
        if (y === TOP) {
            section = `Part ${pad(bi + 1)} · ${b.name}`;
            sectionColour = b.colour;
            furnished[furnished.length - 1] = { n: doc.getNumberOfPages(), section, colour: b.colour };
        }
        fill(b.colour);
        doc.rect(M, y, CW, 3, 'F');
        y += 14;
        kicker(`Part ${pad(bi + 1)} · ${b.name}`, M, y, b.colour, b.colour);
        y += 15;
        y += para(b.question, M, y, CW, 'semibold', 20, INK, { lh: 1.1 });
        y += 16;

        attention.forEach((m, i) => {
            const h = block(m, 0, b.colour, b.tint, false);
            if (i > 0) {
                ensure(h + 26);
                stroke(LINE, 0.8);
                doc.line(M, y, W - M, y);
                y += 16;
            } else ensure(h);
            block(m, y, b.colour, b.tint, true);
            y += h + 12;
        });

        if (healthy.length) {
            const heights = healthy.map((m) => row(m, 0, b.colour, false));
            ensure(26 + heights[0]);
            y += attention.length ? 6 : 0;
            kicker(attention.length ? 'Looking good' : 'All looking good', M, y, MUTED, '#14a03c');
            y += 12;
            healthy.forEach((m, i) => {
                ensure(heights[i]);
                stroke(LINE);
                doc.line(M, y, W - M, y);
                row(m, y, b.colour, true);
                y += heights[i];
            });
            stroke(LINE);
            doc.line(M, y, W - M, y);
            y += 8;
        }

        // Default alive / default dead chart closes the runway section.
        if (b.id === 'runway' && r.projection && r.projection.series.length > 1) {
            const p = r.projection;
            // Shrink the chart to fit what's left of the page rather than strand it on its own.
            const room = BOTTOM - y - 108;
            if (room < 80) newPage();
            const ch = Math.max(80, Math.min(130, BOTTOM - y - 108));
            y += 14;
            kicker('Figure · Default alive or default dead?', M, y, MUTED);
            y += 15;
            y += para(p.alive ? 'Revenue catches expenses before the cash runs out.' : 'The cash runs out before revenue catches expenses.', M, y, CW, 'semibold', 12, INK);
            y += para(`Monthly revenue growing at ${(p.growth * 100).toFixed(1).replace(/\.0$/, '')}% against flat monthly spend of ${money(p.series[0].expenses, cur)}.`, M, y + 2, CW, 'regular', 9, MUTED);
            y += 14;
            const pts = p.series;
            const last = pts[pts.length - 1].month || 1;
            const maxY = Math.max(...pts.map((d) => Math.max(d.revenue, d.expenses))) * 1.15;
            const px = (mo: number) => M + (mo / last) * CW;
            const py2 = (v: number) => y + (1 - v / maxY) * ch;
            stroke(LINE);
            [0.25, 0.5, 0.75].forEach((f) => doc.line(M, y + ch * f, W - M, y + ch * f));
            stroke(INK, 0.8);
            doc.line(M, y + ch, W - M, y + ch);
            stroke(INK, 1.4);
            doc.line(px(0), py2(pts[0].expenses), px(last), py2(pts[0].expenses));
            stroke('#92519b', 2.2);
            for (let k = 1; k < pts.length; k++) doc.line(px(pts[k - 1].month), py2(pts[k - 1].revenue), px(pts[k].month), py2(pts[k].revenue));
            const end = pts[pts.length - 1];
            if (p.alive) {
                fill('#ffffff');
                stroke('#92519b', 2);
                doc.circle(px(end.month), py2(end.expenses), 4.5, 'FD');
                text(`Profitable · month ${end.month}`, px(end.month) - 8, py2(end.expenses) - 16, 'semibold', 8.5, INK, 'right');
            } else {
                stroke(INK, 1);
                doc.setLineDashPattern([3, 3], 0);
                doc.line(px(end.month), y, px(end.month), y + ch);
                doc.setLineDashPattern([], 0);
                text(`Cash runs out · month ${end.month}`, px(end.month) - 6, y + 4, 'semibold', 8.5, INK, 'right');
            }
            text('Month 0', M, y + ch + 6, 'regular', 8, MUTED);
            text(`Month ${last}`, W - M, y + ch + 6, 'regular', 8, MUTED, 'right');
            y += ch + 22;
            fill('#92519b');
            doc.rect(M, y + 3, 10, 3, 'F');
            text('Revenue', M + 16, y, 'regular', 8.5, MUTED);
            fill(INK);
            doc.rect(M + 70, y + 3, 10, 3, 'F');
            text('Monthly spend', M + 86, y, 'regular', 8.5, MUTED);
            y += 18;
        }
    });

    // ================= NEXT 30 DAYS =================
    // Continues on the current page when the heading and first step fit, so the chart page isn't left half empty.
    if (y + 230 > BOTTOM) newPage('Next Steps', GREEN_DOT);
    else {
        y += 30;
        fill(LIME);
        doc.rect(M, y, 40, 4, 'F');
        y += 22;
    }
    kicker('Next steps', M, y, MUTED, GREEN_DOT);
    y += 18;
    y += para('Your next 30 days.', M, y, CW, 'semibold', 30, INK, { lh: 1.1 });
    y += 12;
    y += para('Metrics don’t build companies. People do. But these numbers tell you whether what you’re building is working. Start with the moves below, then run this check again next month and compare.', M, y, CW - 40, 'regular', 10.5, BODY, { lh: 1.5 });
    y += 22;
    const steps = pr.length
        ? pr.map((m) => ({ title: m.name, move: leadMove(m) ?? m.signalText, colour: bucketOf(m.bucket).colour }))
        : [{ title: 'Keep the dashboard alive', move: 'Nothing urgent stood out. Track these numbers weekly and re-run the check next month.', colour: GREEN_DOT }];
    steps.forEach((st, i) => {
        const h = para(st.move, M + 36, 0, CW - 80, 'regular', 10, BODY, { draw: false }) + 20;
        ensure(h + 16);
        stroke(st.colour, 1.4);
        doc.roundedRect(M, y + 1, 13, 13, 3, 3, 'S');
        text(pad(i + 1), W - M, y - 1, 'regular', 16, st.colour, 'right');
        text(st.title, M + 36, y, 'semibold', 11.5);
        para(st.move, M + 36, y + 19, CW - 80, 'regular', 10, BODY);
        y += h + 14;
        stroke(LINE);
        doc.line(M, y - 7, W - M, y - 7);
    });

    // What would complete the picture.
    const missing = r.metrics.filter((m) => m.missing);
    if (missing.length) {
        y += 14;
        const lines = missing.map((m) => `${m.name}: ${m.missing!.charAt(0).toLowerCase()}${m.missing!.slice(1)}`);
        const half = Math.ceil(lines.length / 2);
        const cols = [lines.slice(0, half), lines.slice(half)];
        const cw2 = (CW - 56) / 2;
        const colH = cols.map((c) => c.reduce((a, t) => a + para(t, 0, 0, cw2, 'regular', 8.5, BODY, { draw: false }) + 5, 0));
        const mh = 48 + Math.max(...colH);
        ensure(mh);
        fill(MIST);
        doc.roundedRect(M, y, CW, mh, 12, 12, 'F');
        kicker(`Complete the picture · ${missing.length} more metric${missing.length > 1 ? 's' : ''}`, M + 20, y + 18, INK, GREEN_DOT);
        cols.forEach((c, ci) => {
            let my = y + 38;
            c.forEach((t) => (my += para(t, M + 20 + ci * (cw2 + 16), my, cw2, 'regular', 8.5, BODY) + 5));
        });
        y += mh + 16;
    } else y += 14;

    // ================= BACK COVER =================
    doc.addPage();
    fill(INK);
    doc.rect(0, 0, W, H, 'F');
    doc.addImage(doodleWhite.data, 'PNG', W - dw + 70, -60, dw, (dw * doodleWhite.h) / doodleWhite.w);
    kicker('Go deeper', M, 400, LIME, LIME);
    const deeperH = para('Read the Startup Metrics Cheat Sheet for what every number means, then run this check again next month and compare.', M, 420, CW - 160, 'medium', 13, '#ffffff', { lh: 1.45 });
    para('sandboxreseau.com/reports  ·  sandboxreseau.com/tools/metrics', M, 420 + deeperH + 10, CW, 'regular', 9, '#bdbdbd');
    para('Know your numbers.\nBuild intentionally.', M, H - 230, CW, 'semibold', 30, '#ffffff', { lh: 1.15 });
    para(`Startup Metrics Check for ${name} · ${date}`, M, H - 142, CW, 'regular', 9, '#bdbdbd');
    para('Sandbox Réseau: high-signal, no fluff. Accra’s builder community. sandboxreseau.com', M, H - 128, CW - 100, 'regular', 9, '#bdbdbd');
    const disclaimer = `Benchmarks are guides for early-stage startups, taken from the Startup Metrics Cheat Sheet, and not financial advice.${
        cur === 'USD' ? '' : ` Dollar equivalents use ${currency.name} rates from ${RATES_DATE}.`
    } Your numbers were processed in your browser and never sent to Sandbox Réseau.`;
    para(disclaimer, M, H - 92, CW - 110, 'regular', 7.5, '#8a8a8a', { lh: 1.5 });
    doc.addImage(logoWhite.data, 'PNG', W - M - 80, H - 96, 80, (80 * logoWhite.h) / logoWhite.w);

    furnish();
    doc.setProperties({ title: `${name} · Startup Metrics Check`, author: 'Sandbox Réseau', subject: 'Startup Metrics Check', creator: 'sandboxreseau.com' });
    const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'startup';
    doc.save(`${slug}-metrics-check.pdf`);
}
