import { randomUUID } from 'node:crypto';
import type { Account, Submission, SubmissionDraft } from './store';

/**
 * Intake: turning what somebody types into something a moderator can decide on.
 *
 * `COMMONS.md` section 5.1. The intake asks the six fields that make an account
 * citable, plus state, line and date, in plain language. It asks for no
 * document, and there is no mechanism to accept one - a declarations page is
 * the densest packet of personal information a person owns, and accepting one
 * converts a research property into a data-breach liability.
 *
 * WHAT THE MODERATOR SETS AND THE CONTRIBUTOR DOES NOT
 *
 * The `label` is not on this form. A person describing their own situation is
 * not always the best judge of what kind of evidence it is, and the label is
 * the field a reader relies on most - so it is set at moderation, from what the
 * account turns out to be. `provenance` is written by the moderator for the
 * same reason: it records what *was checked*, and the contributor cannot
 * testify to that.
 *
 * `cannotGeneralize` IS asked for, with a floor of three, and that is the field
 * contributors will find hardest. It is asked anyway, because a person who
 * cannot name three reasons their situation is particular has usually not
 * finished thinking about it, and because the alternative is a moderator
 * inventing limits on an account they did not live.
 */

/** Room to say something, and a ceiling so no field becomes a document. */
export const LIMITS = {
	title: { min: 15, max: 160 },
	whatHappened: { min: 120, max: 6000 },
	insuranceQuestion: { min: 15, max: 400 },
	decidedBy: { min: 20, max: 1200 },
	item: { min: 10, max: 600 },
	occurredOn: { min: 4, max: 60 },
} as const;

export const MIN_INFORMATION = 3;
export const MIN_CANNOT_GENERALIZE = 3;

/**
 * Phrases that read as a verdict on whether a claim should have been paid.
 *
 * This is the one rule that survives the crossing from the Record, and here it
 * is a flag rather than a block. Two reasons. A contributor phrasing something
 * badly should be told what the rule is and given the chance to say it another
 * way, not silently rejected. And these patterns will produce false positives -
 * "the adjuster said it should have been covered" is a report of what somebody
 * said, which is exactly the kind of fact this site wants. A human decides.
 *
 * Deliberately the same list the published-report lint uses, so a phrase that
 * would fail at publication is flagged at the door rather than after the work.
 */
const VERDICT_PATTERNS: Array<{ pattern: RegExp; why: string }> = [
	{ pattern: /should have been (paid|covered|approved|accepted)/i, why: 'states what the outcome should have been' },
	{ pattern: /should not have been (paid|covered|denied|rejected)/i, why: 'states what the outcome should have been' },
	{ pattern: /(was|were) wrongly (denied|paid|rejected)/i, why: 'calls a decision wrong' },
	{ pattern: /the (carrier|insurer|adjuster) was (right|wrong)/i, why: 'calls a decision-maker right or wrong' },
	{ pattern: /(clearly|obviously|definitely) (covered|not covered|excluded)/i, why: 'asserts coverage as settled' },
	{ pattern: /(bad faith|acted in bad faith)/i, why: 'is a legal conclusion about conduct' },
	{ pattern: /they owe(d)? (me|us)/i, why: 'asserts an entitlement' },
];

export interface VerdictFlag {
	phrase: string;
	why: string;
}

/** Every verdict-shaped phrase in a body of text, with why it tripped. */
export function verdictFlags(text: string): VerdictFlag[] {
	const found: VerdictFlag[] = [];
	for (const { pattern, why } of VERDICT_PATTERNS) {
		const match = text.match(pattern);
		if (match) found.push({ phrase: match[0], why });
	}
	return found;
}

export interface FieldError {
	field: string;
	message: string;
}

/** Split a textarea of one-per-line entries, dropping blanks. */
export function lines(value: string): string[] {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * Validate, and say what is wrong in the contributor's terms.
 *
 * Every message names the field and what would fix it. "Invalid input" on a
 * form somebody has spent twenty minutes on is how a submission gets abandoned,
 * and an abandoned submission is a real account this site does not get.
 */
export function validateSubmission(input: Record<string, string>): {
	errors: FieldError[];
	draft: Omit<SubmissionDraft, 'email'> | null;
} {
	const errors: FieldError[] = [];
	const text = (key: string) => (input[key] ?? '').trim();

	const check = (field: string, value: string, limit: { min: number; max: number }, label: string) => {
		if (value.length < limit.min) {
			errors.push({ field, message: `${label} needs at least ${limit.min} characters. There are ${value.length}.` });
		} else if (value.length > limit.max) {
			errors.push({ field, message: `${label} is limited to ${limit.max} characters. There are ${value.length}.` });
		}
	};

	const title = text('title');
	const whatHappened = text('whatHappened');
	const insuranceQuestion = text('insuranceQuestion');
	const decidedBy = text('decidedBy');
	const occurredOn = text('occurredOn');
	const informationThatMattered = lines(text('informationThatMattered'));
	const cannotGeneralize = lines(text('cannotGeneralize'));
	const linesOfBusiness = lines(text('lines'));
	const states = lines(text('states')).map((s) => s.toUpperCase());

	check('title', title, LIMITS.title, 'The one-line summary');
	check('whatHappened', whatHappened, LIMITS.whatHappened, 'What happened');
	check('insuranceQuestion', insuranceQuestion, LIMITS.insuranceQuestion, 'The insurance question');
	check('decidedBy', decidedBy, LIMITS.decidedBy, 'Who decided');
	check('occurredOn', occurredOn, LIMITS.occurredOn, 'When it happened');

	if (informationThatMattered.length < MIN_INFORMATION) {
		errors.push({
			field: 'informationThatMattered',
			message: `Name at least ${MIN_INFORMATION} things that mattered, one per line. There ${informationThatMattered.length === 1 ? 'is' : 'are'} ${informationThatMattered.length}.`,
		});
	}
	if (cannotGeneralize.length < MIN_CANNOT_GENERALIZE) {
		errors.push({
			field: 'cannotGeneralize',
			message: `Name at least ${MIN_CANNOT_GENERALIZE} reasons this would not apply to somebody else, one per line. There ${cannotGeneralize.length === 1 ? 'is' : 'are'} ${cannotGeneralize.length}. This is the hardest field and it is the one that stops a reader treating your outcome as their rule.`,
		});
	}
	for (const item of [...informationThatMattered, ...cannotGeneralize]) {
		if (item.length < LIMITS.item.min || item.length > LIMITS.item.max) {
			errors.push({
				field: 'informationThatMattered',
				message: `Each line needs to be between ${LIMITS.item.min} and ${LIMITS.item.max} characters. "${item.slice(0, 40)}" is ${item.length}.`,
			});
			break;
		}
	}
	if (linesOfBusiness.length === 0) {
		errors.push({ field: 'lines', message: 'Name at least one kind of policy this concerned.' });
	}
	for (const state of states) {
		if (!/^[A-Z]{2}$/.test(state)) {
			errors.push({ field: 'states', message: `"${state}" is not a two-letter state code.` });
			break;
		}
	}

	if (errors.length > 0) return { errors, draft: null };

	const flags = verdictFlags(
		[title, whatHappened, insuranceQuestion, decidedBy, ...informationThatMattered, ...cannotGeneralize].join('\n'),
	);

	return {
		errors: [],
		draft: {
			title,
			whatHappened,
			insuranceQuestion,
			informationThatMattered,
			decidedBy,
			cannotGeneralize,
			lines: linesOfBusiness,
			states,
			occurredOn,
			verdictFlags: flags.map((f) => `${f.phrase} — ${f.why}`),
		},
	};
}

export const newSubmissionId = () => randomUUID();

/**
 * Turn an approved submission into a report record for the repository.
 *
 * The moderator supplies what only they can: the label, why it carries that
 * label, and the provenance - what was actually checked before publication.
 * Everything else comes from the submission unchanged, because editing somebody
 * else's account of what happened to them is not moderation.
 *
 * The output is written to `src/content/reports/<slug>.json` and committed. It
 * is deliberately not inserted into a database and served: published content
 * belongs in git, where it has a history, a diff, and a correction trail.
 */
export function draftReport(
	submission: Submission,
	account: Account,
	moderator: { label: string; labelNote: string; provenance: string; name: string; publishedOn: string },
) {
	return {
		title: submission.title,
		label: moderator.label,
		labelNote: moderator.labelNote,
		moderation: 'published',
		contributor: {
			displayName: account.displayName,
			kind: account.kind,
			...(account.license ? { license: account.license } : {}),
		},
		whatHappened: submission.whatHappened,
		informationThatMattered: submission.informationThatMattered,
		insuranceQuestion: submission.insuranceQuestion,
		decidedBy: submission.decidedBy,
		cannotGeneralize: submission.cannotGeneralize,
		provenance: moderator.provenance,
		lines: submission.lines,
		states: submission.states,
		occurredOn: submission.occurredOn,
		publishedOn: moderator.publishedOn,
		moderatedBy: moderator.name,
		citesRecord: [],
		...(submission.promotedFrom
			? {
					promotedFrom: {
						threadId: submission.promotedFrom.threadId,
						postId: submission.promotedFrom.postId,
					},
				}
			: {}),
	};
}

/** A filename for the report, derived from the title and kept short. */
export function reportSlug(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.split('-')
		.slice(0, 8)
		.join('-');
}
