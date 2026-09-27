/**
 * Structured experiences, moderation, and retention (BR-D4).
 *
 * An experience is not an allegation the library publishes. Facts, opinions,
 * and unresolved disputes stay in separate fields. Sensitive text is dropped
 * before the record is kept. Nothing here is indexable.
 */
export const EXPERIENCE_PUBLICATION_OPEN: boolean = false;

const SENSITIVE = /\b(?:ssn|social security|policy\s*(?:number|#)|claim\s*(?:number|#)|medical|diagnos(?:is|ed)|prescription|\d{3}-\d{2}-\d{4})\b/i;
const DEFAMATION = /\b(?:fraud|stole|criminal|scam|embezzl\w*)\b/i;
const IMPERSONATION = /\b(?:i am the|i'm the|as the)\s+(?:ceo|president|commissioner|claims director|regulator)\b/i;

export type StatementKind = 'fact' | 'opinion' | 'unresolved-dispute';

export interface ExperienceStatement {
	id: string;
	kind: StatementKind;
	text: string;
	sourceIds: string[];
}

export interface ExperienceRecord {
	id: string;
	authorName: string;
	companyId: string;
	disclosures: string;
	state: 'submitted' | 'redacted' | 'in-moderation' | 'company-responded' | 'appealed' | 'corrected' | 'withdrawn' | 'retained' | 'rejected';
	statements: ExperienceStatement[];
	evidence: Array<{ id: string; title: string; url: string }>;
	companyResponse: { author: string; text: string; at: string } | null;
	conflictOfInterest: boolean;
	events: Array<{ at: string; action: string; note: string }>;
	retainedUntil: string | null;
	indexable: false;
}

export interface ExperienceBook {
	records: ExperienceRecord[];
	seen: string[];
	counts: Map<string, number>;
}

export function createExperienceBook(): ExperienceBook {
	return { records: [], seen: [], counts: new Map() };
}

function redact(text: string): { text: string; redacted: boolean } {
	const next = text
		.replace(/\b(?:ssn|social security|policy\s*(?:number|#)|claim\s*(?:number|#)|medical|diagnos(?:is|ed)|prescription)\b[:\s#-]*[A-Za-z0-9-]*/gi, '[redacted]')
		.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted]');
	return { text: next, redacted: next !== text };
}

function fingerprint(author: string, companyId: string, statements: ExperienceStatement[]): string {
	const body = statements.map((statement) => statement.text.trim().toLowerCase().replace(/\s+/g, ' ')).join('|');
	return `${author.trim().toLowerCase()}::${companyId}::${body}`;
}

export function submitExperience(book: ExperienceBook, input: {
	id: string;
	authorName: string;
	companyId: string;
	companyName: string;
	disclosures: string;
	statements: ExperienceStatement[];
	at: string;
}): { ok: boolean; state: string; record?: ExperienceRecord } {
	const key = input.authorName.trim().toLowerCase();
	const count = (book.counts.get(key) ?? 0) + 1;
	book.counts.set(key, count);
	if (count > 5) return { ok: false, state: 'abuse-limited' };
	if (!input.authorName.trim() || !input.disclosures.trim() || input.statements.length === 0) return { ok: false, state: 'rejected' };
	if (input.authorName.trim().toLowerCase() === input.companyName.trim().toLowerCase() || input.statements.some((statement) => IMPERSONATION.test(statement.text))) {
		return { ok: false, state: 'impersonation' };
	}
	const fp = fingerprint(input.authorName, input.companyId, input.statements);
	if (book.seen.includes(fp)) return { ok: false, state: 'duplicate' };
	let redacted = false;
	const statements = input.statements.map((statement) => {
		const cleaned = redact(statement.text);
		if (cleaned.redacted) redacted = true;
		let kind = statement.kind;
		const unsourcedAccusation = DEFAMATION.test(cleaned.text) && statement.sourceIds.length === 0;
		if (unsourcedAccusation) kind = 'unresolved-dispute';
		if (kind === 'fact' && statement.sourceIds.length === 0) kind = 'opinion';
		return { ...statement, kind, text: cleaned.text, sourceIds: [...statement.sourceIds] };
	});
	if (statements.some((statement) => SENSITIVE.test(statement.text))) return { ok: false, state: 'sensitive-data' };
	const conflictOfInterest = input.disclosures.toLowerCase().includes(input.companyName.toLowerCase());
	const coiStatements = conflictOfInterest
		? statements.map((statement) => statement.kind === 'fact' ? { ...statement, kind: 'opinion' as const } : statement)
		: statements;
	book.seen.push(fp);
	const record: ExperienceRecord = {
		id: input.id,
		authorName: input.authorName.trim(),
		companyId: input.companyId,
		disclosures: input.disclosures.trim(),
		state: redacted ? 'redacted' : 'submitted',
		statements: coiStatements,
		evidence: [],
		companyResponse: null,
		conflictOfInterest,
		events: [{ at: input.at, action: redacted ? 'redacted' : 'submitted', note: redacted ? 'Sensitive text was removed before retention.' : 'Submitted for moderation.' }],
		retainedUntil: null,
		indexable: false,
	};
	book.records.push(record);
	return { ok: true, state: record.state, record };
}

function pathHasIdentifier(pathname: string): boolean {
	let decoded: string;
	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		return true;
	}
	if (/\b\d{3}-\d{2}-\d{4}\b/.test(decoded)) return true;
	return /(?:^|\/)(?:claim|policy)(?:[-_]?(?:number|no|id))?(?:\/|[-_])(?=[^/]*\d)[^/]+/i.test(decoded);
}

function evidenceUrl(raw: string): string | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || pathHasIdentifier(url.pathname)) return null;
	return url.toString();
}

export function attachEvidence(record: ExperienceRecord, input: { id: string; title: string; url: string; at: string }): ExperienceRecord & { problem?: string } {
	const url = evidenceUrl(input.url);
	if (!url) return { ...record, problem: 'Evidence needs a public https URL without credentials, a query, a fragment, or a claim or policy identifier in the path.' };
	const title = redact(input.title).text.trim();
	if (!title || SENSITIVE.test(title)) return { ...record, problem: 'Evidence title cannot keep a sensitive identifier.' };
	return {
		...record,
		state: 'in-moderation',
		evidence: [...record.evidence, { id: input.id, title, url }],
		events: [...record.events, { at: input.at, action: 'evidence-attached', note: title }],
		indexable: false,
	};
}

export function moderateExperience(record: ExperienceRecord, input: { at: string; decision: 'hold' | 'reject'; note: string }): ExperienceRecord {
	return {
		...record,
		state: input.decision === 'reject' ? 'rejected' : 'in-moderation',
		events: [...record.events, { at: input.at, action: 'moderated', note: input.note }],
		indexable: false,
	};
}

export function addCompanyExperienceResponse(record: ExperienceRecord, input: { author: string; text: string; at: string }): ExperienceRecord & { problem?: string } {
	if (!input.author.trim() || !input.text.trim()) return { ...record, problem: 'A company response names its author.' };
	const statements = record.statements.map((statement) => ({ ...statement }));
	return {
		...record,
		state: 'company-responded',
		statements,
		companyResponse: { author: input.author.trim(), text: input.text.trim(), at: input.at },
		events: [...record.events, { at: input.at, action: 'company-response', note: 'Labeled company response. Independent statements were not changed.' }],
		indexable: false,
	};
}

export function appealExperience(record: ExperienceRecord, input: { at: string; note: string }): ExperienceRecord & { problem?: string } {
	if (record.state !== 'rejected' || !input.note.trim()) return { ...record, problem: 'An appeal follows a rejection.' };
	return { ...record, state: 'appealed', events: [...record.events, { at: input.at, action: 'appealed', note: input.note }], indexable: false };
}

export function correctExperience(record: ExperienceRecord, input: { statementId: string; text: string; at: string; note: string }): ExperienceRecord & { problem?: string } {
	const statements = record.statements.map((statement) => ({ ...statement }));
	const statement = statements.find((item) => item.id === input.statementId);
	if (!statement || !input.text.trim()) return { ...record, problem: 'A correction names the statement and the new wording.' };
	const cleaned = redact(input.text);
	statement.text = cleaned.text;
	return {
		...record,
		state: 'corrected',
		statements,
		events: [...record.events, { at: input.at, action: 'corrected', note: input.note }],
		indexable: false,
	};
}

export function withdrawExperience(record: ExperienceRecord, input: { at: string; retainUntil: string }): ExperienceRecord {
	return {
		...record,
		state: 'withdrawn',
		statements: record.statements.map((statement) => ({ ...statement, text: '[withdrawn]' })),
		companyResponse: record.companyResponse ? { ...record.companyResponse, text: '[withdrawn]' } : null,
		retainedUntil: input.retainUntil,
		events: [...record.events, { at: input.at, action: 'withdrawn', note: `Retained until ${input.retainUntil}.` }],
		indexable: false,
	};
}

export function presentExperience(record: ExperienceRecord): {
	facts: Array<{ label: 'Factual claim'; text: string }>;
	opinions: Array<{ label: 'Personal opinion'; text: string }>;
	disputes: Array<{ label: 'Unresolved dispute'; text: string }>;
	companyResponse: { label: 'Company response'; author: string; text: string } | null;
	indexable: false;
} {
	return {
		facts: record.statements.filter((statement) => statement.kind === 'fact').map((statement) => ({ label: 'Factual claim', text: statement.text })),
		opinions: record.statements.filter((statement) => statement.kind === 'opinion').map((statement) => ({ label: 'Personal opinion', text: statement.text })),
		disputes: record.statements.filter((statement) => statement.kind === 'unresolved-dispute').map((statement) => ({ label: 'Unresolved dispute', text: statement.text })),
		companyResponse: record.companyResponse ? { label: 'Company response', author: record.companyResponse.author, text: record.companyResponse.text } : null,
		indexable: false,
	};
}

export function experiencePublication(record: ExperienceRecord, options: { commonsReady: boolean }): { eligible: boolean; indexable: false; sitemapIncluded: false; reasons: string[] } {
	const reasons = ['An experience is not published as an unreviewed allegation.'];
	if (options.commonsReady !== true || EXPERIENCE_PUBLICATION_OPEN !== true) reasons.push('PUBLIC_COMMONS_READY is false');
	if (record.state === 'withdrawn') reasons.push('The experience is withdrawn and retained.');
	return { eligible: false, indexable: false, sitemapIncluded: false, reasons };
}
