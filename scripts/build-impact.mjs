/**
 * Deterministic Vercel build-impact guard (COST-2).
 *
 * Vercel runs this as `ignoreCommand`. Exit code semantics are Vercel's:
 *
 *   exit 0  -> the deployment is SKIPPED
 *   exit 1  -> the build PROCEEDS
 *
 * So the fail-closed direction is exit 1, and every ambiguous branch below
 * takes it: no base commit, an unresolvable base in a shallow clone, a git
 * failure, a path this file has never heard of - all of them build. The only
 * way to skip is to prove that every changed path is in the explicit
 * skip-safe list, and that list contains nothing the site serves, imports,
 * or builds from.
 *
 * WHAT IS SKIP-SAFE, AND HOW THAT WAS ESTABLISHED
 *
 * The skip classes are documentation and evidence directories that were each
 * verified against the repository before being listed: no file under src/,
 * astro.config.mjs, or the verify scripts imports or reads them, and none of
 * them is served. `scripts/verify-build-impact.mjs` re-verifies that claim on
 * every run - if a page ever starts importing a root markdown file or reading
 * docs/, the truthfulness test fails and this list must be corrected before
 * the suite goes green again.
 *
 * WHAT IS DELIBERATELY NOT SKIP-SAFE
 *
 *   - planning/** looks like documentation and is not: catalog:verify reads
 *     all three files in it, so it is a validation input.
 *   - redirect-plan.json is a generated planning artifact, but it is cheap to
 *     be wrong about a root-level JSON file, so it builds.
 *   - .nvmrc / .npmrc would change the toolchain a build runs under.
 *   - commons/** may be the build input of a second Vercel project rooted
 *     there; this repository cannot see project settings, so it builds.
 *   - Anything unknown. A new top-level directory builds until a reviewed
 *     change to this file says otherwise.
 *
 * This guard never runs the suite and never suppresses one. CI runs the full
 * suite on every push and pull request regardless of what this file decides;
 * the only thing skipped is the Vercel deployment of an artifact that could
 * not have changed.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/**
 * Paths that cannot change the served artifact, the build toolchain, or any
 * validation input. Root-anchored regular expressions over repo-relative
 * paths. Order does not matter; first match wins only for reporting.
 */
export const SKIP_SAFE_RULES = [
	{ name: 'root-doc', why: 'root-level markdown documentation; imported by nothing (asserted by verify-build-impact)', test: /^[^/]+\.md$/ },
	{ name: 'docs', why: 'handoff documents; imported by nothing (asserted by verify-build-impact)', test: /^docs\// },
	{ name: 'outputs', why: 'screenshots and audit evidence; served and imported by nothing', test: /^outputs\// },
	{ name: 'design-mockups', why: 'design mockups; distinct from the /design routes under src/pages', test: /^design\// },
	{ name: 'github', why: 'CI definitions; they select checks and are not a build input', test: /^\.github\// },
	{ name: 'editor-config', why: 'editor and agent settings', test: /^\.(vscode|claude)\// },
	{ name: 'gitignore', why: 'affects what git tracks, not what the build reads', test: /^\.gitignore$/ },
];

/**
 * Named build-input classes, for the decision line this prints. These do not
 * decide anything - everything that is not skip-safe builds - but a decision
 * that names its class is checkable against the fixture table.
 */
export const BUILD_CLASSES = [
	{ name: 'dependency', test: /^(package\.json|package-lock\.json|\.npmrc|\.nvmrc)$/ },
	{ name: 'config', test: /^(astro\.config\.mjs|tsconfig\.json|vercel\.json)$/ },
	{ name: 'content', test: /^src\/content\// },
	{ name: 'app', test: /^src\// },
	{ name: 'served-asset', test: /^public\// },
	{ name: 'script', test: /^scripts\// },
	{ name: 'validation-input', test: /^planning\// },
	{ name: 'commons', test: /^commons\// },
];

/** 'skip-safe:<rule>' or 'build:<class>'. Unknown paths are 'build:unknown'. */
export function classifyPath(path) {
	for (const rule of SKIP_SAFE_RULES) if (rule.test.test(path)) return `skip-safe:${rule.name}`;
	for (const cls of BUILD_CLASSES) if (cls.test.test(path)) return `build:${cls.name}`;
	return 'build:unknown';
}

/**
 * Pure decision over a changed-path list. An empty list means the two trees
 * are identical, which is the one case where skipping needs no path argument.
 */
export function decideFromPaths(paths) {
	if (paths.length === 0) return { build: false, reason: 'no changed paths: the trees are identical' };
	for (const path of paths) {
		const cls = classifyPath(path);
		if (cls.startsWith('build:')) return { build: true, reason: `${path} is a build input (${cls})` };
	}
	return { build: false, reason: `all ${paths.length} changed path(s) are skip-safe documentation or evidence` };
}

/**
 * The full decision, with the environment and git injected so the verifier
 * can drive every branch without a Vercel account or a network.
 *
 * `git(args)` must return stdout as a string or throw.
 */
export function decide(env, git) {
	if (env.VERCEL_ENV === 'production') {
		return { build: true, reason: 'production target: a production authority always builds' };
	}
	const ref = env.VERCEL_GIT_COMMIT_REF ?? '';
	if (ref.startsWith('autopilot/')) {
		return { build: false, reason: `ref ${ref} is an autopilot lane: local preview only, never deploys` };
	}
	if (ref === 'main' || ref.startsWith('launch/') || ref.startsWith('release/')) {
		return { build: true, reason: `ref ${ref} is a release authority and always builds` };
	}

	/*
	 * The base is the commit of the previous deployment on this branch and
	 * target. A fork PR's first preview, a new branch, or a project with no
	 * prior deployment has none - and without a base there is nothing sound to
	 * diff against, so those all build. BUILD_IMPACT_BASE exists for the test
	 * harness and for a person reproducing a decision locally.
	 */
	const base = env.BUILD_IMPACT_BASE || env.VERCEL_GIT_PREVIOUS_SHA;
	if (!base) return { build: true, reason: 'no previous deployment SHA: nothing sound to diff against' };

	let paths;
	try {
		git(['rev-parse', '--verify', '--quiet', `${base}^{commit}`]);
		const out = git(['diff', '--name-only', base, 'HEAD']);
		paths = out.split('\n').map((line) => line.trim()).filter(Boolean);
	} catch (error) {
		return { build: true, reason: `git could not resolve or diff ${base} (${error?.message?.split('\n')[0] ?? 'unknown error'}): failing closed` };
	}

	return decideFromPaths(paths);
}

function realGit(args) {
	return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/*
 * argv[1] is relative when Vercel invokes `node scripts/build-impact.mjs`, so
 * it must be resolved before comparing - a bare string comparison would never
 * match, main() would never run, and every deployment would exit 0 and be
 * skipped. That is the exact inversion of fail-closed, which is why the
 * verifier executes this file as a child process and asserts both exit codes
 * rather than trusting the module boundary.
 */
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
	const verdict = decide(process.env, realGit);
	console.log(`build-impact: ${verdict.build ? 'BUILD' : 'SKIP'} - ${verdict.reason}`);
	process.exit(verdict.build ? 1 : 0);
}
