import { createHash } from 'node:crypto';
import type { CollectionEntry } from 'astro:content';
import { siteConfig } from '../config/site';
import { stripMarkers } from './citations';
import { TODAY } from './today';

/**
 * Machine-readable page companions.
 *
 * These records contain public page facts only: identifiers, jurisdiction,
 * effective and review dates, canonical URL, content version, and the source
 * identifiers behind the page. They never contain a visitor's question, a tool
 * input, an analytics identifier, or generated text that is not already visible
 * on the page.
 */

const abs = (path: string) => new URL(path, siteConfig.origin).toString();

export interface MachineRecordBase {
	$schema: string;
	recordType: string;
	id: string;
	canonicalUrl: string;
	contentVersion: string;
	generatedFor: string;
	operator: { legalName: string; dba: string; license: string; licenseAuthority: string };
	license: string;
	notice: string;
}

const SCHEMA_URL = `${siteConfig.origin}/llms-full.txt`;

function base(recordType: string, id: string, path: string): MachineRecordBase {
	return {
		$schema: SCHEMA_URL,
		recordType,
		id,
		canonicalUrl: abs(path),
		contentVersion: siteConfig.contentVersion,
		generatedFor: TODAY,
		operator: {
			legalName: siteConfig.operator.legalName,
			dba: siteConfig.operator.dba,
			license: siteConfig.operator.agencyLicense,
			licenseAuthority: siteConfig.operator.licenseAuthority,
		},
		license: 'Text on this page may be quoted with attribution and a link to the canonical URL.',
		notice:
			'Public page facts only. This record contains no visitor question, no tool input, and no identifier. It is not a coverage determination, an eligibility decision, or individualized advice.',
	};
}

export function sourceRecord(source: CollectionEntry<'sources'>) {
	return {
		id: source.id,
		title: source.data.title,
		publisher: source.data.publisher,
		url: source.data.url,
		sourceType: source.data.sourceType,
		jurisdiction: source.data.jurisdiction,
		authorityLevel: source.data.authorityLevel,
		primary: source.data.primary,
		publishedDate: source.data.publishedDate,
		effectiveDate: source.data.effectiveDate,
		accessedDate: source.data.accessedDate,
		lastChecked: source.data.lastChecked,
		updateCadence: source.data.updateCadence,
		status: source.data.status,
		supportsClaims: source.data.claims,
		...(source.data.archive ? { archive: source.data.archive } : {}),
	};
}

export function questionRecord(
	entry: CollectionEntry<'questions'>,
	sources: CollectionEntry<'sources'>[],
) {
	const path = `/questions/${entry.id}`;
	const d = entry.data;
	return {
		...base('question', entry.id, path),
		question: d.question,
		aliases: d.aliases,
		directAnswer: stripMarkers(d.shortAnswer),
		assumes: d.assumes.map(stripMarkers),
		whatChangesTheAnswer: d.whatChanges.map(stripMarkers),
		variability: d.variability.map(stripMarkers),
		nextActions: d.nextActions.map(stripMarkers),
		confidence: d.confidence,
		reviewState: d.reviewState,
		...(d.correction ? { correction: d.correction } : {}),
		classification: {
			family: d.family,
			lines: d.lines,
			states: d.states,
			audience: d.audience,
			topics: d.topics,
		},
		effectiveDate: d.effectiveDate,
		lastReviewed: d.lastReviewed,
		author: d.author,
		reviewer: d.reviewer,
		sourceIds: sources.map((s) => s.id),
		sources: sources.map(sourceRecord),
		relatedQuestions: d.related.map((r) => ({ id: r.id, url: abs(`/questions/${r.id}`) })),
	};
}

export function coverageRecord(
	entry: CollectionEntry<'coverages'>,
	sources: CollectionEntry<'sources'>[],
) {
	const path = `/insurance/${entry.id}`;
	const d = entry.data;
	return {
		...base('coverage', entry.id, path),
		name: d.name,
		line: d.line,
		family: d.family,
		definition: stripMarkers(d.definition),
		protects: d.protects.map(stripMarkers),
		commonlyCovers: d.commonlyCovers.map((i) => ({ item: i.item, note: stripMarkers(i.note) })),
		commonlyExcludes: d.commonlyExcludes.map((i) => ({ item: i.item, note: stripMarkers(i.note) })),
		limitsAndDeductibles: d.limitsAndDeductibles.map(stripMarkers),
		endorsements: d.endorsements.map((i) => ({ item: i.item, note: stripMarkers(i.note) })),
		relatedPolicies: d.relatedPolicies,
		underwritingInputs: d.underwritingInputs,
		stateVariations: d.stateVariations.map((v) => ({ state: v.state, note: stripMarkers(v.note) })),
		effectiveDate: d.effectiveDate,
		lastReviewed: d.lastReviewed,
		author: d.author,
		reviewer: d.reviewer,
		sourceIds: sources.map((s) => s.id),
		sources: sources.map(sourceRecord),
	};
}

export function companyRecord(
	entry: CollectionEntry<'companies'>,
	sources: CollectionEntry<'sources'>[],
	relatedResearch: {
		questions?: CollectionEntry<'questions'>[];
		coverages?: CollectionEntry<'coverages'>[];
	} = {},
) {
	const path = `/companies/${entry.id}`;
	const d = entry.data;
	const relatedQuestions = relatedResearch.questions ?? [];
	const relatedCoverages = relatedResearch.coverages ?? [];
	return {
		...base('organization', entry.id, path),
		legalName: d.legalName,
		shortName: d.shortName,
		orgType: d.orgType,
		...(d.naic ? { naic: d.naic } : {}),
		...(d.regulatoryIdentity
			? {
				regulatoryIdentity: {
					sourceId: d.regulatoryIdentity.sourceId.id,
					sourceUrl: abs(`/sources/${d.regulatoryIdentity.sourceId.id}`),
					regulatorCompanyId: d.regulatoryIdentity.regulatorCompanyId,
					authorizedDate: d.regulatoryIdentity.authorizedDate,
					licenseStatus: d.regulatoryIdentity.licenseStatus,
					companyType: d.regulatoryIdentity.companyType,
					domicile: d.regulatoryIdentity.domicile,
					...(d.regulatoryIdentity.agentForService
						? { agentForService: d.regulatoryIdentity.agentForService }
						: {}),
				},
			}
			: {}),
		summary: stripMarkers(d.summary),
		officialUrls: d.officialUrls,
		contactChannels: d.contactChannels,
		regulatorRecords: d.regulatorRecords,
		filedForms: d.filedForms.map((form) => ({
			label: form.label,
			sourceId: form.sourceId.id,
			sourceUrl: abs(`/sources/${form.sourceId.id}`),
			note: form.note,
		})),
		publications: d.publications,
		statutoryBasis: d.statutoryBasis,
		jurisdictions: d.jurisdictions,
		whatWeDoNotClaim: d.whatWeDoNotClaim,
		lastReviewed: d.lastReviewed,
		author: d.author,
		reviewer: d.reviewer,
		sourceIds: sources.map((s) => s.id),
		sources: sources.map(sourceRecord),
		relatedResearch: {
			questions: relatedQuestions.map((question) => ({
				id: question.id,
				question: question.data.question,
				url: abs(`/questions/${question.id}`),
			})),
			coverages: relatedCoverages.map((coverage) => ({
				id: coverage.id,
				name: coverage.data.name,
				url: abs(`/insurance/${coverage.id}`),
			})),
		},
	};
}

export function stateRecord(
	entry: CollectionEntry<'states'>,
	sources: CollectionEntry<'sources'>[],
) {
	const path = `/states/${entry.id}`;
	const d = entry.data;
	return {
		...base('jurisdiction', entry.id, path),
		code: d.code,
		name: d.name,
		regulator: d.regulator,
		summary: stripMarkers(d.summary),
		keyMechanisms: d.keyMechanisms.map((m) => ({ title: m.title, detail: stripMarkers(m.detail) })),
		...(d.residualMarket
			? { residualMarket: { ...d.residualMarket, note: stripMarkers(d.residualMarket.note) } }
			: {}),
		autoRequirements: d.autoRequirements.map((a) => ({ item: a.item, detail: stripMarkers(a.detail) })),
		...(d.wcMechanism ? { workersCompensation: { detail: stripMarkers(d.wcMechanism.detail) } } : {}),
		consumerTools: d.consumerTools,
		effectiveDate: d.effectiveDate,
		lastReviewed: d.lastReviewed,
		author: d.author,
		reviewer: d.reviewer,
		sourceIds: sources.map((s) => s.id),
		sources: sources.map(sourceRecord),
	};
}

export function exampleRecord(
	entry: CollectionEntry<'examples'>,
	sources: CollectionEntry<'sources'>[],
) {
	const path = `/examples/${entry.id}`;
	const d = entry.data;
	return {
		...base('example', entry.id, path),
		title: d.title,
		label: d.label,
		labelNote: d.labelNote,
		family: d.family,
		lines: d.lines,
		whatHappened: stripMarkers(d.whatHappened),
		informationThatMattered: d.informationThatMattered.map(stripMarkers),
		insuranceQuestion: d.insuranceQuestion,
		decidedBy: stripMarkers(d.decidedBy),
		cannotGeneralize: d.cannotGeneralize.map(stripMarkers),
		provenance: d.provenance,
		lastReviewed: d.lastReviewed,
		author: d.author,
		reviewer: d.reviewer,
		sourceIds: sources.map((s) => s.id),
		sources: sources.map(sourceRecord),
	};
}

export function toolRecord(entry: CollectionEntry<'tools'>, sources: CollectionEntry<'sources'>[]) {
	const path = entry.data.route || `/tools/${entry.id}`;
	const d = entry.data;
	return {
		...base('tool', entry.id, path),
		name: d.name,
		status: d.status,
		family: d.family,
		lines: d.lines,
		summary: d.summary,
		specification: d.spec,
		lastReviewed: d.lastReviewed,
		sourceIds: sources.map((s) => s.id),
		sources: sources.map(sourceRecord),
	};
}

/**
 * A short checksum over a claim's exact text.
 *
 * The claim URI is positional and stable: /sources/<id>#c3 is always the third
 * claim. The checksum is what makes a citation verifiable rather than merely
 * durable - a citing party can tell whether the sentence they relied on still
 * says what it said, which a URL alone cannot express. A corrected claim is a
 * different claim and gets a different checksum, deliberately.
 */
export function claimChecksum(text: string): string {
	return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12);
}

/**
 * The standalone source record.
 *
 * The source collection is the most citable thing on this site and was the only
 * collection with no machine companion, while llms.txt told every AI system that
 * every substantive page had one and to prefer it over scraping the HTML. That
 * statement was false for 244 pages.
 *
 * `supportsClaims` is the load-bearing field. Each entry carries its own
 * address, its checksum, and the exact sentence, so a claim can be cited on its
 * own rather than by pointing at a page and hoping.
 */
export function sourceEntityRecord(
	source: CollectionEntry<'sources'>,
	citing: Array<{ title: string; path: string; kind: string }>,
) {
	const d = source.data;
	const path = `/sources/${source.id}`;
	return {
		...base('source', source.id, path),
		title: d.title,
		publisher: d.publisher,
		url: d.url,
		officialHost: d.officialHost,
		sourceType: d.sourceType,
		authorityLevel: d.authorityLevel,
		primary: d.primary,
		jurisdiction: d.jurisdiction,
		publishedDate: d.publishedDate,
		effectiveDate: d.effectiveDate,
		accessedDate: d.accessedDate,
		lastChecked: d.lastChecked,
		updateCadence: d.updateCadence,
		status: d.status,
		...(d.statusNote ? { statusNote: d.statusNote } : {}),
		...(d.supersededBy ? { supersededBy: d.supersededBy.id, supersededByUrl: abs(`/sources/${d.supersededBy.id}`) } : {}),
		...(d.archive ? { archive: d.archive } : {}),
		supportsClaims: d.claims.map((claim, i) => ({
			claimId: `${source.id}#c${i + 1}`,
			canonicalUrl: abs(`${path}#c${i + 1}`),
			checksum: claimChecksum(claim),
			text: claim,
		})),
		/* What depends on this source. A source page that understates its own
		   blast radius is the least useful kind of provenance. */
		reliedOnBy: citing.map((c) => ({ kind: c.kind, title: c.title, url: abs(c.path) })),
		reliedOnByCount: citing.length,
		citation: {
			text: `${d.publisher}. "${d.title}." ${d.publishedDate}. ${d.url} (retrieved ${d.accessedDate}).`,
			viaThisSite: `Birch Research source record ${source.id}, content version ${siteConfig.contentVersion}. ${abs(path)}`,
			note: 'Cite the underlying source when you can. Cite this record when you are describing our synthesis or our claim list.',
		},
	};
}

/**
 * The corpus-wide claim index.
 *
 * Normalized deliberately: a `sources` map plus a flat `claims` array that
 * references it. Inlining source metadata on every claim would repeat 244
 * records across 1,472 entries for no gain, and a consumer that wants the
 * source detail can follow `sourceId` in one lookup.
 *
 * The header carries the distribution of what is in here - by authority level,
 * by source type, by jurisdiction - so a consumer can tell what the corpus
 * actually covers before downloading opinions about it.
 */
export function claimIndex(
	sources: CollectionEntry<'sources'>[],
	reliedOnBy: Map<string, Array<{ title: string; path: string; kind: string }>>,
) {
	const tally = (pick: (s: CollectionEntry<'sources'>) => string) => {
		const out: Record<string, number> = {};
		for (const s of sources) out[pick(s)] = (out[pick(s)] ?? 0) + 1;
		return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
	};

	const claims = sources.flatMap((source) =>
		source.data.claims.map((text, i) => ({
			claimId: `${source.id}#c${i + 1}`,
			canonicalUrl: abs(`/sources/${source.id}#c${i + 1}`),
			checksum: claimChecksum(text),
			text,
			sourceId: source.id,
			reliedOnBy: (reliedOnBy.get(source.id) ?? []).map((c) => abs(c.path)),
		})),
	);

	return {
		...base('claim-index', 'claims', '/claims.json'),
		about:
			'Every individually recorded claim in this library. A claim states exactly what its ' +
			'source supports, and nothing beyond it. The claim, not the page, is the citable unit.',
		howToCite: [
			'Cite the underlying source first. Its url, publisher and dates are in the sources map.',
			'Where you are relying on our reading of that source, cite the claim by its canonicalUrl.',
			'Carry the checksum. It is how you or a reader can tell later whether the sentence you relied on still says what it said.',
			'Carry the date. Most of this is time sensitive and lastChecked tells you how fresh our verification is.',
			'Do not strip a hedge. Where a claim says often, may, commonly, or depends on the policy form, that qualifier is the finding.',
		],
		mayNotBeInferred: [
			'That a claim describes the policy the reader holds. It describes the source named.',
			'That we have determined coverage or eligibility. We publish no such determination.',
			'That we endorse, rate, rank, or price any insurer, or state the appetite of any carrier.',
			'That a claim is current merely because it appears here. Read status and lastChecked.',
			/*
			 * The inference this corpus most invites, and the one it had never warned
			 * against. byJurisdiction sits immediately below and is heavily
			 * concentrated, so a page about a line reads as national when it is not.
			 * A jurisdiction absent from that tally is one we hold no source for,
			 * which is a different statement from the rule being the same there.
			 */
			"That a line works the same way in the reader's jurisdiction. Read byJurisdiction: this corpus is concentrated, and a jurisdiction missing from it is one we hold no source for rather than one where the rule matches.",
		],
		counts: {
			claims: claims.length,
			sources: sources.length,
			byAuthorityLevel: tally((s) => s.data.authorityLevel),
			bySourceType: tally((s) => s.data.sourceType),
			byJurisdiction: tally((s) => s.data.jurisdiction),
			byStatus: tally((s) => s.data.status),
			primarySources: sources.filter((s) => s.data.primary).length,
			onOfficialHost: sources.filter((s) => s.data.officialHost).length,
		},
		sources: Object.fromEntries(
			sources.map((source) => {
				const d = source.data;
				return [
					source.id,
					{
						title: d.title,
						publisher: d.publisher,
						url: d.url,
						recordUrl: abs(`/sources/${source.id}`),
						officialHost: d.officialHost,
						sourceType: d.sourceType,
						authorityLevel: d.authorityLevel,
						primary: d.primary,
						jurisdiction: d.jurisdiction,
						publishedDate: d.publishedDate,
						effectiveDate: d.effectiveDate,
						lastChecked: d.lastChecked,
						status: d.status,
						...(d.statusNote ? { statusNote: d.statusNote } : {}),
						...(d.supersededBy ? { supersededBy: d.supersededBy.id } : {}),
					},
				];
			}),
		),
		claims,
	};
}


/**
 * A guide, which is the same evidence as its coverage page in another reading.
 *
 * `sameEvidenceAs` is the load-bearing field and the reason this is not just
 * `coverageRecord` with a different path. A guide is generated one-for-one from
 * a coverage record - same sources, same claims, same ledger - so a system that
 * read both and counted them as two would be double-counting a single reading
 * of a single set of documents. That is exactly the corroboration error a
 * corpus like this one most easily invites, and the only defence is to say so
 * in the record rather than hope it is inferred from the identical source list.
 */
export function guideRecord(
	entry: CollectionEntry<'coverages'>,
	sources: CollectionEntry<'sources'>[],
) {
	const path = `/guides/${entry.id}`;
	const d = entry.data;
	return {
		...base('guide', entry.id, path),
		name: d.name,
		line: d.line,
		family: d.family,
		about:
			'A plain reading of one line of business, arranged for a reader meeting it for the first ' +
			'time. Every section is deep-linkable and none of it paraphrases the coverage page: they ' +
			'are two presentations of one evidence base.',
		sameEvidenceAs: abs(`/insurance/${entry.id}`),
		doNotDoubleCount:
			`This guide and ${abs(`/insurance/${entry.id}`)} rest on the same source records and the ` +
			'same claims. Treating them as two independent sources would count one reading twice.',
		definition: stripMarkers(d.definition),
		sections: [
			{ id: 'covers', name: 'What it commonly covers', url: abs(`${path}#covers`) },
			{ id: 'excludes', name: 'What it commonly excludes', url: abs(`${path}#excludes`) },
			{ id: 'limits', name: 'Limits and deductibles', url: abs(`${path}#limits`) },
			{ id: 'endorsements', name: 'Endorsements', url: abs(`${path}#endorsements`) },
			{ id: 'variations', name: 'State variations', url: abs(`${path}#variations`) },
		],
		effectiveDate: d.effectiveDate,
		lastReviewed: d.lastReviewed,
		reviewState: d.reviewState,
		author: d.author,
		reviewer: d.reviewer,
		sourceIds: sources.map((s) => s.id),
		sources: sources.map(sourceRecord),
	};
}

/**
 * A line hub: what this library holds on one canonical line of business.
 *
 * The honest content of this record is mostly what is missing. A line with an
 * index and no written coverage page is a line we hold sources on and have not
 * explained, and `written` says which. Publishing the distinction is what stops
 * an empty line reading as a line with nothing to say about it.
 */
export function lineRecord(hub: {
	line: string;
	label: string;
	family: string;
	coverageId?: string;
	guideId?: string;
	checks: unknown[];
	moduleIds: Array<{ id: string; name: string; ruleCount: number }>;
	questionIds: Array<{ id: string; question: string }>;
	exampleIds: Array<{ id: string; title: string }>;
	sourceIds: string[];
	claimCount: number;
	adjacent: string[];
}) {
	const path = `/lines/${hub.line}`;
	return {
		...base('line', hub.line, path),
		name: hub.label,
		family: hub.family,
		written: Boolean(hub.coverageId),
		about: hub.coverageId
			? 'A line with a written coverage page. The page explains it; this record indexes everything that depends on it.'
			: 'A line this library holds cited material on but has not written up. The sources and checks below are real; there is no explanation of the line itself yet, and that absence is the point of saying so here.',
		...(hub.coverageId ? { coverage: abs(`/insurance/${hub.coverageId}`) } : {}),
		...(hub.guideId ? { guide: abs(`/guides/${hub.guideId}`) } : {}),
		counts: {
			sources: hub.sourceIds.length,
			claims: hub.claimCount,
			citedChecks: hub.checks.length,
			questions: hub.questionIds.length,
			examples: hub.exampleIds.length,
		},
		modules: hub.moduleIds.map((m) => ({ id: m.id, name: m.name, rules: m.ruleCount, url: abs(`/tools/${m.id}`) })),
		questions: hub.questionIds.map((q) => ({ id: q.id, question: q.question, url: abs(`/questions/${q.id}`) })),
		examples: hub.exampleIds.map((e) => ({ id: e.id, title: e.title, url: abs(`/examples/${e.id}`) })),
		adjacentLines: hub.adjacent.map((line) => abs(`/lines/${line}`)),
		sourceIds: hub.sourceIds,
	};
}

/**
 * The figures table: every amount this library publishes and what moves it.
 *
 * `amount` is echoed exactly as the figure record states it, and no operative
 * value is computed here. Several of these are stepped schedules whose value
 * today is arithmetic from the instrument rather than a printed number, and
 * `DIRECTION.md` forbids publishing a figure the source did not state. The
 * `note` on each row carries that hedge and travels with the amount.
 */
export function figuresRecord(figures: CollectionEntry<'figures'>[]) {
	return {
		...base('figure-index', 'figures', '/figures'),
		about:
			'Every amount this library publishes, with the instrument that sets it and what moves it. ' +
			'Amounts are quoted as their source states them; where an operative value would have to be ' +
			'calculated, the note says so and no calculation is published.',
		mayNotBeInferred: [
			'That an amount is the operative one today. Read movesWhen and nextMove.',
			'That a scheduled increase produces the figure you calculate from it. We publish no figure the source did not state.',
			'That an amount applies outside the jurisdiction named in states.',
		],
		count: figures.length,
		figures: figures.map((f) => ({
			id: f.id,
			url: abs(`/figures#${f.id}`),
			label: f.data.label,
			amount: f.data.amount,
			applies: f.data.applies,
			basis: f.data.basis,
			movesWhen: f.data.movesWhen,
			nextMove: f.data.nextMove,
			lastMoved: f.data.lastMoved,
			instrument: f.data.instrument,
			note: f.data.note,
			family: f.data.family,
			lines: f.data.lines,
			states: f.data.states,
			effectiveDate: f.data.effectiveDate,
			lastReviewed: f.data.lastReviewed,
			reviewState: f.data.reviewState,
			sourceIds: (f.data.sourceIds ?? []).map((r: { id: string } | string) =>
				typeof r === 'string' ? r : r.id,
			),
		})),
	};
}

/**
 * An advisory module: the rule set it runs, published as a rule set.
 *
 * Modules are the one place on this site where a page is a program. Publishing
 * the checks as data rather than only as a rendered form is what lets somebody
 * read what the module actually decides without filling it in - and every rule
 * cites a source, so the rule set is as citable as the prose.
 */
export function moduleRecord(
	entry: CollectionEntry<'modules'>,
	sources: CollectionEntry<'sources'>[],
) {
	const path = `/tools/${entry.id}`;
	const d = entry.data;
	return {
		...base('module', entry.id, path),
		name: d.name,
		family: d.family,
		lines: d.lines,
		summary: d.summary,
		about:
			'A deterministic rule set. Every check cites a source, answers are held in the reader browser ' +
			'and nothing is submitted, so this is readable as a published rule set rather than as a form.',
		privacy: 'No answer to this module is transmitted, stored, or logged. There is no server copy of anything a reader enters.',
		fieldCount: (d.fields ?? []).length,
		ruleCount: (d.rules ?? []).length,
		rules: (d.rules ?? []).map((rule: Record<string, unknown>) => ({
			...rule,
			title: typeof rule.title === 'string' ? stripMarkers(rule.title) : rule.title,
			detail: typeof rule.detail === 'string' ? stripMarkers(rule.detail) : rule.detail,
			action: typeof rule.action === 'string' ? stripMarkers(rule.action) : rule.action,
		})),
		lastReviewed: d.lastReviewed,
		reviewState: d.reviewState,
		author: d.author,
		reviewer: d.reviewer,
		sourceIds: sources.map((s) => s.id),
		sources: sources.map(sourceRecord),
	};
}

export function jsonResponse(body: unknown): Response {
	return new Response(`${JSON.stringify(body, null, 2)}\n`, {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'public, max-age=600',
		},
	});
}
