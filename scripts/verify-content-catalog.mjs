import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_LINES } from '../src/lib/lines.ts';

const ROOT = process.cwd();
const readJson = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const readNdjson = (file) => readFileSync(join(ROOT, file), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const fail = (message) => { throw new Error(`Content catalog verification failed: ${message}`); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const manifest = readJson('planning/birch-content-master-manifest.json');
const companyUniverse = readJson('planning/birch-company-page-universe.json');
const questions = readNdjson('planning/birch-question-catalog.ndjson');

if (manifest.status !== 'planning-only') fail('the master manifest must remain planning-only');
if (companyUniverse.status !== 'planning-only') fail('the company universe must remain planning-only');
if (manifest.questionCandidateCount !== questions.length) fail('manifest question count does not match NDJSON rows');
if (manifest.canonicalLineCount !== CANONICAL_LINES.length) fail('manifest line count drifted from src/lib/lines.ts');
if (manifest.jurisdictionCount !== new Set(questions.map((row) => row.jurisdictionCode).filter(Boolean)).size) fail('jurisdiction count does not match rows');

const ids = new Set();
const titles = new Set();
const familyCounts = {};
const lineIds = new Set(CANONICAL_LINES);
const jurisdictionCodes = new Set();
for (const row of questions) {
	if (ids.has(row.id)) fail(`duplicate candidate id: ${row.id}`);
	ids.add(row.id);
	if (titles.has(row.question)) fail(`duplicate candidate question: ${row.question}`);
	titles.add(row.question);
	familyCounts[row.inventoryFamily] = (familyCounts[row.inventoryFamily] || 0) + 1;
	if (row.lineId && !lineIds.has(row.lineId)) fail(`unknown canonical line: ${row.lineId}`);
	if (row.jurisdictionCode) jurisdictionCodes.add(row.jurisdictionCode);
	if (row.status !== 'candidate' || row.publishable !== false || row.publicRoute !== null) fail(`candidate ${row.id} is not safely unpublished`);
	if (row.sourceIds.length !== 0 || row.lastChecked !== null) fail(`candidate ${row.id} has source or review state before research`);
	if (!row.reviewGates.includes('licensed-insurance-reviewer')) fail(`candidate ${row.id} is missing licensed review gate`);
	if (!row.reviewGates.includes('compliance-and-conflicts')) fail(`candidate ${row.id} is missing compliance gate`);
	if (!row.decisionNote.includes('Do not render, index, answer, or publish')) fail(`candidate ${row.id} has a weak publication boundary`);
}

if (!same(manifest.questionCandidateFamilies, familyCounts)) fail('family counts do not match the generated rows');
if (jurisdictionCodes.size !== manifest.jurisdictionCount) fail('jurisdiction rows are not unique');

const companyIds = new Set();
for (const family of companyUniverse.families) {
	if (companyIds.has(family.id)) fail(`duplicate company family id: ${family.id}`);
	companyIds.add(family.id);
	if (!['P0', 'P1', 'P2'].includes(family.priority)) fail(`invalid company family priority: ${family.id}`);
	if (!family.inclusion || !family.pageRole) fail(`company family ${family.id} is missing inclusion or page role`);
}
if (manifest.companyPageFamilyCount !== companyUniverse.families.length) fail('company family count does not match universe');
if (new Set(companyUniverse.existingBirchRecords).size !== companyUniverse.existingBirchRecords.length) fail('existing company records are duplicated');

console.log(JSON.stringify({
	status: 'ok',
	questionCandidates: questions.length,
	questionFamilies: familyCounts,
	canonicalLines: manifest.canonicalLineCount,
	jurisdictions: manifest.jurisdictionCount,
	companyPageFamilies: companyUniverse.families.length,
	existingCompanyRecords: companyUniverse.existingBirchRecords.length,
}, null, 2));
