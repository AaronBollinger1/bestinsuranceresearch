/**
 * The line hub.
 *
 * The corpus covers far more lines than it has coverage pages for. Professional
 * liability carries 60 source records and 380 recorded claims and had no page
 * at all; umbrella and excess, 40 records; flood, 47. That material is already
 * written, already cited and already reviewed to the same standard as
 * everything else — it just lived inside module rules and question answers
 * where a reader looking for "professional liability" would never find it.
 *
 * A hub page per line surfaces it. It is deliberately NOT a coverage page and
 * must never read like one:
 *
 *  - A coverage page is a reading of a line: what it covers, what it excludes,
 *    what goes wrong. It is written, and it takes a week per line.
 *  - A hub page is an index of what this library holds on a line. It asserts
 *    nothing of its own. Every sentence on it was already published somewhere
 *    else on the site, with its citation intact.
 *
 * That distinction is the whole reason this is honest rather than filler. A hub
 * page with nothing behind it would be a stub pretending to be coverage, so
 * `hasSubstance` gates page generation and the nine lines with no material get
 * listed as gaps on the index instead of getting a page of their own.
 */
import type { Corpus } from './corpus';
import { canonicalLine, CANONICAL_LINES, type CanonicalLine } from './lines';

export interface HubCheck {
	moduleId: string;
	moduleName: string;
	ruleId: string;
	kind: string;
	severity: string;
	title: string;
	detail: string;
	sourceIds: string[];
	relatedQuestion?: string;
}

export interface LineHub {
	line: CanonicalLine;
	/** Display name, taken from a coverage page where one exists. */
	label: string;
	family: string;
	/** The coverage page for this line, where one has been written. */
	coverageId?: string;
	coverageName?: string;
	guideId?: string;
	checks: HubCheck[];
	moduleIds: Array<{ id: string; name: string; ruleCount: number }>;
	questionIds: Array<{ id: string; question: string }>;
	exampleIds: Array<{ id: string; title: string }>;
	sourceIds: string[];
	claimCount: number;
	/** Other canonical lines that share a module with this one. */
	adjacent: CanonicalLine[];
	/** False when the corpus holds too little to justify a page. */
	hasSubstance: boolean;
}

const ids = (refs: unknown): string[] =>
	((refs ?? []) as Array<string | { id: string }>).map((r) => (typeof r === 'string' ? r : r.id));

const linesOf = (values: unknown): CanonicalLine[] => {
	const out = new Set<CanonicalLine>();
	for (const v of (values ?? []) as string[]) {
		const c = canonicalLine(v);
		if (c) out.add(c);
	}
	return [...out];
};

/** Title case a slug, for lines the corpus has no written label for. */
function labelFor(line: string): string {
	const WORDS: Record<string, string> = {
		and: 'and',
		or: 'or',
		of: 'of',
		cgl: 'CGL',
		epli: 'EPLI',
		hoa: 'HOA',
		dic: 'DIC',
	};
	return line
		.split('-')
		.map((w, i) => WORDS[w] ?? (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
		.join(' ');
}

/**
 * A single line's holdings. `minSources` is the substance threshold: below it
 * the line is reported as a gap rather than rendered as a page.
 */
export function lineHub(corpus: Corpus, line: CanonicalLine, minSources = 3): LineHub {
	const coverage = corpus.coverages.find((c) => canonicalLine(c.data.line) === line);
	const modules = corpus.liveModules.filter((m) => linesOf(m.data.lines).includes(line));
	const questions = corpus.questions.filter((q) =>
		linesOf(q.data.lines).includes(line),
	);
	const examples = corpus.examples.filter((e) =>
		linesOf(e.data.lines).includes(line),
	);

	const checks: HubCheck[] = [];
	for (const m of modules) {
		for (const r of m.data.rules ?? []) {
			checks.push({
				moduleId: m.id,
				moduleName: m.data.name,
				ruleId: r.id,
				kind: r.kind,
				severity: r.severity,
				title: r.title,
				detail: r.detail,
				sourceIds: ids(r.sourceIds),
				relatedQuestion:
					typeof r.relatedQuestion === 'string'
						? r.relatedQuestion
						: r.relatedQuestion?.id,
			});
		}
	}

	const sourceIds = new Set<string>();
	for (const c of checks) for (const s of c.sourceIds) sourceIds.add(s);
	if (coverage) for (const s of ids(coverage.data.sourceIds)) sourceIds.add(s);
	for (const q of questions) for (const s of ids(q.data.sourceIds)) sourceIds.add(s);
	for (const e of examples) for (const s of ids(e.data.sourceIds)) sourceIds.add(s);

	const claimCount = [...sourceIds].reduce((n, id) => {
		const s = corpus.sourceById.get(id);
		return n + (s ? s.data.claims.length : 0);
	}, 0);

	const adjacent = new Set<CanonicalLine>();
	for (const m of modules) for (const l of linesOf(m.data.lines)) if (l !== line) adjacent.add(l);

	const family =
		coverage?.data.family ??
		modules[0]?.data.family ??
		(line.startsWith('commercial') || line.includes('liability') ? 'commercial' : 'personal');

	return {
		line,
		label: coverage?.data.name ?? labelFor(line),
		family,
		coverageId: coverage?.id,
		coverageName: coverage?.data.name,
		guideId: coverage?.id,
		checks,
		moduleIds: modules.map((m) => ({
			id: m.id,
			name: m.data.name,
			ruleCount: (m.data.rules ?? []).length,
		})),
		questionIds: questions.map((q) => ({ id: q.id, question: q.data.question })),
		exampleIds: examples.map((e) => ({ id: e.id, title: e.data.title })),
		sourceIds: [...sourceIds],
		claimCount,
		adjacent: [...adjacent].sort(),
		hasSubstance: sourceIds.size >= minSources,
	};
}

/** Every canonical line, richest first. */
export function allLineHubs(corpus: Corpus, minSources = 3): LineHub[] {
	return CANONICAL_LINES.map((line) => lineHub(corpus, line, minSources)).sort(
		(a, b) => b.sourceIds.length - a.sourceIds.length || a.label.localeCompare(b.label),
	);
}
