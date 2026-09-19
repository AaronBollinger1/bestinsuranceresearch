/**
 * Shortening a passage without lying about it.
 *
 * Every card, every related-question row and every `<meta name="description">`
 * on this site used to do `text.slice(0, 190)`, which cuts wherever the 190th
 * character happens to fall. The homepage shipped "in at least 10-point
 * boldface ty" and "NASBP describes a su". Six of them above the fold.
 *
 * That is worth more than a tidy-up, for two reasons.
 *
 * THE FIRST IS EDITORIAL. `DIRECTION.md` says a hedge is the finding: where a
 * claim says often, may, commonly, or depends on the policy form, that
 * qualifier is the substance and stripping it changes what was said. A cut at
 * an arbitrary character does exactly that, silently and at scale. "Generally
 * covered, unless the form excludes earth movement" truncated at the comma is
 * not a shorter version of that sentence; it is a different and wrong one. A
 * summary that can invert a claim is not a formatting problem.
 *
 * THE SECOND IS THAT IT IS THE SIGNATURE OF MACHINE-MADE TEXT. Prose severed
 * mid-word is the single most recognisable tell of a page assembled by a
 * program that never read it. On a property whose entire argument is that a
 * person checked this, that texture costs more than it appears to.
 *
 * So the rule here is to prefer whole sentences and to fall back to whole
 * words. A card shows the first sentence or two of a real answer and stops
 * where the writer stopped, which is also simply how an editor writes a
 * standfirst.
 */

/**
 * Abbreviations whose full stop is not the end of a sentence.
 *
 * Legal and insurance prose is unusually dense with these - a naive split on
 * ". " breaks "42 U.S.C. 4012a" into three sentences and "Stats. 2022, Ch. 17,
 * Sec. 3" into four. The list is the ones this corpus actually contains;
 * anything not here is caught by the single-letter and digit rules below.
 */
const ABBREVIATIONS = new Set([
	'u.s.c',
	'c.f.r',
	'u.s',
	'stats',
	'stat',
	'ch',
	'sec',
	/* Reporter and code abbreviations. "Cal. Code Regs. tit. 19" is four full
	   stops and no sentences, and this corpus is largely made of citations
	   shaped like it. */
	'cal',
	'regs',
	'reg',
	'tit',
	'ann',
	'supp',
	'rev',
	'admin',
	'civ',
	'ins',
	'veh',
	'pen',
	'lab',
	'prob',
	'bus',
	'prof',
	'gov',
	'util',
	'app',
	'ct',
	'cir',
	'dist',
	'subd',
	'subs',
	'cl',
	'vol',
	'ed',
	'tex',
	'fla',
	'n.y',
	'no',
	'nos',
	'v',
	'vs',
	'inc',
	'co',
	'corp',
	'ltd',
	'llc',
	'dba',
	'et al',
	'e.g',
	'i.e',
	'cf',
	'ibid',
	'para',
	'pt',
	'art',
	'fig',
	'approx',
	'dept',
	'div',
	'mr',
	'mrs',
	'ms',
	'dr',
	'st',
	'ave',
	'jan',
	'feb',
	'mar',
	'apr',
	'jun',
	'jul',
	'aug',
	'sep',
	'sept',
	'oct',
	'nov',
	'dec',
]);

/**
 * True where the full stop at `index` genuinely ends a sentence.
 *
 * Three things disqualify it: the word before it is a known abbreviation, that
 * word is a single letter (an initial, or a statutory "A."), or the character
 * before it is a digit and the one after is too, which is a decimal or a
 * section number like 1798.82.
 */
function endsSentence(text: string, index: number): boolean {
	const before = text[index - 1];
	const after = text[index + 1];

	if (/\d/.test(before ?? '') && /\d/.test(after ?? '')) return false;

	/* The word immediately preceding the stop, lower-cased and without any
	   internal punctuation stripped - "u.s.c" has to match as written. */
	const preceding = text.slice(0, index).match(/([A-Za-z.]+)$/)?.[1]?.toLowerCase() ?? '';
	/* No alphabetic token before the stop means it follows a number - "effective
	   January 1, 2023." The decimal case is already excluded above, so this is a
	   real sentence end. Returning false here swallowed every sentence that
	   happens to end in a year, which in this corpus is a great many. */
	if (!preceding) return true;
	if (preceding.length === 1) return false;
	if (ABBREVIATIONS.has(preceding.replace(/\.$/, ''))) return false;

	return true;
}

/** Split into sentences, keeping their terminal punctuation. */
export function sentences(text: string): string[] {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (!clean) return [];

	const out: string[] = [];
	let start = 0;

	for (let i = 0; i < clean.length; i += 1) {
		const char = clean[i];
		if (char !== '.' && char !== '!' && char !== '?') continue;

		/* Run past a closing quote or bracket so they stay with the sentence. */
		let end = i + 1;
		while (end < clean.length && /["')\]”]/.test(clean[end])) end += 1;

		/* A sentence break needs whitespace after it, or the end of the text. */
		if (end < clean.length && !/\s/.test(clean[end])) continue;
		if (char === '.' && !endsSentence(clean, i)) continue;

		out.push(clean.slice(start, end).trim());
		start = end;
		i = end - 1;
	}

	const tail = clean.slice(start).trim();
	if (tail) out.push(tail);
	return out;
}

/**
 * A short version of a passage that stops where a writer would.
 *
 * Whole sentences up to the budget. Where even the first sentence is longer
 * than the budget, whole words with an ellipsis - never a severed word, and
 * never a cut inside the sentence's own hedge if a sentence boundary is
 * available.
 *
 * `budget` is a target rather than a hard cap, because a complete sentence a
 * little over is better than an amputated one under. The tolerance is a quarter:
 * past that a sentence overruns the card it sits in badly enough that the
 * layout, rather than the prose, becomes the problem, and the word-boundary
 * fallback runs instead.
 */
const TOLERANCE = 1.25;

export function excerpt(text: string, budget: number, min = 0): string {
	const clean = (text ?? '').replace(/\s+/g, ' ').trim();
	if (!clean) return '';
	if (clean.length <= budget) return clean;

	const parts = sentences(clean);

	/* Take whole sentences while they fit. */
	let taken = '';
	for (const sentence of parts) {
		const next = taken ? `${taken} ${sentence}` : sentence;
		if (next.length > budget && taken) break;
		taken = next;
		if (taken.length >= budget) break;
	}

	/*
	 * `min` exists because of a real regression. Several answers here open with
	 * the whole answer in two words - "Very little.", "Generally no." - and the
	 * loop above will not add the next sentence if doing so exceeds the budget.
	 * On a card that is perfect: the direct answer, punchy, and complete. As a
	 * search-result description it is useless, and twelve pages shipped one.
	 *
	 * So a caller that needs substance sets a floor, and below it we take whole
	 * words instead. Cards deliberately do not set one.
	 */
	if (taken && taken.length >= min && taken.length <= budget * TOLERANCE) return taken;

	/*
	 * The first sentence is very long, so fall back to whole words. The trailing
	 * word is dropped along with any dangling punctuation, because "the policy,…"
	 * reads as a transcription error rather than an abridgement.
	 */
	const words = clean.slice(0, budget + 1).split(' ');
	words.pop();
	const trimmed = words.join(' ').replace(/[\s,;:—–-]+$/, '');
	return trimmed ? `${trimmed}…` : clean.slice(0, budget);
}

/**
 * Shorten a label rather than a passage.
 *
 * A title is not prose and must not be sentence-split. "Cal. Code Regs. tit.
 * 19, section 901" contains four full stops and no sentences at all, so running
 * the sentence rule over it produced the description "Source record: Cal. Code
 * Regs. tit." - correct by that rule and useless.
 *
 * So titles clip on a word boundary and nothing else. The distinction is worth
 * keeping in two functions rather than a flag: `excerpt` is for something
 * somebody wrote in sentences, `clip` is for a name.
 */
export function clip(text: string, budget: number): string {
	const clean = (text ?? '').replace(/\s+/g, ' ').trim();
	if (clean.length <= budget) return clean;
	const words = clean.slice(0, budget + 1).split(' ');
	words.pop();
	const trimmed = words.join(' ').replace(/[\s,;:—–-]+$/, '');
	return trimmed ? `${trimmed}…` : clean.slice(0, budget);
}

/**
 * Close a fragment with a full stop, unless it already ends in one.
 *
 * A clipped value already ends in an ellipsis, and appending a period to it
 * gives "reproduction of the…." - which reads as a rendering fault rather than
 * an abridgement, and is exactly the kind of small wrongness this pass is about.
 */
export function endSentence(text: string): string {
	const trimmed = (text ?? '').trim();
	if (!trimmed) return '';
	return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * The excerpt for a `<meta name="description">`.
 *
 * Shorter, because a search engine shows about 155 characters and cutting
 * inside the visible part is where the damage is done. Same sentence rule: a
 * description that stops mid-clause reads as a broken page before anybody has
 * opened it, and it is the first thing anyone sees of this site.
 */
export function metaDescription(text: string): string {
	/*
	 * The floor is 80 rather than the audit's 50, so a description that only just
	 * clears the check is not treated as fine. `npm run audit:onpage` fails a
	 * production build under 50 characters, and it is the thing that caught this.
	 */
	return excerpt(text, 155, 80);
}

/**
 * A short list, with the remainder counted rather than spilled.
 *
 * A question tagged with five lines of business rendered all five as a wrapping
 * wall of monospace, which reads as output rather than as metadata. Three and a
 * count is legible and says the same thing.
 */
export function shortList(items: string[], keep = 3): string {
	if (items.length <= keep) return items.join(', ');
	return `${items.slice(0, keep).join(', ')} +${items.length - keep} more`;
}
