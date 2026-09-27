/**
 * Consented multi-angle property visualization (BR-E2 / BR-10).
 *
 * The 2D board is the record. An optional sketch is approximate and is not
 * a measurement. No imagery provider is signed. Permissions come from BR-E1.
 */
import { can, type ViewRole } from './property-research-views.ts';

export const IMAGERY_PROVIDER_SIGNED: boolean = false;
export const VISUAL_PUBLIC: boolean = false;

export const ANGLES = ['north', 'east', 'south', 'west'] as const;
export type CaptureAngle = (typeof ANGLES)[number];

export interface Capture {
	id: string;
	angle: CaptureAngle;
	quality: 'sufficient' | 'insufficient';
	note: string;
	bytes: number;
}

export interface VisualBoard {
	propertyId: string;
	address: string;
	consented: boolean;
	captures: Capture[];
	conflicts: Array<{ angle: CaptureAngle; left: string; right: string }>;
	corrections: Array<{ at: string; note: string; was: string }>;
	state: 'consent-required' | 'ready' | 'property-mismatch' | 'quality-insufficient' | 'upload-failed' | 'deleted' | 'retained' | 'conflict' | 'corrected' | 'in-review' | 'permission' | 'shared' | 'exported' | 'cost-blocked' | 'provider-outage' | 'rolled-back';
	retainedUntil: string | null;
	shared: boolean;
	providerCalls: number;
	spend: number;
	model: { shown: boolean; approximate: true; measurement: false; label: string } | null;
}

const MAX_BYTES = 512 * 1024;

export function createBoard(propertyId: string, address: string): VisualBoard {
	return {
		propertyId,
		address,
		consented: false,
		captures: [],
		conflicts: [],
		corrections: [],
		state: 'consent-required',
		retainedUntil: null,
		shared: false,
		providerCalls: 0,
		spend: 0,
		model: null,
	};
}

export function grantConsent(board: VisualBoard, purpose: string): VisualBoard {
	if (!purpose.trim()) return { ...board, state: 'consent-required' };
	return { ...board, consented: true, state: 'ready' };
}

export function addCapture(board: VisualBoard, input: {
	angle: CaptureAngle;
	quality: 'sufficient' | 'insufficient';
	note: string;
	bytes: number;
	statedAddress: string;
	mime: string;
}): { board: VisualBoard; ok: boolean } {
	if (!board.consented) return { ok: false, board: { ...board, state: 'consent-required' } };
	if (input.statedAddress.trim() !== board.address) return { ok: false, board: { ...board, state: 'property-mismatch' } };
	if (input.quality !== 'sufficient' || !(ANGLES as readonly string[]).includes(input.angle)) {
		return { ok: false, board: { ...board, state: 'quality-insufficient' } };
	}
	if (input.mime !== 'image/jpeg' || input.bytes < 1 || input.bytes > MAX_BYTES) {
		return { ok: false, board: { ...board, state: 'upload-failed', captures: board.captures } };
	}
	const captures = [...board.captures, { id: `cap-${board.captures.length + 1}`, angle: input.angle, quality: input.quality, note: input.note.trim(), bytes: input.bytes }];
	return { ok: true, board: { ...board, captures, state: 'ready', model: modelFor(captures) } };
}

export function deleteCapture(board: VisualBoard, id: string, retainUntil: string): VisualBoard {
	return {
		...board,
		captures: board.captures.filter((capture) => capture.id !== id),
		state: 'retained',
		retainedUntil: retainUntil,
		model: null,
	};
}

export function recordConflict(board: VisualBoard, angle: CaptureAngle, left: string, right: string): VisualBoard {
	return { ...board, state: 'conflict', conflicts: [...board.conflicts, { angle, left, right }] };
}

export function correctNote(board: VisualBoard, id: string, note: string, at: string): VisualBoard {
	const prior = board.captures.find((capture) => capture.id === id);
	if (!prior || !note.trim()) return board;
	return {
		...board,
		state: 'corrected',
		captures: board.captures.map((capture) => capture.id === id ? { ...capture, note: note.trim() } : capture),
		corrections: [...board.corrections, { at, note: note.trim(), was: prior.note }],
	};
}

export function markReview(board: VisualBoard): VisualBoard {
	return { ...board, state: 'in-review' };
}

export function shareBoard(board: VisualBoard, role: ViewRole): VisualBoard {
	if (!can(role, 'view-property').allowed) return { ...board, state: 'permission', shared: false };
	return { ...board, state: 'shared', shared: true };
}

export function exportBoard(board: VisualBoard, role: ViewRole): { ok: boolean; state: VisualBoard['state']; body?: Record<string, unknown> } {
	if (!can(role, 'view-property').allowed) return { ok: false, state: 'permission' };
	return {
		ok: true,
		state: 'exported',
		body: {
			propertyId: board.propertyId,
			address: board.address,
			captures: board.captures.map((capture) => ({ angle: capture.angle, note: capture.note })),
			model: board.model,
			measurement: false,
			indexable: false,
		},
	};
}

export function imageryOutage(board: VisualBoard): VisualBoard {
	return { ...board, state: 'provider-outage', providerCalls: 0, spend: 0, model: null };
}

export function blockCost(board: VisualBoard): VisualBoard {
	return { ...board, state: 'cost-blocked', providerCalls: 0, spend: 0 };
}

export function rollbackBoard(board: VisualBoard, previous: VisualBoard): VisualBoard {
	return {
		...previous,
		captures: previous.captures.map((capture) => ({ ...capture, bytes: 0 })),
		state: 'rolled-back',
		providerCalls: 0,
		spend: 0,
		model: null,
		corrections: board.corrections,
	};
}

function modelFor(captures: Capture[]): VisualBoard['model'] {
	const angles = new Set(captures.filter((capture) => capture.quality === 'sufficient').map((capture) => capture.angle));
	if (angles.size < ANGLES.length) return null;
	return {
		shown: true,
		approximate: true,
		measurement: false,
		label: 'Approximate sketch. Not an underwriting measurement.',
	};
}

export function presentBoard(board: VisualBoard, role: ViewRole): { html: string; indexable: false; fallback: '2d' } {
	const gate = can(role, 'view-property');
	const title = gate.allowed ? escapeHtml(`${board.address} evidence board`) : 'Permission required';
	const shots = gate.allowed
		? board.captures.map((capture) => `<li>${escapeHtml(capture.angle)}: ${escapeHtml(capture.note)}</li>`).join('')
		: '';
	const model = gate.allowed && board.model?.shown
		? `<p data-approximate="true">${escapeHtml(board.model.label)}</p>`
		: '';
	const fallback = gate.allowed ? '<p data-fallback="2d">2D evidence board. No model is required.</p>' : '';
	const conflicts = gate.allowed
		? board.conflicts.map((conflict) => `<p>${escapeHtml(conflict.left)}</p><p>${escapeHtml(conflict.right)}</p>`).join('')
		: '';
	const html = `<!doctype html><html lang="en"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
</head><body><main>
<h1>${title}</h1>
<p role="status">${escapeHtml(board.state)}</p>
<ul>${shots}</ul>
${conflicts}
${fallback}
${model}
</main></body></html>`;
	return { html, indexable: false, fallback: '2d' };
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
