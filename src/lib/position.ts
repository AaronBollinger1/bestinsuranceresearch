/**
 * The Coverage Position: the object the whole advisory instrument is built around.
 *
 * One typed object, held on the visitor's own device, written to by every module
 * and read by the rule engine. Because it is one object rather than nine
 * disconnected forms, a fact recorded in one module can raise an open item in
 * another. That cross-module inference is the product.
 *
 * This module is isomorphic: no Astro, no Node. The same code runs at build time
 * (to validate the rule set) and in the browser (to evaluate a live position).
 * Nothing here transmits anything anywhere.
 *
 * See POSITIONING.md for the boundary this code is built to hold.
 */

/* ------------------------------------------------------------------ */
/* The position                                                        */
/* ------------------------------------------------------------------ */

export type FieldValue = string | number | boolean | string[] | null;

export interface ModuleState {
	/** Recorded answers, keyed by field id. */
	fields: Record<string, FieldValue>;
	/** ISO timestamp of the last edit to this module. */
	touchedAt: string | null;
}

export interface Position {
	/** Bumped when the stored shape changes, so a stale position is discarded. */
	version: number;
	savedAt: string | null;
	profile: {
		audience: 'individual' | 'business-owner' | 'professional' | null;
		states: string[];
		family: 'personal' | 'commercial' | 'both' | null;
	};
	modules: Record<string, ModuleState>;
}

export const POSITION_VERSION = 1;

export function emptyPosition(): Position {
	return {
		version: POSITION_VERSION,
		savedAt: null,
		profile: { audience: null, states: [], family: null },
		modules: {},
	};
}

/* ------------------------------------------------------------------ */
/* Module definition                                                   */
/* ------------------------------------------------------------------ */

export type FieldKind = 'select' | 'multiselect' | 'boolean' | 'number' | 'date' | 'text' | 'band';

export interface FieldOption {
	value: string;
	label: string;
}

export interface FieldDef {
	id: string;
	label: string;
	help?: string;
	kind: FieldKind;
	options?: FieldOption[];
	unit?: string;
	group: string;
	required: boolean;
	/** Whether a rule reads this field, or it exists for the printed brief. */
	purpose?: 'rule-input' | 'brief-only';
	/**
	 * Present only where a person might otherwise type something identifying.
	 * Rendered next to the control, not buried in a policy page.
	 */
	privacyNote?: string;
}

/* ------------------------------------------------------------------ */
/* Rules                                                              */
/* ------------------------------------------------------------------ */

/**
 * The five things a rule is allowed to be. Anything outside this list would be
 * an underwriting judgement, a price, or an appetite claim, and none of those
 * can be sourced. See POSITIONING.md.
 */
export type RuleKind = 'gap' | 'inconsistency' | 'timing' | 'documentation' | 'question';

export type Severity = 'high' | 'medium' | 'low';

export type Operator =
	| 'eq' | 'neq'
	| 'gt' | 'gte' | 'lt' | 'lte'
	| 'includes' | 'excludes'
	| 'isSet' | 'isEmpty'
	/* How many options a multiselect holds. The only way to say "more than one". */
	| 'countGte';

/**
 * A comparison value.
 *
 * The three date forms exist because a date comparand is either a **rolling
 * window** (twelve months before whenever the reader is looking) or an
 * **anchored calendar date** (a statutory effective date), and those are not
 * the same claim. Writing a rolling window as a literal computes it once, at
 * build time, and it is wrong the following day. So the author has to say which
 * one they mean, and `validateModule()` rejects a bare string on a date field.
 */
export type Comparand =
	| string
	| number
	| boolean
	| null
	/** Compare against another recorded field. */
	| { field: string }
	/** A window measured in days from the day the reader is looking. Negative is past. */
	| { daysFromToday: number }
	/** The same, in calendar months. Clamped to the last valid day of the target month. */
	| { monthsFromToday: number }
	/** A date that genuinely does not move, with the reason it does not. */
	| { fixedDate: string; why: string }
	/**
	 * Whole years from a calendar year to the year the reader is looking, as a
	 * number. `{ yearsSince: 2010 }` is the age implied by a "2010 or later"
	 * construction era: 16 in 2026 and 17 in 2027. Writing that as `16` makes the
	 * rule under-fire by a year, every year, forever.
	 */
	| { yearsSince: number };

/** True for any comparand form that resolves to a date. */
export function isDateComparand(v: Comparand | undefined): boolean {
	return (
		v !== null && typeof v === 'object' &&
		('daysFromToday' in v || 'monthsFromToday' in v || 'fixedDate' in v)
	);
}

/** True for a comparand that resolves to a number derived from the clock. */
export function isElapsedComparand(v: Comparand | undefined): boolean {
	return v !== null && typeof v === 'object' && 'yearsSince' in v;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) =>
	`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** Today, as an ISO date, in UTC. Isolated so tests and builds can pin it. */
export function todayIso(): string {
	return isoOf(new Date());
}

/**
 * Shift an ISO date by whole days and/or calendar months.
 *
 * Month arithmetic clamps: 2026-03-31 shifted back one month is 2026-02-28,
 * not an overflow into March. Day arithmetic is exact.
 */
export function shiftIsoDate(iso: string, shift: { days?: number; months?: number }): string {
	if (!ISO_DATE.test(iso)) return iso;
	const [y, m, d] = iso.split('-').map(Number);
	const months = shift.months ?? 0;
	const days = shift.days ?? 0;

	let targetY = y;
	let targetM = m - 1 + months;
	targetY += Math.floor(targetM / 12);
	targetM = ((targetM % 12) + 12) % 12;

	// Day 0 of the following month is the last day of the target month.
	const lastDay = new Date(Date.UTC(targetY, targetM + 1, 0)).getUTCDate();
	const clamped = Math.min(d, lastDay);

	const base = new Date(Date.UTC(targetY, targetM, clamped));
	if (days !== 0) base.setUTCDate(base.getUTCDate() + days);
	return isoOf(base);
}

export interface Condition {
	field: string;
	op: Operator;
	value?: Comparand;
}

export interface RuleDef {
	id: string;
	kind: RuleKind;
	severity: Severity;
	title: string;
	detail: string;
	action: string;
	when: { all: Condition[] };
	sourceIds: string[];
	relatedQuestion?: string | null;
	routeToProfessional?: 'broker' | 'insurer' | 'lawyer' | 'accountant' | null;
}

export interface ModuleDef {
	moduleId: string;
	name: string;
	summary: string;
	family: string;
	lines: string[];
	privacyBoundary: string;
	uncertainty: string;
	fields: FieldDef[];
	rules: RuleDef[];
	/** Route, when this module is published. */
	route?: string;
	/** The vanity domain that redirects here, if any. */
	domain?: string | null;
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

export interface OpenItem {
	ruleId: string;
	moduleId: string;
	moduleName: string;
	kind: RuleKind;
	severity: Severity;
	title: string;
	detail: string;
	action: string;
	sourceIds: string[];
	relatedQuestion?: string | null;
	routeToProfessional?: string | null;
}

const isBlank = (v: FieldValue | undefined): boolean =>
	v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Resolve a comparand against the recorded fields and the evaluation date.
 *
 * `today` is passed in rather than read from the clock so that the build-time
 * reachability tests can pin it, and so that a rolling window is evaluated in
 * the reader's browser on the day they are reading.
 */
export function resolveComparand(
	value: Comparand | undefined,
	fields: Record<string, FieldValue>,
	today: string = todayIso(),
): FieldValue | undefined {
	if (value !== null && typeof value === 'object') {
		if ('field' in value) return fields[value.field];
		if ('daysFromToday' in value) return shiftIsoDate(today, { days: value.daysFromToday });
		if ('monthsFromToday' in value) return shiftIsoDate(today, { months: value.monthsFromToday });
		if ('fixedDate' in value) return value.fixedDate;
		if ('yearsSince' in value) return Number(today.slice(0, 4)) - value.yearsSince;
	}
	return value as FieldValue | undefined;
}

const asNumber = (v: unknown): number | null => {
	if (typeof v === 'number') return Number.isFinite(v) ? v : null;
	if (typeof v === 'string' && v.trim() !== '') {
		// Tolerate a person typing "1,000,000" or "$2m" is NOT tolerated: only
		// digits, separators, and a decimal point. Anything else is not a number.
		const cleaned = v.replace(/[,\s]/g, '');
		if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
		const n = Number(cleaned);
		return Number.isFinite(n) ? n : null;
	}
	return null;
};

/**
 * Evaluate one condition. Returns false rather than throwing on anything
 * unexpected: an unanswered field must never fire a rule, because an open item
 * the person cannot act on is worse than no open item.
 */
export function evaluateCondition(
	condition: Condition,
	fields: Record<string, FieldValue>,
	today: string = todayIso(),
): boolean {
	const actual = fields[condition.field];
	const expected = resolveComparand(condition.value, fields, today);

	switch (condition.op) {
		case 'isSet':
			return !isBlank(actual);
		case 'isEmpty':
			return isBlank(actual);
		default:
			break;
	}

	// Every remaining operator needs a recorded answer on both sides.
	if (isBlank(actual)) return false;

	switch (condition.op) {
		case 'eq':
			return Array.isArray(actual) ? false : actual === expected;
		case 'neq':
			return Array.isArray(actual) ? false : actual !== expected;
		case 'includes':
			if (Array.isArray(actual)) return actual.includes(String(expected));
			return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
		case 'excludes':
			if (Array.isArray(actual)) return !actual.includes(String(expected));
			return typeof actual === 'string' && typeof expected === 'string' && !actual.includes(expected);
		case 'countGte':
			// Only meaningful for a multiselect. A single answer counts as one.
			return (Array.isArray(actual) ? actual.length : 1) >= Number(expected);
		case 'gt':
		case 'gte':
		case 'lt':
		case 'lte': {
			// Dates compare lexically as ISO strings; everything else numerically.
			const bothIsoDates =
				typeof actual === 'string' && typeof expected === 'string' &&
				/^\d{4}-\d{2}-\d{2}$/.test(actual) && /^\d{4}-\d{2}-\d{2}$/.test(expected);
			if (bothIsoDates) {
				if (condition.op === 'gt') return actual > expected;
				if (condition.op === 'gte') return actual >= expected;
				if (condition.op === 'lt') return actual < expected;
				return actual <= expected;
			}
			const a = asNumber(actual);
			const b = asNumber(expected);
			if (a === null || b === null) return false;
			if (condition.op === 'gt') return a > b;
			if (condition.op === 'gte') return a >= b;
			if (condition.op === 'lt') return a < b;
			return a <= b;
		}
		default:
			return false;
	}
}

export function evaluateRule(
	rule: RuleDef,
	fields: Record<string, FieldValue>,
	today: string = todayIso(),
): boolean {
	return rule.when.all.every((c) => evaluateCondition(c, fields, today));
}

/** Highest severity first, then by module, so the list reads as a work queue. */
const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function openItemsFor(
	module: ModuleDef,
	state: ModuleState | undefined,
	today: string = todayIso(),
): OpenItem[] {
	const fields = state?.fields ?? {};
	const items: OpenItem[] = [];
	for (const rule of module.rules) {
		if (!evaluateRule(rule, fields, today)) continue;
		items.push({
			ruleId: rule.id,
			moduleId: module.moduleId,
			moduleName: module.name,
			kind: rule.kind,
			severity: rule.severity,
			title: rule.title,
			detail: rule.detail,
			action: rule.action,
			sourceIds: rule.sourceIds,
			relatedQuestion: rule.relatedQuestion ?? null,
			routeToProfessional: rule.routeToProfessional ?? null,
		});
	}
	return items;
}

export function evaluatePosition(
	modules: ModuleDef[],
	position: Position,
	today: string = todayIso(),
): OpenItem[] {
	return modules
		.flatMap((m) => openItemsFor(m, position.modules[m.moduleId], today))
		.sort((a, b) =>
			SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
			a.moduleId.localeCompare(b.moduleId) ||
			a.ruleId.localeCompare(b.ruleId),
		);
}

/* ------------------------------------------------------------------ */
/* Completeness                                                        */
/* ------------------------------------------------------------------ */

export interface Completeness {
	answered: number;
	total: number;
	/** Whole percent. */
	percent: number;
	/** Rounded to the nearest ten. The only form allowed to cross a boundary. */
	bucket: string;
	requiredOutstanding: string[];
}

/**
 * Information completeness: the share of a module's fields the person has
 * actually recorded. It measures their own input, never their risk. There is no
 * risk score anywhere in this system and there is not going to be one.
 */
export function completenessFor(module: ModuleDef, state: ModuleState | undefined): Completeness {
	const fields = state?.fields ?? {};
	const total = module.fields.length;
	let answered = 0;
	const requiredOutstanding: string[] = [];
	for (const field of module.fields) {
		if (!isBlank(fields[field.id])) answered += 1;
		else if (field.required) requiredOutstanding.push(field.label);
	}
	const percent = total === 0 ? 0 : Math.round((answered / total) * 100);
	return {
		answered,
		total,
		percent,
		bucket: String(Math.min(100, Math.max(0, Math.round(percent / 10) * 10))),
		requiredOutstanding,
	};
}

export function positionCompleteness(modules: ModuleDef[], position: Position): Completeness {
	let answered = 0;
	let total = 0;
	for (const m of modules) {
		const c = completenessFor(m, position.modules[m.moduleId]);
		answered += c.answered;
		total += c.total;
	}
	const percent = total === 0 ? 0 : Math.round((answered / total) * 100);
	return {
		answered,
		total,
		percent,
		bucket: String(Math.min(100, Math.max(0, Math.round(percent / 10) * 10))),
		requiredOutstanding: [],
	};
}

/** A module the visitor has touched at all. */
export function startedModules(modules: ModuleDef[], position: Position): ModuleDef[] {
	return modules.filter((m) => {
		const state = position.modules[m.moduleId];
		return state && Object.values(state.fields).some((v) => !isBlank(v));
	});
}

/* ------------------------------------------------------------------ */
/* Rule-set validation, run at build time                              */
/* ------------------------------------------------------------------ */

export interface RuleProblem {
	moduleId: string;
	ruleId: string;
	problem: string;
}

/** Words that would mean the rule had crossed into underwriting or pricing. */
const FORBIDDEN_PHRASES = [
	'you qualify', 'you are eligible', 'not eligible', 'ineligible',
	'is insurable', 'uninsurable', 'will be bound', 'is bound',
	'standard market', 'non-admitted market',
	'your premium will', 'estimated premium', 'your rate',
	'this is covered', 'is not covered', 'will be covered',
	'we recommend you buy', 'you should buy',
];

const NUMERIC_OPS: Operator[] = ['gt', 'gte', 'lt', 'lte'];

/**
 * Assert that a rule set stays inside the boundary. Called by
 * scripts/verify.mjs, so a rule that crosses the line fails the build rather
 * than reaching a reader.
 */
export function validateModule(module: ModuleDef, knownSourceIds: Set<string>, knownQuestions: Set<string>): RuleProblem[] {
	const problems: RuleProblem[] = [];
	const fieldById = new Map(module.fields.map((f) => [f.id, f]));
	const p = (ruleId: string, problem: string) => problems.push({ moduleId: module.moduleId, ruleId, problem });

	const seen = new Set<string>();
	for (const rule of module.rules) {
		if (seen.has(rule.id)) p(rule.id, 'duplicate rule id');
		seen.add(rule.id);

		const prose = `${rule.title} ${rule.detail} ${rule.action}`.toLowerCase();
		for (const phrase of FORBIDDEN_PHRASES) {
			if (prose.includes(phrase)) p(rule.id, `crosses the boundary: contains "${phrase}"`);
		}

		if (rule.when.all.length === 0) p(rule.id, 'has no condition, so it would always fire');

		for (const condition of rule.when.all) {
			const field = fieldById.get(condition.field);
			if (!field) {
				p(rule.id, `references unknown field "${condition.field}"`);
				continue;
			}
			if (NUMERIC_OPS.includes(condition.op) && !['number', 'date', 'band'].includes(field.kind)) {
				p(rule.id, `uses ${condition.op} on a ${field.kind} field "${condition.field}"`);
			}
			if (condition.op === 'includes' || condition.op === 'excludes') {
				if (!['multiselect', 'text'].includes(field.kind)) {
					p(rule.id, `uses ${condition.op} on a ${field.kind} field "${condition.field}"`);
				}
			}
			if (condition.value !== null && typeof condition.value === 'object' && 'field' in condition.value) {
				if (!fieldById.has(condition.value.field)) {
					p(rule.id, `compares against unknown field "${condition.value.field}"`);
				}
			}
			// A condition on an option field must name an option that exists, or it can
			// never fire. This checked only 'eq', which left 73 includes, excludes and
			// neq conditions unchecked - and those are the ones a typo hides in, because
			// the reachability probe synthesises its candidate value FROM the condition
			// and so agrees with the typo.
			const OPTION_OPS: Operator[] = ['eq', 'neq', 'includes', 'excludes'];
			if (OPTION_OPS.includes(condition.op) && field.options && typeof condition.value === 'string') {
				if (!field.options.some((o) => o.value === condition.value)) {
					p(
						rule.id,
						`uses ${condition.op} against "${condition.field}" with "${condition.value}", ` +
							'which is not one of its options',
					);
				}
			}

			// A date comparison must declare whether it is a rolling window or an
			// anchored date. A bare ISO string is neither: it is a rolling window
			// that was computed once at authoring time and is wrong the next day.
			const ordered = NUMERIC_OPS.includes(condition.op);
			if (field.kind === 'date' && ordered) {
				const v = condition.value;
				const isFieldRef = v !== null && typeof v === 'object' && 'field' in v;
				if (!isDateComparand(v) && !isFieldRef) {
					p(
						rule.id,
						`compares the date field "${condition.field}" to a bare value. Use ` +
							`{daysFromToday}/{monthsFromToday} for a rolling window, or ` +
							`{fixedDate, why} for a date that does not move.`,
					);
				}
			}
			if (isDateComparand(condition.value) && field.kind !== 'date') {
				p(rule.id, `uses a date comparand against the ${field.kind} field "${condition.field}"`);
			}
			if (isElapsedComparand(condition.value) && !['number', 'band'].includes(field.kind)) {
				p(rule.id, `uses yearsSince against the ${field.kind} field "${condition.field}"`);
			}
			if (condition.value !== null && typeof condition.value === 'object' && 'fixedDate' in condition.value) {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(condition.value.fixedDate)) {
					p(rule.id, `has fixedDate "${condition.value.fixedDate}", which is not an ISO date`);
				}
				if (!condition.value.why || condition.value.why.trim().length < 15) {
					p(rule.id, 'anchors a fixed date without saying why it does not move');
				}
			}
		}

		if (rule.sourceIds.length === 0 && rule.kind !== 'inconsistency') {
			p(rule.id, 'carries no source, and is not a pure arithmetic check');
		}
		for (const id of rule.sourceIds) {
			if (!knownSourceIds.has(id)) p(rule.id, `cites unknown source "${id}"`);
		}
		for (const marker of rule.detail.matchAll(/\[S:([a-zA-Z0-9._-]+)\]/g)) {
			if (!rule.sourceIds.includes(marker[1])) {
				p(rule.id, `marker [S:${marker[1]}] is not in the rule's sourceIds`);
			}
		}
		if (rule.relatedQuestion && !knownQuestions.has(rule.relatedQuestion)) {
			p(rule.id, `links unknown question "${rule.relatedQuestion}"`);
		}
	}

	for (const field of module.fields) {
		if (['select', 'multiselect', 'band'].includes(field.kind) && (!field.options || field.options.length === 0)) {
			p(`field:${field.id}`, `is a ${field.kind} with no options`);
		}
	}

	// A declared source no sentence points at makes no checkable claim, and it
	// still renders in the rule's ledger. That pads the apparent evidence base
	// with something the reader cannot verify, which is the exact failure the
	// marker system exists to prevent.
	for (const rule of module.rules) {
		const marked = new Set([...rule.detail.matchAll(/\[S:([a-z0-9-]+)\]/g)].map((m) => m[1]));
		for (const id of rule.sourceIds) {
			if (!marked.has(id)) p(rule.id, `declares the source "${id}" but no sentence cites it`);
		}
	}

	// A field that feeds no rule and is not declared as belonging on the brief is
	// a question asked for nothing. It also dilutes the completeness figure,
	// which is the one number this instrument publishes.
	const readByRule = new Set<string>();
	for (const rule of module.rules) {
		for (const condition of rule.when.all) {
			readByRule.add(condition.field);
			if (condition.value !== null && typeof condition.value === 'object' && 'field' in condition.value) {
				readByRule.add(condition.value.field);
			}
		}
	}
	for (const field of module.fields) {
		if ((field.purpose ?? 'rule-input') !== 'rule-input') continue;
		if (!readByRule.has(field.id)) {
			p(`field:${field.id}`, 'is a rule input that no rule reads. Give it a rule, or mark it brief-only.');
		}
	}

	return problems;
}
