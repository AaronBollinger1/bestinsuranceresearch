/**
 * Allowlisted public-source intake and cited drafts (BR-D6).
 *
 * The worker reads fixture items the caller already holds. It does not
 * fetch. A paid discovery credential is refused. Drafts stay noindex until
 * editorial and licensed review, and this module never opens that gate.
 */
export const PAID_DISCOVERY_ENABLED: boolean = false;
export const INTAKE_PUBLICATION_OPEN: boolean = false;

export interface IntakeSource {
	id: string;
	publisher: string;
	canonicalUrl: string;
	kind: 'rss' | 'atom' | 'official-api' | 'regulator-bulletin' | 'sitemap';
	permittedUse: 'allowed' | 'blocked' | 'ambiguous';
	robots: 'allow' | 'disallow' | 'unknown';
	termsReviewed: 'reviewed-allow' | 'reviewed-block' | 'unreviewed';
	refreshOwner: string;
	removed: boolean;
}

export interface FixtureItem {
	sourceId: string;
	canonicalUrl: string;
	retrievedAt: string;
	title: string;
	text: string;
	effectiveDate: string | null;
	uncertainty: string;
	reportedFact: string;
	analysis: string;
	entities: Partial<Record<'company' | 'state' | 'regulator' | 'coverage' | 'claim' | 'question', string>>;
}

export interface EntityCatalog {
	companies: string[];
	states: string[];
	regulators: string[];
	coverages: string[];
	claims: string[];
	questions: string[];
}

export interface IntakeDraft {
	id: string;
	sourceId: string;
	canonicalUrl: string;
	contentHash: string;
	retrievedAt: string;
	effectiveDate: string | null;
	uncertainty: string;
	reportedFact: string;
	analysis: string;
	gaps: string[];
	conflicts: string[];
	supersededBy: string | null;
	status: 'noindex-draft' | 'superseded' | 'withdrawn';
	indexable: false;
	provenance: { publisher: string; url: string; retrievedAt: string; hash: string; refreshOwner: string };
	modelVersion: 'none';
	promptVersion: 'fixture-template-v1';
	confidence: string;
	disclaimer: string;
	corrections: Array<{ at: string; note: string; was: string }>;
	reviews: Array<{ at: string; action: 'validate' | 'dispute'; name: string; note: string }>;
	editorial: { name: string; at: string; note: string } | null;
	licensedReview: { name: string; at: string; note: string } | null;
}

export interface IntakeBook {
	sources: IntakeSource[];
	snapshots: Array<{ sourceId: string; canonicalUrl: string; hash: string; retrievedAt: string; title: string; bytesRetained: number; removed: boolean }>;
	drafts: IntakeDraft[];
	paused: boolean;
	failures: number;
	backoffUntil: string | null;
	lastSuccess: string | null;
	lastFailure: string | null;
	events: Array<{ at: string; action: string; detail: string }>;
	providerCalls: number;
	spend: number;
}

const COPY_SPAN = 40;

export function createIntakeBook(sources: IntakeSource[]): IntakeBook {
	return {
		sources: sources.map((source) => ({ ...source })),
		snapshots: [],
		drafts: [],
		paused: false,
		failures: 0,
		backoffUntil: null,
		lastSuccess: null,
		lastFailure: null,
		events: [],
		providerCalls: 0,
		spend: 0,
	};
}

export function contentHash(text: string): string {
	let hash = 5381;
	for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
	return `h${(hash >>> 0).toString(16)}`;
}

function lawful(source: IntakeSource | undefined): string | null {
	if (!source) return 'not-allowlisted';
	if (source.removed) return 'removed';
	if (!source.publisher.trim() || !source.canonicalUrl.startsWith('https://') || !source.refreshOwner.trim()) return 'incomplete-source';
	if (source.permittedUse !== 'allowed' || source.robots !== 'allow' || source.termsReviewed !== 'reviewed-allow') return 'robots-or-terms-closed';
	return null;
}

function copiesSource(writing: string, sourceText: string): boolean {
	const left = writing.toLowerCase().replace(/\s+/g, ' ');
	const right = sourceText.toLowerCase().replace(/\s+/g, ' ');
	if (left.length < COPY_SPAN) return false;
	for (let i = 0; i + COPY_SPAN <= left.length; i += 1) {
		if (right.includes(left.slice(i, i + COPY_SPAN))) return true;
	}
	return false;
}

function entityGaps(item: FixtureItem, catalog: EntityCatalog): string[] {
	const gaps: string[] = [];
	const lists: Record<string, string[]> = {
		company: catalog.companies,
		state: catalog.states,
		regulator: catalog.regulators,
		coverage: catalog.coverages,
		claim: catalog.claims,
		question: catalog.questions,
	};
	for (const [key, id] of Object.entries(item.entities)) {
		if (!id) continue;
		if (!lists[key]?.includes(id)) gaps.push(`${key}:${id}`);
	}
	return gaps;
}

export function pollIntake(book: IntakeBook, input: {
	now: string;
	items: FixtureItem[];
	catalog: EntityCatalog;
	requestsInWindow: number;
	maxRequests: number;
	backoffMs: number;
	credential?: string;
}): { ok: boolean; state: string; drafts: IntakeDraft[] } {
	if (input.credential?.trim()) {
		book.events.push({ at: input.now, action: 'paid-discovery-refused', detail: 'A paid provider was offered. No call was made and no fact was stored.' });
		return { ok: false, state: 'paid-discovery-refused', drafts: [] };
	}
	if (book.paused) {
		book.events.push({ at: input.now, action: 'paused', detail: 'Intake is paused.' });
		return { ok: false, state: 'paused', drafts: [] };
	}
	if (book.backoffUntil && input.now < book.backoffUntil) {
		return { ok: false, state: 'backoff', drafts: [] };
	}
	if (input.requestsInWindow >= input.maxRequests) {
		book.failures += 1;
		book.lastFailure = input.now;
		book.backoffUntil = new Date(Date.parse(input.now) + input.backoffMs).toISOString();
		book.events.push({ at: input.now, action: 'rate-limited', detail: 'The window is full. Backoff started.' });
		return { ok: false, state: 'rate-limited', drafts: [] };
	}
	const created: IntakeDraft[] = [];
	for (const item of input.items) {
		const source = book.sources.find((candidate) => candidate.id === item.sourceId);
		const block = lawful(source);
		if (block || !source) {
			book.failures += 1;
			book.lastFailure = input.now;
			book.events.push({ at: input.now, action: block ?? 'not-allowlisted', detail: `${item.sourceId} stored 0 bytes.` });
			continue;
		}
		const hash = contentHash(item.text);
		const exact = book.snapshots.some((snapshot) => snapshot.hash === hash);
		const changedAtSameUrl = !exact && book.snapshots.some((snapshot) => snapshot.canonicalUrl === item.canonicalUrl);
		book.snapshots.push({
			sourceId: source.id,
			canonicalUrl: item.canonicalUrl,
			hash,
			retrievedAt: item.retrievedAt,
			title: item.title,
			bytesRetained: exact || changedAtSameUrl ? 0 : Math.min(item.text.length, 180),
			removed: false,
		});
		if (exact) {
			book.events.push({ at: input.now, action: 'duplicate', detail: `${item.canonicalUrl} remains visible and was not overwritten.` });
			continue;
		}
		if (copiesSource(item.reportedFact, item.text) || copiesSource(item.analysis, item.text)) {
			book.failures += 1;
			book.lastFailure = input.now;
			book.events.push({ at: input.now, action: 'verbatim-refused', detail: 'The draft copied the source and was not stored.' });
			continue;
		}
		const prior = book.drafts.find((draft) => draft.provenance.url === item.canonicalUrl && draft.status === 'noindex-draft');
		const draft: IntakeDraft = {
			id: `draft-${hash}`,
			sourceId: source.id,
			canonicalUrl: item.canonicalUrl,
			contentHash: hash,
			retrievedAt: item.retrievedAt,
			effectiveDate: item.effectiveDate,
			uncertainty: item.uncertainty,
			reportedFact: item.reportedFact.trim(),
			analysis: item.analysis.trim(),
			gaps: entityGaps(item, input.catalog),
			conflicts: [],
			supersededBy: null,
			status: 'noindex-draft',
			indexable: false,
			provenance: { publisher: source.publisher, url: item.canonicalUrl, retrievedAt: item.retrievedAt, hash, refreshOwner: source.refreshOwner },
			modelVersion: 'none',
			promptVersion: 'fixture-template-v1',
			confidence: 'Fixture synthesis only. This is not a ranked confidence score.',
			disclaimer: 'Public-source draft. Not insurance advice and not a completeness claim.',
			corrections: [],
			reviews: [],
			editorial: null,
			licensedReview: null,
		};
		if (prior && prior.reportedFact !== draft.reportedFact) {
			prior.status = 'superseded';
			prior.supersededBy = draft.id;
			draft.conflicts.push(prior.id);
			book.events.push({ at: input.now, action: 'conflict', detail: `${prior.id} stays visible beside ${draft.id}.` });
		}
		book.drafts.push(draft);
		created.push(draft);
	}
	if (created.length > 0) book.lastSuccess = input.now;
	book.events.push({ at: input.now, action: 'polled', detail: `${created.length} drafts.` });
	return { ok: true, state: created.length > 0 ? 'drafts' : 'no-new-drafts', drafts: created };
}

export function pauseIntake(book: IntakeBook, at: string): void {
	book.paused = true;
	book.events.push({ at, action: 'pause', detail: 'Paused by the refresh owner.' });
}

export function resumeIntake(book: IntakeBook, at: string): void {
	book.paused = false;
	book.backoffUntil = null;
	book.events.push({ at, action: 'resume', detail: 'Resumed.' });
}

export function removeSource(book: IntakeBook, sourceId: string, at: string): void {
	const source = book.sources.find((item) => item.id === sourceId);
	if (source) source.removed = true;
	for (const snapshot of book.snapshots) {
		if (snapshot.sourceId === sourceId) {
			snapshot.removed = true;
			snapshot.bytesRetained = 0;
		}
	}
	book.events.push({ at, action: 'source-removed', detail: `${sourceId} bytes cleared. History kept.` });
}

export function reviewDraft(book: IntakeBook, input: { draftId: string; at: string; action: 'validate' | 'dispute' | 'correct'; name: string; note: string; text?: string }): { ok: boolean } {
	const draft = book.drafts.find((item) => item.id === input.draftId);
	if (!draft || !input.note.trim()) return { ok: false };
	if (input.action === 'correct') {
		if (!input.text?.trim()) return { ok: false };
		draft.corrections.push({ at: input.at, note: input.note, was: draft.analysis });
		draft.analysis = input.text.trim();
	} else {
		draft.reviews.push({ at: input.at, action: input.action, name: input.name, note: input.note });
	}
	draft.indexable = false;
	return { ok: true };
}

export function recordHumanReview(book: IntakeBook, input: { draftId: string; at: string; kind: 'editorial' | 'licensed'; name: string; note: string }): { ok: boolean } {
	const draft = book.drafts.find((item) => item.id === input.draftId);
	if (!draft || !input.note.trim() || !input.name.trim()) return { ok: false };
	if (input.kind === 'editorial') draft.editorial = { name: input.name, at: input.at, note: input.note };
	else draft.licensedReview = { name: input.name, at: input.at, note: input.note };
	draft.indexable = false;
	return { ok: true };
}

export function withdrawDraft(book: IntakeBook, draftId: string, at: string): void {
	const draft = book.drafts.find((item) => item.id === draftId);
	if (!draft) return;
	draft.status = 'withdrawn';
	draft.indexable = false;
	book.events.push({ at, action: 'withdrawn', detail: draftId });
}

export function draftPublication(draft: IntakeDraft, options: { commonsReady: boolean }): { eligible: boolean; indexable: false; reasons: string[] } {
	const reasons: string[] = [];
	if (!draft.editorial) reasons.push('editorial review is missing');
	if (!draft.licensedReview) reasons.push('licensed review is missing');
	if (draft.reviews.some((review) => review.action === 'dispute')) reasons.push('a dissent is open');
	if (draft.status !== 'noindex-draft') reasons.push('the draft is not the current noindex record');
	if (options.commonsReady !== true || INTAKE_PUBLICATION_OPEN !== true) reasons.push('PUBLIC_COMMONS_READY is false');
	return { eligible: false, indexable: false, reasons };
}
