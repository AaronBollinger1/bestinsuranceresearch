/**
 * National insurance library registries (BR-D1).
 *
 * Templates and a measurable matrix over fixture candidates. This module
 * does not load the live corpus, does not mount routes, and does not claim
 * the matrix is complete while any tracked cell is empty. Publication
 * eligibility stays closed unless the caller passes commonsReady, and the
 * default posture of this unit is that the flag is false.
 */
import { CANONICAL_LINES } from './lines.ts';

export const US_JURISDICTIONS = [
	'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
	'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
	'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
	'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
	'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

export type UsJurisdiction = (typeof US_JURISDICTIONS)[number];

/** Core families the matrix tracks. Ids are the existing line vocabulary. */
export const CORE_COVERAGE_FAMILIES = [
	{ id: 'auto', family: 'personal' },
	{ id: 'homeowners', family: 'personal' },
	{ id: 'renters', family: 'personal' },
	{ id: 'commercial-auto', family: 'commercial' },
	{ id: 'commercial-general-liability', family: 'commercial' },
	{ id: 'commercial-property', family: 'commercial' },
	{ id: 'workers-compensation', family: 'commercial' },
	{ id: 'professional-liability', family: 'commercial' },
] as const;

export const LIBRARY_KINDS = ['company', 'type', 'coverage', 'state', 'regulator', 'relationship'] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

export const PAGE_TEMPLATES: Record<LibraryKind, readonly string[]> = {
	company: ['id', 'name', 'status', 'effectiveDate', 'refreshOwner', 'sources'],
	type: ['id', 'name', 'family', 'effectiveDate', 'refreshOwner', 'sources'],
	coverage: ['id', 'name', 'line', 'family', 'effectiveDate', 'refreshOwner', 'sources'],
	state: ['id', 'name', 'jurisdiction', 'effectiveDate', 'refreshOwner', 'sources'],
	regulator: ['id', 'name', 'jurisdiction', 'effectiveDate', 'refreshOwner', 'sources'],
	relationship: ['id', 'name', 'relation', 'from', 'to', 'effectiveDate', 'refreshOwner', 'sources'],
};

export const LIBRARY_RELATIONS = ['parent-of', 'merged-into', 'succeeded-by', 'regulates', 'available-in', 'writes'] as const;
export type LibraryRelation = (typeof LIBRARY_RELATIONS)[number];

const FORBIDDEN_SCHEMA = ['FAQPage', 'ClaimReview', 'Rating', 'Review', 'Offer'] as const;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface LibrarySource {
	id: string;
	title: string;
	publisher: string;
	url: string;
}

export interface LibraryRecord {
	id: string;
	kind: LibraryKind;
	name: string;
	summary: string;
	effectiveDate: string;
	refreshOwner: string;
	sources: LibrarySource[];
	family?: 'personal' | 'commercial';
	line?: string;
	jurisdiction?: string;
	status?: 'current' | 'historical';
	criterionId?: string;
	supersededBy?: string;
	relation?: LibraryRelation;
	from?: string;
	to?: string;
}

export interface MajorCompanyCriterion {
	id: string;
	text: string;
	effectiveDate: string;
	refreshOwner: string;
	supersededBy: string | null;
}

export interface LibraryFixture {
	criterion: MajorCompanyCriterion;
	priorCriterion: MajorCompanyCriterion;
	records: LibraryRecord[];
}

export interface GateProblem {
	id: string;
	problem: string;
}

export interface MatrixGap {
	code: 'regulator' | 'availability' | 'company-history' | 'refresh-owner';
	jurisdiction?: string;
	coverage?: string;
	companyId?: string;
	detail: string;
}

export interface PageContract {
	canonicalPath: string;
	indexable: boolean;
	sitemapIncluded: boolean;
	robotsMeta: 'noindex, nofollow' | 'index, follow';
	visibleSources: LibrarySource[];
	schema: { '@type': 'WebPage'; name: string; dateModified: string } | null;
	eligible: boolean;
	reasons: string[];
}

function isJurisdiction(value: string | undefined): value is UsJurisdiction {
	return !!value && (US_JURISDICTIONS as readonly string[]).includes(value);
}

function sourceProblems(record: LibraryRecord): string[] {
	if (!Array.isArray(record.sources) || record.sources.length === 0) return ['no visible source'];
	const problems: string[] = [];
	for (const source of record.sources) {
		if (!source.id || !source.title?.trim() || !source.publisher?.trim()) problems.push(`source ${source.id || '(missing)'} is missing identity`);
		if (!source.url?.startsWith('https://')) problems.push(`source ${source.id || '(missing)'} has no https URL`);
	}
	return problems;
}

export function qualityGate(record: LibraryRecord, seen: ReadonlySet<string>): GateProblem[] {
	const problems: string[] = [];
	if (!SLUG.test(record.id)) problems.push('id is not a slug');
	if (seen.has(record.id)) problems.push('duplicate id');
	if (!(LIBRARY_KINDS as readonly string[]).includes(record.kind)) problems.push(`unknown kind ${record.kind}`);
	const summary = typeof record.summary === 'string' ? record.summary.trim() : '';
	if (!record.name?.trim() || summary.length < 40) problems.push('name or summary is missing');
	if (!ISO_DATE.test(record.effectiveDate)) problems.push('effective date is missing');
	if (!record.refreshOwner?.trim()) problems.push('refresh owner is missing');
	problems.push(...sourceProblems(record));
	const template = PAGE_TEMPLATES[record.kind];
	if (template) {
		for (const field of template) {
			const value = (record as unknown as Record<string, unknown>)[field];
			if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) problems.push(`template field ${field} is empty`);
		}
	}
	if (record.kind === 'coverage' && record.line && !(CANONICAL_LINES as readonly string[]).includes(record.line)) {
		problems.push(`line ${record.line} is outside the canonical vocabulary`);
	}
	if ((record.kind === 'state' || record.kind === 'regulator') && !isJurisdiction(record.jurisdiction)) {
		problems.push('jurisdiction is outside the state-plus-DC matrix');
	}
	if (record.kind === 'company' && record.status !== 'current' && record.status !== 'historical') problems.push('company status is missing');
	if (record.kind === 'relationship' && (!(LIBRARY_RELATIONS as readonly string[]).includes(record.relation ?? '') || !record.from || !record.to)) {
		problems.push('relationship is missing its ends or its kind');
	}
	return problems.map((problem) => ({ id: record.id, problem }));
}

export function buildNationalLibrary(fixture: LibraryFixture) {
	const rejected: GateProblem[] = [];
	const accepted: LibraryRecord[] = [];
	const seen = new Set<string>();
	for (const record of fixture.records) {
		const problems = qualityGate(record, seen);
		if (problems.length > 0) {
			rejected.push(...problems);
			continue;
		}
		seen.add(record.id);
		accepted.push(record);
	}
	const ids = new Set(accepted.map((record) => record.id));
	for (const record of accepted) {
		if (record.supersededBy && !ids.has(record.supersededBy)) {
			rejected.push({ id: record.id, problem: `supersededBy ${record.supersededBy} is not an accepted record` });
		}
	}
	const stillAccepted = accepted.filter((record) => !rejected.some((problem) => problem.id === record.id && /supersededBy/.test(problem.problem)));

	const criterionCurrent = fixture.criterion.supersededBy == null && fixture.priorCriterion.supersededBy === fixture.criterion.id;
	const companies = stillAccepted.filter((record) => record.kind === 'company');
	const major = companies.filter((company) => company.status === 'current' && company.criterionId === fixture.criterion.id && !company.supersededBy);
	const historical = companies.filter((company) => company.status === 'historical' || !!company.supersededBy);
	const relationships = stillAccepted.filter((record) => record.kind === 'relationship');
	const gaps: MatrixGap[] = [];

	for (const jurisdiction of US_JURISDICTIONS) {
		const regulator = stillAccepted.find((record) => record.kind === 'regulator' && record.jurisdiction === jurisdiction);
		const regulates = relationships.some((record) => record.relation === 'regulates' && record.to === jurisdiction && record.from === regulator?.id);
		if (!regulator || !regulates) gaps.push({ code: 'regulator', jurisdiction, detail: `${jurisdiction} has no regulator relationship` });
		for (const coverage of CORE_COVERAGE_FAMILIES) {
			const available = relationships.some((record) => record.relation === 'available-in' && record.from === coverage.id && record.to === jurisdiction);
			if (!available) gaps.push({ code: 'availability', jurisdiction, coverage: coverage.id, detail: `${coverage.id} has no availability record in ${jurisdiction}` });
		}
	}
	for (const company of historical) {
		const linked = relationships.some((record) => (record.relation === 'merged-into' || record.relation === 'succeeded-by') && record.from === company.id);
		if (!linked && !company.supersededBy) gaps.push({ code: 'company-history', companyId: company.id, detail: `${company.id} is historical without a successor link` });
	}
	if (!fixture.criterion.refreshOwner.trim()) gaps.push({ code: 'refresh-owner', detail: 'the major-company criterion has no refresh owner' });

	const jurisdictionDenominator = US_JURISDICTIONS.length;
	const stateFilled = US_JURISDICTIONS.filter((jurisdiction) => stillAccepted.some((record) => record.kind === 'state' && record.jurisdiction === jurisdiction)).length;
	const regulatorGaps = gaps.filter((gap) => gap.code === 'regulator').length;
	const availabilityDenominator = jurisdictionDenominator * CORE_COVERAGE_FAMILIES.length;
	const availabilityGaps = gaps.filter((gap) => gap.code === 'availability').length;
	const historicalFilled = historical.filter((company) => company.supersededBy || relationships.some((record) => (record.relation === 'merged-into' || record.relation === 'succeeded-by') && record.from === company.id)).length;
	const completion = {
		states: { filled: stateFilled, denominator: jurisdictionDenominator },
		regulators: { filled: jurisdictionDenominator - regulatorGaps, denominator: jurisdictionDenominator },
		coverageCells: { filled: availabilityDenominator - availabilityGaps, denominator: availabilityDenominator },
		currentCompanies: { filled: major.length, denominator: companies.filter((company) => company.status === 'current').length },
		historicalRelationships: { filled: historicalFilled, denominator: historical.length },
	};
	const percent = (filled: number, denominator: number) => denominator === 0 ? 0 : Math.round((1000 * filled) / denominator) / 10;

	const matrix = {
		jurisdictions: jurisdictionDenominator,
		includesDc: US_JURISDICTIONS.includes('DC'),
		coverageFamilies: CORE_COVERAGE_FAMILIES.map((coverage) => coverage.id),
		majorCompanyIds: major.map((company) => company.id),
		historicalCompanyIds: historical.map((company) => company.id),
		gaps,
		gapCount: gaps.length,
		complete: gaps.length === 0,
		completion: {
			states: { ...completion.states, percent: percent(completion.states.filled, completion.states.denominator) },
			regulators: { ...completion.regulators, percent: percent(completion.regulators.filled, completion.regulators.denominator) },
			coverageCells: { ...completion.coverageCells, percent: percent(completion.coverageCells.filled, completion.coverageCells.denominator) },
			currentCompanies: { ...completion.currentCompanies, percent: percent(completion.currentCompanies.filled, completion.currentCompanies.denominator) },
			historicalRelationships: { ...completion.historicalRelationships, percent: percent(completion.historicalRelationships.filled, completion.historicalRelationships.denominator) },
		},
		statement: gaps.length === 0 ? 'No tracked gap remains.' : 'Gaps remain. Completeness is not claimed.',
		refreshOwner: fixture.criterion.refreshOwner,
		scope: 'States and the District of Columbia. Territories are outside this matrix, which is a scope limit and not a completeness claim.',
	};

	return {
		accepted: stillAccepted,
		rejected,
		acceptedCount: stillAccepted.length,
		withinCandidateBand: stillAccepted.length >= 25 && stillAccepted.length <= 100,
		criterion: fixture.criterion,
		criterionCurrent,
		major,
		historical,
		relationships,
		matrix,
	};
}

export function isMajorCompany(company: LibraryRecord, criterion: MajorCompanyCriterion): boolean {
	return company.kind === 'company'
		&& company.status === 'current'
		&& !company.supersededBy
		&& company.criterionId === criterion.id
		&& criterion.supersededBy == null;
}

export function pageContract(record: LibraryRecord, options: { commonsReady: boolean }): PageContract {
	const reasons: string[] = [];
	const canonicalPath = `/library/${record.kind}/${record.id}`;
	const visible = record.sources.length > 0 && record.sources.every((source) => source.url.startsWith('https://') && source.title.trim() && source.publisher.trim());
	if (!visible) reasons.push('visible sources are missing');
	if (record.summary.trim().length < 40) reasons.push('summary is too short to cite');
	if (!ISO_DATE.test(record.effectiveDate)) reasons.push('effective date is missing');
	if (!record.refreshOwner.trim()) reasons.push('refresh owner is missing');
	if (record.supersededBy) reasons.push('a superseded record is not publication-eligible');
	if (options.commonsReady !== true) reasons.push('PUBLIC_COMMONS_READY is false');
	const citabilityOk = visible && record.summary.trim().length >= 40 && ISO_DATE.test(record.effectiveDate) && !!record.refreshOwner.trim() && !record.supersededBy;
	const eligible = options.commonsReady === true && citabilityOk;
	return {
		canonicalPath,
		indexable: eligible,
		sitemapIncluded: eligible,
		robotsMeta: eligible ? 'index, follow' : 'noindex, nofollow',
		visibleSources: visible ? record.sources : [],
		schema: eligible ? { '@type': 'WebPage', name: record.name, dateModified: record.effectiveDate } : null,
		eligible,
		reasons,
	};
}

export function schemaIsAllowed(schema: PageContract['schema']): boolean {
	if (!schema) return true;
	return !(FORBIDDEN_SCHEMA as readonly string[]).includes(schema['@type']);
}
