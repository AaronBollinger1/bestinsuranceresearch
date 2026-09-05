/**
 * Citation resolution.
 *
 * Content prose carries inline markers of the exact form [S:source-id].
 * Numbering comes from the entry's declared `sourceIds` array, so the number
 * shown next to a claim always matches the position of that source in the
 * visible source ledger rendered on the same page.
 *
 * A marker that is not in `sourceIds` is a build error, not a silent no-op.
 * That is what keeps the promise "every citation number resolves to a visible
 * source record".
 */

const MARKER = /\[S:([a-z0-9][a-z0-9-]*)\]/g;

const ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
};

export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Every source id referenced by a marker anywhere in the given strings. */
export function markersIn(...blocks: Array<string | undefined | null>): string[] {
	const found = new Set<string>();
	for (const block of blocks) {
		if (!block) continue;
		for (const match of block.matchAll(MARKER)) found.add(match[1]);
	}
	return [...found];
}

export interface Citer {
	/** Inline HTML for one run of text: escaped, with markers turned into links. */
	inline(text: string): string;
	/** Block HTML: blank-line-separated paragraphs, each passed through inline(). */
	paragraphs(text: string): string;
	/** 1-based ledger position of a source id. */
	numberOf(sourceId: string): number;
	/** Plain text with markers rendered as [1], [2] - used for exports and JSON. */
	plain(text: string): string;
}

export interface CiterOptions {
	/**
	 * Where a citation marker should point.
	 *
	 * 'ledger' (default) links to the numbered anchor in the source ledger on the
	 * same page. 'absolute' links to the source's own record page instead, for
	 * surfaces that cite sources without rendering a ledger. Using 'ledger' on a
	 * page with no ledger would produce a link that goes nowhere, which is exactly
	 * the failure the citation system exists to prevent.
	 */
	link?: 'ledger' | 'absolute';
}

/**
 * @param sourceIds  the entry's declared sources, in ledger order
 * @param context    an identifier used only in error messages
 * @param options    see CiterOptions
 */
export function createCiter(
	sourceIds: readonly string[],
	context: string,
	options: CiterOptions = {},
): Citer {
	const index = new Map<string, number>();
	sourceIds.forEach((id, i) => {
		if (!index.has(id)) index.set(id, i + 1);
	});

	const resolve = (id: string): number => {
		const n = index.get(id);
		if (!n) {
			throw new Error(
				`Unresolved citation [S:${id}] in ${context}. ` +
					`Add "${id}" to that entry's sourceIds, or correct the marker. ` +
					`Declared sources: ${sourceIds.join(', ') || '(none)'}`,
			);
		}
		return n;
	};

	const absolute = options.link === 'absolute';

	const inline = (text: string): string => {
		let out = '';
		let cursor = 0;
		for (const match of text.matchAll(MARKER)) {
			const at = match.index ?? 0;
			out += escapeHtml(text.slice(cursor, at));
			const id = match[1];
			const n = resolve(id);
			out += absolute
				? `<a class="cite" href="/sources/${encodeURIComponent(id)}" ` +
					`aria-label="Source ${n}: open the source record">[${n}]</a>`
				: `<a class="cite" href="#source-${n}" ` +
					`aria-label="Source ${n}: jump to the source record">[${n}]</a>`;
			cursor = at + match[0].length;
		}
		out += escapeHtml(text.slice(cursor));
		return out;
	};

	return {
		inline,
		paragraphs: (text) =>
			text
				.split(/\n{2,}/)
				.map((block) => block.trim())
				.filter(Boolean)
				.map((block) => `<p>${inline(block)}</p>`)
				.join('\n'),
		numberOf: resolve,
		plain: (text) => text.replace(MARKER, (_m, id: string) => `[${resolve(id)}]`),
	};
}

/** Strip markers entirely. For meta descriptions and machine-readable records. */
export function stripMarkers(text: string): string {
	return text.replace(MARKER, '').replace(/\s+([.,;:)])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
