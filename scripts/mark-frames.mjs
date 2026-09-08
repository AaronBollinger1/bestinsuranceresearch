/**
 * Render frames of the loading animation to a contact sheet.
 *
 * WHY THIS EXISTS
 *
 * The animation is CSS on an inline SVG, so the only way to see it was to load
 * `/ask`, force the loading state open, and pause `document.getAnimations()` by
 * hand. That is a poor way to review a brand asset and a worse way to catch a
 * regression: the first version of this animation ended each loop by flinging
 * all 37 dots outward - the mark visibly exploding once a cycle - and nothing
 * except a browser sampling session showed it.
 *
 * So the same maths runs here. The keyframes, the delays and the easing are
 * duplicated from `MarkConverging.astro` deliberately: if the two ever
 * disagree, the contact sheet stops matching the page and that is exactly the
 * signal worth having. The duplication is checked rather than trusted - the
 * resolved frame must reproduce `public/mark.svg` coordinate for coordinate,
 * which is asserted below.
 *
 *   node scripts/mark-frames.mjs
 *   node scripts/mark-frames.mjs --write   # public/media/mark-frames.png
 */
import sharp from 'sharp';
import fs from 'node:fs';

const SRC = 'public/mark.svg';
const OUT = 'public/media/mark-frames.png';

/* ---- Duplicated from MarkConverging.astro. Keep in step. ---------- */
const DURATION = 2600;
const DOT_STAGGER = 520;
const HEAD_DELAY = 560;
const EASE = [0.22, 0.61, 0.24, 1];
const THROW_BASE = 6;
const THROW_SCALE = 26;

/** opacity and scale stops, as fractions of the cycle. */
const DOT_STOPS = [
	{ at: 0.0, opacity: 0, offset: 1, scale: 0.55 },
	{ at: 0.38, opacity: 1, offset: 0, scale: 1 },
	{ at: 0.84, opacity: 1, offset: 0, scale: 1 },
	{ at: 0.93, opacity: 0, offset: 0, scale: 1 },
	{ at: 1.0, opacity: 0, offset: 1, scale: 0.55 },
];
const HEAD_STOPS = [
	{ at: 0.0, opacity: 0, scale: 0.6 },
	{ at: 0.26, opacity: 1, scale: 1 },
	{ at: 0.84, opacity: 1, scale: 1 },
	{ at: 0.93, opacity: 0, scale: 1 },
	{ at: 1.0, opacity: 0, scale: 0.6 },
];

/** Cubic bezier easing, solved by bisection. Deterministic, and enough here. */
function ease([x1, y1, x2, y2], x) {
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	const bez = (a, b, t) => {
		const u = 1 - t;
		return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
	};
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 40; i++) {
		const mid = (lo + hi) / 2;
		if (bez(x1, x2, mid) < x) lo = mid;
		else hi = mid;
	}
	return bez(y1, y2, (lo + hi) / 2);
}

/** Interpolate a stop table at cycle fraction p, easing each segment. */
function sample(stops, p) {
	for (let i = 0; i < stops.length - 1; i++) {
		const a = stops[i];
		const b = stops[i + 1];
		if (p < a.at || p > b.at) continue;
		const span = b.at - a.at || 1;
		const k = ease(EASE, (p - a.at) / span);
		const out = {};
		for (const key of Object.keys(a)) {
			if (key === 'at') continue;
			out[key] = a[key] + (b[key] - a[key]) * k;
		}
		return out;
	}
	const last = stops[stops.length - 1];
	return { ...last };
}

/* ---- The traced mark ---------------------------------------------- */
const source = fs.readFileSync(SRC, 'utf8');
const viewBox = source.match(/viewBox="([^"]+)"/)[1];
const headX = Number(source.match(/data-head-x="([\d.]+)"/)[1]);
const headY = Number(source.match(/data-head-y="([\d.]+)"/)[1]);
const headPath = source.match(/<path class="mk-head" d="([^"]+)"/)[1];
const dots = [...source.matchAll(/data-t="([\d.]+)"[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"[^>]*r="([\d.]+)"/g)].map((m) => {
	const t = Number(m[1]);
	const cx = Number(m[2]);
	const cy = Number(m[3]);
	const r = Number(m[4]);
	const dx = cx - headX;
	const dy = cy - headY;
	const len = Math.hypot(dx, dy) || 1;
	const throwBy = THROW_SCALE * t + THROW_BASE;
	return { t, cx, cy, r, ox: (dx / len) * throwBy, oy: (dy / len) * throwBy };
});

const INK = '#17212e';
const PAPER = '#faf7f0';

function frame(ms) {
	const parts = [`<rect width="100%" height="100%" fill="${PAPER}"/>`];

	const headP = Math.min(1, Math.max(0, (ms - HEAD_DELAY) / DURATION));
	const h = sample(HEAD_STOPS, headP);
	if (h.opacity > 0.004) {
		/* transform-box: fill-box, so the arrowhead scales about its own centre. */
		parts.push(
			`<g opacity="${h.opacity.toFixed(3)}" transform="translate(${headX.toFixed(2)} ${headY.toFixed(2)}) scale(${h.scale.toFixed(3)}) translate(${(-headX).toFixed(2)} ${(-headY).toFixed(2)})">` +
				`<path d="${headPath}"/></g>`,
		);
	}

	for (const d of dots) {
		const delay = (1 - d.t) * DOT_STAGGER;
		const p = Math.min(1, Math.max(0, (ms - delay) / DURATION));
		const s = sample(DOT_STOPS, p);
		if (s.opacity <= 0.004) continue;
		parts.push(
			`<circle cx="${(d.cx + d.ox * s.offset).toFixed(2)}" cy="${(d.cy + d.oy * s.offset).toFixed(2)}" ` +
				`r="${(d.r * s.scale).toFixed(2)}" opacity="${s.opacity.toFixed(3)}"/>`,
		);
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="${INK}">${parts.join('')}</svg>`;
}

/* ---- Check the duplication against the source of truth ------------ */
/*
 * At full rest the animation must BE the artwork. Any drift between this file
 * and the component, or between either and the trace, shows up here as a
 * coordinate that has moved.
 */
const rest = frame(1600);
const restDots = [...rest.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" opacity="([\d.]+)"/g)];
const problems = [];
if (restDots.length !== dots.length) {
	problems.push(`resolved frame shows ${restDots.length} dots, the mark has ${dots.length}`);
}
for (const [i, m] of restDots.entries()) {
	const d = dots[i];
	if (Math.abs(Number(m[1]) - d.cx) > 0.01 || Math.abs(Number(m[2]) - d.cy) > 0.01) {
		problems.push(`dot ${i} rests at ${m[1]},${m[2]} but the mark places it at ${d.cx},${d.cy}`);
	}
	if (Math.abs(Number(m[3]) - d.r) > 0.01) problems.push(`dot ${i} rests at r=${m[3]}, the mark has ${d.r}`);
	if (Number(m[4]) < 0.999) problems.push(`dot ${i} is not fully opaque at rest (${m[4]})`);
}
if (problems.length > 0) {
	console.error('The resolved frame is not the artwork:');
	for (const p of problems.slice(0, 8)) console.error(`  - ${p}`);
	process.exit(1);
}
console.log(`resolved frame reproduces all ${dots.length} dots and the arrowhead exactly`);

/* Nothing visible may be displaced once the mark has landed, or the loop
   ends by throwing the mark apart - which it did, and which this catches. */
let worst = 0;
for (let ms = 1000; ms <= DURATION; ms += 25) {
	for (const d of dots) {
		const delay = (1 - d.t) * DOT_STAGGER;
		const s = sample(DOT_STOPS, Math.min(1, Math.max(0, (ms - delay) / DURATION)));
		if (s.opacity > 0.05) worst = Math.max(worst, Math.abs(s.offset) * Math.hypot(d.ox, d.oy));
	}
}
console.log(`largest displacement of any visible dot after 1000ms: ${worst.toFixed(2)}px`);
if (worst > 1) {
	console.error('The mark visibly moves apart on the way out. That is the bug this check exists for.');
	process.exit(1);
}

/* ---- Contact sheet ------------------------------------------------ */
const TIMES = [0, 120, 240, 360, 500, 700, 900, 1300, 1800, 2200, 2400, 2560];
const CELL = 150;
const COLS = 6;
const rows = Math.ceil(TIMES.length / COLS);

const cells = await Promise.all(
	TIMES.map((ms) => sharp(Buffer.from(frame(ms))).resize(CELL, CELL).png().toBuffer()),
);

const sheet = sharp({
	create: {
		width: CELL * COLS,
		height: CELL * rows,
		channels: 4,
		background: { r: 240, g: 236, b: 226, alpha: 1 },
	},
}).composite(
	cells.map((input, i) => ({
		input,
		left: (i % COLS) * CELL,
		top: Math.floor(i / COLS) * CELL,
	})),
);

console.log(`frames at ${TIMES.join(', ')} ms`);
if (process.argv.includes('--write')) {
	fs.mkdirSync('public/media', { recursive: true });
	await sheet.png().toFile(OUT);
	console.log(`wrote ${OUT}`);
} else {
	console.log('report only. pass --write to emit the contact sheet.');
}
