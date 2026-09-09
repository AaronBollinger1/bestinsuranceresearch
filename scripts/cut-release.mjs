/**
 * Cut a dated, frozen release of the claim corpus.
 *
 *   node scripts/cut-release.mjs             # cut today's release
 *   node scripts/cut-release.mjs 2026-09-09  # cut a named release
 *   node scripts/cut-release.mjs --force     # overwrite one that exists
 *
 * Why this exists, since /claims.json already publishes the whole corpus.
 *
 * /claims.json is a live endpoint. It is regenerated on every build, it carries
 * a `generatedFor` stamp that changes daily whether or not a word moved, and it
 * has no identity beyond the URL. A paper, a dataset registry or somebody
 * else's tool cannot cite it: "we used the BestInsurance Research claim index"
 * names nothing that can be fetched again and compared. That is the difference
 * between being downloadable and being citable, and only the second one is the
 * goal in DIRECTION.md.
 *
 * So a release is frozen bytes. This script writes them into public/ once, they
 * are committed, and nothing regenerates them afterwards - not a rebuild, not a
 * correction, not a later run of this script at a different date. When the
 * corpus changes, the honest move is a new release beside the old one, never an
 * edit to a release somebody may already have cited.
 *
 * That immutability is the whole value, so scripts/verify.mjs asserts it two
 * ways: the manifest digests must match the bytes on disk, and every checksum
 * in the release must be reproducible from the release's own claim text. The
 * second one is what keeps this script and claimChecksum() in src/lib/machine.ts
 * from silently drifting apart, without forcing a frozen release to track a
 * corpus that has moved on.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');
const DATASET = path.join(ROOT, 'public/dataset');

const ORIGIN = 'https://bestinsuranceresearch.com';

/** The shape of a release. Bumped when a consumer would have to change code. */
const SCHEMA_VERSION = 1;

const args = process.argv.slice(2);
const force = args.includes('--force');
const named = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const release = named || new Date().toISOString().slice(0, 10);

/**
 * Must stay identical to claimChecksum() in src/lib/machine.ts, which is what
 * every claim address on the site publishes. verify.mjs holds the two to the
 * same answer rather than trusting this comment.
 */
const checksum = (text) => createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function collection(name) {
	const dir = path.join(CONTENT, name);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.sort()
		.map((f) => ({
			id: f.replace(/\.json$/, ''),
			data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
		}));
}

const tally = (values) => {
	const out = {};
	for (const v of values) out[v] = (out[v] ?? 0) + 1;
	return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};

const sources = collection('sources');
if (sources.length === 0) {
	console.error('No sources found. Run this from the repository root.');
	process.exit(1);
}

/* ------------------------------------------------------------------ */
/* The claim table                                                     */
/* ------------------------------------------------------------------ */

/*
 * Claim addressing is positional: /sources/<id>#c3 is the third claim in the
 * array and always will be. Claims are appended, never inserted, so an address
 * cut into a release stays pointing at the sentence it was cut for.
 */
const claims = sources.flatMap((source) =>
	source.data.claims.map((text, i) => ({
		claimId: `${source.id}#c${i + 1}`,
		url: `${ORIGIN}/sources/${source.id}#c${i + 1}`,
		checksum: checksum(text),
		sourceId: source.id,
		text,
	})),
);

/*
 * JSONL rather than one JSON array, because the consumers this release is for
 * stream it: a line is a record, a record is a claim, and nothing has to hold
 * 1,900 objects in memory or parse the file to count it.
 */
const claimsJsonl = `${claims.map((c) => JSON.stringify(c)).join('\n')}\n`;

/* ------------------------------------------------------------------ */
/* The source registry                                                 */
/* ------------------------------------------------------------------ */

/*
 * lastCheckedBasis is carried deliberately, and it is the field a consumer
 * should read first. 'access' means somebody read the document once on
 * accessedDate. 'recheck' means somebody returned to it and compared the
 * operative language against what we recorded. A corpus that publishes only
 * lastChecked reads as uniformly verified; publishing the basis is what stops
 * this release from overstating itself.
 */
const sourceRows = sources.map(({ id, data: d }) => ({
	id,
	title: d.title,
	publisher: d.publisher,
	url: d.url,
	recordUrl: `${ORIGIN}/sources/${id}`,
	officialHost: d.officialHost,
	sourceType: d.sourceType,
	authorityLevel: d.authorityLevel,
	primary: d.primary,
	jurisdiction: d.jurisdiction,
	publishedDate: d.publishedDate,
	effectiveDate: d.effectiveDate,
	accessedDate: d.accessedDate,
	lastChecked: d.lastChecked,
	lastCheckedBasis: d.lastCheckedBasis,
	updateCadence: d.updateCadence,
	status: d.status,
	...(d.statusNote ? { statusNote: d.statusNote } : {}),
	...(d.supersededBy ? { supersededBy: d.supersededBy.id } : {}),
	...(d.archive ? { archive: d.archive } : {}),
	claimCount: d.claims.length,
}));

const sourcesJson = `${JSON.stringify(
	{
		release,
		schemaVersion: SCHEMA_VERSION,
		count: sourceRows.length,
		sources: sourceRows,
	},
	null,
	2,
)}\n`;

/* ------------------------------------------------------------------ */
/* Review posture                                                      */
/* ------------------------------------------------------------------ */

/*
 * A release that did not state its own review posture would be the single most
 * misleading thing this site publishes: a clean machine-readable corpus reads
 * as a verified one. Every collection carrying a reviewState is counted here,
 * so a consumer sees the sign-off position before they cite anything.
 */
const REVIEWABLE = [
	'questions',
	'coverages',
	'companies',
	'states',
	'examples',
	'modules',
	'cross-rules',
	'figures',
	'tools',
];

const reviewStates = [];
for (const name of REVIEWABLE) {
	for (const entry of collection(name)) {
		if (entry.data.reviewState) reviewStates.push(entry.data.reviewState);
	}
}

const rechecked = sourceRows.filter((s) => s.lastCheckedBasis === 'recheck').length;

/* ------------------------------------------------------------------ */
/* What moved since the last release                                   */
/* ------------------------------------------------------------------ */

function priorReleases() {
	if (!fs.existsSync(DATASET)) return [];
	return fs
		.readdirSync(DATASET, { withFileTypes: true })
		.filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
		.map((e) => e.name)
		.filter((v) => v < release)
		.sort();
}

/*
 * A checksum change is a corrected claim, and it is the interesting row. An
 * added claim is ordinary growth; a removed one needs explaining, which is why
 * the identifiers are listed rather than only counted.
 */
function changesSince(previous) {
	if (!previous) return null;
	const file = path.join(DATASET, previous, 'claims.jsonl');
	if (!fs.existsSync(file)) return null;
	const before = new Map();
	for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
		if (!line.trim()) continue;
		const row = JSON.parse(line);
		before.set(row.claimId, row.checksum);
	}
	const now = new Map(claims.map((c) => [c.claimId, c.checksum]));
	const added = [...now.keys()].filter((id) => !before.has(id));
	const removed = [...before.keys()].filter((id) => !now.has(id));
	const changed = [...now.entries()]
		.filter(([id, sum]) => before.has(id) && before.get(id) !== sum)
		.map(([id]) => id);
	return {
		previousRelease: previous,
		addedCount: added.length,
		changedCount: changed.length,
		removedCount: removed.length,
		changed,
		removed,
		note:
			'A changed claim is one whose text was corrected, so its checksum no longer matches the ' +
			'earlier release. A citation carrying the earlier checksum is still a valid citation of ' +
			'what we published then; it is how a reader tells that the sentence has since moved.',
	};
}

const prior = priorReleases();
const previous = prior.length ? prior[prior.length - 1] : null;

/* ------------------------------------------------------------------ */
/* Write it                                                            */
/* ------------------------------------------------------------------ */

const dir = path.join(DATASET, release);
if (fs.existsSync(dir) && !force) {
	console.error(
		`Release ${release} already exists. A release is frozen once published: cut a new one, or ` +
			'pass --force only if it has never been committed.',
	);
	process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });

const files = [
	{
		name: 'claims.jsonl',
		body: claimsJsonl,
		encodingFormat: 'application/x-ndjson',
		description:
			'Every recorded claim, one JSON object per line: its stable address, the checksum over ' +
			'its exact text, the source that supports it, and the sentence itself.',
	},
	{
		name: 'sources.json',
		body: sourcesJson,
		encodingFormat: 'application/json',
		description:
			'The source registry as it stood at this release, including the dates each document was ' +
			'read and whether it has been returned to since.',
	},
];

for (const f of files) fs.writeFileSync(path.join(dir, f.name), f.body);

const manifest = {
	release,
	schemaVersion: SCHEMA_VERSION,
	name: `BestInsurance Research claim corpus, release ${release}`,
	description:
		`${claims.length} individually recorded claims across ${sources.length} source records. Each ` +
		'claim is one sentence stating exactly what one source supports and nothing beyond it, with a ' +
		'stable address and a checksum over its exact text. Contains no ratings, rankings, prices, ' +
		'premiums, quotes, carrier appetite claims, coverage determinations, eligibility verdicts, ' +
		'risk scores, or personal data.',
	datePublished: release,
	documentation: `${ORIGIN}/dataset`,
	publisher: {
		name: 'BestInsurance Research',
		operator: 'WJB Services, Inc. dba Bollinsure Insurance Services',
		license: '6013787',
		licenseAuthority: 'California Department of Insurance',
	},
	license:
		'Records may be quoted and redistributed with attribution and a link to the canonical URL. ' +
		'Cite the underlying source in preference to us wherever the underlying source will do.',
	isAccessibleForFree: true,
	immutability:
		'This release is frozen. Its bytes will not change. A correction to the corpus appears in the ' +
		'next release rather than in this one, so a citation to this release stays checkable.',
	counts: {
		claims: claims.length,
		sources: sources.length,
		primarySources: sources.filter((s) => s.data.primary).length,
		onOfficialHost: sources.filter((s) => s.data.officialHost).length,
		byAuthorityLevel: tally(sources.map((s) => s.data.authorityLevel)),
		bySourceType: tally(sources.map((s) => s.data.sourceType)),
		byJurisdiction: tally(sources.map((s) => s.data.jurisdiction)),
		byStatus: tally(sources.map((s) => s.data.status)),
	},
	/*
	 * Stated as a count of what has and has not been signed off, not as a
	 * quality claim. Nothing in this corpus has been through licensed review
	 * yet, and a release that let a consumer assume otherwise would be trading
	 * on a verification that has not happened.
	 */
	reviewStatus: {
		...tally(reviewStates),
		recordsWithReviewState: reviewStates.length,
		note:
			'reviewState is the record-level sign-off position. "reviewed" means a licensed reviewer ' +
			'has signed the record off; "under-review" means it is written and cited but not yet ' +
			'signed off; "corrected" means a published error was fixed and the change is logged at ' +
			`${ORIGIN}/corrections.`,
	},
	verification: {
		sourcesRechecked: rechecked,
		sourcesReadOnce: sourceRows.length - rechecked,
		note:
			'lastCheckedBasis on each source row is the field to read. "access" means the document was ' +
			'read once on accessedDate. "recheck" means somebody returned to it and compared the ' +
			'operative language against the recorded claim.',
	},
	files: files.map((f) => {
		const body = Buffer.from(f.body, 'utf8');
		return {
			name: f.name,
			url: `${ORIGIN}/dataset/${release}/${f.name}`,
			encodingFormat: f.encodingFormat,
			bytes: body.length,
			sha256: sha256(body),
			description: f.description,
		};
	}),
	citation: {
		text:
			`BestInsurance Research. "Claim corpus, release ${release}." ${ORIGIN}/dataset/${release}/. ` +
			`${claims.length} claims across ${sources.length} sources.`,
		note:
			'Cite an individual claim by its own address and checksum from claims.jsonl. Cite the ' +
			'release when you are describing the corpus as a whole, or when your result depends on ' +
			'which version of it you read.',
	},
	mayNotBeInferred: [
		'That a claim describes the policy the reader holds. It describes the source named.',
		'That we have determined coverage or eligibility. We publish no such determination.',
		'That we endorse, rate, rank, or price any insurer, or state the appetite of any carrier.',
		'That a claim is current merely because it appears here. Read status and lastChecked.',
		"That a line works the same way in the reader's jurisdiction. Read byJurisdiction: this " +
			'corpus is concentrated, and a jurisdiction missing from it is one we hold no source for ' +
			'rather than one where the rule matches.',
		'That the corpus has been through licensed review. Read reviewStatus.',
	],
	changesSince: changesSince(previous),
};

fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

/*
 * The index is rebuilt from the manifests on disk rather than appended to, so
 * it cannot describe a release that is not there. It is the one file in
 * public/dataset that is allowed to change when a new release is cut.
 */
const all = fs
	.readdirSync(DATASET, { withFileTypes: true })
	.filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
	.map((e) => e.name)
	.sort()
	.reverse();

const index = {
	name: 'BestInsurance Research claim corpus',
	documentation: `${ORIGIN}/dataset`,
	about:
		'Dated, frozen releases of the claim corpus. Each release is immutable: cite one by its date ' +
		'and your citation stays checkable. The live, always-current index is at ' +
		`${ORIGIN}/claims.json, which is deliberately not versioned and should not be cited as a ` +
		'dataset.',
	latest: all[0],
	releases: all.map((v) => {
		const m = JSON.parse(fs.readFileSync(path.join(DATASET, v, 'manifest.json'), 'utf8'));
		return {
			release: v,
			url: `${ORIGIN}/dataset/${v}/manifest.json`,
			schemaVersion: m.schemaVersion,
			datePublished: m.datePublished,
			claims: m.counts.claims,
			sources: m.counts.sources,
			files: m.files.map((f) => ({ name: f.name, url: f.url, bytes: f.bytes, sha256: f.sha256 })),
		};
	}),
};

fs.writeFileSync(path.join(DATASET, 'releases.json'), `${JSON.stringify(index, null, 2)}\n`);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`Cut release ${release}`);
for (const f of manifest.files) console.log(`  ${f.name.padEnd(14)} ${kb(f.bytes)}  ${f.sha256.slice(0, 16)}`);
console.log(`  ${claims.length} claims, ${sources.length} sources, ${rechecked} rechecked`);
if (manifest.changesSince) {
	const c = manifest.changesSince;
	console.log(`  since ${c.previousRelease}: +${c.addedCount} added, ${c.changedCount} changed, ${c.removedCount} removed`);
} else {
	console.log('  initial release, nothing to compare against');
}
