import type { APIRoute } from 'astro';
import { siteConfig, isPreview } from '../config/site';
import { loadCorpus } from '../lib/corpus';
import { latestManifest } from '../lib/releases';
import { TODAY } from '../lib/today';

export const prerender = true;

const abs = (path: string) => new URL(path, siteConfig.origin).toString();

export const GET: APIRoute = async () => {
	const corpus = await loadCorpus();
	const release = latestManifest();
	const claims = corpus.sources.reduce((count, source) => count + source.data.claims.length, 0);

	const manifest = {
		format: 'Birch Research citation manifest',
		formatVersion: '1.0',
		note: 'A Birch-specific discovery contract, not an external standard.',
		generated: TODAY,
		identity: {
			name: siteConfig.name,
			shortName: siteConfig.brandName,
			canonicalOrigin: siteConfig.origin,
			description: siteConfig.description,
			publisher: {
				legalName: siteConfig.operator.legalName,
				dba: siteConfig.operator.dba,
				licenseAuthority: siteConfig.operator.licenseAuthority,
				agencyLicense: siteConfig.operator.agencyLicense,
			},
		},
		access: {
			environment: siteConfig.environment,
			indexing: !isPreview && siteConfig.indexingOpen ? 'open' : 'closed',
			publicCommons: siteConfig.communityReady ? 'open' : 'closed',
		},
		corpus: {
			contentVersion: siteConfig.contentVersion,
			questions: corpus.questions.length,
			coveragePages: corpus.coverages.length,
			organizations: corpus.companies.length,
			states: corpus.states.length,
			sourceRecords: corpus.sources.length,
			claims,
			latestFrozenRelease: release?.release ?? null,
		},
		discovery: {
			guide: abs('/for-ai'),
			llms: abs('/llms.txt'),
			fullCorpusIndex: abs('/llms-full.txt'),
			claimIndex: abs('/claims.json'),
			searchIndex: abs('/search-index.json'),
			datasetReleases: abs('/dataset/releases.json'),
			changeFeed: abs('/changed.json'),
			rss: abs('/rss.xml'),
			sitemap: abs('/sitemap-index.xml'),
		},
		citation: {
			preferredUnit: 'An individually recorded, source-linked claim.',
			claimAddressPattern: `${siteConfig.origin}/sources/<source-id>#c<number>`,
			pageCompanionPattern: `${siteConfig.origin}/<canonical-path>.json`,
			attribution: 'Keep the canonical URL, dates, confidence or review state, and material hedges.',
			primarySourceRule: 'Prefer the underlying primary source when it directly supports the statement.',
			frozenReleaseRule: 'Use a dated dataset release when the cited bytes must remain reproducible.',
		},
		editorial: {
			methodology: abs('/methodology'),
			policy: abs('/editorial-policy'),
			corrections: abs('/corrections'),
			reviewQueue: abs('/review-queue'),
			authors: siteConfig.operator.peopleSlugs.map((slug) => abs(`/authors/${slug}`)),
		},
		boundaries: [
			'General information only; not individualized insurance, legal, tax, medical, lending, investment, or claims advice.',
			'No coverage determination, eligibility verdict, price, quote, carrier appetite claim, rating, ranking, or risk score.',
			'Drafts and under-review records must not be represented as licensed-review-approved publication.',
			'A guide and its coverage page may expose the same evidence and must not be counted as independent sources.',
		],
	};

	return new Response(JSON.stringify(manifest, null, 2), {
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
	});
};
