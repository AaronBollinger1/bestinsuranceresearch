/**
 * The review queue.
 *
 * Nothing on this site is signed off: 45 of 45 content records carry
 * `reviewState: under-review`, and "licensed broker reviewed" is the whole
 * proposition. The bottleneck is not willingness, it is that a reviewer had no
 * way to see what needed attention, in what order, or why. This computes that.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not show a diff of what changed since the last review, because there
 * is no history to diff against: the working copy is not a repository, so the
 * only dates available are the ones the records state about themselves. Rather
 * than imply a change feed it does not have, the queue reports the triggers
 * that are genuinely computable — and a superseded source under a published
 * page matters more than an edit to its prose anyway.
 *
 * HOW THE ORDER IS DECIDED
 *
 * By severity first, then by how many cited statements the record publishes.
 * The second is the honest measure of exposure: every `[S:...]` marker is one
 * assertion a reviewer is putting their licence behind, so a page with 106 of
 * them is a larger commitment than one with 9, regardless of either page's
 * subject.
 */
import type { Corpus } from './corpus';
import { citingPages } from './corpus';

export type TriggerSeverity = 'high' | 'medium';

/** Mirrors REVIEW_STATE in content.config.ts, and StatusChip accepts these. */
export type ReviewState = 'reviewed' | 'under-review' | 'corrected';

export interface ReviewTrigger {
	code: string;
	label: string;
	detail: string;
	severity: TriggerSeverity;
}

export interface ReviewItem {
	kind: string;
	id: string;
	title: string;
	path: string;
	reviewState: ReviewState;
	lastReviewed: string;
	reviewer: string;
	/** Cited statements on this record. The review workload, and the exposure. */
	statements: number;
	sourceCount: number;
	triggers: ReviewTrigger[];
	/**
	 * Triggers other than never having been reviewed. While nothing on the
	 * site is signed off, `never-reviewed` is true of every record, so it
	 * cannot discriminate between them; these are the reasons one record needs
	 * attention ahead of another.
	 */
	escalations: ReviewTrigger[];
}

/** Every `[S:...]` marker anywhere in the record, however deeply nested. */
export function statementCount(value: unknown): number {
	if (typeof value === 'string') return (value.match(/\[S:[a-z0-9-]+\]/g) ?? []).length;
	if (Array.isArray(value)) return value.reduce<number>((n, v) => n + statementCount(v), 0);
	if (value && typeof value === 'object') {
		return Object.values(value as Record<string, unknown>).reduce<number>(
			(n, v) => n + statementCount(v),
			0,
		);
	}
	return 0;
}

const idsOf = (refs: unknown): string[] =>
	((refs ?? []) as Array<string | { id: string }>).map((r) => (typeof r === 'string' ? r : r.id));

/**
 * Triggers that come from the sources a record leans on rather than from the
 * record itself. These are the ones worth surfacing: a page can be perfectly
 * written and still be wrong because a regulation under it was withdrawn.
 */
function sourceTriggers(
	corpus: Corpus,
	sourceIds: string[],
	isStaleFn: (lastChecked: string) => boolean,
): ReviewTrigger[] {
	const triggers: ReviewTrigger[] = [];
	const notActive: string[] = [];
	const stale: string[] = [];
	let neverRechecked = 0;

	for (const id of sourceIds) {
		const source = corpus.sourceById.get(id);
		if (!source) continue;
		const d = source.data;
		if (d.status !== 'active') notActive.push(`${id} (${d.status})`);
		if (isStaleFn(d.lastChecked)) stale.push(id);
		if (d.lastCheckedBasis === 'access') neverRechecked++;
	}

	if (notActive.length > 0) {
		triggers.push({
			code: 'source-not-active',
			label: 'Relies on a source that is not active',
			detail: `${notActive.join(', ')}. A withdrawn or superseded source under a published page is the one review trigger that cannot wait.`,
			severity: 'high',
		});
	}
	if (stale.length > 0) {
		triggers.push({
			code: 'source-stale',
			label: 'Relies on a source past the review window',
			detail: `${stale.length} of ${sourceIds.length} source records are past the window and are flagged wherever they are cited.`,
			severity: 'high',
		});
	}
	if (neverRechecked > 0) {
		triggers.push({
			code: 'source-never-rechecked',
			label: 'Sources never independently rechecked',
			detail: `${neverRechecked} of ${sourceIds.length} carry the date they were read on rather than a later confirmation. Reviewing the page is a good moment to confirm one or two of them.`,
			severity: 'medium',
		});
	}
	return triggers;
}

/**
 * One record that carries a review state, normalized across collections.
 *
 * This exists because the enumeration kept being written twice. `citingPages`
 * and `reviewQueue` each held their own list of collections, and each one has
 * now silently omitted a collection that carried an under-review badge: figures
 * from both, cross-rules from both. A page that says nothing depends on a
 * source, or a queue that reports a smaller backlog than exists, is the most
 * expensive kind of quiet wrong on this property.
 *
 * So the list of what is reviewable lives here once, and `reviewQueue`,
 * `sourceReviewOrder` and the verification sheets all read it. Adding a
 * collection means adding it in one place. `scripts/verify.mjs` asserts that
 * every collection carrying a `reviewState` appears in the result.
 */
export interface ReviewableRecord {
	kind: string;
	id: string;
	title: string;
	/** The page this record publishes on. Several records may share one. */
	path: string;
	data: Record<string, unknown>;
	/** Triggers only this collection can compute. */
	extraTriggers: ReviewTrigger[];
}

export function reviewableRecords(corpus: Corpus): ReviewableRecord[] {
	const out: ReviewableRecord[] = [];
	const push = (
		kind: string,
		id: string,
		title: string,
		path: string,
		data: unknown,
		extraTriggers: ReviewTrigger[] = [],
	) => out.push({ kind, id, title, path, data: data as Record<string, unknown>, extraTriggers });

	for (const c of corpus.coverages) push('Coverage', c.id, c.data.name, `/insurance/${c.id}`, c.data);
	for (const q of corpus.questions) push('Question', q.id, q.data.question, `/questions/${q.id}`, q.data);

	for (const m of corpus.modules) {
		/* A rule that compares against a moving date changes meaning without
		   anyone editing it, which is the one case where time alone is a review
		   trigger. */
		const dated = (m.data.rules ?? []).filter((r: unknown) =>
			/daysFromToday|monthsFromToday|yearsSince|fixedDate/.test(JSON.stringify(r)),
		).length;
		const extra: ReviewTrigger[] = dated
			? [
					{
						code: 'dated-rule',
						label: 'Contains rules that compare against today',
						detail: `${dated} of ${(m.data.rules ?? []).length} rules resolve a date at build time, so their output changes as time passes without the module being edited. Worth re-reading whenever the review is refreshed.`,
						severity: 'medium',
					},
				]
			: [];
		push('Module', m.id, m.data.name, `/tools/${m.id}`, m.data, extra);
	}

	for (const e of corpus.examples) push('Example', e.id, e.data.title, `/examples/${e.id}`, e.data);
	/* Figures arrived as a collection without being added here, so nineteen
	   records published an under-review badge while the queue said the backlog
	   was smaller than it was. */
	for (const f of corpus.figures) push('Figure', f.id, f.data.label, `/figures#${f.id}`, f.data);
	for (const s of corpus.states) push('State', s.id, s.data.name, `/states/${s.id}`, s.data);
	for (const c of corpus.companies) {
		push('Entity', c.id, c.data.shortName || c.data.legalName, `/companies/${c.id}`, c.data);
	}
	/* Cross-rules were the second collection to go missing the same way. Fifteen
	   records, each naming Brian Bollinger as reviewer and each carrying an
	   under-review badge, cited sources that no queue counted and no source page
	   reported. They evaluate on the position rather than on a page of their
	   own, which is why they were easy to forget and no reason to exclude them. */
	for (const r of corpus.crossRules) push('Cross-rule', r.id, r.data.title, '/position', r.data);

	return out;
}

/**
 * The queue. `isStaleFn` is injected rather than imported so this stays
 * testable and so the caller keeps ownership of what "stale" means.
 */
export function reviewQueue(
	corpus: Corpus,
	isStaleFn: (lastChecked: string) => boolean,
): ReviewItem[] {
	const items: ReviewItem[] = [];

	const add = (
		kind: string,
		id: string,
		title: string,
		path: string,
		data: Record<string, unknown>,
		extra: ReviewTrigger[] = [],
	) => {
		const sourceIds = idsOf(data.sourceIds);
		const triggers = [...extra, ...sourceTriggers(corpus, sourceIds, isStaleFn)];

		if (data.reviewState !== 'reviewed') {
			triggers.unshift({
				code: 'never-reviewed',
				label: 'Never signed off',
				detail:
					'Published with an under-review badge. Until a named licensed reviewer signs it off, the page states its own status honestly but cannot be cited as broker reviewed.',
				severity: 'high',
			});
		}

		items.push({
			kind,
			id,
			title,
			path,
			reviewState: (data.reviewState ?? 'under-review') as ReviewState,
			lastReviewed: String(data.lastReviewed ?? 'unknown'),
			reviewer: String(data.reviewer ?? 'unassigned'),
			statements: statementCount(data),
			sourceCount: sourceIds.length,
			triggers,
			escalations: triggers.filter((t) => t.code !== 'never-reviewed'),
		});
	};

	for (const record of reviewableRecords(corpus)) {
		add(record.kind, record.id, record.title, record.path, record.data, record.extraTriggers);
	}

	/* A high escalation first, then how many escalations, then how much the
	   record asserts. Ties break on title so the order is stable between builds. */
	const urgent = (item: ReviewItem) =>
		item.escalations.some((t) => t.severity === 'high') ? 0 : 1;
	return items.sort(
		(a, b) =>
			urgent(a) - urgent(b) ||
			b.escalations.length - a.escalations.length ||
			b.statements - a.statements ||
			a.title.localeCompare(b.title),
	);
}

/**
 * The same job ordered by source rather than by record.
 *
 * A record is signed off by verifying every source under it, so ordering by
 * record means re-opening the same statute once per record that cites it.
 * Measured on the corpus as it stands: 148 outstanding records rest on 299
 * distinct sources across 838 record-to-source dependencies. Verified
 * source-first that is 299 readings rather than 838 - the same job at roughly
 * a third of the reading.
 *
 * What it is NOT is a leverage play. The obvious hope was that a handful of
 * sources would carry most of the corpus, so twenty readings would clear the
 * backlog. They do not: the twenty most-depended-on sources account for 18
 * per cent of dependencies and 58 sources carry exactly one record each. The
 * graph is flat. The saving is real but it comes from de-duplication, not from
 * concentration, and the list below is honest about that rather than
 * presenting a top-twenty as though it were a shortcut.
 *
 * Priority is therefore not the dependent count. It is whether the source has
 * already moved underneath the records citing it.
 */
export type SourcePriority = 'moved' | 'never-rechecked' | 'ordinary';

export interface SourceReviewItem {
	id: string;
	title: string;
	status: string;
	priority: SourcePriority;
	/** Why this source needs reading before the ones below it. */
	reason: string;
	officialHost: boolean;
	lastChecked: string;
	rechecked: boolean;
	/** Outstanding records that cannot be signed off until this is verified. */
	dependents: number;
	dependentPaths: string[];
}

export function sourceReviewOrder(corpus: Corpus): SourceReviewItem[] {
	const outstanding = new Set(
		reviewQueue(corpus, () => false)
			.filter((i) => i.reviewState !== 'reviewed')
			.map((i) => i.path),
	);

	const items: SourceReviewItem[] = [];
	for (const source of corpus.sources) {
		const paths = citingPages(corpus, source.id)
			.map((c) => c.path)
			.filter((path) => outstanding.has(path));
		if (paths.length === 0) continue;

		const status = source.data.status;
		const rechecked = source.data.lastCheckedBasis === 'recheck';

		let priority: SourcePriority = 'ordinary';
		let reason = 'Read once when it was added, and nothing has changed under it that we know of.';
		if (status !== 'active') {
			priority = 'moved';
			reason = `The document itself is ${status}. Every record citing it must state that in its own text, and a reviewer should confirm it does before signing anything off.`;
		} else if (!rechecked) {
			priority = 'never-rechecked';
			reason = 'Never returned to since it was added, so the only assurance is that somebody read it once.';
		}

		items.push({
			id: source.id,
			title: source.data.title,
			status,
			priority,
			reason,
			officialHost: source.data.officialHost,
			lastChecked: source.data.lastChecked,
			rechecked,
			dependents: new Set(paths).size,
			dependentPaths: [...new Set(paths)].sort(),
		});
	}

	const rank: Record<SourcePriority, number> = { moved: 0, 'never-rechecked': 1, ordinary: 2 };
	return items.sort(
		(a, b) =>
			rank[a.priority] - rank[b.priority] ||
			b.dependents - a.dependents ||
			a.id.localeCompare(b.id),
	);
}

/** The arithmetic that justifies reading source-first, stated rather than implied. */
export function sourceReviewSummary(items: SourceReviewItem[]) {
	const dependencies = items.reduce((n, i) => n + i.dependents, 0);
	const top20 = [...items].sort((a, b) => b.dependents - a.dependents).slice(0, 20);
	return {
		sources: items.length,
		dependencies,
		moved: items.filter((i) => i.priority === 'moved').length,
		neverRechecked: items.filter((i) => i.priority === 'never-rechecked').length,
		singletons: items.filter((i) => i.dependents === 1).length,
		top20Share: dependencies
			? Math.round((top20.reduce((n, i) => n + i.dependents, 0) / dependencies) * 100)
			: 0,
	};
}

/** Headline counts, so the page can state the size of the job before the list. */
export function reviewSummary(items: ReviewItem[]) {
	return {
		total: items.length,
		reviewed: items.filter((i) => i.reviewState === 'reviewed').length,
		statements: items.reduce((n, i) => n + i.statements, 0),
		escalated: items.filter((i) => i.escalations.some((t) => t.severity === 'high')).length,
		withdrawnSources: items.filter((i) => i.triggers.some((t) => t.code === 'source-not-active'))
			.length,
	};
}

/**
 * Every published correction, newest first.
 *
 * Reads `reviewableRecords`, so it cannot omit a collection the way
 * `/corrections` did: that page scanned questions alone and therefore
 * described itself as the log of every material correction while being unable
 * to hold one made to a module, a figure or a cross-rule. The first recheck to
 * correct a module rule made the overstatement real.
 */
export interface CorrectionEntry {
	kind: string;
	id: string;
	title: string;
	path: string;
	date: string;
	was: string;
	now: string;
}

export function correctionLog(corpus: Corpus): CorrectionEntry[] {
	const out: CorrectionEntry[] = [];
	for (const record of reviewableRecords(corpus)) {
		const correction = record.data.correction as
			| { date?: string; was?: string; now?: string }
			| undefined;
		if (record.data.reviewState !== 'corrected' || !correction) continue;
		if (!correction.date || !correction.was || !correction.now) continue;
		out.push({
			kind: record.kind,
			id: record.id,
			title: record.title,
			path: record.path,
			date: correction.date,
			was: correction.was,
			now: correction.now,
		});
	}
	return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
}
