/**
 * Which share card a page uses.
 *
 * A page without a family-specific card falls back to the Birch house card, so
 * a rebranded link never inherits the retired BestInsurance wordmark.
 * Per-family cards fix that, and the cards are the one generation job with a
 * measurable payoff: a link with no distinctive preview is a link people scroll
 * past in Slack, LinkedIn and chat surfaces.
 *
 * THE POINT OF THE EXISTS CHECK
 *
 * This resolves against the files actually present in `public/`, and falls back
 * to `og-birch.svg` for anything missing. That means the wiring can ship before a
 * single card has been generated: nothing breaks, every page keeps a working
 * preview, and each new file that lands in `public/` starts being used on the
 * next build with no code change. Pointing markup at an image that does not
 * exist is worse than pointing every page at the same one — a broken preview
 * reads as a broken site.
 */
import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const FALLBACK = '/og-birch.svg';

/** Cached because this is called once per page and the answer cannot change mid-build. */
const present = new Map<string, boolean>();

function exists(file: string): boolean {
	const hit = present.get(file);
	if (hit !== undefined) return hit;
	let found = false;
	try {
		found = fs.existsSync(path.join(PUBLIC_DIR, file.replace(/^\//, '')));
	} catch {
		found = false;
	}
	present.set(file, found);
	return found;
}

/**
 * A card for an insurance family, falling back to the house card.
 * Generated files are expected at `public/og-<family>.jpg`.
 */
export function shareImageForFamily(family: string | undefined): string {
	if (!family) return FALLBACK;
	const candidate = `/og-${family}.jpg`;
	return exists(candidate) ? candidate : FALLBACK;
}

/**
 * A card for one specific line, then its family, then the house card. A line
 * card is worth generating only for the lines people actually link to, so most
 * lines will resolve to their family and that is the intended behaviour rather
 * than a gap.
 */
export function shareImageForLine(line: string | undefined, family?: string): string {
	if (line) {
		const candidate = `/og-line-${line}.jpg`;
		if (exists(candidate)) return candidate;
	}
	return shareImageForFamily(family);
}

/** A card for a named surface, for example `tools` or `review-queue`. */
export function shareImageForSurface(surface: string): string {
	const candidate = `/og-${surface}.jpg`;
	return exists(candidate) ? candidate : FALLBACK;
}

/** What is present today, so a build can report the state rather than guess. */
export function shareImageInventory(): { file: string; present: boolean }[] {
	try {
		return fs
			.readdirSync(PUBLIC_DIR)
			.filter((f) => f.startsWith('og') && /\.(jpg|jpeg|png|webp)$/i.test(f))
			.map((f) => ({ file: `/${f}`, present: true }));
	} catch {
		return [];
	}
}
