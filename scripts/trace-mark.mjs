/**
 * Trace the logo mark from its master raster into a true vector.
 *
 * WHY THIS EXISTS
 *
 * Every asset in `public/` derives from `icon-master-black-transparent.png`.
 * The two files named `favicon-light.svg` and `favicon-dark.svg` are not
 * vectors: each is a 340x340 `<image>` element wrapping a base64 PNG, so the
 * package advertises SVG and ships raster. That is why dark mode needs a second
 * file, why no asset can scale past 512, and why two Higgsfield passes
 * conditioned on the master both replaced the mark with a random dot cloud -
 * a video model asked to move a picture of the mark has no geometry to
 * preserve, so it invents some.
 *
 * `AMBITION.md` records producing a true vector as a real task rather than
 * housekeeping. This is that task, done by measurement rather than by eye: the
 * mark is a field of circles converging on a solid arrowhead, which is exactly
 * the shape a connected-component pass recovers exactly.
 *
 * WHAT IT DOES
 *
 * Reads the master's alpha channel, labels connected components with an
 * iterative flood fill, and classifies each one. A component whose area is
 * close to pi*r^2 for its own bounding box is a dot and becomes a `<circle>`
 * with a measured centre and radius. The one large component that is not round
 * is the arrowhead and is emitted as a traced polygon, because it has corners
 * and a circle would lie about them.
 *
 * The output is checked against the geometry `AMBITION.md` already records -
 * 37 dots, radius falling from about 2.58 at the open edge to about 1.60 at the
 * point - so a trace that disagrees with the documented mark fails loudly
 * instead of quietly shipping a different logo.
 *
 *   node scripts/trace-mark.mjs            # report only
 *   node scripts/trace-mark.mjs --write    # emit public/mark.svg
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const MASTER = 'public/icon-master-black-transparent.png';
const OUT = 'public/mark.svg';
/** Alpha at or above this is ink. The master is hard-edged, so this is not delicate. */
const INK = 128;
/** Documented geometry, asserted rather than trusted. */
const EXPECT_DOTS = 37;

const { data, info } = await sharp(MASTER).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const alphaAt = (x, y) => data[(y * W + x) * C + (C - 1)];

/* ------------------------------------------------------------------ */
/* Connected components, 8-connected, iterative so a large blob cannot  */
/* overflow the stack.                                                  */
/* ------------------------------------------------------------------ */

const label = new Int32Array(W * H).fill(-1);
const components = [];

for (let y = 0; y < H; y++) {
	for (let x = 0; x < W; x++) {
		const start = y * W + x;
		if (label[start] !== -1 || alphaAt(x, y) < INK) continue;

		const id = components.length;
		const pixels = [];
		const stack = [start];
		label[start] = id;

		while (stack.length > 0) {
			const p = stack.pop();
			const px = p % W;
			const py = (p - px) / W;
			pixels.push(p);
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0) continue;
					const nx = px + dx;
					const ny = py + dy;
					if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
					const n = ny * W + nx;
					if (label[n] !== -1 || alphaAt(nx, ny) < INK) continue;
					label[n] = id;
					stack.push(n);
				}
			}
		}

		let sx = 0;
		let sy = 0;
		let minX = W;
		let maxX = -1;
		let minY = H;
		let maxY = -1;
		for (const p of pixels) {
			const px = p % W;
			const py = (p - px) / W;
			sx += px;
			sy += py;
			if (px < minX) minX = px;
			if (px > maxX) maxX = px;
			if (py < minY) minY = py;
			if (py > maxY) maxY = py;
		}
		const area = pixels.length;
		const bw = maxX - minX + 1;
		const bh = maxY - minY + 1;
		/* A filled circle of this bounding box would have this area. The ratio is
		   how the arrowhead is told from a dot, and it needs no threshold tuning:
		   dots land near 1, the arrowhead nowhere near it. */
		const roundness = area / ((Math.PI * bw * bh) / 4);
		components.push({
			id,
			area,
			cx: sx / area + 0.5,
			cy: sy / area + 0.5,
			bw,
			bh,
			minX,
			minY,
			maxX,
			maxY,
			roundness,
			aspect: bw / bh,
			pixels,
		});
	}
}

/* ------------------------------------------------------------------ */
/* Classify                                                            */
/* ------------------------------------------------------------------ */

const isDot = (c) => c.roundness > 0.7 && c.roundness < 1.3 && c.aspect > 0.6 && c.aspect < 1.6 && c.area < 400;
const dots = components.filter(isDot).sort((a, b) => a.cy - b.cy || a.cx - b.cx);
const rest = components.filter((c) => !isDot(c)).sort((a, b) => b.area - a.area);

const radiusOf = (c) => Math.sqrt(c.area / Math.PI);

console.log(`master ${W}x${H}, ${components.length} components`);
console.log(`dots: ${dots.length} (expected ${EXPECT_DOTS})`);
if (dots.length > 0) {
	const radii = dots.map(radiusOf);
	console.log(
		`  radius ${Math.min(...radii).toFixed(2)} to ${Math.max(...radii).toFixed(2)}, ` +
			`mean ${(radii.reduce((a, b) => a + b, 0) / radii.length).toFixed(2)}`,
	);
}
console.log(`non-dot components: ${rest.length}`);
for (const c of rest.slice(0, 6)) {
	console.log(
		`  area ${c.area} box ${c.bw}x${c.bh} at ${c.minX},${c.minY} roundness ${c.roundness.toFixed(2)}`,
	);
}

/* ------------------------------------------------------------------ */
/* Trace the arrowhead outline: march the boundary of its pixel set.   */
/* ------------------------------------------------------------------ */

function traceOutline(component) {
	const set = new Set(component.pixels);
	const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && set.has(y * W + x);

	/* Moore boundary tracing from the top-left-most ink pixel. */
	let startX = -1;
	let startY = -1;
	for (let y = component.minY; y <= component.maxY && startX === -1; y++) {
		for (let x = component.minX; x <= component.maxX; x++) {
			if (inside(x, y)) {
				startX = x;
				startY = y;
				break;
			}
		}
	}
	if (startX === -1) return [];

	const N = [
		[1, 0], [1, 1], [0, 1], [-1, 1],
		[-1, 0], [-1, -1], [0, -1], [1, -1],
	];
	const outline = [[startX, startY]];
	let cx = startX;
	let cy = startY;
	let dir = 0;
	const limit = component.pixels.length * 8 + 64;

	for (let step = 0; step < limit; step++) {
		let moved = false;
		for (let k = 0; k < 8; k++) {
			const d = (dir + 6 + k) % 8;
			const nx = cx + N[d][0];
			const ny = cy + N[d][1];
			if (!inside(nx, ny)) continue;
			cx = nx;
			cy = ny;
			dir = d;
			moved = true;
			break;
		}
		if (!moved) break;
		if (cx === startX && cy === startY) break;
		outline.push([cx, cy]);
	}
	return outline;
}

/** Ramer-Douglas-Peucker, so an outline of 900 pixels becomes the polygon it is. */
function simplify(points, tolerance) {
	if (points.length < 3) return points;
	const sqTol = tolerance * tolerance;

	const sqSegDist = (p, a, b) => {
		let x = a[0];
		let y = a[1];
		let dx = b[0] - x;
		let dy = b[1] - y;
		if (dx !== 0 || dy !== 0) {
			const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
			if (t > 1) {
				x = b[0];
				y = b[1];
			} else if (t > 0) {
				x += dx * t;
				y += dy * t;
			}
		}
		dx = p[0] - x;
		dy = p[1] - y;
		return dx * dx + dy * dy;
	};

	const keep = new Uint8Array(points.length);
	keep[0] = 1;
	keep[points.length - 1] = 1;
	const stack = [[0, points.length - 1]];
	while (stack.length > 0) {
		const [first, last] = stack.pop();
		let index = -1;
		let maxSq = sqTol;
		for (let i = first + 1; i < last; i++) {
			const sq = sqSegDist(points[i], points[first], points[last]);
			if (sq > maxSq) {
				index = i;
				maxSq = sq;
			}
		}
		if (index === -1) continue;
		keep[index] = 1;
		stack.push([first, index], [index, last]);
	}
	return points.filter((_, i) => keep[i]);
}

const arrow = rest[0];
let arrowPath = '';
if (arrow) {
	const outline = traceOutline(arrow);
	const simplified = simplify(outline, 1.1);
	arrowPath =
		'M' +
		simplified.map(([x, y]) => `${(x + 0.5).toFixed(1)} ${(y + 0.5).toFixed(1)}`).join('L') +
		'Z';
	console.log(`arrowhead outline: ${outline.length} boundary pixels -> ${simplified.length} points`);
}

/* ------------------------------------------------------------------ */
/* The funnel gradient                                                 */
/* ------------------------------------------------------------------ */

/*
 * The mark is a funnel, so radius should fall as a dot approaches the
 * arrowhead. That is the claim AMBITION.md makes about the artwork, and it is
 * the property the loading animation depends on, so it is measured here rather
 * than assumed. A positive correlation of radius with distance from the point
 * is the whole assertion; the absolute radii depend on the scale the mark was
 * measured at and are reported rather than asserted.
 */
const headCx = arrow ? arrow.cx : W / 2;
const headCy = arrow ? arrow.cy : H / 2;
const byDistance = dots
	.map((d) => ({ r: radiusOf(d), d: Math.hypot(d.cx - headCx, d.cy - headCy) }))
	.sort((a, b) => a.d - b.d);

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const meanR = mean(byDistance.map((v) => v.r));
const meanD = mean(byDistance.map((v) => v.d));
const sdR = Math.sqrt(mean(byDistance.map((v) => (v.r - meanR) ** 2)));
const sdD = Math.sqrt(mean(byDistance.map((v) => (v.d - meanD) ** 2)));
const correlation = mean(byDistance.map((v) => (v.r - meanR) * (v.d - meanD))) / (sdR * sdD);

const nearest6 = mean(byDistance.slice(0, 6).map((v) => v.r));
const farthest6 = mean(byDistance.slice(-6).map((v) => v.r));

console.log('\nfunnel gradient, measured from the arrowhead centroid:');
console.log(`  nearest the point  r=${byDistance[0].r.toFixed(2)} at d=${byDistance[0].d.toFixed(0)}`);
console.log(
	`  farthest out       r=${byDistance[byDistance.length - 1].r.toFixed(2)} at d=${byDistance[byDistance.length - 1].d.toFixed(0)}`,
);
console.log(`  mean r nearest 6   ${nearest6.toFixed(2)}`);
console.log(`  mean r farthest 6  ${farthest6.toFixed(2)}  (ratio ${(farthest6 / nearest6).toFixed(2)})`);
console.log(`  correlation of radius with distance from the point: ${correlation.toFixed(3)}`);
console.log(
	`  AMBITION.md records 2.58 falling to 1.60 (ratio ${(2.58 / 1.6).toFixed(2)}); those are a` +
		' smaller scale than this 340-unit master, so the shape of the gradient is the claim,\n' +
		'  not the absolute numbers.',
);

/* ------------------------------------------------------------------ */
/* Validate against the documented mark before writing anything.       */
/* ------------------------------------------------------------------ */

const problems = [];
if (dots.length !== EXPECT_DOTS) {
	problems.push(`traced ${dots.length} dots, and AMBITION.md records ${EXPECT_DOTS}`);
}
if (!arrow) problems.push('no arrowhead component found');
if (rest.length > 1) {
	problems.push(`${rest.length} non-dot components; the mark has one arrowhead and nothing else`);
}
if (correlation < 0.3) {
	problems.push(
		`radius does not fall toward the point (correlation ${correlation.toFixed(2)}); the mark is a funnel and this trace is not one`,
	);
}

if (problems.length > 0) {
	console.error('\nTrace disagrees with the documented mark:');
	for (const p of problems) console.error(`  - ${p}`);
	console.error('\nNothing written. A trace that does not reproduce the mark is a different logo.');
	process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Emit                                                               */
/* ------------------------------------------------------------------ */

/*
 * One file, `currentColor`, so the light and dark masters collapse into a
 * single asset that inherits its colour from the page instead of needing a
 * second raster. Dots carry an index and their normalised distance along the
 * funnel, which is what lets a stylesheet animate convergence without any
 * script knowing the geometry.
 */
const cxs = dots.map((d) => d.cx);
const cys = dots.map((d) => d.cy);
const tipX = arrow ? arrow.cx : W / 2;
const tipY = arrow ? arrow.cy : H / 2;
const dist = dots.map((d) => Math.hypot(d.cx - tipX, d.cy - tipY));
const maxDist = Math.max(...dist);

const circles = dots
	.map((d, i) => {
		const r = radiusOf(d);
		const t = (dist[i] / maxDist).toFixed(3);
		return (
			`  <circle class="mk-dot" data-i="${i}" data-t="${t}" ` +
			`cx="${d.cx.toFixed(1)}" cy="${d.cy.toFixed(1)}" r="${r.toFixed(2)}" />`
		);
	})
	.join('\n');

const svg = [
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="currentColor" role="img" aria-label="BestInsurance Research" data-head-x="${tipX.toFixed(1)}" data-head-y="${tipY.toFixed(1)}">`,
	`  <title>BestInsurance Research</title>`,
	arrowPath ? `  <path class="mk-head" d="${arrowPath}" />` : '',
	circles,
	'</svg>',
	'',
]
	.filter(Boolean)
	.join('\n');

console.log(
	`\ndot field spans x ${Math.min(...cxs).toFixed(0)}-${Math.max(...cxs).toFixed(0)}, ` +
		`y ${Math.min(...cys).toFixed(0)}-${Math.max(...cys).toFixed(0)}`,
);
console.log(`arrowhead centroid ${tipX.toFixed(1)},${tipY.toFixed(1)}`);
console.log(`svg would be ${svg.length} bytes (masters are ${fs.statSync(MASTER).size} bytes)`);

/* ------------------------------------------------------------------ */
/* Fidelity against the master                                         */
/* ------------------------------------------------------------------ */

/*
 * The trace is only worth having if it reproduces the artwork, so it is
 * rasterised back at the master's own size and compared pixel for pixel. The
 * measure is intersection over union of the two ink masks: 1.0 would be
 * identical coverage. Anti-aliased edges on both sides put a perfect score out
 * of reach, so what matters is that the score is high enough that no dot has
 * moved, gone missing, or changed size.
 */
const rendered = await sharp(Buffer.from(svg)).resize(W, H).ensureAlpha().raw().toBuffer();
const rc = rendered.length / (W * H);
let both = 0;
let either = 0;
let onlyMaster = 0;
let onlyTrace = 0;
for (let i = 0; i < W * H; i++) {
	const m = data[i * C + (C - 1)] >= INK;
	const t = rendered[i * rc + (rc - 1)] >= INK;
	if (m && t) both++;
	if (m || t) either++;
	if (m && !t) onlyMaster++;
	if (t && !m) onlyTrace++;
}
const iou = both / either;
console.log('\nfidelity against the master:');
console.log(`  ink shared           ${both}`);
console.log(`  master only          ${onlyMaster}`);
console.log(`  trace only           ${onlyTrace}`);
console.log(`  intersection / union ${iou.toFixed(4)}`);

if (iou < 0.9) {
	problems.push(`trace covers only ${(iou * 100).toFixed(1)} per cent of the master's ink; a dot has moved or changed size`);
	console.error('\nTrace is not faithful to the master. Nothing written.');
	for (const x of problems) console.error(`  - ${x}`);
	process.exit(1);
}

/* ------------------------------------------------------------------ */
/* The favicon, from the same geometry                                 */
/* ------------------------------------------------------------------ */

/*
 * A second file rather than a second copy of the artwork, because a favicon
 * cannot inherit `currentColor` from a page it is not in - it has to carry its
 * own colour. So this one embeds the two ink values and switches between them
 * with its own media query, which is what collapses `favicon-light.svg` and
 * `favicon-dark.svg` into one asset.
 *
 * Both of those shipped as 340x340 `<image>` elements wrapping a base64 PNG:
 * 22KB between them, for a mark that is 37 circles and a polygon. This is
 * about a sixth of that and is sharp at any size, which a favicon particularly
 * needs - the package includes seven raster sizes precisely because the raster
 * cannot scale.
 *
 * The values are the real tokens from src/styles/tokens.css: --ink for light
 * browsers, --white for dark. They are literals here because an SVG served as
 * a file has no access to the stylesheet, and they are the only two colours in
 * the brand that the mark is ever drawn in.
 */
const FAVICON = 'public/favicon.svg';
const faviconSvg = [
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="BestInsurance Research">`,
	'  <title>BestInsurance Research</title>',
	'  <style>',
	'    :root { --mk: #17212e }',
	'    @media (prefers-color-scheme: dark) { :root { --mk: #ffffff } }',
	'    .mk { fill: var(--mk) }',
	'  </style>',
	`  <g class="mk">`,
	arrowPath ? `    <path d="${arrowPath}" />` : '',
	...dots.map((d) => `    <circle cx="${d.cx.toFixed(1)}" cy="${d.cy.toFixed(1)}" r="${radiusOf(d).toFixed(2)}" />`),
	'  </g>',
	'</svg>',
	'',
]
	.filter(Boolean)
	.join('\n');

if (process.argv.includes('--write')) {
	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, svg);
	console.log(`\nwrote ${OUT}`);

	/*
	 * What is being overwritten here is not an older version of the mark. The
	 * file at public/favicon.svg was the Astro starter's own logo - a single
	 * filled path in a 128 viewBox, no circles, nothing to do with this brand -
	 * left behind at scaffold time and never referenced by the layout. It sat in
	 * the public directory of a property whose entire argument is that it is
	 * careful.
	 */
	const stray = fs.existsSync(FAVICON) ? fs.readFileSync(FAVICON, 'utf8') : '';
	if (stray && !stray.includes('BestInsurance Research')) {
		console.log(`  replacing a foreign ${stray.length}-byte favicon.svg that is not this mark`);
	}
	fs.writeFileSync(FAVICON, faviconSvg);
	console.log(`wrote ${FAVICON} (${faviconSvg.length} bytes, self-colouring)`);
} else {
	console.log(`\nfavicon would be ${faviconSvg.length} bytes`);
	console.log('report only. pass --write to emit the files.');
}
