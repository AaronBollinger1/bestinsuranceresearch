/**
 * Advisory instrument verification.
 *
 * The boundary in POSITIONING.md is enforced here, not merely stated. A rule that
 * crosses it fails the build rather than reaching a reader.
 *
 *   npm run build && npm run verify
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'src/content');

if (!fs.existsSync(DIST)) {
	console.error('dist/ not found. Run `npm run build` first.');
	process.exit(1);
}

const read = (f) => fs.readFileSync(f, 'utf8');
const collection = (name) => {
	const dir = path.join(CONTENT, name);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => ({ id: f.replace(/\.json$/, ''), data: JSON.parse(read(path.join(dir, f))) }));
};

const modules = collection('modules');
const sources = collection('sources');
const sourceIds = new Set(sources.map((s) => s.id));
const questionSlugs = new Set(collection('questions').map((q) => q.id));

const {
	validateModule,
	evaluateRule,
	resolveComparand,
	todayIso,
	shiftIsoDate,
	isDateComparand,
	completenessFor,
	openItemsFor,
	evaluatePosition,
	emptyPosition,
} = await import(new URL('../src/lib/position.ts', import.meta.url).href);

const defOf = (m) => ({ moduleId: m.id, ...m.data });

/* ------------------------------------------------------------------ */

test('the instrument publishes modules, and each has a route', () => {
	assert.ok(modules.length >= 4, `expected several modules, found ${modules.length}`);
	for (const m of modules) {
		const page = path.join(DIST, 'tools', m.id, 'index.html');
		assert.ok(fs.existsSync(page), `module ${m.id} has no built page`);
	}
	assert.ok(fs.existsSync(path.join(DIST, 'position', 'index.html')), 'the position surface is not built');
});

test('every rule stays inside the boundary and references only real fields', () => {
	const problems = [];
	for (const m of modules) problems.push(...validateModule(defOf(m), sourceIds, questionSlugs));
	assert.deepEqual(
		problems,
		[],
		`rule problems:\n${problems.map((p) => `  ${p.moduleId}/${p.ruleId}: ${p.problem}`).join('\n')}`,
	);
});

test('no rule states an eligibility, price, appetite, or coverage verdict', () => {
	// A second, blunter pass over the rendered prose, independent of validateModule.
	/*
	 * What is being guarded against is a verdict about THIS reader's insurance.
	 * An accurate quotation of, say, FMLA employee eligibility is not that, so the
	 * patterns are anchored to insurance subjects rather than to the bare word
	 * "eligible", which appears legitimately in employment and benefits law.
	 */
	const banned = [
		/\byou (?:do )?qualify\b/i,
		/\byou(?:'re| are) (?:not )?eligible\b/i,
		/\beligible for (?:coverage|the standard market|the fair plan|surplus lines)\b/i,
		/\b(?:the )?(?:risk|property|business|home|vehicle) (?:is|are) (?:not )?eligible\b/i,
		/\buninsurable\b/i,
		/\b(?:is|are) insurable\b/i,
		/\bwill be bound\b/i,
		/\byour (?:premium|rate) (?:will|is|would)\b/i,
		/\bestimated premium\b/i,
		/\bthis (?:is|is not) covered\b/i,
		/\bwe recommend you (?:buy|purchase)\b/i,
		/\brisk score\b/i,
	];
	for (const m of modules) {
		for (const rule of m.data.rules) {
			const prose = `${rule.title} ${rule.detail} ${rule.action}`;
			for (const pattern of banned) {
				assert.ok(!pattern.test(prose), `${m.id}/${rule.id} matches ${pattern}`);
			}
		}
	}
});

test('no rule fires on an empty position', () => {
	// Someone who has recorded nothing must see nothing. An open item a person
	// cannot act on is worse than no open item at all.
	for (const m of modules) {
		const items = openItemsFor(defOf(m), { fields: {}, touchedAt: null });
		assert.deepEqual(items, [], `${m.id} fires ${items.length} rules with nothing recorded`);
	}
	assert.deepEqual(evaluatePosition(modules.map(defOf), emptyPosition()), []);
});

test('completeness measures recorded fields and stays inside its bounds', () => {
	for (const m of modules) {
		const def = defOf(m);
		const none = completenessFor(def, { fields: {}, touchedAt: null });
		assert.equal(none.answered, 0);
		assert.equal(none.percent, 0);

		const all = {};
		for (const f of m.data.fields) {
			all[f.id] =
				f.kind === 'number' ? 1 : f.kind === 'boolean' ? true : f.kind === 'multiselect' ? ['x'] : 'x';
		}
		const full = completenessFor(def, { fields: all, touchedAt: null });
		assert.equal(full.answered, m.data.fields.length);
		assert.equal(full.percent, 100);
		assert.equal(full.bucket, '100');
	}
});

test('the completeness bucket is always a multiple of ten', () => {
	// The bucket is the only completeness value allowed to cross a boundary, so it
	// must never be fine-grained enough to act as a fingerprint.
	for (const m of modules) {
		const def = defOf(m);
		for (let take = 0; take <= m.data.fields.length; take += 1) {
			const fields = {};
			for (const f of m.data.fields.slice(0, take)) fields[f.id] = 'x';
			const c = completenessFor(def, { fields, touchedAt: null });
			assert.equal(Number(c.bucket) % 10, 0, `${m.id} produced bucket ${c.bucket}`);
			assert.ok(Number(c.bucket) >= 0 && Number(c.bucket) <= 100);
		}
	}
});

/** Shift an ISO date by whole days, staying in UTC so there is no zone drift. */
const TODAY = todayIso();

function shiftDate(iso, days) {
	const t = new Date(`${iso}T00:00:00Z`);
	t.setUTCDate(t.getUTCDate() + days);
	return t.toISOString().slice(0, 10);
}

/**
 * Synthesise one recorded state that satisfies every condition in a rule, so the
 * rule can be shown to be reachable.
 *
 * Conditions are grouped by field first. A single multiselect legitimately carries
 * several conditions at once, for example "includes direct-supervisor" plus
 * "excludes" every other channel, which is how a rule says "this is the only
 * channel". Solving per condition rather than per field would overwrite the value
 * and make that rule look dead when it is not.
 */
function satisfyingState(rule, fieldDefs) {
	const byField = new Map();
	for (const c of rule.when.all) {
		if (!byField.has(c.field)) byField.set(c.field, []);
		byField.get(c.field).push(c);
	}

	const state = {};
	for (const [fieldId, conditions] of byField) {
		const def = fieldDefs.find((f) => f.id === fieldId);
		if (!def) return null;

		// A field-to-field comparison is solved after the literal ones. Every other
		// comparand is resolved through the engine first: a rolling date window or
		// a yearsSince count is an object, and only the engine knows what it means.
		const literals = conditions
			.filter((c) => !(c.value && typeof c.value === 'object' && c.value.field))
			.map((c) =>
				c.value !== null && typeof c.value === 'object'
					? { ...c, value: resolveComparand(c.value, {}, TODAY) }
					: c,
			);
		if (literals.length === 0) continue;

		if (def.kind === 'multiselect') {
			const required = literals.filter((c) => c.op === 'includes').map((c) => String(c.value));
			const forbidden = new Set(literals.filter((c) => c.op === 'excludes').map((c) => String(c.value)));
			if (required.some((v) => forbidden.has(v))) return null; // genuinely contradictory
			if (literals.some((c) => c.op === 'isEmpty')) continue;
			const value = required.length > 0 ? required : ['__probe__'];
			if (value.some((v) => forbidden.has(v))) return null;
			state[fieldId] = value;
			continue;
		}

		for (const c of literals) {
			const isDate = typeof c.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.value);
			switch (c.op) {
				case 'isSet': state[fieldId] = 'x'; break;
				case 'isEmpty': delete state[fieldId]; break;
				case 'eq': state[fieldId] = c.value; break;
				case 'neq': state[fieldId] = def.kind === 'number' ? -99999 : '__other__'; break;
				case 'includes': state[fieldId] = String(c.value); break;
				case 'excludes': state[fieldId] = '__other__'; break;
				case 'gt': state[fieldId] = isDate ? shiftDate(c.value, 1) : Number(c.value) + 1; break;
				case 'gte': state[fieldId] = isDate ? c.value : Number(c.value); break;
				case 'lt': state[fieldId] = isDate ? shiftDate(c.value, -1) : Number(c.value) - 1; break;
				case 'lte': state[fieldId] = isDate ? c.value : Number(c.value); break;
				default: return null;
			}
		}
	}

	// Field-to-field comparisons, set consistently on both sides.
	for (const c of rule.when.all) {
		if (!(c.value && typeof c.value === 'object' && c.value.field)) continue;
		if (c.op === 'gt') { state[c.field] = 10; state[c.value.field] = 1; }
		else if (c.op === 'gte') { state[c.field] = 10; state[c.value.field] = 10; }
		else if (c.op === 'lt') { state[c.field] = 1; state[c.value.field] = 10; }
		else if (c.op === 'lte') { state[c.field] = 10; state[c.value.field] = 10; }
		else if (c.op === 'eq') { state[c.field] = 'same'; state[c.value.field] = 'same'; }
		else if (c.op === 'neq') { state[c.field] = 'a'; state[c.value.field] = 'b'; }
	}

	return state;
}

test('every rule is reachable: some recorded state makes it fire', () => {
	// A rule that can never fire is dead weight that looks like coverage.
	const unreachable = [];
	for (const m of modules) {
		for (const rule of m.data.rules) {
			const state = satisfyingState(rule, m.data.fields);
			if (state === null) {
				unreachable.push(`${m.id}/${rule.id} (no satisfying state exists)`);
				continue;
			}
			if (!evaluateRule(rule, state, TODAY)) unreachable.push(`${m.id}/${rule.id}`);
		}
	}
	assert.deepEqual(unreachable, [], `rules that never fire:\n  ${unreachable.join('\n  ')}`);
});

test('date arithmetic is calendar-correct, including month-end and leap years', () => {
	// A rolling window is only as good as the arithmetic under it, and the
	// month-end cases are where a naive implementation silently overflows.
	const cases = [
		['2026-08-31', { months: -12 }, '2025-08-31'],
		['2026-08-31', { months: -24 }, '2024-08-31'],
		['2026-08-31', { days: -60 }, '2026-07-02'],
		['2026-08-31', { days: -300 }, '2025-11-04'],
		['2026-08-31', { days: 60 }, '2026-10-30'],
		['2026-03-31', { months: -1 }, '2026-02-28'],
		['2024-03-31', { months: -1 }, '2024-02-29'],
		['2026-01-15', { months: -1 }, '2025-12-15'],
		['2026-12-15', { months: 1 }, '2027-01-15'],
		['2026-01-31', { months: -14 }, '2024-11-30'],
		['2026-03-01', { days: -1 }, '2026-02-28'],
	];
	for (const [iso, shift, want] of cases) {
		assert.equal(shiftIsoDate(iso, shift), want, iso + ' ' + JSON.stringify(shift));
	}
});

test('no rule compares a date to a value frozen at build time', () => {
	// The defect this replaced: a rolling window written as a literal is computed
	// once and is wrong the next day. A date comparison must declare itself as a
	// rolling window, an anchored date with a reason, or another recorded field.
	for (const m of modules) {
		const kindOf = new Map(m.data.fields.map((f) => [f.id, f.kind]));
		for (const rule of m.data.rules) {
			for (const c of rule.when.all) {
				if (!['gt', 'gte', 'lt', 'lte'].includes(c.op)) continue;
				if (kindOf.get(c.field) !== 'date') continue;
				const isFieldRef = c.value && typeof c.value === 'object' && c.value.field;
				assert.ok(
					isDateComparand(c.value) || isFieldRef,
					m.id + '/' + rule.id + ' compares the date field "' + c.field +
						'" to a frozen value (' + JSON.stringify(c.value) + ')',
				);
			}
		}
	}
});

test('no rule detail quotes a date that only the build date could produce', () => {
	// A rolling comparand with a frozen sentence beside it is worse than a frozen
	// comparand: the rule fires correctly and then explains itself with a date
	// that has since moved. Publication dates of cited sources are exempt.
	const publicationDates = new Set(sources.map((s) => s.data.publishedDate).filter(Boolean));
	for (const m of modules) {
		for (const rule of m.data.rules) {
			const prose = [rule.title, rule.detail, rule.action].join(' ');
			for (const found of prose.match(/\d{4}-\d{2}-\d{2}/g) ?? []) {
				assert.ok(
					publicationDates.has(found),
					m.id + '/' + rule.id + ' states the date ' + found +
						', which is not a cited publication date. Say the interval, not the boundary.',
				);
			}
		}
	}
});

test('no module field collects an identifier or health information', () => {
	const banned =
		/\b(your name|full name|policy number|claim number|street address|date of birth|social security|diagnosis|medical condition|prescription)\b/i;
	for (const m of modules) {
		for (const field of m.data.fields) {
			assert.ok(!banned.test(field.label), `${m.id}/${field.id} asks for identifying or health data`);
		}
		// Free text is where identifying data leaks in, so it needs a stated warning.
		for (const field of m.data.fields.filter((f) => f.kind === 'text')) {
			assert.ok(field.privacyNote, `${m.id}/${field.id} is free text with no privacy note`);
		}
	}
});

test('every module page states its privacy boundary and has no file input', () => {
	for (const m of modules) {
		const html = read(path.join(DIST, 'tools', m.id, 'index.html'));
		assert.ok(
			html.includes(m.data.privacyBoundary.slice(0, 40)),
			`${m.id} does not state its privacy boundary on the page itself`,
		);
		assert.ok(!/type="file"/.test(html), `${m.id} has a file input`);
		assert.ok(!/\[S:[a-z0-9-]+\]/.test(html), `${m.id} leaked a raw citation marker`);
	}
});

test('the position surface names its boundary and refuses a risk score', () => {
	const html = read(path.join(DIST, 'position', 'index.html'));
	assert.match(html, /there is no risk score/i, 'the position must say there is no risk score');
	assert.match(html, /It will not/i, 'the position must state what it will not do');
	assert.ok(!/type="file"/.test(html), 'the position has a file input');
	assert.ok(!/\[S:[a-z0-9-]+\]/.test(html), 'the position leaked a raw citation marker');
});

test('citation markers on the position link to a source page, not a missing anchor', () => {
	// The position lists open items without rendering a ledger, so a #source-N
	// anchor would point at nothing. That is exactly the failure the citation
	// system exists to prevent.
	const html = read(path.join(DIST, 'position', 'index.html'));
	const anchors = html.match(/class="cite" href="#source-\d+"/g) || [];
	assert.deepEqual(anchors, [], 'the position emits ledger anchors but renders no ledger');
	const absolute = html.match(/class=\\?"cite\\?" href=\\?"\/sources\//g) || [];
	assert.ok(absolute.length > 0, 'the position emits no absolute source links');
});

test('every rule source and related question resolves', () => {
	for (const m of modules) {
		for (const rule of m.data.rules) {
			for (const id of rule.sourceIds) {
				assert.ok(sourceIds.has(id), `${m.id}/${rule.id} cites unknown source "${id}"`);
				assert.ok(
					fs.existsSync(path.join(DIST, 'sources', id, 'index.html')),
					`${m.id}/${rule.id} cites "${id}" which has no built page`,
				);
			}
			if (rule.relatedQuestion) {
				assert.ok(questionSlugs.has(rule.relatedQuestion), `${m.id}/${rule.id} links unknown question`);
			}
		}
	}
});

test('module content is ASCII', () => {
	for (const m of modules) {
		const text = JSON.stringify(m.data);
		const bad = text.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
		assert.equal(bad, null, `modules/${m.id} contains non-ASCII: ${[...new Set(bad || [])].join(' ')}`);
	}
});

test('every module names an author, a reviewer, and its review state', () => {
	for (const m of modules) {
		assert.ok(m.data.author, `${m.id} has no author`);
		assert.ok(m.data.reviewer, `${m.id} has no reviewer`);
		assert.ok(
			['reviewed', 'under-review', 'corrected'].includes(m.data.reviewState),
			`${m.id} has an invalid review state`,
		);
	}
});

test('every rule kind is represented across the instrument', () => {
	// All five kinds exist because each one catches a different class of problem.
	// If a kind disappears, the instrument has quietly narrowed.
	const kinds = new Set(modules.flatMap((m) => m.data.rules.map((r) => r.kind)));
	for (const kind of ['gap', 'inconsistency', 'timing', 'documentation', 'question']) {
		assert.ok(kinds.has(kind), `no rule of kind "${kind}" exists anywhere`);
	}
});
