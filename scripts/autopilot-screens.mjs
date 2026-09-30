/**
 * Screenshot built routes at the three autopilot widths.
 *
 *   node scripts/autopilot-screens.mjs <out-dir> <route> [route ...]
 *
 * Serves dist/ with `astro preview` on a free local port, captures each route
 * at 390, 768 and 1280 with headless Chrome, and stops the server. Local only:
 * nothing is uploaded and no provider is called. Captures are the top of the
 * page at a tall viewport, which is what a reader sees first; the receipt says
 * so rather than calling them full-page.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/*
 * Headless Chrome proper clamps the window to a 500px minimum, so a "390"
 * capture from it is a 500px layout cropped to 390 and shows overflow that a
 * phone never sees. The headless shell honours the width, measured with
 * innerWidth, so it is preferred whenever Playwright has one cached.
 */
import os from 'node:os';
const SHELL_ROOT = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const shell = fs.existsSync(SHELL_ROOT)
	? fs
			.readdirSync(SHELL_ROOT)
			.filter((d) => d.startsWith('chromium_headless_shell-'))
			.sort()
			.reverse()
			.map((d) => path.join(SHELL_ROOT, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'))
			.find((f) => fs.existsSync(f))
	: undefined;
const CHROME = shell ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!shell) console.warn('no headless shell found: widths under 500px will be a cropped 500px layout');
const WIDTHS = [
	[390, 2400],
	[768, 2200],
	[1280, 1800],
];
const [outDir, ...routes] = process.argv.slice(2);
if (!outDir || routes.length === 0) {
	console.error('usage: node scripts/autopilot-screens.mjs <out-dir> <route> [route ...]');
	process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

/*
 * Astro 7 runs `astro preview` as a background daemon and answers "already
 * running at <url>" when one exists, so the base URL is read from whatever it
 * reports rather than assumed from the port asked for. A daemon this script
 * did not start is left running.
 */
const port = 4400 + Math.floor(Math.random() * 400);
const said = execFileSync('npx', ['astro', 'preview', '--port', String(port), '--host', '127.0.0.1'], {
	encoding: 'utf8',
	timeout: 60000,
});
const base = (said.match(/https?:\/\/(?:127\.0\.0\.1|localhost):\d+/) ?? [])[0];
if (!base) throw new Error(`could not find a preview URL in: ${said}`);
const startedHere = !/already running/i.test(said);
for (let i = 0; i < 60; i++) {
	try {
		const res = await fetch(`${base}/`);
		if (res.ok) break;
	} catch {}
	await new Promise((r) => setTimeout(r, 500));
}

try {
	for (const route of routes) {
		const slug = route.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home';
		for (const [width, height] of WIDTHS) {
			const file = path.resolve(outDir, `${slug}-${width}.png`);
			execFileSync(CHROME, [
				...(shell ? [] : ['--headless=new']),
				'--disable-gpu',
				'--hide-scrollbars',
				'--force-prefers-reduced-motion',
				`--window-size=${width},${height}`,
				`--screenshot=${file}`,
				`${base}${route}`,
			], { stdio: 'ignore', timeout: 60000 });
			console.log(file);
		}
	}
} finally {
	if (startedHere) execFileSync('npx', ['astro', 'preview', 'stop'], { stdio: 'ignore' });
}
