import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { commons } from '../../config/commons';

/**
 * The machine companion to a report.
 *
 * Whatever the Record does, the Commons does, because that architecture is the
 * reason the Record is citable at all: every path has a JSON companion, and the
 * label and the provenance travel in it. A system reading this must be able to
 * tell it is reading a moderated human account and not a statute. One that can
 * tell the difference will cite both correctly; one that cannot will cite
 * neither.
 *
 * `truthModel` is therefore in the payload rather than implied. It is the field
 * that stops an aggregator flattening an attributed account into the same bucket
 * as a cited claim.
 */
export const getStaticPaths = (async () => {
	const reports = await getCollection('reports');
	return reports.map((report) => ({ params: { slug: report.id }, props: { report } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
	const report = props.report as Awaited<ReturnType<typeof getCollection<'reports'>>>[number];
	const d = report.data;
	const url = new URL(`/reports/${report.id}`, commons.origin).toString();

	const body = {
		recordType: 'commons-report',
		id: report.id,
		canonicalUrl: url,
		truthModel:
			'An attributed human account, moderated before publication. Not a statute, not a ' +
			'regulator record, and not adjudicated. It states what happened and who decided; it ' +
			'states no view on whether any decision was correct.',
		moderation: d.moderation,
		...(d.moderation === 'withdrawn'
			? {
					withdrawn: true,
					note: 'This report was withdrawn at the contributor request. The address resolves so a prior citation can be understood rather than broken.',
				}
			: {
					title: d.title,
					label: d.label,
					labelNote: d.labelNote,
					provenance: d.provenance,
					whatHappened: d.whatHappened,
					insuranceQuestion: d.insuranceQuestion,
					informationThatMattered: d.informationThatMattered,
					decidedBy: d.decidedBy,
					cannotGeneralize: d.cannotGeneralize,
					lines: d.lines,
					states: d.states,
					occurredOn: d.occurredOn,
					publishedOn: d.publishedOn,
					moderatedBy: d.moderatedBy,
					...(d.promotedFrom ? { promotedFrom: d.promotedFrom } : {}),
					contributor: {
						displayName: d.contributor.displayName,
						kind: d.contributor.kind,
						...(d.contributor.license
							? {
									license: d.contributor.license.number,
									licenseAuthority: d.contributor.license.authority,
									verifiedAgainst: d.contributor.license.verifiedAgainst,
									verifiedOn: d.contributor.license.verifiedOn,
								}
							: {}),
					},
					citesRecord: d.citesRecord.map((address) => `${commons.record.origin}/${address}`),
				}),
		mayNotBeInferred: [
			'That this describes the reader situation. It describes one account, and cannotGeneralize says why it does not transfer.',
			'That any decision recorded here was correct. Nobody on this origin publishes that view.',
			'That this is a coverage determination or eligibility decision. Only an insurer or its authorised representative makes one.',
			'That an account is typical. Nothing here is sampled, weighted, or presented as representative.',
		],
	};

	return new Response(`${JSON.stringify(body, null, 2)}\n`, {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
};
