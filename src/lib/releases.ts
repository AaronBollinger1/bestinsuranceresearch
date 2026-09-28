import fs from 'node:fs';
import path from 'node:path';

/**
 * The frozen dataset releases.
 *
 * These are read off disk rather than derived from the corpus, and that is the
 * point. A release is bytes that were written once by scripts/cut-release.mjs
 * and committed; if this module rebuilt them from the current content, the
 * "release" would silently track the corpus and a citation to it would mean
 * nothing. So the page renders what is actually published, and where the
 * numbers here disagree with the numbers elsewhere on the site, the difference
 * is real: it is the corpus having moved since the release was cut.
 */

const DATASET = path.resolve('public/dataset');

export interface ReleaseFile {
	name: string;
	url: string;
	bytes: number;
	sha256: string;
	encodingFormat?: string;
	description?: string;
}

export interface ReleaseSummary {
	release: string;
	url: string;
	schemaVersion: number;
	datePublished: string;
	claims: number;
	sources: number;
	files: ReleaseFile[];
}

export interface ReleaseIndex {
	name: string;
	documentation: string;
	about: string;
	latest?: string;
	releases: ReleaseSummary[];
}

export interface ReleaseManifest {
	release: string;
	schemaVersion: number;
	name: string;
	description: string;
	datePublished: string;
	license: string;
	immutability: string;
	counts: {
		claims: number;
		sources: number;
		primarySources: number;
		onOfficialHost: number;
		byAuthorityLevel: Record<string, number>;
		bySourceType: Record<string, number>;
		byJurisdiction: Record<string, number>;
		byStatus: Record<string, number>;
	};
	reviewStatus: Record<string, number | string>;
	verification: { sourcesRechecked: number; sourcesReadOnce: number; note: string };
	files: ReleaseFile[];
	citation: { text: string; note: string };
	mayNotBeInferred: string[];
	changesSince: {
		previousRelease: string;
		addedCount: number;
		changedCount: number;
		removedCount: number;
		changed: string[];
		removed: string[];
		note: string;
	} | null;
}

const readJson = <T>(file: string): T | null => {
	if (!fs.existsSync(file)) return null;
	return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
};

export function releaseIndex(): ReleaseIndex | null {
	return readJson<ReleaseIndex>(path.join(DATASET, 'releases.json'));
}

export function releaseManifest(version: string): ReleaseManifest | null {
	return readJson<ReleaseManifest>(path.join(DATASET, version, 'manifest.json'));
}

/** Newest first, which is the order a reader wants and the order the index is written in. */
export function allManifests(): ReleaseManifest[] {
	const index = releaseIndex();
	if (!index) return [];
	return index.releases
		.map((r) => releaseManifest(r.release))
		.filter((m): m is ReleaseManifest => m !== null);
}

export function latestManifest(): ReleaseManifest | null {
	return allManifests()[0] ?? null;
}

/**
 * How many records in a release carry a licensed sign-off.
 *
 * Derived, never written in prose. The sign-off count is currently zero and the
 * obvious thing is to say so in a sentence - which is how a page comes to state
 * something that was true when it was typed. Read it off the release instead,
 * so the first record Brian signs off changes every place that mentions it.
 */
export function signedOff(manifest: ReleaseManifest): number {
	const value = manifest.reviewStatus.reviewed;
	return typeof value === 'number' ? value : 0;
}

/** Bytes as a reader reads them. Releases are downloads, so the size is a fact they need. */
export function fileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
