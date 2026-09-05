/**
 * Local-only tool persistence.
 *
 * Every tool on this site keeps its working state in the visitor's own browser and
 * nowhere else. There is no server call, no upload, and no identifier. If the
 * visitor clears site data the work is gone, because it was never anywhere else.
 *
 * The shape stored is deliberately small and the reader is told exactly what is in
 * it on each tool page.
 */

export interface ToolSnapshot {
	/** Tool id, so one tool can never read another's state. */
	tool: string;
	/** Bumped when the stored shape changes, so a stale snapshot is discarded. */
	version: number;
	savedAt: string;
	state: Record<string, unknown>;
}

const VERSION = 1;
const prefix = (tool: string) => `bir_tool_${tool}`;

export function saveState(tool: string, state: Record<string, unknown>): 'saved' | 'unavailable' {
	const snapshot: ToolSnapshot = {
		tool,
		version: VERSION,
		savedAt: new Date().toISOString(),
		state,
	};
	try {
		localStorage.setItem(prefix(tool), JSON.stringify(snapshot));
		return 'saved';
	} catch {
		return 'unavailable';
	}
}

export function loadState(tool: string): { state: Record<string, unknown>; savedAt: string } | null {
	try {
		const raw = localStorage.getItem(prefix(tool));
		if (!raw) return null;
		const snapshot = JSON.parse(raw) as ToolSnapshot;
		if (snapshot.tool !== tool || snapshot.version !== VERSION) return null;
		return { state: snapshot.state ?? {}, savedAt: snapshot.savedAt };
	} catch {
		return null;
	}
}

export function clearState(tool: string): void {
	try {
		localStorage.removeItem(prefix(tool));
	} catch {
		/* nothing to clear */
	}
}

/** Percent of rows the visitor has actually touched, rounded to the nearest ten. */
export function completionBucket(touched: number, total: number): string {
	if (total === 0) return '0';
	const pct = Math.round((touched / total) * 100);
	return String(Math.min(100, Math.max(0, Math.round(pct / 10) * 10)));
}

export function formatSavedAt(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return 'an unknown time';
	return parsed.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}
