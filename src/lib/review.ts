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

	for (const c of corpus.coverages) {
		add('Coverage', c.id, c.data.name, `/insurance/${c.id}`, c.data as Record<string, unknown>);
	}
	for (const q of corpus.questions) {
		add('Question', q.id, q.data.question, `/questions/${q.id}`, q.data as Record<string, unknown>);
	}
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
		add('Module', m.id, m.data.name, `/tools/${m.id}`, m.data as Record<string, unknown>, extra);
	}
	for (const e of corpus.examples) {
		add('Example', e.id, e.data.title, `/examples/${e.id}`, e.data as Record<string, unknown>);
	}
	for (const s of corpus.states) {
		add('State', s.id, s.data.name, `/states/${s.id}`, s.data as Record<string, unknown>);
	}
	for (const c of corpus.companies) {
		add('Entity', c.id, c.data.shortName || c.data.legalName, `/companies/${c.id}`, c.data as Record<string, unknown>);
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
