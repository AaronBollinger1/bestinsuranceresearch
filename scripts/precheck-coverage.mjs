/**
 * Fast pre-build check for coverage records and the sources they cite.
 *
 *   node --experimental-strip-types scripts/precheck-coverage.mjs [coverage-id ...]
 *
 * The full suite needs a build and takes minutes; this runs against the JSON in
 * src/content and catches the defects a drafter makes most often before the
 * build does: a marker not on sourceIds, a source id that does not exist, a
 * non-canonical line, non-ASCII text, a reviewed state an agent may not set,
 * selling language in claimMitigation, and a new source whose URL duplicates
 * an existing record. It is a convenience, not a gate: `npm run validate`
 * remains the proof.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalLine } from '../src/lib/lines.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');
const load = (name) =>
	fs
		.readdirSync(path.join(CONTENT, name))
		.filter((f) => f.endsWith('.json'))
		.map((f) => ({ id: f.slice(0, -5), data: JSON.parse(fs.readFileSync(path.join(CONTENT, name, f), 'utf8')) }));

const sources = load('sources');
const sourceIds = new Set(sources.map((s) => s.id));
const questionIds = new Set(load('questions').map((q) => q.id));
const coverages = load('coverages');
const wanted = process.argv.slice(2);
const targets = wanted.length ? coverages.filter((c) => wanted.includes(c.id)) : coverages;
const errors = [];
const warnings = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

for (const id of wanted) if (!coverages.some((c) => c.id === id)) fail(id, 'no such coverage file');

const BANNED_MITIGATION = [
	/\b(?:save|saves|saving|savings)\b/i,
	/\b(?:discount|credit|rebate)\b/i,
	/\b(?:lower|reduce|cut)s? (?:your |the )?(?:premium|rate|cost|price)\b/i,
	/\b(?:premium|rate) (?:reduction|decrease|drop)\b/i,
	/\b(?:guarantee|guaranteed|guarantees)\b/i,
	/\bwill (?:qualify|be covered|be eligible)\b/i,
];
const VERDICT = [/\bis covered\b/i, /\bis not covered\b/i, /\bbest\b/i, /\bcheapest\b/i, /\bmost reliable\b/i, /\beligible for\b/i];

for (const c of targets) {
	const d = c.data;
	const text = JSON.stringify(d);
	const bad = text.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
	if (bad) fail(c.id, `non-ASCII: ${[...new Set(bad)].join(' ')}`);
	if (!canonicalLine(d.line)) fail(c.id, `line ${d.line} is not canonical`);
	if (!['personal', 'commercial', 'life', 'health'].includes(d.family)) fail(c.id, `family ${d.family}`);
	if (d.reviewState === 'reviewed') fail(c.id, 'reviewState reviewed may only be set by the licensed reviewer');
	if ((d.definition ?? '').length < 80) fail(c.id, 'definition under 80 characters');
	for (const [field, min] of [['protects', 1], ['commonlyCovers', 2], ['commonlyExcludes', 2], ['limitsAndDeductibles', 1], ['underwritingInputs', 1], ['exposures', 3], ['claimMitigation', 3]]) {
		if (!Array.isArray(d[field]) || d[field].length < min) fail(c.id, `${field} needs at least ${min}`);
	}
	for (const field of ['exposures', 'claimMitigation']) {
		for (const e of d[field] ?? []) {
			if (e.note.length < 40) fail(c.id, `${field} "${e.item}" note under 40 characters`);
			if (!/\[S:[a-z0-9-]+\]/.test(`${e.item} ${e.note}`)) fail(c.id, `${field} "${e.item}" cites nothing`);
		}
	}
	for (const e of d.claimMitigation ?? []) {
		for (const re of BANNED_MITIGATION) {
			const m = `${e.item} ${e.note}`.match(re);
			if (m) fail(c.id, `claimMitigation "${e.item}" contains "${m[0]}"`);
		}
	}
	for (const re of VERDICT) {
		const m = text.match(re);
		if (m) warn(c.id, `verdict or ranking word "${m[0]}" (read the sentence; narrow it if it states a determination)`);
	}
	const declared = new Set(d.sourceIds ?? []);
	for (const s of declared) if (!sourceIds.has(s)) fail(c.id, `sourceIds names ${s}, which has no source file`);
	const markers = new Set([...text.matchAll(/\[S:([a-z0-9-]+)\]/g)].map((m) => m[1]));
	for (const m of markers) if (!declared.has(m)) fail(c.id, `marker [S:${m}] is not on sourceIds`);
	for (const s of declared) if (!markers.has(s)) warn(c.id, `sourceIds names ${s} but no sentence cites it`);
	for (const q of d.relatedQuestions ?? []) if (!questionIds.has(q)) fail(c.id, `relatedQuestions names ${q}, which does not exist`);
	for (const s of declared) {
		const src = sources.find((x) => x.id === s);
		if (!src) continue;
		const sd = src.data;
		const sbad = JSON.stringify(sd).match(/[^\x09\x0A\x0D\x20-\x7E]/g);
		if (sbad) fail(s, `source non-ASCII: ${[...new Set(sbad)].join(' ')}`);
		if (!Array.isArray(sd.claims) || sd.claims.length < 1) fail(s, 'source has no claims');
		if (sd.lastCheckedBasis === 'access' && sd.lastChecked !== sd.accessedDate) fail(s, 'access basis but lastChecked differs from accessedDate');
		if (sd.lastCheckedBasis === 'recheck' && !(sd.lastChecked > sd.accessedDate)) fail(s, 'recheck basis but lastChecked is not after accessedDate');
		if (sd.status !== 'active' && !sd.statusNote) fail(s, 'non-active source without statusNote');
	}
}

const byUrl = new Map();
for (const s of sources) {
	const key = s.data.url.trim().replace(/\.+$/, '').toLowerCase();
	byUrl.set(key, [...(byUrl.get(key) ?? []), s.id]);
}
for (const [url, ids] of byUrl) if (ids.length > 1) errors.push(`duplicate source URL ${url}: ${ids.join(', ')}`);

if (warnings.length) console.warn(`precheck-coverage: ${warnings.length} warning(s), read each sentence\n  ${warnings.join('\n  ')}`);
if (errors.length) {
	console.error(`precheck-coverage: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`);
	process.exit(1);
}
console.log(`precheck-coverage: ${targets.length} coverage record(s) clean`);
