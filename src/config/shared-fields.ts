/**
 * Field ids a module may share with another module, and what each one means.
 *
 * The existing assertion held that a field id defined in more than one module
 * must agree on kind and options. That is necessary and it is not sufficient,
 * and `last-training-date` is the case that proved it. Two modules declared it,
 * both as `date`, both with no options, so the assertion passed. But the cyber
 * module meant the last round of security awareness training, measured against
 * the annual expectation in the CISA performance goals, and the employment
 * module meant the last harassment prevention session, measured against
 * California's two-year interval and New York's one-year one. Two different
 * facts, two different clocks, one id.
 *
 * Nothing rendered wrong, because every rule reading it was inside one module.
 * The hazard was the next cross-module rule: a finding that those two dates
 * disagreed would have been nonsense, since they should differ, and it would
 * have looked correct to everyone who wrote it. The two fields are now
 * `security-awareness-training-date` and `harassment-training-date`.
 *
 * Comparing labels would not have caught it. Four of the legitimate shares here
 * are worded differently in each module while asking for the same fact, and the
 * two that collided were worded almost identically. So the check cannot be
 * mechanical on the text; it has to be a decision someone made once and wrote
 * down.
 *
 * Hence this file. A field id appearing in more than one module must appear
 * here, with a sentence saying what single fact it records. Adding a field
 * whose id happens to collide with another module's now fails the suite until
 * somebody either renames it or comes here and states that the two really are
 * the same fact. That is the whole mechanism: sharing becomes deliberate.
 */

export interface SharedField {
	/** The field id, identical in every module that declares it. */
	id: string;
	/** The kind every declaring module must use. */
	kind: 'select' | 'multiselect' | 'boolean' | 'number' | 'date' | 'text' | 'band';
	/** The one fact this field records, stated so a later reader can test a module against it. */
	means: string;
}

export const SHARED_FIELDS: SharedField[] = [
	{
		id: 'residence-type',
		kind: 'select',
		means:
			'What kind of dwelling the household lives in, chosen from one list. It decides which contract answers a loss, so the same answer has to hold across the property, earthquake and auto modules for one household.',
	},
	{
		id: 'construction-era',
		kind: 'band',
		means:
			'The band containing the year the structure was originally built. Both declaring modules reason from it, one about seismic code lines and one about the age of systems, so a disagreement means one of them is working from the wrong year.',
	},
	{
		id: 'total-employee-count',
		kind: 'number',
		means:
			'How many people the business employs right now, counted the same way in both modules. Statutory thresholds attach to it on both sides, so it is one number rather than two estimates.',
	},
	{
		id: 'states-of-operation',
		kind: 'multiselect',
		means:
			'The states in which employees actually perform work. Every declaring module reasons about obligations that attach by that answer, so it describes one workforce rather than the view any single module happens to hold.',
	},
	{
		id: 'questions-for-broker',
		kind: 'text',
		means:
			'Free text the reader wants carried onto the printed brief. It feeds no rule in any module and is shared so that one brief can collect it from wherever the reader happened to be working.',
	},
];

export const SHARED_FIELD_IDS = new Set(SHARED_FIELDS.map((f) => f.id));

export function sharedField(id: string): SharedField | undefined {
	return SHARED_FIELDS.find((f) => f.id === id);
}
