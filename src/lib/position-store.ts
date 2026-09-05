/**
 * Local persistence for the Coverage Position.
 *
 * One key, one object, on the visitor's own device. Every module reads and writes
 * the same record, which is what makes cross-module open items possible.
 *
 * There is no server call anywhere in this file and there is not going to be one.
 * If the visitor clears site data the position is gone, because it was never
 * anywhere else.
 */
import { emptyPosition, POSITION_VERSION, type FieldValue, type Position } from './position';

const KEY = 'bir_position';

export function loadPosition(): Position {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return emptyPosition();
		const parsed = JSON.parse(raw) as Position;
		// A stale shape is discarded rather than migrated. The position is cheap to
		// rebuild and a half-migrated record would produce open items nobody can trust.
		if (parsed.version !== POSITION_VERSION) return emptyPosition();
		return {
			...emptyPosition(),
			...parsed,
			profile: { ...emptyPosition().profile, ...(parsed.profile ?? {}) },
			modules: parsed.modules ?? {},
		};
	} catch {
		return emptyPosition();
	}
}

export function savePosition(position: Position): 'saved' | 'unavailable' {
	try {
		localStorage.setItem(KEY, JSON.stringify({ ...position, savedAt: new Date().toISOString() }));
		return 'saved';
	} catch {
		return 'unavailable';
	}
}

export function clearPosition(): void {
	try {
		localStorage.removeItem(KEY);
	} catch {
		/* nothing to clear */
	}
}

/** Merge one module's recorded fields into the position and persist. */
export function writeModule(
	moduleId: string,
	fields: Record<string, FieldValue>,
): Position {
	const position = loadPosition();
	position.modules[moduleId] = { fields, touchedAt: new Date().toISOString() };
	savePosition(position);
	return position;
}

export function readModule(moduleId: string): Record<string, FieldValue> {
	return loadPosition().modules[moduleId]?.fields ?? {};
}

export function formatWhen(iso: string | null): string {
	if (!iso) return 'not yet';
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return 'an unknown time';
	return parsed.toLocaleString(undefined, {
		year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
	});
}
