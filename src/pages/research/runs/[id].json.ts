/**
 * Machine companion for a research-run preview.
 *
 * Same rule as every other companion on this origin: the JSON says no more
 * than the page does. It carries the recorded events, the fold's outcome,
 * and an explicit `synthetic: true`, so a machine reader cannot mistake a
 * fixture replay for a live research run or for published Birch evidence.
 */
import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { reduceRun, honestStatus, runIdFor, type RunEvent } from '../../../lib/research-run';

/* Project-root resolution, matching the page: a bundled module's
   import.meta.url points at the build output, not this source file. */
const FIXTURES = path.resolve('scripts/fixtures/research-runs');

export function getStaticPaths() {
	return fs
		.readdirSync(FIXTURES)
		.filter((file) => file.endsWith('.json'))
		.sort()
		.map((file) => ({ params: { id: runIdFor(file) }, props: { file } }));
}

export const GET: APIRoute = ({ props, site }) => {
	const { file } = props as { file: string };
	const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES, file), 'utf8')) as {
		_fixture: string;
		context: { questionId: string; note: string };
		events: RunEvent[];
	};
	const runId = runIdFor(file);
	const snapshot = reduceRun(fixture.events);
	const origin = (site ?? new URL('https://birch.insure')).toString().replace(/\/+$/, '');

	return new Response(
		JSON.stringify(
			{
				recordType: 'research-run-fixture',
				synthetic: true,
				runId,
				canonicalUrl: `${origin}/research/runs/${runId}`,
				contentVersion: snapshot.updatedAt,
				description: fixture._fixture,
				disclosure:
					'Synthetic research-run preview. No provider was called, no source was fetched, no review occurred, and nothing was published. Events carry their recorded timestamps and counts; nothing here is Birch evidence.',
				questionContext: {
					id: fixture.context.questionId,
					url: `${origin}/questions/${fixture.context.questionId}`,
					note: fixture.context.note,
				},
				state: snapshot.state,
				status: honestStatus(snapshot),
				terminal: snapshot.terminal,
				awaitingLicensedReview: snapshot.awaitingLicensedReview,
				counts: snapshot.counts,
				events: fixture.events,
			},
			null,
			'\t',
		),
		{ headers: { 'Content-Type': 'application/json; charset=utf-8' } },
	);
};
