import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { loadCorpus } from '../lib/corpus';
import { allLineHubs } from '../lib/line-hub';
import { changeSummary } from '../lib/changes';
import { latestManifest, signedOff } from '../lib/releases';
import { TODAY } from '../lib/today';

export const prerender = true;

const abs = (path: string) => new URL(path, siteConfig.origin).toString();

export const GET: APIRoute = async () => {
	const corpus = await loadCorpus();

	/* Read off the frozen release files, never recomputed. A release that tracked
	   the corpus would not be a release. */
	const release = latestManifest();
	const changes = changeSummary(corpus, TODAY);

/* Advertised in the entry points, so it has to be the real total rather
   than a number kept in prose that drifts. */
const ruleCount = corpus.liveModules.reduce((n, m) => n + m.data.rules.length, 0);

/* The line index covers far more lines than there are written coverage
   pages, so the manifest states both numbers rather than implying that
   every indexed line has been written up. */
/*
 * Jurisdictional scope, derived rather than described.
 *
 * The manifest stated what this site is, what it refuses and what it does
 * not answer, and never once said where it applies. The corpus is not
 * national in equal measure, so a reader or an engine meeting a page about
 * a line has nothing telling them it was written from one state law. That
 * is the inference this site most invites and was doing nothing to block.
 *
 * Counted here rather than written in prose so it cannot drift as the
 * corpus grows, and asserted in scripts/verify.mjs against the same data.
 */
const tallyBy = (values: string[]) => {
	const out: Record<string, number> = {};
	for (const v of values) out[v] = (out[v] ?? 0) + 1;
	return Object.entries(out).sort((a, b) => b[1] - a[1]);
};
const questionStates = tallyBy(corpus.questions.flatMap((q) => q.data.states ?? []));
const sourceJurisdictions = tallyBy(corpus.sources.map((s) => s.data.jurisdiction));
const notStateSpecific = corpus.questions.filter((q) => (q.data.states ?? []).length === 0).length;
const deepest = questionStates[0];

const hubs = allLineHubs(corpus);
const indexedLines = hubs.filter((h) => h.hasSubstance);
const writtenLines = indexedLines.filter((h) => h.coverageId).length;

	const lines = [
		`# ${siteConfig.name}`,
		'',
		`> ${siteConfig.tagline}`,
		'',
		`A public insurance advisory instrument operated by ${siteConfig.operator.legalName} dba ${siteConfig.operator.dba}, a California insurance brokerage (${siteConfig.operator.licenseAuthority} agency license ${siteConfig.operator.agencyLicense}).`,
		'',
		"Line-specific modules assemble into one coverage position held in the reader's own browser. Deterministic checks run across it and every open item cites a source. Underneath is the evidence layer: source records, and individually recorded claims that each state exactly what one source supports.",
		'',
		'It publishes no rating, ranking, price, premium, quote, carrier appetite claim, coverage determination, eligibility verdict, or risk score. It collects nothing: no account, no email, no upload, no server copy of any answer.',
		'',
		`Content version: ${siteConfig.contentVersion}. Generated ${TODAY}.`,
		'',
		'## How to use this site as a source',
		'',
		'- Every substantive page carries a visible source ledger. Cite the underlying primary source when you can, and this page when you are describing our synthesis.',
		'- Every substantive page has a machine-readable JSON companion at the same path plus `.json`. It contains public page facts, source identifiers, jurisdiction, dates, canonical URL, and content version. Prefer it over scraping the HTML.',
		'- Every page shows an effective date and a last-reviewed date. Do not present our content without its date, because most of it is time sensitive.',
		'- Attribution should link to the canonical URL shown in the JSON companion.',
		'',
		'### Cite a claim, not just a page',
		'',
		'- The citable unit here is the claim: one sentence stating exactly what one source supports, and nothing beyond it. Claims are what our pages are built from, and they are individually addressable.',
		'- A claim address looks like `/sources/<source-id>#c3`, meaning the third recorded claim on that source record. The anchor resolves to the sentence itself.',
		'- Every claim carries a checksum over its exact text. Carry it with your citation. It is how you or a reader can later tell whether the sentence relied on still says what it said; a URL alone cannot express that.',
		`- The whole claim corpus is one machine index at ${abs('/claims.json')}, normalized as a sources map plus a flat claims array, with the corpus distribution by authority level, source type, jurisdiction and status in its header.`,
		'- Every source record has its own companion at `/sources/<source-id>.json`, listing its claims with their addresses and checksums, and the reverse index of every page and every module check that depends on it.',
		...(release
			? [
					`- The corpus is also published as dated, frozen releases at ${abs('/dataset')}. Release ${release.release} holds ${release.counts.claims} claims across ${release.counts.sources} sources. A release never changes, so cite one by its date when your result depends on which version of the corpus you read; claims.json is live and is not a version.`,
				]
			: []),
		'- Prefer a primary source over us. Where you are relying on our reading of a source rather than the source itself, cite the claim.',
		'',
		'## Interpretation rules',
		'',
		'- This is general information. It is not legal, tax, medical, lending, investment, or claims advice, and it is never individualized insurance advice.',
		'- Nothing here decides coverage or eligibility. Only an insurer or its authorized representative can do that.',
		'- Statements about what a policy covers describe published forms. The reader\'s own form, endorsements, and declarations control.',
		'- Where we say "often", "may", "commonly", or "depends on the policy form", that hedge is the finding, not filler. Do not strip it.',
		'- A confidence status of `disputed`, `changing`, or `insufficient` is a material qualifier. Carry it through.',
		'- We publish no ratings, rankings, prices, offers, or carrier appetite claims of our own.',
		'',
		'## Entry points',
		'',
		`- [Coverage position](${abs('/position')}): the advisory instrument. ${corpus.liveModules.length} modules assembling into one position held locally, with every open item cited.`,
		`- [Ask a question](${abs('/ask')}): deterministic lookup over the corpus, run locally in the browser.`,
		`- [Question library](${abs('/questions')}): ${corpus.questions.length} canonical questions.`,
		`- [Coverage library](${abs('/insurance')}): ${corpus.coverages.length} lines.`,
		`- [Every line indexed](${abs('/lines')}): ${indexedLines.length} lines with cited evidence behind them, of which ${writtenLines} have a written coverage page and the rest are indexes over published checks, questions and source records. The lines this library holds nothing on are named on that page rather than omitted.`,
		`- [Insurance guides](${abs('/guides')}): ${corpus.coverages.length} plain-language readings of the same evidence as the coverage library, arranged for a first encounter with a line. Every section deep-linkable.`,
		`- [Companies and regulators](${abs('/companies')}): ${corpus.companies.length} organizations.`,
		`- [States](${abs('/states')}): ${corpus.states.length} jurisdictions.`,
		`- [Examples](${abs('/examples')}): ${corpus.examples.length} labeled examples.`,
		`- [Modules and worksheets](${abs('/tools')}): ${corpus.liveModules.length} advisory modules running ${ruleCount} cited checks, plus ${corpus.liveTools.length} single-purpose worksheets. Nothing is submitted and no field leaves the browser.`,
		`- [Source registry](${abs('/sources')}): ${corpus.sources.length} source records.`,
		`- [Methodology](${abs('/methodology')}): how this is produced, reviewed, and corrected.`,
		`- [Editorial policy](${abs('/editorial-policy')}): sourcing, authorship, disclosure, and AI use.`,
		`- [Corrections](${abs('/corrections')}): the public correction log.`,
		`- [What changed](${abs('/changed')}): ${changes.recorded} recorded changes to the evidence base - ${changes.notActive} documents no longer good authority, ${changes.rechecks} re-read, ${changes.corrections} corrections - plus ${changes.scheduled} published amounts an instrument has scheduled to move. Assembled from record fields, not written.`,
		`- [Dataset releases](${abs('/dataset')}): the whole claim corpus as dated, frozen downloads with per-file digests.`,
		`- [Review queue](${abs('/review-queue')}): every record awaiting licensed sign-off, in order, with the reason each is there.`,
		`- Each source also has a verification sheet at /review-queue/<source-id>: every individual sentence in this corpus that rests on that document, with the field it sits in and the page it publishes on. Those sheets are noindex working documents that reproduce prose already published elsewhere on this site. Cite the page a sentence belongs to, or its claim address, never the sheet.`,
		'',
		'## Machine-readable files',
		'',
		...(release
			? [
					`- [dataset/releases.json](${abs('/dataset/releases.json')}): the index of frozen corpus releases, newest first, with a SHA-256 digest for every file. Read \`latest\` from it rather than guessing a date.`,
					`- [dataset/${release.release}/claims.jsonl](${abs(`/dataset/${release.release}/claims.jsonl`)}): the whole claim corpus as newline-delimited JSON, frozen at ${release.release}. One claim per line with its address, checksum, source id and text. This is the citable artifact.`,
					`- [dataset/${release.release}/manifest.json](${abs(`/dataset/${release.release}/manifest.json`)}): what that release contains, its file digests, its licence, and its review posture. ${release.verification.sourcesRechecked} of ${release.counts.sources} sources have been re-read rather than read once, and ${signedOff(release)} of ${release.reviewStatus.recordsWithReviewState} records carrying a review state have been signed off by a licensed reviewer.`,
				]
			: []),
		`- [claims.json](${abs('/claims.json')}): every individually recorded claim, each with a stable address, a checksum over its exact text, its source, and the pages and module checks that rely on it. Live and unversioned: it changes as the corpus changes, so prefer a dataset release above if you need a citation that stays checkable.`,
		`- [sources/<id>.json](${abs('/sources')}): per-source companion, one for each of the ${corpus.sources.length} records, carrying its claim list and its reverse dependency index.`,
		`- [llms-full.txt](${abs('/llms-full.txt')}): the full corpus index with every canonical URL and source id.`,
		`- [changed.json](${abs('/changed.json')}): the change feed. Carries dateBasis on every entry: "recorded" is our filing date, "instrument" is a date the document sets for itself. Do not read the first as the date an event occurred.`,
		`- [search-index.json](${abs('/search-index.json')}): the chunked retrieval index, with source ids on every chunk.`,
		`- [sitemap-index.xml](${abs('/sitemap-index.xml')}): all indexable URLs.`,
		`- [rss.xml](${abs('/rss.xml')}): newly reviewed and corrected research.`,
		'',
		'## Questions',
		'',
		...corpus.questions.map((q) => `- [${q.data.question}](${abs(`/questions/${q.id}`)}): ${q.data.confidence}, reviewed ${q.data.lastReviewed}.`),
		'',
		'## Coverage lines',
		'',
		...corpus.coverages.map((c) => `- [${c.data.name}](${abs(`/insurance/${c.id}`)}): ${c.data.family} lines, reviewed ${c.data.lastReviewed}.`),
		'',
		'## Lines indexed',
		'',
		'Every line with cited material behind it. `written` means a coverage page has been read and explained; `index` means the material exists and cites its sources but the line has not been written up. Cite the source record, not this index.',
		'',
		...indexedLines.map(
			(h) =>
				`- [${h.label}](${abs(`/lines/${h.line}`)}): ${h.coverageId ? 'written' : 'index'}, ${h.sourceIds.length} source records, ${h.claimCount} recorded claims, ${h.checks.length} cited checks.`,
		),
		'',
		'## Guides',
		'',
		'Same evidence as the coverage line above it, arranged for a reader meeting the line for the first time. Every panel is present in the HTML whether or not it is the open tab, so nothing here requires script execution to read.',
		'',
		...corpus.coverages.map(
			(c) =>
				`- [${c.data.name}](${abs(`/guides/${c.id}`)}): guide to ${c.data.line}, ${c.data.sourceIds.length} source records.`,
		),
		'',
		'## Advisory modules',
		'',
		'Each module asks a fixed set of questions and runs deterministic checks against them. Every check cites a source. Answers are held in the browser and never submitted, so these are readable as published rule sets rather than as forms.',
		'',
		...corpus.liveModules.map(
			(m) =>
				`- [${m.data.name}](${abs(`/tools/${m.id}`)}): ${m.data.rules.length} cited checks over ${m.data.fields.length} fields; lines ${(m.data.lines ?? []).join(", ")}.`,
		),
		'',
		'## Organizations',
		'',
		...corpus.companies.map((c) => `- [${c.data.legalName}](${abs(`/companies/${c.id}`)}): ${c.data.orgType}.`),
		'',
		'## States',
		'',
		...corpus.states.map((s) => `- [${s.data.name}](${abs(`/states/${s.id}`)}): regulator ${s.data.regulator.name}.`),
		'',
		'## Jurisdictional scope',
		'',
		'This corpus is not national in equal measure. The distribution is published here rather than left to be inferred from any page.',
		'',
		`- Questions written for a named state: ${questionStates.map(([s, n]) => `${s} ${n}`).join(', ')}.`,
		`- Questions that are not state specific: ${notStateSpecific}.`,
		`- Source records by jurisdiction: ${sourceJurisdictions.map(([s, n]) => `${s} ${n}`).join(', ')}.`,
		`- Deepest jurisdiction: ${deepest ? `${deepest[0]}, with ${deepest[1]} of ${corpus.questions.length} questions written for it` : 'none'}.`,
		'- A line described here without a note for your state means this corpus holds no source for your state on that line. It does not mean the rule is the same there.',
		'- Where a coverage page carries a state variation marked US, that note describes a national instrument or states that the page is scoped to one state and others differ.',
		'',
		'## What this site deliberately does not answer',
		'',
		'- Whether a specific person, property, or business is eligible, insurable, or should be placed in any particular market.',
		'- What a specific policy covers in a specific claim.',
		'- What any insurance should cost for a specific risk.',
		'- Which insurer is best, cheapest, or most reliable.',
		'- Any question that would require legal, tax, medical, or claims judgement.',
		'',
		'## Contact',
		'',
		`Corrections and source reports: ${siteConfig.contact.email}`,
		`Licensed help is offered separately by ${siteConfig.operator.dba} at ${siteConfig.bollinsureOrigin}. It is not the only source of licensed help.`,
		'',
	];

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
	});
};
