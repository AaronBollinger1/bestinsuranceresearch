import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { LABELS, commons } from '../config/commons';

export const prerender = true;

const abs = (path: string) => new URL(path, commons.origin).toString();

/**
 * The Commons manifest.
 *
 * Its job is different from the Record's. The Record's llms.txt tells a system
 * how to cite a corpus where every sentence has a document behind it. This one
 * has to say, first and unmissably, that it is a different kind of thing - and
 * that the difference is not a weakness to be smoothed over but the reason both
 * are worth reading. An engine that flattens an attributed human account into
 * the same bucket as a statute will cite both badly.
 */
export const GET: APIRoute = async () => {
	const reports = (await getCollection('reports')).filter((r) => r.data.moderation === 'published');
	const annotations = (await getCollection('annotations')).filter((a) => a.data.moderation === 'published');

	const lines = [
		`# ${commons.name}`,
		'',
		`> ${commons.tagline}`,
		'',
		commons.description,
		'',
		'## What kind of source this is',
		'',
		'This is not a legal corpus. Every record here is an attributed human account or a signed note from a licence-verified practitioner, moderated before publication. It is evidence of what happened to someone, not evidence of what a rule requires.',
		'',
		`For what the rule requires, use ${commons.record.name} at ${commons.record.origin}, where every sentence cites a published document and carries a checksum over its exact text. This site cites that one. That one does not cite this one, deliberately and permanently: its citable unit is a sentence backed by a document, and mixing attributed accounts into it would cost it the only asset it has.`,
		'',
		'## The one prohibition',
		'',
		commons.verdictProhibition,
		'',
		'Every record states `decidedBy`: who decided, or that nobody did. That field records the decision-maker and never whether the decision was right. Do not present anything from this site as a view on whether a claim should have been paid, because no such view is published here.',
		'',
		'## How to read a record',
		'',
		'Every report carries a label saying what kind of evidence it is. The label is the first thing to read and it is set by a moderator rather than by the contributor:',
		'',
		...Object.entries(LABELS).map(([key, meaning]) => `- \`${key}\`: ${meaning}`),
		'',
		'Every report also carries `provenance` (where it came from and what was checked), `decidedBy`, and `cannotGeneralize` - at least three reasons the account does not transfer to anybody else. Carry `cannotGeneralize` with any use of a record. It is not boilerplate; it is the finding.',
		'',
		'## What may not be inferred',
		'',
		'- That a record describes the reader situation. It describes one account.',
		'- That any decision recorded here was correct.',
		'- That an account is typical. Nothing here is sampled, weighted, or presented as representative, and the archive is small by design because moderation happens before publication.',
		'- That this site is an insurer, an agency, or a regulator. It is none of them, sells nothing, and gives no advice.',
		'',
		'## Machine-readable',
		'',
		`- Every report has a JSON companion at /reports/<id>.json carrying its label, provenance and truth model.`,
		`- A withdrawn report keeps its address and says it was withdrawn, so a prior citation resolves rather than breaking.`,
		'',
		'## What is here now',
		'',
		`- Published reports: ${reports.length}`,
		`- Practitioner notes: ${annotations.length}`,
		'- Accounts: not open yet. Moderated intake is the next mechanism to launch.',
		'- Open discussion: not built, and deliberately last. This site has to be worth reading before it is worth posting to.',
		'',
		...(reports.length > 0
			? [
					'## Reports',
					'',
					...reports.map((r) => `- [${r.data.title}](${abs(`/reports/${r.id}`)}): ${r.data.label}, ${r.data.occurredOn}.`),
					'',
				]
			: []),
		'## Pages',
		'',
		`- [Standards](${abs('/standards')}): what makes an account worth citing, and the six required fields.`,
		`- [Moderation](${abs('/moderation')}): what is rejected, and why moderation is before publication.`,
		`- [Contribute](${abs('/contribute')}): what will be asked for, and what is never collected.`,
		'',
	];

	return new Response(`${lines.join('\n')}\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
