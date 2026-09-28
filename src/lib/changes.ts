import type { Corpus } from './corpus';
import { correctionLog } from './review';

/**
 * What changed, derived from the source registry rather than written.
 *
 * `AUTHORITY-AND-DISTRIBUTION-PLAN.md` asks for a "what changed" report and
 * notes it is cheap to produce because the registry already records `status`,
 * `lastChecked`, `lastCheckedBasis` and supersession. That is the whole design:
 * nobody writes news here. A bill that failed, a guidance that was rescinded, a
 * form edition superseded, a document returned to and re-read - each of those
 * is already a field on a record, and this assembles them into one dated feed.
 *
 * `COMMONS.md` section 9 is why it belongs on the Record rather than on the
 * Commons: the Record states what changed, and the Commons discusses it. A
 * dated feed built from source deltas is citable in a way commentary is not.
 *
 * TWO KINDS OF DATE, AND THEY ARE NOT INTERCHANGEABLE
 *
 * A recorded change is dated by *when we recorded it*, because that is the only
 * date the corpus actually knows. We know an EEOC guidance is rescinded because
 * we read the notice saying so; we do not, from that field alone, know the date
 * the Commission voted. Presenting our filing date as the event date would be a
 * small lie that compounds across a whole feed, so the two are separated in the
 * type and labelled on the page.
 *
 * A scheduled change is dated by the instrument itself: `figures.nextMove` is
 * the date the document says the amount moves. That one is the document's date,
 * not ours.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not compute the amount a scheduled change will produce. Several
 * figures are stepped schedules whose operative value today is arithmetic
 * rather than a printed number, and `DIRECTION.md` forbids publishing a figure
 * the source did not state. The feed says when the instrument moves the amount
 * and leaves the amount to the figure record, which carries the hedge.
 *
 * It also does not infer that a recheck caused a correction. The two are
 * recorded on different records - a recheck on the source, a correction on the
 * record that cited it - and joining them on nearby dates would be a guess
 * presented as provenance. They are listed as what they are.
 */

export type RecordedChangeKind =
	| 'superseded'
	| 'rescinded'
	| 'not-adopted'
	| 'corrected'
	| 'rechecked';

export interface RecordedChange {
	kind: RecordedChangeKind;
	/** When we recorded it. Never presented as the date the event happened. */
	date: string;
	title: string;
	path: string;
	detail: string;
	/** Only on a supersession we hold both halves of. */
	supersededBy?: { id: string; title: string; path: string };
	/** Only on a correction. Kept as two fields so the page can label them. */
	was?: string;
	now?: string;
}

export interface ScheduledChange {
	/** The instrument's own date, from figures.nextMove. */
	date: string;
	label: string;
	amount: string;
	movesWhen: string;
	instrument: string;
	path: string;
	states: string[];
}

const STATUS_KIND: Record<string, RecordedChangeKind> = {
	superseded: 'superseded',
	rescinded: 'rescinded',
	'not-adopted': 'not-adopted',
};

export const CHANGE_LABEL: Record<RecordedChangeKind, string> = {
	superseded: 'Superseded',
	rescinded: 'Rescinded',
	'not-adopted': 'Never adopted',
	corrected: 'Correction published',
	rechecked: 'Source re-read',
};

/**
 * Every recorded change, newest first.
 *
 * A source that is both not-active and rechecked produces two entries, and that
 * is right: finding that a document had been withdrawn and returning to it
 * later are different events, and collapsing them would hide the second.
 */
export function recordedChanges(corpus: Corpus): RecordedChange[] {
	const out: RecordedChange[] = [];

	for (const source of corpus.sources) {
		const d = source.data;
		const path = `/sources/${source.id}`;

		const kind = STATUS_KIND[d.status];
		if (kind) {
			/* Hoisted so the narrowing survives into the spread below. The field is
			   nullable as well as optional, which astro check catches and a runtime
			   test would not have. */
			const replacement = d.supersededBy ?? undefined;
			const target = replacement ? corpus.sourceById.get(replacement.id) : undefined;
			out.push({
				kind,
				date: d.lastChecked,
				title: d.title,
				path,
				/* The record's own status note, which is where the document says what
				   happened to it. Not paraphrased: a paraphrase of a withdrawal is
				   the easiest place on this site to soften a fact by accident. */
				detail: d.statusNote || `The registry records this document as ${d.status}.`,
				...(replacement && target
					? {
							supersededBy: {
								id: replacement.id,
								title: target.data.title,
								path: `/sources/${replacement.id}`,
							},
						}
					: {}),
			});
		}

		if (d.lastCheckedBasis === 'recheck') {
			out.push({
				kind: 'rechecked',
				date: d.lastChecked,
				title: d.title,
				path,
				/* Just the two dates. The caveat that a recheck is a comparison rather
				   than an outcome belongs in the section intro: repeated on all
				   eleven rows it was noise, and it buried the dates that are the
				   actual content. */
				detail: `First read ${d.accessedDate}, returned to and compared against the claims recorded from it on ${d.lastChecked}.`,
			});
		}
	}

	for (const entry of correctionLog(corpus)) {
		out.push({
			kind: 'corrected',
			date: entry.date,
			title: entry.title,
			path: entry.path,
			/* No prose. The two labelled halves below say it, and a sentence
			   repeated above every one of them was the same noise the recheck
			   caveat was. */
			detail: '',
			was: entry.was,
			now: entry.now,
		});
	}

	return out.sort(
		(a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)),
	);
}

/** A real ISO date, as opposed to the schema's 'unknown' and 'n/a' escapes. */
const isRealDate = (value: unknown): value is string =>
	typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * What the instruments themselves schedule, soonest first.
 *
 * Only dates still ahead of us: a `nextMove` in the past means the amount has
 * moved and the figure record has not caught up, which is a review trigger
 * rather than a thing to publish as forthcoming.
 */
export function scheduledChanges(corpus: Corpus, today: string): ScheduledChange[] {
	const out: ScheduledChange[] = [];
	for (const figure of corpus.figures) {
		const d = figure.data;
		if (!isRealDate(d.nextMove) || d.nextMove <= today) continue;
		out.push({
			date: d.nextMove,
			label: d.label,
			amount: d.amount,
			movesWhen: d.movesWhen,
			instrument: d.instrument,
			path: `/figures#${figure.id}`,
			states: d.states ?? [],
		});
	}
	return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.label.localeCompare(b.label)));
}

/**
 * A figure whose scheduled move is already behind us.
 *
 * Not published as a change - it is the registry telling on itself, and it
 * belongs in the review queue's language rather than in a feed of news. It is
 * computed here because this is the only place that reads `nextMove`, and a
 * silent filter is how a stale figure survives.
 */
export function overdueFigures(corpus: Corpus, today: string) {
	return corpus.figures
		.filter((f) => isRealDate(f.data.nextMove) && f.data.nextMove <= today)
		.map((f) => ({ id: f.id, label: f.data.label, nextMove: f.data.nextMove as string }))
		.sort((a, b) => a.nextMove.localeCompare(b.nextMove));
}

/** Grouped by year, so a long feed reads as a timeline rather than a list. */
export function byYear(changes: RecordedChange[]): Array<{ year: string; changes: RecordedChange[] }> {
	const groups = new Map<string, RecordedChange[]>();
	for (const change of changes) {
		const year = change.date.slice(0, 4);
		if (!groups.has(year)) groups.set(year, []);
		groups.get(year)!.push(change);
	}
	return [...groups.entries()]
		.sort((a, b) => b[0].localeCompare(a[0]))
		.map(([year, list]) => ({ year, changes: list }));
}

export function changeSummary(corpus: Corpus, today: string) {
	const recorded = recordedChanges(corpus);
	return {
		recorded: recorded.length,
		notActive: recorded.filter((c) => c.kind !== 'rechecked' && c.kind !== 'corrected').length,
		rechecks: recorded.filter((c) => c.kind === 'rechecked').length,
		corrections: recorded.filter((c) => c.kind === 'corrected').length,
		scheduled: scheduledChanges(corpus, today).length,
		newest: recorded[0]?.date ?? 'none',
	};
}
