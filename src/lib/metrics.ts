/**
 * Startup Metrics Check: turns a founder's raw numbers into the 16 metrics from the
 * Startup Metrics Cheat Sheet (July 2026, Accra Early-Stage Edition), each with its
 * benchmark signal, red flag and "the move".
 *
 * Benchmarks follow the cheat sheet's "What good looks like" tables. Where the document
 * disagrees with itself (e.g. the one-page dashboard's looser targets), the tables win.
 * Pure functions only: used by the /tools/metrics page and its PDF export.
 */

export type Signal = 'strong' | 'okay' | 'work' | 'danger';
export type Stage = 'idea' | 'mvp' | 'pmf' | 'scaling';
export type Currency = 'GHS' | 'NGN' | 'KES' | 'ZAR' | 'EGP' | 'XOF' | 'XAF' | 'RWF' | 'UGX' | 'TZS' | 'MAD' | 'ETB' | 'USD' | 'EUR' | 'GBP';
export type BucketId = 'growth' | 'engagement' | 'revenue' | 'unit' | 'runway';

export interface Inputs {
    name?: string;
    stage?: Stage;
    currency?: Currency;
    // Growth
    usersNow?: number;
    usersPrev?: number;
    usersPrev2?: number;
    usersPrev3?: number;
    signups?: number;
    activated?: number;
    invitesPerUser?: number;
    inviteConversion?: number; // %
    // Engagement
    dau?: number; // monthly actives are usersNow
    dauPrev?: number;
    d1?: number; // % of a signup cohort still active on day 1
    d7?: number; // %
    d30?: number; // %
    coreActionUsers?: number;
    // Revenue
    mrr?: number;
    mrrStart?: number;
    mrrLost?: number;
    mrr3Ago?: number;
    churnPrev?: number; // %
    // Unit economics
    smSpend?: number;
    newCustomers?: number;
    monthsCharging?: number;
    // Runway
    cash?: number;
    expenses?: number; // revenue for burn is MRR
}

export interface MetricResult {
    id: number;
    name: string;
    short: string;
    bucket: BucketId;
    value: number | null;
    display: string;
    signal: Signal | null;
    signalText: string;
    working: string;
    redFlag: string | null;
    moves: string[];
    missing: string | null;
    note: string | null;
    focus: boolean;
}

export interface Projection {
    alive: boolean;
    month: number | null; // profitable month (alive) or cash-out month (dead)
    cashLeft: number | null;
    growth: number; // monthly revenue growth used, as a fraction
    series: { month: number; revenue: number; expenses: number; cash: number }[];
}

export interface Report {
    inputs: Inputs;
    metrics: MetricResult[];
    priorities: MetricResult[];
    counts: Record<Signal, number>;
    projection: Projection | null;
    computed: number;
}

export const BUCKETS: { id: BucketId; name: string; question: string; colour: string; tint: string }[] = [
    { id: 'growth', name: 'Growth', question: 'Are we growing?', colour: '#2d6cb5', tint: '#e7eef7' },
    { id: 'engagement', name: 'Engagement', question: 'Do people stay?', colour: '#b07316', tint: '#f5ece0' },
    { id: 'revenue', name: 'Revenue', question: 'Are they paying?', colour: '#21917e', tint: '#e2f1ee' },
    { id: 'unit', name: 'Unit economics', question: 'Is each customer worth it?', colour: '#e06c4c', tint: '#fbebe6' },
    { id: 'runway', name: 'Runway', question: 'Will we survive?', colour: '#92519b', tint: '#f1e8f2' },
];

export const SIGNALS: Record<Signal, { label: string; colour: string }> = {
    strong: { label: 'Strong', colour: '#14a03c' },
    okay: { label: 'Okay', colour: '#f5b400' },
    work: { label: 'Needs work', colour: '#ee7f55' },
    danger: { label: 'Danger', colour: '#d93a3a' },
};

export const STAGES: { id: Stage; name: string; hint: string; focus: number[] }[] = [
    { id: 'idea', name: 'Idea / pre-MVP', hint: 'No product people can touch yet', focus: [] },
    { id: 'mvp', name: 'MVP / first users', hint: 'People are trying it', focus: [2, 6, 5] },
    { id: 'pmf', name: 'Post-PMF signal', hint: 'Users stay, some pay', focus: [1, 5, 7, 14, 15] },
    { id: 'scaling', name: 'Scaling', hint: 'You need the full dashboard', focus: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
];

/**
 * Units per US$ (mid-market, 16 October 2026). Only used to compare MRR with the cheat sheet's
 * dollar bands and to show a dollar equivalent; every other number stays in the founder's currency.
 */
export const CURRENCIES: { code: Currency; name: string; symbol: string; perUsd: number; region: 'Africa' | 'Global' }[] = [
    { code: 'GHS', name: 'Ghanaian cedi', symbol: 'GH₵', perUsd: 11.66, region: 'Africa' },
    { code: 'NGN', name: 'Nigerian naira', symbol: '₦', perUsd: 1331, region: 'Africa' },
    { code: 'KES', name: 'Kenyan shilling', symbol: 'KSh ', perUsd: 129.75, region: 'Africa' },
    { code: 'ZAR', name: 'South African rand', symbol: 'R', perUsd: 16.52, region: 'Africa' },
    { code: 'EGP', name: 'Egyptian pound', symbol: 'E£', perUsd: 53.46, region: 'Africa' },
    { code: 'XOF', name: 'West African CFA franc', symbol: 'CFA ', perUsd: 584.9, region: 'Africa' },
    { code: 'XAF', name: 'Central African CFA franc', symbol: 'FCFA ', perUsd: 584.9, region: 'Africa' },
    { code: 'RWF', name: 'Rwandan franc', symbol: 'RF ', perUsd: 1478, region: 'Africa' },
    { code: 'UGX', name: 'Ugandan shilling', symbol: 'USh ', perUsd: 4000, region: 'Africa' },
    { code: 'TZS', name: 'Tanzanian shilling', symbol: 'TSh ', perUsd: 2633, region: 'Africa' },
    { code: 'MAD', name: 'Moroccan dirham', symbol: 'MAD ', perUsd: 9.82, region: 'Africa' },
    { code: 'ETB', name: 'Ethiopian birr', symbol: 'Br ', perUsd: 161.6, region: 'Africa' },
    { code: 'USD', name: 'US dollar', symbol: '$', perUsd: 1, region: 'Global' },
    { code: 'EUR', name: 'Euro', symbol: '€', perUsd: 0.892, region: 'Global' },
    { code: 'GBP', name: 'British pound', symbol: '£', perUsd: 0.754, region: 'Global' },
];
export const RATES_DATE = '16 October 2026';
export const currencyOf = (code?: string) => CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

const SEVERITY: Record<Signal, number> = { danger: 3, work: 2, okay: 1, strong: 0 };

const has = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n);
const pos = (n: number | undefined): n is number => has(n) && n > 0;

function trim(n: number, digits = 1) {
    const s = n.toFixed(digits);
    return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}
export const pct = (n: number) => `${trim(n)}%`;
export function num(n: number, digits = 0) {
    return n.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
export function money(n: number, currency: Currency = 'GHS', digits?: number) {
    const symbol = currencyOf(currency).symbol;
    const d = digits ?? (Math.abs(n) < 100 && n % 1 !== 0 ? 2 : 0);
    const amount = Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
    return `${n < 0 ? '−' : ''}${symbol}${amount}`;
}
const months = (n: number) => `${trim(n)} ${Math.abs(n - 1) < 0.05 ? 'month' : 'months'}`;

type Band = [test: (v: number) => boolean, signal: Signal, text: string];
function band(v: number, bands: Band[]): { signal: Signal; signalText: string } {
    const hit = bands.find(([test]) => test(v)) ?? bands[bands.length - 1];
    return { signal: hit[1], signalText: hit[2] };
}

const MOVES: Record<number, string[]> = {
    1: [
        'If growth is slowing, the answer is almost never “more marketing.” It’s usually one of three things:',
        'Your activation flow is broken: people sign up but don’t get value.',
        'Your retention is leaking: you’re adding users but losing old ones.',
        'You’ve exhausted your current channel: time to find a new acquisition source.',
    ],
    2: [
        'Map the drop-off. Where exactly do people leave? Even manual tracking in a spreadsheet works.',
        'Reduce time-to-value. If the “aha” moment takes 10 steps, cut it to 3.',
        'Kill the friction. Every field, screen and permission is a point where people leave.',
    ],
    3: [
        'Build sharing into the product: make it better when used with others (split payments, shared workspaces, referral rewards that matter).',
        'Make the invite selfish. “Invite a friend and you both get X” works because the inviter gets something too.',
    ],
    4: [
        'Build a daily trigger: notifications, streaks, daily content or a reason to open the app. Give genuine value, don’t spam.',
        'Find your natural frequency. If your product is weekly, measure WAU/MAU instead.',
    ],
    5: [
        'Day 1 retention is an onboarding problem. Fix the first experience.',
        'Day 7 retention is a value problem. People tried it and didn’t find enough reason to return.',
        'Day 30 retention is a habit problem. You need to become part of their routine.',
    ],
    6: [
        'Make the core action the first thing users see when they open the product.',
        'Remove everything between the user and the core action. Every extra tap, screen or decision is friction.',
    ],
    7: [
        'Flat MRR means new customers are exactly replacing churned ones. You have a retention problem, not a growth problem.',
        'If MRR is growing but slowly, experiment with pricing. Most early-stage founders undercharge.',
    ],
    8: [
        'Exit interviews. Ask every single person who cancels why. Patterns will emerge fast.',
        'Watch for “quiet churn”: users who’ve stopped using the product but haven’t cancelled yet.',
    ],
    9: [
        'Upsell. Can you offer a premium tier, more features for more money?',
        'Run pricing experiments with new cohorts. You might be surprised how little pushback you get.',
        'Segment your ARPU. Your top 20% of users probably generate 80% of revenue. Build for them.',
    ],
    10: [
        'Track CAC by channel. Instagram ads might cost 25× what WhatsApp referrals do. Double down on what’s cheap.',
        'Organic beats paid. Content, community, word of mouth and partnerships have near-zero marginal CAC.',
    ],
    11: [
        'Increase ARPU: upsell, cross-sell, raise prices.',
        'Reduce churn. Every month you keep a customer, LTV goes up.',
        'Don’t over-project. Use actual data, not “if we retain them for 3 years…”.',
    ],
    12: [
        'If LTV:CAC is below 3, don’t scale. Fix the ratio first: cheaper channels and better conversion, or less churn and higher prices.',
        'If LTV:CAC is above 5, spend more on acquisition. You’re leaving growth on the table.',
    ],
    13: [
        'Same levers as LTV:CAC: reduce CAC or increase ARPU.',
        'Payback matters most if you’re bootstrapping: it decides how much working capital you need.',
    ],
    14: ['Know this number exactly. Update it monthly, in a spreadsheet you actually look at.'],
    15: [
        'Start fundraising when you have 9–12 months left. Raising takes 3–6 months in Africa, often longer.',
        'Cut ruthlessly if needed: the extra hire, the co-working space, the ads that don’t convert.',
        'Revenue is the best runway extension. Every bit of revenue reduces your burn.',
    ],
    16: [
        'Cut expenses until you’re default alive. It’s the only option entirely in your control, so do it first.',
        'Accelerate revenue growth.',
        'Raise money.',
    ],
};

/** Revenue grows at the current monthly rate, expenses stay flat: do they cross before the cash runs out? */
export function project(cash: number, revenue: number, expenses: number, growth: number): Projection {
    const series = [{ month: 0, revenue, expenses, cash }];
    let rev = revenue;
    let left = cash;
    if (rev >= expenses) return { alive: true, month: 0, cashLeft: left, growth, series };
    for (let m = 1; m <= 60; m++) {
        rev *= 1 + growth;
        if (rev >= expenses) {
            series.push({ month: m, revenue: rev, expenses, cash: left });
            return { alive: true, month: m, cashLeft: left, growth, series };
        }
        left -= expenses - rev;
        series.push({ month: m, revenue: rev, expenses, cash: Math.max(left, 0) });
        if (left <= 0) return { alive: false, month: m, cashLeft: 0, growth, series };
    }
    return { alive: false, month: null, cashLeft: left, growth, series };
}

export function analyse(inputs: Inputs): Report {
    const i = inputs;
    const cur = i.currency ?? 'GHS';
    const stage = STAGES.find((s) => s.id === i.stage) ?? STAGES[2];
    const out: MetricResult[] = [];

    const add = (
        id: number,
        name: string,
        short: string,
        bucket: BucketId,
        r: Partial<MetricResult> & { missing?: string | null },
    ) => {
        const signal = r.signal ?? null;
        out.push({
            id,
            name,
            short,
            bucket,
            value: r.value ?? null,
            display: r.display ?? '—',
            signal,
            signalText: r.signalText ?? '',
            working: r.working ?? '',
            redFlag: r.redFlag ?? null,
            // The moves only matter when something is off.
            moves: (signal && signal !== 'strong') || r.redFlag ? MOVES[id] ?? [] : [],
            missing: r.missing ?? null,
            note: r.note ?? null,
            focus: stage.focus.includes(id),
        });
    };

    // 01 MoM growth
    if (pos(i.usersPrev) && has(i.usersNow)) {
        const g = ((i.usersNow - i.usersPrev) / i.usersPrev) * 100;
        const b = band(g, [
            [(v) => v >= 15, 'strong', 'Strong. You’re in YC territory.'],
            [(v) => v >= 10, 'okay', 'Solid. Keep pushing.'],
            [(v) => v >= 5, 'work', 'Okay, but something needs to change.'],
            [() => true, 'danger', 'Stalling. Diagnose immediately.'],
        ]);
        let redFlag: string | null = null;
        if (pos(i.usersPrev2) && pos(i.usersPrev3)) {
            const rates = [
                ((i.usersPrev2 - i.usersPrev3) / i.usersPrev3) * 100,
                ((i.usersPrev - i.usersPrev2) / i.usersPrev2) * 100,
                g,
            ];
            if (rates.every((r) => r < 5)) redFlag = 'Three consecutive months below 5%. You’re plateauing.';
        }
        add(1, 'Month-over-month growth', 'MoM', 'growth', {
            value: g,
            display: pct(g),
            ...b,
            working: `(${num(i.usersNow)} − ${num(i.usersPrev)}) ÷ ${num(i.usersPrev)} × 100`,
            redFlag,
        });
    } else add(1, 'Month-over-month growth', 'MoM', 'growth', { missing: 'Active users this month and last month' });

    // 02 Activation
    if (pos(i.signups) && has(i.activated)) {
        const a = (i.activated / i.signups) * 100;
        const b = band(a, [
            [(v) => v > 40, 'strong', 'Excellent. Your onboarding works.'],
            [(v) => v >= 25, 'okay', 'Decent. Room to improve.'],
            [(v) => v >= 10, 'work', 'Problem. Your onboarding is losing people.'],
            [() => true, 'danger', 'Emergency. Most people don’t understand your product.'],
        ]);
        add(2, 'Activation rate', 'Act', 'growth', {
            value: a,
            display: pct(a),
            ...b,
            working: `${num(i.activated)} ÷ ${num(i.signups)} × 100`,
            redFlag: a < 15 ? 'Below 15%. You’re spending money or effort acquiring people who never become real users.' : null,
        });
    } else add(2, 'Activation rate', 'Act', 'growth', { missing: 'Signups and how many completed your activation event' });

    // 03 Viral coefficient
    if (has(i.invitesPerUser) && has(i.inviteConversion)) {
        const k = i.invitesPerUser * (i.inviteConversion / 100);
        const b = band(k, [
            [(v) => v > 1, 'strong', 'Viral. Extremely rare. You’ve won.'],
            [(v) => v >= 0.5, 'okay', 'Strong word of mouth. Growth is partly organic.'],
            [(v) => v >= 0.2, 'work', 'Some organic pull. Your product has advocates.'],
            [() => true, 'danger', 'No organic growth. You’re paying for every user.'],
        ]);
        add(3, 'Viral coefficient (K)', 'K', 'growth', {
            value: k,
            display: trim(k, 2),
            ...b,
            working: `${trim(i.invitesPerUser, 2)} × ${trim(i.inviteConversion / 100, 3)}`,
            redFlag: k < 0.1 && pos(i.smSpend) ? 'K near zero while you’re spending on acquisition. You’re on a treadmill.' : null,
        });
    } else add(3, 'Viral coefficient (K)', 'K', 'growth', { missing: 'Invites sent per user and the % of invites that convert' });

    // 04 DAU/MAU
    if (pos(i.usersNow) && has(i.dau)) {
        const s = (i.dau / i.usersNow) * 100;
        const b = band(s, [
            [(v) => v > 50, 'strong', 'Extremely sticky. A daily habit.'],
            [(v) => v >= 25, 'strong', 'Very engaged.'],
            [(v) => v >= 10, 'okay', 'Normal for many products (e-commerce, marketplaces).'],
            [() => true, 'work', 'Low engagement. Fine for occasional-use utilities, not for daily products.'],
        ]);
        const prev = pos(i.usersPrev) && has(i.dauPrev) ? (i.dauPrev / i.usersPrev) * 100 : null;
        add(4, 'DAU/MAU (stickiness)', 'D/M', 'engagement', {
            value: s,
            display: pct(s),
            ...b,
            working: `${num(i.dau)} ÷ ${num(i.usersNow)} × 100`,
            redFlag: prev !== null && s < prev ? `Down from ${pct(prev)} last month. A declining ratio matters more than the absolute number.` : null,
            note: 'Context matters: a travel app at 5% isn’t broken, a messaging app at 5% is.',
        });
    } else add(4, 'DAU/MAU (stickiness)', 'D/M', 'engagement', { missing: 'Daily and monthly active users' });

    // 05 Retention
    if (has(i.d1) || has(i.d7) || has(i.d30)) {
        const parts: { label: string; v: number; strong: number; okay: number }[] = [];
        if (has(i.d1)) parts.push({ label: 'D1', v: i.d1, strong: 60, okay: 40 });
        if (has(i.d7)) parts.push({ label: 'D7', v: i.d7, strong: 30, okay: 20 });
        if (has(i.d30)) parts.push({ label: 'D30', v: i.d30, strong: 15, okay: 10 });
        const rate = (p: (typeof parts)[number]): Signal => (p.v > p.strong ? 'strong' : p.v >= p.okay ? 'okay' : 'danger');
        // Worst interval: highest severity, then furthest below its own “okay” threshold.
        const shortfall = (p: (typeof parts)[number]) => p.v / p.okay;
        const worst = parts.reduce(
            (w, p) => (SEVERITY[rate(p)] > SEVERITY[rate(w)] || (rate(p) === rate(w) && shortfall(p) < shortfall(w)) ? p : w),
            parts[0],
        );
        const signal = rate(worst);
        const allSame = parts.every((p) => rate(p) === signal);
        const text =
            signal === 'strong'
                ? 'Strong across the board. The curve is flattening.'
                : allSame
                  ? signal === 'okay'
                      ? `Okay on ${parts.length === 3 ? 'all three' : 'every interval'}, not strong yet.`
                      : 'In the danger zone on every interval.'
                  : `${worst.label} is the weak point: ${signal === 'okay' ? 'okay, not strong yet' : 'in the danger zone'}.`;
        const d30 = parts.find((p) => p.label === 'D30');
        add(5, 'Retention (D1 · D7 · D30)', 'Ret', 'engagement', {
            value: worst.v,
            // Unlabelled “55 · 28 · 14%” only reads clearly when all three days are there.
            display: parts.length === 3 ? parts.map((p) => trim(p.v)).join(' · ') + '%' : parts.map((p) => `${p.label} ${trim(p.v)}%`).join(' · '),
            signal,
            signalText: text,
            working: `Share of one signup cohort still active: ${parts.map((p) => `${p.label} ${trim(p.v)}%`).join(' · ')}`,
            redFlag: d30 && d30.v < 5 ? 'Day 30 retention below 5%. You’re churning faster than you can grow.' : null,
            note: 'Strong: D1 > 60%, D7 > 30%, D30 > 15%.',
        });
        // Lead with the move for the weakest interval (D1 onboarding, D7 value, D30 habit).
        const added = out[out.length - 1];
        const lead = ['D1', 'D7', 'D30'].indexOf(worst.label);
        if (added.moves.length && lead > 0) added.moves = [added.moves[lead], ...added.moves.filter((_, k) => k !== lead)];
    } else add(5, 'Retention (D1 · D7 · D30)', 'Ret', 'engagement', { missing: 'The % of signups still active on day 1, 7 and 30' });

    // 06 Core action rate
    const active = i.usersNow;
    if (pos(active) && has(i.coreActionUsers)) {
        const r = (i.coreActionUsers / active) * 100;
        const b = band(r, [
            [(v) => v > 50, 'strong', 'Healthy. Most active users do the thing your product exists for.'],
            [(v) => v >= 20, 'okay', 'Room to improve. Many “active” users aren’t doing the core action.'],
            [() => true, 'danger', 'People are in your product but not using it for its purpose.'],
        ]);
        add(6, 'Core action rate', 'Core', 'engagement', {
            value: r,
            display: pct(r),
            ...b,
            working: `${num(i.coreActionUsers)} ÷ ${num(active)} × 100`,
            redFlag: r < 20 ? 'Below 20%. People are in your product but not using it for its purpose.' : null,
        });
    } else add(6, 'Core action rate', 'Core', 'engagement', { missing: 'Active users and how many did the main thing your product is for' });

    // 07 MRR
    if (has(i.mrr)) {
        const usd = i.mrr / currencyOf(cur).perUsd;
        // The cheat sheet's bands are in dollars, except its note on Ghanaian SMEs, which applies to cedis.
        const b =
            cur === 'GHS'
                ? band(i.mrr, [
                      [(v) => v > 10000, 'strong', 'Real traction for the local market.'],
                      [(v) => v >= 5000, 'okay', 'Meaningful traction for a product selling to Ghanaian SMEs. Understand why people pay.'],
                      [() => true, 'work', 'Pre-product-market fit. Normal for the first 6–12 months.'],
                  ])
                : band(usd, [
                      [(v) => v >= 50000, 'strong', 'Strong. You have a business.'],
                      [(v) => v >= 10000, 'strong', 'Real traction. You can start thinking about fundraising.'],
                      [(v) => v >= 1000, 'okay', 'Something is working. Understand why people are paying.'],
                      [() => true, 'work', 'Pre-product-market fit. Normal for the first 6–12 months.'],
                  ]);
        add(7, 'Monthly recurring revenue', 'MRR', 'revenue', {
            value: i.mrr,
            display: money(i.mrr, cur),
            ...b,
            working: pos(i.mrrStart) ? `${trim(((i.mrr - i.mrrStart) / i.mrrStart) * 100)}% vs last month (${money(i.mrrStart, cur)})` : 'Paying customers × average monthly revenue',
            redFlag: has(i.mrr3Ago) && i.mrr <= i.mrr3Ago ? 'MRR flat or declining for 3+ months.' : null,
            note:
                cur === 'GHS'
                    ? `≈ ${money(usd, 'USD')}. Don’t compare yourself to US SaaS benchmarks: GH₵5,000–10,000 MRR selling to Ghanaian SMEs is meaningful.`
                    : cur === 'USD'
                      ? null
                      : `≈ ${money(usd, 'USD')} at ${RATES_DATE} rates. The benchmark bands are in US dollars: judge them against what’s meaningful in your market.`,
        });
        // “Flat MRR…” only fits when revenue isn't growing; otherwise lead with pricing.
        const mrrCard = out[out.length - 1];
        if (pos(i.mrrStart) && i.mrr > i.mrrStart && mrrCard.moves.length > 1) mrrCard.moves = [mrrCard.moves[1], mrrCard.moves[0]];
    } else add(7, 'Monthly recurring revenue', 'MRR', 'revenue', { missing: 'Your MRR (or monthly revenue run rate)' });

    // 08 Revenue churn
    const churn = pos(i.mrrStart) && has(i.mrrLost) ? (i.mrrLost / i.mrrStart) * 100 : null;
    if (churn !== null) {
        const b = band(churn, [
            [(v) => v < 2, 'strong', 'Excellent. Healthy retention.'],
            [(v) => v <= 5, 'okay', 'Normal for early stage. Work on it.'],
            [(v) => v <= 10, 'work', 'Warning. You’re losing too many customers.'],
            [() => true, 'danger', 'Critical. Your product has a value problem.'],
        ]);
        const kept = Math.pow(1 - churn / 100, 12) * 100;
        add(8, 'Revenue churn', 'Chn', 'revenue', {
            value: churn,
            display: pct(churn),
            ...b,
            working: `${money(i.mrrLost!, cur)} ÷ ${money(i.mrrStart!, cur)} × 100`,
            redFlag: has(i.churnPrev) && churn > i.churnPrev ? `Rising: up from ${pct(i.churnPrev)} last month.` : null,
            note: `At this rate you keep ${trim(kept, 0)}% of today’s revenue after 12 months with no new customers.`,
        });
    } else add(8, 'Revenue churn', 'Chn', 'revenue', { missing: 'MRR at the start of the month and MRR lost to cancellations or downgrades' });

    // 09 ARPU
    const arpu = has(i.mrr) && pos(i.usersNow) ? i.mrr / i.usersNow : null;
    if (arpu !== null) {
        const prevArpu = pos(i.mrrStart) && pos(i.usersPrev) ? i.mrrStart / i.usersPrev : null;
        const falling = prevArpu !== null && arpu < prevArpu && has(i.usersNow) && pos(i.usersPrev) && i.usersNow > i.usersPrev;
        add(9, 'Average revenue per user', 'ARPU', 'revenue', {
            value: arpu,
            display: money(arpu, cur),
            signal: falling ? 'work' : null,
            signalText: falling ? 'Falling while your user count grows.' : 'No universal benchmark: it depends on your model. Track the trend.',
            working: `${money(i.mrr!, cur)} ÷ ${num(i.usersNow!)} users`,
            redFlag: falling ? `ARPU fell from ${money(prevArpu!, cur)} while users grew. You’re attracting lower-value users.` : null,
            note: 'Typical: freemium consumer $0.50–5, SME SaaS $10–100, enterprise $500–5,000+ a month.',
        });
    } else add(9, 'Average revenue per user', 'ARPU', 'revenue', { missing: 'MRR and active users this month' });

    // 10 CAC
    const cac = has(i.smSpend) && pos(i.newCustomers) ? i.smSpend / i.newCustomers : null;
    if (cac !== null) {
        const m = arpu ? cac / arpu : null;
        const b =
            m === null
                ? { signal: null, signalText: 'Add MRR and users to compare CAC with what a customer pays.' }
                : band(m, [
                      [(v) => v < 1, 'strong', 'Very efficient: less than one month’s revenue.'],
                      [(v) => v <= 6, 'okay', `${trim(m)} months’ revenue. Normal for SaaS (3–6 is typical).`],
                      [(v) => v <= 12, 'work', `${trim(m)} months’ revenue. Getting expensive.`],
                      [() => true, 'danger', `${trim(m)} months’ revenue. Dangerous unless LTV is very high and proven.`],
                  ]);
        add(10, 'Customer acquisition cost', 'CAC', 'unit', {
            value: cac,
            display: money(cac, cur),
            ...b,
            working: `${money(i.smSpend!, cur)} ÷ ${num(i.newCustomers!)} new customers`,
            note: 'Include everything: ads, sales and marketing salaries, tools, events, content, agencies.',
        });
    } else
        add(10, 'Customer acquisition cost', 'CAC', 'unit', {
            missing: 'Sales & marketing spend and new paying customers this month',
            redFlag: stage.id === 'scaling' && has(i.mrr) ? 'You don’t know your CAC. If you can’t calculate it, you’re spending blind.' : null,
        });

    // 11 LTV
    if (arpu !== null && churn !== null) {
        if (churn <= 0) {
            add(11, 'Customer lifetime value', 'LTV', 'unit', {
                display: '—',
                signalText: 'No churn yet, so lifetime can’t be estimated. Be conservative.',
                missing: null,
                note: 'LTV = ARPU ÷ monthly churn needs some churn history.',
            });
        } else {
            const ltv = arpu / (churn / 100);
            const ratio = cac ? ltv / cac : null;
            add(11, 'Customer lifetime value', 'LTV', 'unit', {
                value: ltv,
                display: money(ltv, cur),
                signal: ratio === null ? null : ratio >= 3 ? 'strong' : 'work',
                signalText: ratio === null ? 'Add CAC to see if it clears 3× what a customer costs.' : ratio >= 3 ? 'More than 3× CAC.' : 'Less than 3× CAC.',
                working: `${money(arpu, cur)} ÷ ${trim(churn / 100, 3)}`,
                redFlag: has(i.monthsCharging) && i.monthsCharging < 6 ? `Only ${months(i.monthsCharging)} of revenue data. You don’t truly know customer lifespan yet: treat this as an estimate.` : null,
            });
        }
    } else add(11, 'Customer lifetime value', 'LTV', 'unit', { missing: 'ARPU and revenue churn (see Revenue)' });

    // 12 LTV:CAC and 13 payback
    const ltv = arpu !== null && churn !== null && churn > 0 ? arpu / (churn / 100) : null;
    if (ltv !== null && cac) {
        const r = ltv / cac;
        const b = band(r, [
            [(v) => v > 5, 'strong', 'Excellent. You could be spending more on growth.'],
            [(v) => v >= 3, 'strong', 'Healthy. The gold standard.'],
            [(v) => v >= 1, 'work', 'Marginal. Workable if it’s improving.'],
            [() => true, 'danger', 'You’re losing money on every customer. Stop scaling.'],
        ]);
        add(12, 'LTV:CAC ratio', 'L:C', 'unit', {
            value: r,
            display: `${trim(r)}:1`,
            ...b,
            working: `${money(ltv, cur)} ÷ ${money(cac, cur)}`,
            redFlag: r < 1 ? 'Below 1:1. You are paying people to use your product and never making it back.' : null,
        });
    } else add(12, 'LTV:CAC ratio', 'L:C', 'unit', { missing: 'LTV and CAC' });

    if (cac && arpu) {
        const p = cac / arpu;
        const b = band(p, [
            [(v) => v < 6, 'strong', 'Excellent. Capital efficient.'],
            [(v) => v <= 12, 'okay', 'Normal for SaaS.'],
            [(v) => v <= 18, 'work', 'Long. You need reliable retention data to justify this.'],
            [() => true, 'danger', 'Dangerous without significant funding.'],
        ]);
        const lifespan = churn ? 100 / churn : null;
        add(13, 'CAC payback period', 'PB', 'unit', {
            value: p,
            display: months(p),
            ...b,
            working: `${money(cac, cur)} ÷ ${money(arpu, cur)} a month`,
            redFlag: lifespan !== null && p > lifespan ? `Longer than your average customer lifespan (${months(lifespan)}). You lose money on the average customer.` : null,
        });
    } else add(13, 'CAC payback period', 'PB', 'unit', { missing: 'CAC and ARPU' });

    // 14 Net burn, 15 runway, 16 default alive
    const revenue = i.mrr;
    let projection: Projection | null = null;
    if (has(i.expenses) && has(revenue)) {
        const burn = i.expenses - revenue;
        add(14, 'Net burn', 'Burn', 'runway', {
            value: burn,
            display: burn <= 0 ? 'Profitable' : `${money(burn, cur)}/mo`,
            signal: burn <= 0 ? 'strong' : null,
            signalText: burn <= 0 ? `You make ${money(-burn, cur)} more than you spend each month.` : 'What matters is that it’s falling month on month.',
            working: `${money(i.expenses, cur)} expenses − ${money(revenue, cur)} revenue`,
        });

        if (has(i.cash)) {
            if (burn <= 0) {
                add(15, 'Months of runway', 'Rwy', 'runway', { display: 'Unlimited', signal: 'strong', signalText: 'Profitable: cash grows every month.', working: 'No net burn' });
            } else {
                const r = i.cash / burn;
                const b = band(r, [
                    [(v) => v > 18, 'strong', 'Comfortable. You have time to experiment.'],
                    [(v) => v >= 12, 'okay', 'Healthy. Start thinking about the next raise at 12 months.'],
                    [(v) => v >= 6, 'work', 'Urgent. If you’re raising, start now.'],
                    [() => true, 'danger', 'Emergency. Cut costs immediately.'],
                ]);
                add(15, 'Months of runway', 'Rwy', 'runway', { value: r, display: months(r), ...b, working: `${money(i.cash, cur)} ÷ ${money(burn, cur)}` });
            }

            const growth =
                pos(i.mrrStart) && has(i.mrr) ? (i.mrr - i.mrrStart) / i.mrrStart : pos(i.usersPrev) && has(i.usersNow) ? (i.usersNow - i.usersPrev) / i.usersPrev : 0;
            projection = project(i.cash, revenue, i.expenses, growth);
            const p = projection;
            add(16, 'Default alive?', 'DA', 'runway', {
                value: p.alive ? 1 : 0,
                display: p.alive ? 'Yes' : 'No',
                signal: p.alive ? 'strong' : 'danger',
                signalText: p.alive
                    ? p.month === 0
                        ? 'Already profitable.'
                        : `Profitable in month ${p.month} with about ${money(Math.round(p.cashLeft! / 1000) * 1000, cur)} still in the bank.`
                    : p.month
                      ? `At this trajectory the cash runs out in month ${p.month}, before revenue catches expenses.`
                      : 'Revenue doesn’t catch up with expenses within 5 years at this growth rate.',
                working: `${trim(growth * 100)}% monthly revenue growth, flat expenses of ${money(i.expenses, cur)}`,
                redFlag: p.alive ? null : 'You’re default dead. Act now: cut costs, accelerate revenue or raise.',
            });
        } else {
            add(15, 'Months of runway', 'Rwy', 'runway', { missing: 'Cash in the bank' });
            add(16, 'Default alive?', 'DA', 'runway', { missing: 'Cash in the bank' });
        }
    } else {
        add(14, 'Net burn', 'Burn', 'runway', { missing: 'Monthly spend and MRR' });
        add(15, 'Months of runway', 'Rwy', 'runway', { missing: 'Cash, monthly spend and MRR' });
        add(16, 'Default alive?', 'DA', 'runway', { missing: 'Cash, monthly spend and MRR' });
    }

    const counts: Record<Signal, number> = { strong: 0, okay: 0, work: 0, danger: 0 };
    for (const m of out) if (m.signal) counts[m.signal]++;

    // Biggest problems first; at equal severity, the metrics that matter at this stage come first.
    const priorities = out
        .filter((m) => (m.signal && m.signal !== 'strong') || m.redFlag)
        .sort(
            (a, b) =>
                SEVERITY[b.signal ?? 'work'] + (b.redFlag ? 0.5 : 0) - (SEVERITY[a.signal ?? 'work'] + (a.redFlag ? 0.5 : 0)) ||
                Number(b.focus) - Number(a.focus) ||
                a.id - b.id,
        )
        .slice(0, 3);

    return { inputs, metrics: out, priorities, counts, projection, computed: out.filter((m) => !m.missing).length };
}

/** The worked example from the cheat sheet: Osu Ledger, a fictional Accra invoicing app. */
/** The one-line verdict shown on the results page and the PDF: default alive/dead when there's cash data, else a status from the ratings. */
export function verdict(r: Report) {
    const p = r.projection;
    const problems = r.counts.work + r.counts.danger;
    const rated = r.counts.strong + r.counts.okay + problems;
    const hero = p
        ? p.alive ? (p.month === 0 ? 'Profitable' : 'Default alive') : 'Default dead'
        : r.counts.danger ? 'Needs attention' : problems ? 'On track, with gaps' : 'Looking healthy';
    const sub = p
        ? p.alive ? (p.month === 0 ? 'Revenue already covers your costs.' : `At today’s growth you turn profitable in month ${p.month}.`) : `At today’s growth your cash runs out in month ${p.month ?? '60+'}.`
        : `${r.counts.strong + r.counts.okay} of ${rated} rated metrics are okay or better.`;
    return { hero, sub };
}

export const SAMPLE: Inputs = {
    name: 'Osu Ledger',
    stage: 'pmf',
    currency: 'GHS',
    usersNow: 460,
    usersPrev: 400,
    signups: 250,
    activated: 80,
    invitesPerUser: 2,
    inviteConversion: 12,
    dau: 92,
    d1: 55,
    d7: 28,
    d30: 14,
    coreActionUsers: 253,
    mrr: 27600,
    mrrStart: 24000,
    mrrLost: 1080,
    smSpend: 23400,
    newCustomers: 78,
    monthsCharging: 10,
    cash: 600000,
    expenses: 85000,
};
