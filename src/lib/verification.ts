/**
 * Verification sheets: the review job stated at the size it actually is.
 *
 * WHY THIS EXISTS
 *
 * `review.ts` gets a reviewer as far as an ordered list. It cannot get them
 * further, because the unit it counts is the record and the unit a reviewer
 * verifies is the sentence. Ordering by source removed the re-reading (299
 * readings rather than 838) but left the reader with a source id and no way to
 * see what the corpus is using that document to assert. To find out, they had
 * to open every dependent page and hunt for the marker.
 *
 * This computes the missing half: for one source, every individual sentence
 * anywhere in the corpus that cites it, with the field it sits in and the page
 * it publishes on. Measured on the corpus as it stands, that is 4,948 cited
 * sentences across 5,696 sentence-to-source edges - the real size of the
 * commitment, against 156 records and 838 record-to-source dependencies as
 * previously reported. Median 13 sentences per source, so a single source is a
 * sitting rather than a project.
 *
 * TWO KINDS OF DEPENDENCY, AND WHY BOTH ARE HERE
 *
 * Most dependencies are prose: a sentence carries `[S:id]` and the marker says
 * precisely what rests on the document. Thirty do not. A figure record cites
 * structurally - its `amount` must appear verbatim in a claim of a cited source,
 * asserted in scripts/verify.mjs, and it carries no inline marker at all - and
 * eight coverage records declare a source in their ledger that no sentence on
 * the page points at. A sheet built on markers alone would omit all thirty and
 * be quietly wrong about the exposure, which is the same failure the figures
 * collection produced twice before in `citingPages` and `reviewQueue`. So
 * declared-but-unmarked dependencies are collected separately and shown as
 * what they are.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not record an outcome. Sign-off lives in the record's own JSON, so
 * the sheet states the edit a verdict implies and stops there rather than
 * implying a control it does not have. Nothing here collects anything: no
 * form, no field, no account. The sheet is a worksheet in the printed sense.
 */
import type { Corpus } from './corpus';
import { idsOf } from './corpus';
import { reviewableRecords, type ReviewableRecord, type ReviewState } from './review';

/*
 * Two regexes for one pattern, deliberately. A global regex carries lastIndex,
 * and String.prototype.matchAll seeds the matcher it builds from that value -
 * so testing a whole block with the global one and then calling matchAll on
 * each of its sentences starts the per-sentence search partway in and silently
 * loses the earlier markers. That cost this file a wrong answer on its first
 * build: a question citing the MICRA statute three times in its own short
 * answer was filed as citing it structurally, with no marker anywhere.
 */
const HAS_MARKER = /\[S:[a-z0-9][a-z0-9-]*\]/;
const MARKER = /\[S:([a-z0-9][a-z0-9-]*)\]/g;

/** One cited sentence: the smallest thing a reviewer can confirm or reject. */
export interface AssertionUnit {
	kind: string;
	recordId: string;
	recordTitle: string;
	/** The page this sentence publishes on. */
	path: string;
	/** Where in the record it sits, for example `commonlyCovers[3].note`. */
	field: string;
	/** The sentence with its markers intact. */
	text: string;
	/** Every source cited by this sentence, so shared attribution is visible. */
	sourceIds: string[];
	reviewState: ReviewState;
}

/**
 * A record that declares this source but points no sentence at it. Not a
 * lesser dependency - a figure's whole assertion is structural - but a
 * differently shaped one, so it is verified against fields rather than prose.
 */
export interface DeclaredDependency {
	kind: string;
	recordId: string;
	recordTitle: string;
	path: string;
	reviewState: ReviewState;
	/** The substantive fields carrying what rests on the document. */
	fields: Array<{ field: string; value: string }>;
}

/**
 * Fields that carry the substance of a structurally citing record, in the order
 * a reviewer wants them. Anything not listed is metadata: a family, a date, an
 * author. Explicit rather than inferred, because "every string field" would
 * bury the amount under the bookkeeping.
 */
const SUBSTANTIVE: Record<string, string[]> = {
	Figure: ['amount', 'applies', 'instrument', 'movesWhen', 'nextMove', 'lastMoved', 'note'],
	Coverage: ['definition'],
	Question: ['shortAnswer'],
	Example: ['whatHappened'],
	Entity: ['summary'],
	State: ['summary'],
	Module: ['summary'],
	'Cross-rule': ['title', 'detail'],
	Worksheet: ['summary'],
};

/**
 * Split a block into the units a reviewer reads one at a time.
 *
 * Paragraphs first, then sentence boundaries. The lookahead requires a capital
 * or an opening quote so that "26 CFR 54.4980H-5(e)(2)" and "Cal. Ins. Code"
 * do not split mid-citation, which is the failure mode that matters here: a
 * half-sentence cannot be confirmed against a document.
 */
export function assertionSentences(text: string): string[] {
	return text
		.split(/\n{2,}/)
		.flatMap((para) => para.split(/(?<=[.:;?!])\s+(?=[A-Z("])/))
		.map((s) => s.trim())
		.filter(Boolean);
}

function walk(
	value: unknown,
	field: string,
	push: (field: string, text: string, sourceIds: string[]) => void,
): void {
	if (typeof value === 'string') {
		if (!HAS_MARKER.test(value)) return;
		for (const sentence of assertionSentences(value)) {
			MARKER.lastIndex = 0;
			const ids = [...sentence.matchAll(MARKER)].map((m) => m[1]);
			if (ids.length === 0) continue;
			push(field, sentence, [...new Set(ids)]);
		}
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((v, i) => walk(v, `${field}[${i}]`, push));
		return;
	}
	if (value && typeof value === 'object') {
		for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
			walk(v, field ? `${field}.${key}` : key, push);
		}
	}
}

/** Every cited sentence in one record, in document order. */
export function assertionsInRecord(record: ReviewableRecord): AssertionUnit[] {
	const out: AssertionUnit[] = [];
	walk(record.data, '', (field, text, sourceIds) => {
		out.push({
			kind: record.kind,
			recordId: record.id,
			recordTitle: record.title,
			path: record.path,
			field,
			text,
			sourceIds,
			reviewState: (record.data.reviewState ?? 'under-review') as ReviewState,
		});
	});
	return out;
}

/** Every source id a record declares, including the ones its rules declare. */
function declaredIn(record: ReviewableRecord): string[] {
	const ids = new Set(idsOf((record.data.sourceIds ?? []) as Array<{ id: string } | string>));
	for (const rule of (record.data.rules ?? []) as Array<{ sourceIds?: Array<{ id: string } | string> }>) {
		for (const id of idsOf(rule.sourceIds ?? [])) ids.add(id);
	}
	return [...ids];
}

function substantiveFields(record: ReviewableRecord): Array<{ field: string; value: string }> {
	const wanted = SUBSTANTIVE[record.kind] ?? [];
	const out: Array<{ field: string; value: string }> = [];
	for (const field of wanted) {
		const value = record.data[field];
		if (typeof value === 'string' && value.trim()) out.push({ field, value: value.trim() });
	}
	return out;
}

export interface VerificationIndex {
	/** Cited sentences, keyed by the source they cite. */
	assertions: Map<string, AssertionUnit[]>;
	/** Declared-but-unmarked dependencies, keyed by source. */
	declared: Map<string, DeclaredDependency[]>;
	/** Corpus-wide totals, so a page can state the size of the job. */
	totals: {
		records: number;
		sentences: number;
		edges: number;
		declaredOnly: number;
	};
}

/**
 * Built once per build and shared, because every sheet needs the whole corpus
 * walked and doing it 299 times would walk it 299 times.
 */
export function verificationIndex(corpus: Corpus): VerificationIndex {
	const assertions = new Map<string, AssertionUnit[]>();
	const declared = new Map<string, DeclaredDependency[]>();
	const records = reviewableRecords(corpus);
	let sentences = 0;
	let edges = 0;
	let declaredOnly = 0;

	for (const record of records) {
		const units = assertionsInRecord(record);
		sentences += units.length;
		const marked = new Set<string>();
		for (const unit of units) {
			for (const id of unit.sourceIds) {
				marked.add(id);
				edges++;
				const bucket = assertions.get(id);
				if (bucket) bucket.push(unit);
				else assertions.set(id, [unit]);
			}
		}

		const fields = substantiveFields(record);
		for (const id of declaredIn(record)) {
			if (marked.has(id)) continue;
			declaredOnly++;
			const entry: DeclaredDependency = {
				kind: record.kind,
				recordId: record.id,
				recordTitle: record.title,
				path: record.path,
				reviewState: (record.data.reviewState ?? 'under-review') as ReviewState,
				fields,
			};
			const bucket = declared.get(id);
			if (bucket) bucket.push(entry);
			else declared.set(id, [entry]);
		}
	}

	return {
		assertions,
		declared,
		totals: {
			records: records.length,
			sentences,
			edges,
			declaredOnly,
		},
	};
}

export interface AssertionGroup {
	kind: string;
	recordId: string;
	recordTitle: string;
	path: string;
	reviewState: ReviewState;
	units: AssertionUnit[];
}

export interface VerificationSheet {
	sourceId: string;
	/** Cited sentences grouped by the record that publishes them. */
	groups: AssertionGroup[];
	declared: DeclaredDependency[];
	sentences: number;
	records: number;
	/** Sentences that cite this source alongside at least one other. */
	shared: number;
	/** Outstanding records among the dependents. */
	outstanding: number;
}

/**
 * One source's sheet. Grouped by record rather than flat: a reviewer reading a
 * statute wants to see the four sentences one coverage page rests on it
 * together, because they are usually one argument split across fields.
 */
export function verificationSheet(index: VerificationIndex, sourceId: string): VerificationSheet {
	const units = index.assertions.get(sourceId) ?? [];
	const byRecord = new Map<string, AssertionGroup>();
	for (const unit of units) {
		const key = `${unit.kind}:${unit.recordId}`;
		const group = byRecord.get(key);
		if (group) group.units.push(unit);
		else
			byRecord.set(key, {
				kind: unit.kind,
				recordId: unit.recordId,
				recordTitle: unit.recordTitle,
				path: unit.path,
				reviewState: unit.reviewState,
				units: [unit],
			});
	}

	const groups = [...byRecord.values()].sort(
		(a, b) => b.units.length - a.units.length || a.recordTitle.localeCompare(b.recordTitle),
	);
	const declared = (index.declared.get(sourceId) ?? []).sort((a, b) =>
		a.recordTitle.localeCompare(b.recordTitle),
	);

	/* Counted by record identity, not by page. Fifteen cross-rules share
	   /position and nineteen figures share /figures, so counting distinct paths
	   would report one dependent where there are fifteen. */
	const key = (x: { kind: string; recordId: string }) => x.kind + ':' + x.recordId;
	const all = [...groups, ...declared];
	const identities = new Set(all.map(key));
	const outstanding = new Set(all.filter((x) => x.reviewState !== 'reviewed').map(key));

	return {
		sourceId,
		groups,
		declared,
		sentences: units.length,
		records: identities.size,
		shared: units.filter((u) => u.sourceIds.length > 1).length,
		outstanding: outstanding.size,
	};
}
