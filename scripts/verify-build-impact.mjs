/**
 * Build-impact guard verification (COST-2).
 *
 * Four layers, each covering a distinct way the guard could go wrong:
 *
 *   1. Classification: every fixture case - positive and negative - classifies
 *      exactly as the table says, and the table covers every rule and class,
 *      so a rule cannot be added or widened without the table changing in the
 *      same diff.
 *   2. Decision: the pure decision function fails closed on every ambiguous
 *      branch - production target, release ref, missing base, unresolvable
 *      base, git failure, unknown path.
 *   3. Truthfulness: the skip-safe list claims those paths feed nothing. That
 *      claim is re-proven here against the actual source tree, so the day a
 *      page imports HANDOFF.md or reads docs/, this suite fails and the list
 *      must be corrected before anything goes green.
 *   4. Exit codes: the script is executed as a real child process in a scratch
 *      git repository and both exit codes are observed. Vercel's contract is
 *      exit 0 = skip, so a wiring mistake that stops main() from running would
 *      silently skip every deployment - the exact inversion of fail-closed -
 *      and only a process-level test can see it.
 *
 *   node --experimental-strip-types --test scripts/verify-build-impact.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { classifyPath, decideFromPaths, decide, SKIP_SAFE_RULES, BUILD_CLASSES } from './build-impact.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/build-impact/cases.json'), 'utf8'));

/* ------------------------------------------------------------------ */
/* 1. Classification against the fixture table                         */
/* ------------------------------------------------------------------ */

test('every fixture path classifies exactly as the table says', () => {
	assert.ok(FIXTURE.cases.length >= 30, `only ${FIXTURE.cases.length} cases; the table has stopped covering the classes`);
	for (const { path: p, expect } of FIXTURE.cases) {
		assert.equal(classifyPath(p), expect, `${p} classified as ${classifyPath(p)}, fixture expects ${expect}`);
	}
});

test('the fixture table covers every rule, every build class, and the unknown fallback', () => {
	const covered = new Set(FIXTURE.cases.map((c) => c.expect));
	for (const rule of SKIP_SAFE_RULES) {
		assert.ok(covered.has(`skip-safe:${rule.name}`), `no fixture exercises skip-safe rule ${rule.name}`);
	}
	for (const cls of BUILD_CLASSES) {
		assert.ok(covered.has(`build:${cls.name}`), `no fixture exercises build class ${cls.name}`);
	}
	assert.ok(covered.has('build:unknown'), 'no fixture exercises the fail-closed unknown fallback');
});

test('NEGATIVE: near-misses of skip-safe rules do not match them', () => {
	/* Anchoring failures are the classic way an allowlist widens silently. */
	assert.equal(classifyPath('src/docs/page.md'), 'build:app', 'docs/ must anchor at the root');
	assert.equal(classifyPath('src/HANDOFF.md'), 'build:app', 'root-doc must not match markdown under src/');
	assert.equal(classifyPath('a/.github/workflows/x.yml'), 'build:unknown', '.github/ must anchor at the root');
	assert.equal(classifyPath('outputs.ts'), 'build:unknown', 'outputs/ must not match a file merely named outputs');
	assert.equal(classifyPath('.gitignore-backup'), 'build:unknown', '.gitignore must match exactly');
});

/* ------------------------------------------------------------------ */
/* 2. Decision fail-closed branches                                     */
/* ------------------------------------------------------------------ */

const gitNever = () => {
	throw new Error('git must not be consulted on this branch');
};
const gitReturning = (paths) => (args) => {
	if (args[0] === 'rev-parse') return '';
	if (args[0] === 'diff') return paths.join('\n');
	throw new Error(`unexpected git call: ${args.join(' ')}`);
};

test('a production target always builds, before git is even consulted', () => {
	const verdict = decide({ VERCEL_ENV: 'production', BUILD_IMPACT_BASE: 'irrelevant' }, gitNever);
	assert.equal(verdict.build, true);
	assert.match(verdict.reason, /production/);
});

test('release-authority refs always build', () => {
	for (const ref of ['main', 'launch/initial-publication', 'release/anything']) {
		const verdict = decide({ VERCEL_GIT_COMMIT_REF: ref, BUILD_IMPACT_BASE: 'irrelevant' }, gitNever);
		assert.equal(verdict.build, true, `${ref} did not force a build`);
	}
});

test('no previous deployment SHA fails closed - the fork-PR and first-preview case', () => {
	/* A fork PR's first preview and a fresh branch both arrive with no base. */
	const verdict = decide({ VERCEL_GIT_COMMIT_REF: 'grok/some-feature' }, gitNever);
	assert.equal(verdict.build, true);
	assert.match(verdict.reason, /no previous deployment/);
});

test('an unresolvable base or a failing diff fails closed', () => {
	const revFails = () => {
		throw new Error('fatal: bad object');
	};
	assert.equal(decide({ BUILD_IMPACT_BASE: 'deadbeef' }, revFails).build, true);

	const diffFails = (args) => {
		if (args[0] === 'rev-parse') return '';
		throw new Error('fatal: ambiguous argument');
	};
	assert.equal(decide({ BUILD_IMPACT_BASE: 'deadbeef' }, diffFails).build, true);
});

test('docs-only changes skip; anything mixed with a build input builds', () => {
	const docsOnly = decide({ BUILD_IMPACT_BASE: 'abc' }, gitReturning(['HANDOFF.md', 'docs/BIRCH-DIRECTION-20260917.md', '.github/workflows/verify.yml']));
	assert.equal(docsOnly.build, false, docsOnly.reason);

	const mixed = decide({ BUILD_IMPACT_BASE: 'abc' }, gitReturning(['HANDOFF.md', 'src/pages/index.astro']));
	assert.equal(mixed.build, true);
	assert.match(mixed.reason, /src\/pages\/index\.astro/);
});

test('each build-input class alone forces a build', () => {
	for (const p of [
		'package-lock.json',
		'astro.config.mjs',
		'vercel.json',
		'src/content/sources/anything.json',
		'src/content.config.ts',
		'src/pages/anything.astro',
		'src/components/anything.astro',
		'src/lib/graph/ids.ts',
		'scripts/verify.mjs',
		'planning/birch-question-catalog.ndjson',
		'public/dataset/2026-09-01/claims.jsonl',
		'commons/src/pages/index.astro',
		'entirely-new-thing.xyz',
	]) {
		assert.equal(decideFromPaths([p]).build, true, `${p} alone did not force a build`);
	}
});

test('an empty diff between resolvable commits skips, because the trees are identical', () => {
	assert.equal(decideFromPaths([]).build, false);
	assert.equal(decide({ BUILD_IMPACT_BASE: 'abc' }, gitReturning([])).build, false);
});

/* ------------------------------------------------------------------ */
/* 3. The skip-safe list stays truthful against the real tree           */
/* ------------------------------------------------------------------ */

test('nothing under src/ or astro.config.mjs reads the skip-safe directories or root markdown', () => {
	/*
	 * The rule being protected: skip-safe paths feed nothing. Route strings like
	 * "/design/account-preview" are fine - only relative traversal out of src/
	 * into a skip-safe location is a violation.
	 */
	const suspicious = [/\.\.\/(\.\.\/)*(docs|outputs|design)\//, /\.\.\/(\.\.\/)*[^'"\s/]+\.md\b/];
	const files = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (/\.(astro|ts|tsx|mjs|js)$/.test(entry.name)) files.push(full);
		}
	};
	walk(path.join(ROOT, 'src'));
	files.push(path.join(ROOT, 'astro.config.mjs'));

	assert.ok(files.length > 100, `only ${files.length} files scanned; the walk has stopped covering src/`);
	for (const file of files) {
		const text = fs.readFileSync(file, 'utf8');
		for (const pattern of suspicious) {
			assert.ok(!pattern.test(text), `${path.relative(ROOT, file)} references a skip-safe path (${pattern}); the skip-safe list in build-impact.mjs is no longer truthful`);
		}
	}
});

test('the guard is wired: vercel.json names it and npm run verify includes this suite', () => {
	const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
	assert.equal(vercel.ignoreCommand, 'node scripts/build-impact.mjs', 'vercel.json does not run the guard, so every commit deploys');
	const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
	assert.match(pkg.scripts.verify, /verify-build-impact\.mjs/, 'npm run verify does not run this suite, so the guard is unprotected');
});

/* ------------------------------------------------------------------ */
/* 4. Exit codes, observed on the real process in a scratch repository  */
/* ------------------------------------------------------------------ */

test('the executed script skips docs-only, builds src changes, and fails closed on a bad base', () => {
	const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'build-impact-'));
	const git = (...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: repo, encoding: 'utf8' });
	try {
		git('init', '-q');
		fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
		fs.mkdirSync(path.join(repo, 'scripts'), { recursive: true });
		/* The script itself is copied in, so the relative-argv invocation below tests the shipped file byte-for-byte. */
		fs.copyFileSync(path.join(ROOT, 'scripts/build-impact.mjs'), path.join(repo, 'scripts/build-impact.mjs'));
		fs.writeFileSync(path.join(repo, 'src/app.ts'), 'export const a = 1;\n');
		fs.writeFileSync(path.join(repo, 'README.md'), 'base\n');
		git('add', '-A');
		git('commit', '-q', '-m', 'base');
		const base = git('rev-parse', 'HEAD').trim();

		const runGuard = (envOverrides) => {
			/* A minimal environment, so a VERCEL_* variable in the test runner's own environment cannot leak in. */
			const env = { PATH: process.env.PATH, HOME: process.env.HOME, ...envOverrides };
			return spawnSync(process.execPath, ['scripts/build-impact.mjs'], { cwd: repo, env, encoding: 'utf8' });
		};

		/* Docs-only change on a feature ref with a sound base: the one legitimate skip. */
		fs.writeFileSync(path.join(repo, 'README.md'), 'docs-only change\n');
		git('commit', '-aqm', 'docs');
		const skip = runGuard({ BUILD_IMPACT_BASE: base, VERCEL_GIT_COMMIT_REF: 'grok/feature' });
		assert.equal(skip.status, 0, `expected exit 0 (skip), got ${skip.status}: ${skip.stdout}${skip.stderr}`);
		assert.match(skip.stdout, /SKIP/);

		/* A src change from the same base must build. */
		fs.writeFileSync(path.join(repo, 'src/app.ts'), 'export const a = 2;\n');
		git('commit', '-aqm', 'src');
		const build = runGuard({ BUILD_IMPACT_BASE: base, VERCEL_GIT_COMMIT_REF: 'grok/feature' });
		assert.equal(build.status, 1, `expected exit 1 (build), got ${build.status}: ${build.stdout}${build.stderr}`);
		assert.match(build.stdout, /BUILD/);

		/* Fail-closed branches, observed at the process level. */
		assert.equal(runGuard({ BUILD_IMPACT_BASE: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }).status, 1, 'an unresolvable base must build');
		assert.equal(runGuard({}).status, 1, 'no base must build');
		assert.equal(runGuard({ VERCEL_ENV: 'production', BUILD_IMPACT_BASE: base }).status, 1, 'production must always build');
		assert.equal(runGuard({ BUILD_IMPACT_BASE: base, VERCEL_GIT_COMMIT_REF: 'launch/initial-publication' }).status, 1, 'the launch authority must always build');
	} finally {
		fs.rmSync(repo, { recursive: true, force: true });
	}
});
