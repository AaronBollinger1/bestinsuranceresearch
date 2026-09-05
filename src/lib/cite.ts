import { siteConfig } from '../config/site';

/**
 * "Cite this page" output. Three formats, all built from public page facts only:
 * title, operator, dates, canonical URL, and content version. No user input,
 * no analytics identifier, no generated claim.
 */

export interface CitablePage {
	title: string;
	/** Canonical path, for example /questions/what-is-a-claims-made-retroactive-date. */
	path: string;
	/** ISO date the page content took effect. */
	published: string;
	/** ISO date of the most recent editorial review. */
	reviewed: string;
	author: string;
	/** Stable id used as the BibTeX key and CSL id. */
	id: string;
	pageType: string;
}

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Renders a date at whatever precision it actually has. "1872" stays 1872 rather
 * than becoming a fabricated January 1st, and anything unrecognised passes through
 * unchanged so a publisher's own wording survives.
 */
export function longDate(value: string): string {
	if (!value || value === 'unknown' || value === 'n/a') return value || 'unknown';
	const parts = value.split('-');
	const y = Number(parts[0]);
	if (!y || parts[0].length !== 4) return value;
	if (parts.length === 1) return String(y);
	const m = Number(parts[1]);
	if (!m || m < 1 || m > 12) return value;
	if (parts.length === 2) return `${MONTHS[m - 1]} ${y}`;
	const d = Number(parts[2]);
	if (!d || d < 1 || d > 31) return `${MONTHS[m - 1]} ${y}`;
	return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** True when a value is a date we can compare, rather than "unknown" or a note. */
export function isDateLike(value: string): boolean {
	return /^\d{4}(-\d{2}(-\d{2})?)?$/.test(value);
}

function canonical(path: string): string {
	return new URL(path, siteConfig.origin).toString();
}

function bibtexKey(id: string, reviewed: string): string {
	return `bir-${id}-${reviewed.slice(0, 4)}`.replace(/[^A-Za-z0-9-]/g, '');
}

export function plainCitation(page: CitablePage): string {
	return (
		`${siteConfig.name}. "${page.title}." ` +
		`${siteConfig.operator.legalName} dba ${siteConfig.operator.dba}. ` +
		`Published ${longDate(page.published)}. Last reviewed ${longDate(page.reviewed)}. ` +
		`Content version ${siteConfig.contentVersion}. ${canonical(page.path)}`
	);
}

export function bibtexCitation(page: CitablePage): string {
	return [
		`@misc{${bibtexKey(page.id, page.reviewed)},`,
		`  title        = {${page.title}},`,
		`  author       = {${page.author}},`,
		`  organization = {${siteConfig.name}},`,
		`  institution  = {${siteConfig.operator.legalName} dba ${siteConfig.operator.dba}},`,
		`  year         = {${page.reviewed.slice(0, 4)}},`,
		`  month        = {${page.reviewed.slice(5, 7)}},`,
		`  note         = {Last reviewed ${longDate(page.reviewed)}; content version ${siteConfig.contentVersion}},`,
		`  howpublished = {\\url{${canonical(page.path)}}},`,
		`  urldate      = {${page.reviewed}}`,
		'}',
	].join('\n');
}

export function cslCitation(page: CitablePage): string {
	const [ry, rm, rd] = page.reviewed.split('-').map(Number);
	const [py, pm, pd] = page.published.split('-').map(Number);
	return JSON.stringify(
		[
			{
				id: page.id,
				type: 'webpage',
				title: page.title,
				'container-title': siteConfig.name,
				publisher: `${siteConfig.operator.legalName} dba ${siteConfig.operator.dba}`,
				author: [{ literal: page.author }],
				URL: canonical(page.path),
				issued: { 'date-parts': [[py, pm, pd]] },
				accessed: { 'date-parts': [[ry, rm, rd]] },
				version: siteConfig.contentVersion,
				genre: page.pageType,
			},
		],
		null,
		2,
	);
}
