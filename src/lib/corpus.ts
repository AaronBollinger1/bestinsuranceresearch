import { getCollection, type CollectionEntry } from 'astro:content';
import { markersIn } from './citations';
import { validateModule, type ModuleDef } from './position';
import { buildIndex, type Chunk, type SearchIndex } from './retrieval';
import { siteConfig } from '../config/site';

/**
 * The normalized content store.
 *
 * Every published entry is loaded once, chunked by claim and section, and each
 * chunk keeps the source ids that support it. This is the single place that
 * decides what "the corpus" means, so retrieval, the RSS feed, llms-full.txt,
 * the sitemap, and the build-time validator can never drift apart.
 */

export type Corpus = Awaited<ReturnType<typeof loadCorpus>>;

export async function loadCorpus() {
	const [sources, questions, coverages, companies, states, examples, tools, modules, people, crossRules] = await Promise.all([
		getCollection('sources'),
		getCollection('questions'),
		getCollection('coverages'),
		getCollection('companies'),
		getCollection('states'),
		getCollection('examples'),
		getCollection('tools'),
		getCollection('modules'),
		getCollection('people'),
		/* Rules that read across modules. Owned by the position, not by a module. */
		getCollection('crossRules'),
	]);

	const sourceById = new Map(sources.map((s) => [s.id, s]));
	const questionBySlug = new Map(questions.map((q) => [q.id, q]));
	const coverageBySlug = new Map(coverages.map((c) => [c.id, c]));
	const companyBySlug = new Map(companies.map((c) => [c.id, c]));
	const personByName = new Map(people.map((p) => [p.data.name, p]));

	const liveTools = tools.filter((t) => t.data.status === 'live').sort((a, b) => a.data.order - b.data.order);

	return {
		sources,
		crossRules,
		questions,
		coverages,
		companies,
		states,
		examples,
		tools,
		modules,
		people,
		liveTools,
		liveModules: modules.filter((m) => m.data.status === 'live').sort((a, b) => a.data.order - b.data.order),
		sourceById,
		questionBySlug,
		coverageBySlug,
		companyBySlug,
		personByName,
	};
}

/** Resolve an entry's declared source ids to full source records, in ledger order. */
export function ledgerFor(
	sourceIds: Array<{ id: string } | string>,
	sourceById: Map<string, CollectionEntry<'sources'>>,
	context: string,
): CollectionEntry<'sources'>[] {
	return sourceIds.map((ref) => {
		const id = typeof ref === 'string' ? ref : ref.id;
		const found = sourceById.get(id);
		if (!found) {
			throw new Error(`Source "${id}" referenced by ${context} is not in the source registry.`);
		}
		return found;
	});
}

export const idsOf = (refs: Array<{ id: string } | string>): string[] =>
	refs.map((r) => (typeof r === 'string' ? r : r.id));

/* ------------------------------------------------------------------ */
/* Chunking                                                            */
/* ------------------------------------------------------------------ */

/**
 * Source attribution for one chunk: the markers actually present in that chunk's
 * text. When a chunk carries no marker it inherits the entry's declared sources,
 * which keeps every chunk attributable without inventing precision.
 */
function chunkSources(text: string, entrySourceIds: string[]): string[] {
	const inline = markersIn(text);
	return inline.length > 0 ? inline : entrySourceIds;
}

function pushChunk(out: Chunk[], base: Omit<Chunk, 'id' | 'text' | 'sourceIds' | 'kind'>, kind: Chunk['kind'], texts: string[], entrySourceIds: string[]) {
	texts.forEach((text, i) => {
		const trimmed = text.trim();
		if (!trimmed) return;
		out.push({
			...base,
			id: `${base.entryType}:${base.slug}#${kind}-${i + 1}`,
			kind,
			text: trimmed,
			sourceIds: chunkSources(trimmed, entrySourceIds),
		});
	});
}

export function chunkCorpus(corpus: Corpus): Chunk[] {
	const chunks: Chunk[] = [];

	for (const entry of corpus.questions) {
		const d = entry.data;
		const entrySources = idsOf(d.sourceIds);
		const base = {
			entryType: 'question' as const,
			slug: entry.id,
			title: d.question,
			path: `/questions/${entry.id}`,
			family: d.family,
			lines: d.lines,
			states: d.states,
			audience: d.audience,
			topics: d.topics,
			effectiveDate: d.effectiveDate,
			lastReviewed: d.lastReviewed,
			confidence: d.confidence,
		};
		pushChunk(chunks, base, 'answer', [d.shortAnswer], entrySources);
		pushChunk(chunks, base, 'assumption', d.assumes, entrySources);
		pushChunk(chunks, base, 'reasoning', d.why.split(/\n{2,}/), entrySources);
		pushChunk(chunks, base, 'change', d.whatChanges, entrySources);
		pushChunk(chunks, base, 'variability', d.variability, entrySources);
		pushChunk(chunks, base, 'action', d.nextActions, entrySources);
	}

	for (const entry of corpus.coverages) {
		const d = entry.data;
		const entrySources = idsOf(d.sourceIds);
		const base = {
			entryType: 'coverage' as const,
			slug: entry.id,
			title: d.name,
			path: `/insurance/${entry.id}`,
			family: d.family,
			lines: [d.line],
			states: d.stateVariations.map((v) => v.state),
			audience: d.family === 'commercial' ? 'business-owner' : 'individual',
			topics: [d.line],
			effectiveDate: d.effectiveDate,
			lastReviewed: d.lastReviewed,
			confidence: 'established',
		};
		pushChunk(chunks, base, 'definition', [d.definition], entrySources);
		pushChunk(chunks, base, 'coverage-detail', d.protects, entrySources);
		pushChunk(chunks, base, 'coverage-detail', d.commonlyCovers.map((i) => `${i.item}. ${i.note}`), entrySources);
		pushChunk(chunks, base, 'coverage-detail', d.commonlyExcludes.map((i) => `${i.item}. ${i.note}`), entrySources);
		pushChunk(chunks, base, 'coverage-detail', d.limitsAndDeductibles, entrySources);
		pushChunk(chunks, base, 'coverage-detail', d.endorsements.map((i) => `${i.item}. ${i.note}`), entrySources);
		pushChunk(chunks, base, 'variability', d.stateVariations.map((v) => `${v.state}: ${v.note}`), entrySources);
	}

	for (const entry of corpus.companies) {
		const d = entry.data;
		const entrySources = idsOf(d.sourceIds);
		const base = {
			entryType: 'company' as const,
			slug: entry.id,
			title: d.legalName,
			path: `/companies/${entry.id}`,
			family: 'personal',
			lines: [],
			states: d.jurisdictions.filter((j) => j.length === 2),
			audience: 'individual',
			topics: [d.orgType],
			effectiveDate: d.lastReviewed,
			lastReviewed: d.lastReviewed,
			confidence: 'established',
		};
		pushChunk(chunks, base, 'entity', [d.summary], entrySources);
		pushChunk(chunks, base, 'entity', d.regulatorRecords.map((r) => `${r.label}. ${r.note || ''}`), entrySources);
	}

	for (const entry of corpus.states) {
		const d = entry.data;
		const entrySources = idsOf(d.sourceIds);
		const base = {
			entryType: 'state' as const,
			slug: entry.id,
			title: `${d.name} insurance context`,
			path: `/states/${entry.id}`,
			family: 'personal',
			lines: [],
			states: [d.code],
			audience: 'individual',
			topics: ['regulation', 'availability'],
			effectiveDate: d.effectiveDate,
			lastReviewed: d.lastReviewed,
			confidence: 'contextual',
		};
		pushChunk(chunks, base, 'jurisdiction', [d.summary], entrySources);
		pushChunk(chunks, base, 'jurisdiction', d.keyMechanisms.map((m) => `${m.title}. ${m.detail}`), entrySources);
		pushChunk(chunks, base, 'jurisdiction', d.autoRequirements.map((a) => `${a.item}. ${a.detail}`), entrySources);
	}

	for (const entry of corpus.examples) {
		const d = entry.data;
		const entrySources = idsOf(d.sourceIds);
		const base = {
			entryType: 'example' as const,
			slug: entry.id,
			title: d.title,
			path: `/examples/${entry.id}`,
			family: d.family,
			lines: d.lines,
			states: [],
			audience: d.family === 'commercial' ? 'business-owner' : 'individual',
			topics: d.lines,
			effectiveDate: d.lastReviewed,
			lastReviewed: d.lastReviewed,
			confidence: d.label === 'public-record' ? 'established' : 'contextual',
		};
		pushChunk(chunks, base, 'example', [d.whatHappened], entrySources);
		pushChunk(chunks, base, 'example', d.reasoningPath.split(/\n{2,}/), entrySources);
	}

	for (const entry of corpus.liveTools) {
		const d = entry.data;
		const base = {
			entryType: 'tool' as const,
			slug: entry.id,
			title: d.name,
			path: d.route || `/tools/${entry.id}`,
			family: d.family[0],
			lines: d.lines,
			states: [],
			audience: d.family.includes('commercial') ? 'business-owner' : 'individual',
			topics: d.lines,
			effectiveDate: d.lastReviewed,
			lastReviewed: d.lastReviewed,
			confidence: 'contextual',
		};
		pushChunk(chunks, base, 'tool', [d.summary, d.spec.output], idsOf(d.sourceIds));
	}

	// One chunk per module, not one per rule.
	//
	// A module is the thing a reader is most likely to be looking for now that
	// the instrument is the product, and until this it could not be found by the
	// lookup at all. It is deliberately one chunk carrying the module's own
	// summary and the names of what it asks about: indexing all 198 rules would
	// add several hundred chunks of near-identical governance prose and shift the
	// score distribution the retrieval floors are calibrated against.
	for (const entry of corpus.liveModules) {
		const d = entry.data;
		const base = {
			entryType: 'tool' as const,
			slug: entry.id,
			title: d.name,
			path: `/tools/${entry.id}`,
			family: d.family,
			lines: d.lines,
			states: [],
			audience: d.family === 'commercial' ? 'business-owner' : 'individual',
			topics: d.lines,
			effectiveDate: d.lastReviewed,
			lastReviewed: d.lastReviewed,
			confidence: 'contextual',
		};
		const groups = [...new Set(d.fields.map((f) => f.group))].join(', ');
		pushChunk(
			chunks,
			base,
			'tool',
			[d.summary, `What this module records: ${groups}.`],
			// A module has no sources of its own; its evidence is what its rules cite.
			[...new Set(d.rules.flatMap((r) => idsOf(r.sourceIds)))],
		);
	}

	return chunks;
}

export function buildSearchIndex(corpus: Corpus): SearchIndex {
	const aliases: SearchIndex['aliases'] = [];
	for (const q of corpus.questions) {
		aliases.push({ slug: q.id, entryType: 'question', text: q.data.question });
		for (const alias of q.data.aliases) aliases.push({ slug: q.id, entryType: 'question', text: alias });
	}
	for (const c of corpus.coverages) aliases.push({ slug: c.id, entryType: 'coverage', text: c.data.name });
	for (const c of corpus.companies) {
		aliases.push({ slug: c.id, entryType: 'company', text: c.data.legalName });
		aliases.push({ slug: c.id, entryType: 'company', text: c.data.shortName });
	}
	for (const s of corpus.states) aliases.push({ slug: s.id, entryType: 'state', text: s.data.name });
	return buildIndex(chunkCorpus(corpus), aliases, siteConfig.contentVersion);
}

/* ------------------------------------------------------------------ */
/* Freshness                                                           */
/* ------------------------------------------------------------------ */

/** A source is treated as stale once it passes its own review horizon. */
export const STALE_AFTER_DAYS = 400;

export function isStale(lastChecked: string, today: string): boolean {
	const a = Date.parse(`${lastChecked}T00:00:00Z`);
	const b = Date.parse(`${today}T00:00:00Z`);
	if (Number.isNaN(a) || Number.isNaN(b)) return false;
	return (b - a) / 86_400_000 > STALE_AFTER_DAYS;
}

/** Entries whose review date is most recent first. Used by RSS and the home band. */
export function recentlyReviewed(corpus: Corpus, limit = 12) {
	const items: Array<{ title: string; path: string; date: string; kind: string; summary: string }> = [];
	for (const q of corpus.questions) {
		items.push({ title: q.data.question, path: `/questions/${q.id}`, date: q.data.lastReviewed, kind: 'Question', summary: q.data.shortAnswer });
	}
	for (const c of corpus.coverages) {
		items.push({ title: c.data.name, path: `/insurance/${c.id}`, date: c.data.lastReviewed, kind: 'Coverage', summary: c.data.definition });
	}
	for (const c of corpus.companies) {
		items.push({ title: c.data.legalName, path: `/companies/${c.id}`, date: c.data.lastReviewed, kind: 'Organization', summary: c.data.summary });
	}
	for (const s of corpus.states) {
		items.push({ title: `${s.data.name} insurance context`, path: `/states/${s.id}`, date: s.data.lastReviewed, kind: 'State', summary: s.data.summary });
	}
	for (const e of corpus.examples) {
		items.push({ title: e.data.title, path: `/examples/${e.id}`, date: e.data.lastReviewed, kind: 'Example', summary: e.data.whatHappened });
	}
	for (const t of corpus.liveTools) {
		items.push({ title: t.data.name, path: t.data.route || `/tools/${t.id}`, date: t.data.lastReviewed, kind: 'Tool', summary: t.data.summary });
	}
	return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title))).slice(0, limit);
}


export interface CitingPage {
	title: string;
	path: string;
	kind: string;
}

/**
 * Every published page that depends on a given source.
 *
 * This lives here rather than inline on the source page because it was inline,
 * and it omitted modules. Twenty-three sources are cited only by module rules,
 * so twenty-three source pages were telling the reader that nothing cites them
 * while 198 rules did. A source's blast radius is the most useful thing on its
 * page and the easiest to get quietly wrong, so there is now one definition.
 */
export function citingPages(corpus: Corpus, sourceId: string): CitingPage[] {
	const out: CitingPage[] = [];
	const cites = (ids: Array<{ id: string } | string>) => idsOf(ids).includes(sourceId);

	for (const q of corpus.questions) {
		if (cites(q.data.sourceIds)) out.push({ title: q.data.question, path: `/questions/${q.id}`, kind: 'Question' });
	}
	for (const c of corpus.coverages) {
		if (cites(c.data.sourceIds)) out.push({ title: c.data.name, path: `/insurance/${c.id}`, kind: 'Coverage' });
	}
	for (const c of corpus.companies) {
		if (cites(c.data.sourceIds)) out.push({ title: c.data.legalName, path: `/companies/${c.id}`, kind: 'Organization' });
	}
	for (const st of corpus.states) {
		if (cites(st.data.sourceIds)) out.push({ title: st.data.name, path: `/states/${st.id}`, kind: 'State' });
	}
	for (const e of corpus.examples) {
		if (cites(e.data.sourceIds)) out.push({ title: e.data.title, path: `/examples/${e.id}`, kind: 'Example' });
	}
	for (const t of corpus.liveTools) {
		if (cites(t.data.sourceIds)) out.push({ title: t.data.name, path: t.data.route || '/tools', kind: 'Worksheet' });
	}
	// A module cites through its rules, so name the rules that depend on it. That
	// is more useful than naming the module: it says which check would change.
	for (const m of corpus.liveModules) {
		const rules = m.data.rules.filter((r) => cites(r.sourceIds));
		if (rules.length === 0) continue;
		out.push({
			title: `${m.data.name} (${rules.length} ${rules.length === 1 ? 'check' : 'checks'})`,
			path: `/tools/${m.id}`,
			kind: 'Module',
		});
	}
	return out;
}

/**
 * Reject a module whose rules break the boundary, before any page is written.
 *
 * This runs at build time for the same reason an unresolved citation marker
 * throws: a rule that states a verdict, cites a source nothing points at, reads
 * a field that does not exist, or compares a date to a value frozen at authoring
 * time should not be able to produce a page at all. The verify suite asserts the
 * same thing afterwards against the built output, which is a separate check and
 * not a substitute for this one.
 */
export function assertModulesValid(corpus: Corpus): void {
	const sourceIds = new Set(corpus.sources.map((s) => s.id));
	const questionSlugs = new Set(corpus.questions.map((q) => q.id));

	const problems = corpus.modules.flatMap((entry) => {
		// References arrive as { collection, id } objects; the validator works in ids.
		const module: ModuleDef = {
			...entry.data,
			moduleId: entry.id,
			rules: entry.data.rules.map((rule) => ({
				...rule,
				sourceIds: idsOf(rule.sourceIds),
				relatedQuestion: rule.relatedQuestion ? rule.relatedQuestion.id : null,
			})),
		};
		return validateModule(module, sourceIds, questionSlugs);
	});

	if (problems.length === 0) return;
	const lines = problems.map((x) => `  ${x.moduleId}/${x.ruleId}: ${x.problem}`);
	throw new Error(
		`${problems.length} module rule problem(s):\n` + lines.join(`\n`),
	);
}
