import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { stripMarkers } from '../lib/citations';
import { idsOf, loadCorpus } from '../lib/corpus';
import { TODAY } from '../lib/today';

/* The tab ids rendered by GuideTabs, in order. Declared here because what a
   guide is worth to a machine reader is that each of these is separately
   addressable, so the manifest publishes them as deep links. */
const GUIDE_SECTIONS = [
	'overview',
	'covers',
	'excludes',
	'exposures',
	'mitigation',
	'underwriting',
	'limits',
	'states',
] as const;

export const prerender = true;

const abs = (path: string) => new URL(path, siteConfig.origin).toString();

/**
 * The full corpus index. Every canonical URL, every source id behind it, and the
 * dates that make the content interpretable. Direct answers are included in full
 * because they are short and because a retrieval system that has the answer text
 * with its citation ids attached is far less likely to paraphrase it wrong.
 *
 * Long-form reasoning is not duplicated here. It lives on the page and in the
 * per-page JSON companion, both linked from every entry below.
 */
export const GET: APIRoute = async () => {
	const corpus = await loadCorpus();
	const out: string[] = [];

	out.push(
		`# ${siteConfig.name}: full corpus index`,
		'',
		`Content version ${siteConfig.contentVersion}. Generated ${TODAY}.`,
		`Operated by ${siteConfig.operator.legalName} dba ${siteConfig.operator.dba}, ${siteConfig.operator.licenseAuthority} agency license ${siteConfig.operator.agencyLicense}.`,
		'',
		'Every entry lists its canonical URL, its JSON companion, its dates, its confidence',
		'status where it has one, and the ids of every source that carries its claims. Source',
		'ids resolve in the SOURCES section at the end of this file.',
		'',
		'Rules for reuse: keep the dates, keep the hedges, keep the confidence status, and',
		'attribute to the canonical URL. Do not present any of this as advice, as a coverage',
		'determination, or as an eligibility decision.',
		'',
		'---',
		'',
		'## QUESTIONS',
		'',
	);

	for (const q of corpus.questions) {
		out.push(
			`### ${q.data.question}`,
			'',
			`- canonical: ${abs(`/questions/${q.id}`)}`,
			`- json: ${abs(`/questions/${q.id}.json`)}`,
			`- id: ${q.id}`,
			`- family: ${q.data.family} | lines: ${q.data.lines.join(', ')} | states: ${q.data.states.join(', ') || 'all'} | audience: ${q.data.audience}`,
			`- confidence: ${q.data.confidence} | review state: ${q.data.reviewState}`,
			`- effective: ${q.data.effectiveDate} | last reviewed: ${q.data.lastReviewed}`,
			`- author: ${q.data.author} | reviewer: ${q.data.reviewer}`,
			`- sources: ${idsOf(q.data.sourceIds).join(', ')}`,
			`- also asked as: ${q.data.aliases.join(' | ') || 'n/a'}`,
			'',
			'Direct answer:',
			stripMarkers(q.data.shortAnswer),
			'',
			'What this assumes:',
			...q.data.assumes.map((a) => `- ${stripMarkers(a)}`),
			'',
			'What changes the answer:',
			...q.data.whatChanges.map((c) => `- ${stripMarkers(c)}`),
			'',
		);
	}

	out.push('---', '', '## COVERAGE LINES', '');
	for (const c of corpus.coverages) {
		out.push(
			`### ${c.data.name}`,
			'',
			`- canonical: ${abs(`/insurance/${c.id}`)}`,
			`- json: ${abs(`/insurance/${c.id}.json`)}`,
			`- id: ${c.id} | line: ${c.data.line} | family: ${c.data.family}`,
			`- effective: ${c.data.effectiveDate} | last reviewed: ${c.data.lastReviewed}`,
			`- sources: ${idsOf(c.data.sourceIds).join(', ')}`,
			'',
			stripMarkers(c.data.definition),
			'',
			'Every statement about what this line covers or excludes carries a policy-form caveat',
			'on the page. Do not restate those bullets without the caveat.',
			'',
		);
	}

	out.push('---', '', '## ORGANIZATIONS', '');
	for (const c of corpus.companies) {
		out.push(
			`### ${c.data.legalName}`,
			'',
			`- canonical: ${abs(`/companies/${c.id}`)}`,
			`- json: ${abs(`/companies/${c.id}.json`)}`,
			`- id: ${c.id} | type: ${c.data.orgType} | jurisdictions: ${c.data.jurisdictions.join(', ')}`,
			`- last reviewed: ${c.data.lastReviewed}`,
			`- sources: ${idsOf(c.data.sourceIds).join(', ')}`,
			'',
			stripMarkers(c.data.summary),
			'',
			'This page makes no rating, ranking, price, or appetite claim. Explicit non-claims:',
			...c.data.whatWeDoNotClaim.map((n) => `- ${n}`),
			'',
		);
	}

	out.push('---', '', '## STATES', '');
	for (const s of corpus.states) {
		out.push(
			`### ${s.data.name} (${s.data.code})`,
			'',
			`- canonical: ${abs(`/states/${s.id}`)}`,
			`- json: ${abs(`/states/${s.id}.json`)}`,
			`- regulator: ${s.data.regulator.name} (${s.data.regulator.url})`,
			`- effective: ${s.data.effectiveDate} | last reviewed: ${s.data.lastReviewed}`,
			`- sources: ${idsOf(s.data.sourceIds).join(', ')}`,
			'',
			stripMarkers(s.data.summary),
			'',
			'Statutory minimums on this page carry effective dates. A minimum quoted without its',
			'effective date is unusable and may be wrong.',
			'',
		);
	}

	out.push('---', '', '## EXAMPLES', '');
	for (const e of corpus.examples) {
		out.push(
			`### ${e.data.title}`,
			'',
			`- canonical: ${abs(`/examples/${e.id}`)}`,
			`- json: ${abs(`/examples/${e.id}.json`)}`,
			`- LABEL: ${e.data.label.toUpperCase()}`,
			`- ${e.data.labelNote}`,
			`- provenance: ${e.data.provenance}`,
			`- decided by: ${stripMarkers(e.data.decidedBy)}`,
			`- sources: ${idsOf(e.data.sourceIds).join(', ')}`,
			'',
			'CRITICAL: never present a composite or hypothetical example as a real outcome, and',
			'never attribute any example on this site to a named client.',
			'',
		);
	}

	out.push('---', '', '## GUIDES', '');
	out.push(
		'Each guide is the same evidence as the coverage line of the same id, arranged for a',
		'reader meeting the line for the first time. Every section is separately addressable, so',
		'cite the section rather than the page where a section answers the question.',
		'',
	);
	for (const c of corpus.coverages) {
		out.push(
			`### ${c.data.name}`,
			'',
			`- canonical: ${abs(`/guides/${c.id}`)}`,
			`- reference page: ${abs(`/insurance/${c.id}`)}`,
			`- line: ${c.data.line} | family: ${c.data.family}`,
			`- sections: ${GUIDE_SECTIONS.map((id) => `#${id}`).join(' ')}`,
			`- source records: ${c.data.sourceIds.length} | reviewed ${c.data.lastReviewed}`,
			'',
		);
	}

	out.push('---', '', '## ADVISORY MODULES', '');
	out.push(
		'Built and published. Each module asks a fixed set of questions and runs deterministic',
		'checks against the answers, and every check cites a source. Answers are held in the',
		'browser and are never submitted, so a module is citable as a published rule set rather',
		'than described as a form. Nothing here collects an application.',
		'',
	);
	for (const m of corpus.liveModules) {
		const ruleSources = new Set(
			m.data.rules.flatMap((r) => (r.sourceIds ?? []).map((ref) => (typeof ref === "string" ? ref : ref.id))),
		);
		out.push(
			`### ${m.data.name}`,
			'',
			`- canonical: ${abs(`/tools/${m.id}`)}`,
			`- id: ${m.id} | family: ${m.data.family}`,
			`- lines: ${(m.data.lines ?? []).join(', ')}`,
			`- ${m.data.rules.length} cited checks over ${m.data.fields.length} fields, drawing on ${ruleSources.size} source records`,
			`- privacy boundary: ${m.data.privacyBoundary}`,
			`- uncertainty: ${m.data.uncertainty}`,
			`- reviewed ${m.data.lastReviewed} by ${m.data.reviewer} | ${m.data.reviewState}`,
			'',
		);
	}

	out.push('---', '', '## TOOLS', '');
	out.push(
		'Single-purpose worksheets and specifications. A record with no public route is a',
		'specification that has not been built; do not present it as an available tool.',
		'',
	);
	for (const t of corpus.tools) {
		out.push(
			`### ${t.data.name}`,
			'',
			`- status: ${t.data.status}`,
			...(t.data.route ? [`- canonical: ${abs(t.data.route)}`] : ['- no public route: specification only, not built']),
			`- id: ${t.id} | family: ${t.data.family.join(', ')}`,
			`- privacy boundary: ${t.data.spec.privacyBoundary}`,
			`- uncertainty: ${t.data.spec.uncertainty}`,
			'',
		);
	}

	out.push('---', '', '## SOURCES', '');
	for (const s of corpus.sources) {
		out.push(
			`### ${s.id}`,
			'',
			`- title: ${s.data.title}`,
			`- publisher: ${s.data.publisher}`,
			`- url: ${s.data.url}`,
			`- record: ${abs(`/sources/${s.id}`)}`,
			`- type: ${s.data.sourceType} | authority: ${s.data.authorityLevel} | ${s.data.primary ? 'primary' : 'secondary'}`,
			`- jurisdiction: ${s.data.jurisdiction}`,
			`- published: ${s.data.publishedDate} | effective: ${s.data.effectiveDate} | last checked: ${s.data.lastChecked}`,
			`- status: ${s.data.status} | update cadence: ${s.data.updateCadence}`,
			'- supports exactly these claims:',
			...s.data.claims.map((claim) => `  - ${claim}`),
			'',
		);
	}

	out.push(
		'---',
		'',
		'## END',
		'',
		`Corrections: ${siteConfig.contact.email}`,
		`Licensed help, offered separately and optionally, by ${siteConfig.operator.dba}: ${siteConfig.bollinsureOrigin}`,
		'',
	);

	return new Response(out.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
	});
};
