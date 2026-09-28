/**
 * Fixture corpus pages (BR-R1).
 *
 * Denominators come from the national-library matrix. A page is indexable
 * only when that record was editorially and licensed-reviewed, rights are
 * recorded, and the caller passes commonsReady. Intake proposals stay
 * noindex and cannot rewrite a historical successor.
 */
import { escapeHtml } from './citations.ts';
import {
	buildNationalLibrary,
	type LibraryFixture,
	type LibraryKind,
	type LibraryRecord,
	type LibrarySource,
} from './national-library.ts';

export const CORPUS_PUBLICATION_OPEN: boolean = false;

export interface RecordReview {
	editorial: boolean;
	licensed: boolean;
	rights: 'recorded' | 'unrecorded';
	corrections: Array<{ at: string; note: string }>;
	withdrawn: boolean;
	aliasOf: string | null;
}

export interface CorpusPage {
	id: string;
	kind: LibraryKind;
	path: string;
	canonical: string;
	redirectTo: string | null;
	indexable: boolean;
	robots: 'noindex, nofollow' | 'index, follow';
	sitemap: boolean;
	title: string;
	summary: string;
	effectiveDate: string;
	refreshOwner: string;
	sources: LibrarySource[];
	corrections: Array<{ at: string; note: string }>;
	schema: { '@type': 'WebPage'; name: string; dateModified: string } | null;
	draft: boolean;
	withdrawn: boolean;
}

const PAGE_KINDS = new Set<LibraryKind>(['company', 'type', 'coverage', 'state', 'regulator', 'relationship']);

export function generateCorpusPages(
	fixture: LibraryFixture,
	reviews: Record<string, RecordReview>,
	options: { origin: string; commonsReady: boolean },
): CorpusPage[] {
	const library = buildNationalLibrary(fixture);
	const byId = new Map(library.accepted.map((record) => [record.id, record]));
	return library.accepted.filter((record) => PAGE_KINDS.has(record.kind)).map((record) => {
		const review = reviews[record.id];
		const reviewed = !!review && review.editorial && review.licensed && review.rights === 'recorded' && !review.withdrawn && !record.supersededBy;
		const indexable = reviewed && options.commonsReady === true && CORPUS_PUBLICATION_OPEN === true;
		const successor = record.supersededBy ? byId.get(record.supersededBy) : undefined;
		return {
			id: record.id,
			kind: record.kind,
			path: `/library/${record.kind}/${record.id}`,
			canonical: `${options.origin}/library/${record.kind}/${record.id}`,
			redirectTo: successor ? `/library/${successor.kind}/${successor.id}` : review?.aliasOf ? `/library/company/${review.aliasOf}` : null,
			indexable,
			robots: indexable ? 'index, follow' : 'noindex, nofollow',
			sitemap: indexable,
			title: record.name,
			summary: record.summary,
			effectiveDate: record.effectiveDate,
			refreshOwner: record.refreshOwner,
			sources: record.sources,
			corrections: review?.corrections ?? [],
			schema: reviewed ? { '@type': 'WebPage', name: record.name, dateModified: record.effectiveDate } : null,
			draft: !reviewed,
			withdrawn: review?.withdrawn === true,
		};
	});
}

export function publishedCorpusPages(
	fixture: LibraryFixture,
	expansion: LibraryRecord[],
	reviews: Record<string, RecordReview>,
	origin: string,
): CorpusPage[] {
	const expanded = expandLibrary(fixture, expansion);
	if (!expanded.ok) throw new Error(expanded.problem ?? 'The fixture expansion was refused.');
	return generateCorpusPages(expanded.fixture, reviews, { origin, commonsReady: false });
}

export function presentCorpusPage(page: CorpusPage): { html: string; jsonLd: { '@context': 'https://schema.org'; '@type': 'WebPage'; name: string; dateModified: string } | null } {
	const status = page.withdrawn
		? '<p class="status" data-research-state="withdrawn"><strong>Withdrawn.</strong> This record is not published.</p>'
		: page.draft
			? '<p class="status" data-research-state="draft"><strong>Research draft.</strong> This record is not reviewed for publication.</p>'
			: '<p class="status" data-research-state="fixture-review"><strong>Fixture review recorded.</strong> Publication remains closed.</p>';
	const redirect = page.redirectTo
		? `<p class="status" data-redirect="${escapeHtml(page.redirectTo)}">This record redirects to <a href="${escapeHtml(page.redirectTo)}">${escapeHtml(page.redirectTo)}</a>.</p>`
		: '';
	const sources = page.sources.map((source) => (
		`<li id="source-${escapeHtml(source.id)}"><a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a> (${escapeHtml(source.publisher)}) <a class="cite" href="#source-${escapeHtml(source.id)}">${escapeHtml(source.id)}</a></li>`
	)).join('');
	const corrections = page.corrections.length > 0
		? page.corrections.map((correction) => `<li><time datetime="${escapeHtml(correction.at)}">${escapeHtml(correction.at)}</time> ${escapeHtml(correction.note)}</li>`).join('')
		: '<li>No correction is recorded.</li>';
	const html = `<article class="shell" data-corpus-page="${escapeHtml(page.id)}">
		<p class="eyebrow">Fixture library</p>
		<h1>${escapeHtml(page.title)}</h1>
		${status}
		${redirect}
		<p>${escapeHtml(page.summary)}</p>
		<p>Effective date <time datetime="${escapeHtml(page.effectiveDate)}">${escapeHtml(page.effectiveDate)}</time>. Refresh owner ${escapeHtml(page.refreshOwner)}.</p>
		<h2>Sources</h2>
		<ul>${sources}</ul>
		<h2>Corrections</h2>
		<ul>${corrections}</ul>
	</article>`;
	const jsonLd = page.schema
		? { '@context': 'https://schema.org' as const, '@type': page.schema['@type'], name: page.schema.name, dateModified: page.schema.dateModified }
		: null;
	return { html, jsonLd };
}

export function expandLibrary(fixture: LibraryFixture, batch: LibraryRecord[], options?: { credential?: string }): { ok: boolean; fixture: LibraryFixture; problem?: string } {
	if (options?.credential?.trim()) return { ok: false, fixture, problem: 'A paid provider was offered. The batch was not applied.' };
	const ids = new Set(fixture.records.map((record) => record.id));
	if (batch.some((record) => ids.has(record.id))) return { ok: false, fixture, problem: 'The batch reuses an id. Historical records were not overwritten.' };
	return { ok: true, fixture: { ...fixture, records: [...fixture.records, ...batch] } };
}

export function proposeIntakeAddition(fixture: LibraryFixture, proposal: { supersedeId?: string; refreshOf?: string; record: LibraryRecord }, origin: string): { ok: boolean; problem?: string; page?: CorpusPage } {
	const historical = fixture.records.find((record) => record.id === proposal.supersedeId);
	if (historical?.supersededBy) return { ok: false, problem: `${historical.id} already names ${historical.supersededBy}. The proposal was not written over it.` };
	const refreshing = proposal.refreshOf ? fixture.records.find((record) => record.id === proposal.refreshOf) : undefined;
	if (proposal.refreshOf && !refreshing) return { ok: false, problem: 'No stored record matches the refresh. Nothing was written.' };
	if (refreshing && proposal.record.effectiveDate <= refreshing.effectiveDate) return { ok: false, problem: 'The refresh is not later than the stored record. Nothing was written.' };
	if (fixture.records.some((record) => record.id === proposal.record.id)) return { ok: false, problem: 'Duplicate proposal.' };
	const record = proposal.record;
	return {
		ok: true,
		page: {
			id: record.id,
			kind: record.kind,
			path: `/library/${record.kind}/${record.id}`,
			canonical: `${origin}/library/${record.kind}/${record.id}`,
			redirectTo: null,
			indexable: false,
			robots: 'noindex, nofollow',
			sitemap: false,
			title: record.name,
			summary: record.summary,
			effectiveDate: record.effectiveDate,
			refreshOwner: record.refreshOwner,
			sources: record.sources,
			corrections: [],
			schema: null,
			draft: true,
			withdrawn: false,
		},
	};
}
