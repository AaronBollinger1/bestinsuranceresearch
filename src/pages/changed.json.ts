import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { changeSummary, overdueFigures, recordedChanges, scheduledChanges } from '../lib/changes';
import { loadCorpus } from '../lib/corpus';
import { jsonResponse } from '../lib/machine';
import { TODAY } from '../lib/today';

export const prerender = true;

const abs = (path: string) => new URL(path, siteConfig.origin).toString();

/**
 * The change feed, machine-readable.
 *
 * The companion to /changed, and the reason the page is worth building for an
 * answer engine rather than only for a reader: a dated list of what moved in an
 * evidence base, with the record behind each entry, is a thing nobody else in
 * this category publishes at all.
 *
 * The two date bases are carried as data rather than explained in prose, so a
 * consumer cannot flatten them by accident. `dateBasis: "recorded"` is our
 * filing date; `dateBasis: "instrument"` is a date the document sets for
 * itself. Treating the first as the date an event occurred is the single
 * misreading this endpoint invites.
 */
export const GET: APIRoute = async () => {
	const corpus = await loadCorpus();
	const recorded = recordedChanges(corpus);
	const scheduled = scheduledChanges(corpus, TODAY);
	const overdue = overdueFigures(corpus, TODAY);

	return jsonResponse({
		$schema: `${siteConfig.origin}/llms-full.txt`,
		recordType: 'change-feed',
		id: 'changed',
		canonicalUrl: abs('/changed'),
		contentVersion: siteConfig.contentVersion,
		generatedFor: TODAY,
		about:
			'Every documented change to the sources behind this library, and every published amount ' +
			'an instrument has scheduled to move. Assembled from fields on the records themselves; ' +
			'no part of this feed is written prose.',
		mayNotBeInferred: [
			'That this is every change to insurance law. It is every change this library has recorded.',
			'That a recorded change happened on the date shown. That date is when we recorded it; read dateBasis.',
			'That an absent jurisdiction had no changes. This corpus is concentrated and a jurisdiction missing from it is one we hold no source for.',
			'That a scheduled move produces the amount you calculate from it. We publish no figure the source did not state.',
			'That a re-read confirmed the record. A recheck is a comparison; where it found a discrepancy the correction is a separate entry.',
		],
		counts: changeSummary(corpus, TODAY),
		recorded: recorded.map((c) => ({
			kind: c.kind,
			date: c.date,
			dateBasis: 'recorded',
			title: c.title,
			url: abs(c.path),
			detail: c.detail,
			...(c.supersededBy ? { supersededBy: abs(c.supersededBy.path) } : {}),
		})),
		scheduled: scheduled.map((s) => ({
			date: s.date,
			dateBasis: 'instrument',
			label: s.label,
			amountToday: s.amount,
			movesWhen: s.movesWhen,
			instrument: s.instrument,
			states: s.states,
			url: abs(s.path),
		})),
		/* Published so a consumer can see the registry's own overdue list rather
		   than discovering it by comparing dates themselves. */
		scheduledMovesAlreadyPassed: overdue.map((f) => ({
			label: f.label,
			wasDue: f.nextMove,
			url: abs(`/figures#${f.id}`),
			note: 'The published amount may no longer be the operative one. This is a review trigger, not a change we are asserting.',
		})),
	});
};
