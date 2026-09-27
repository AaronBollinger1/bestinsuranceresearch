/**
 * Business and property-investor research views (BR-E1).
 *
 * Permissions are explicit. Personal-insurance adapters stay disabled.
 * The presenter is a local document, not a published route.
 */
export const PROPERTY_VIEWS_PUBLIC: boolean = false;

export const VIEW_ROLES = ['organization', 'portfolio', 'property', 'location', 'policy-evidence', 'task', 'contributor'] as const;
export type ViewRole = (typeof VIEW_ROLES)[number];

export const VIEW_ACTIONS = [
	'view-organization',
	'view-portfolio',
	'view-property',
	'view-location',
	'view-evidence',
	'view-task',
	'view-own-draft',
] as const;
export type ViewAction = (typeof VIEW_ACTIONS)[number];

export const PRIMARY_LINES = ['commercial-property', 'commercial-general-liability', 'business-income'] as const;

export const PERSONAL_ADAPTERS = [
	{ id: 'personal-auto', line: 'auto', enabled: false },
	{ id: 'personal-homeowners', line: 'homeowners', enabled: false },
	{ id: 'personal-renters', line: 'renters', enabled: false },
] as const;

const GRANTS: Record<ViewRole, readonly ViewAction[]> = {
	organization: ['view-organization', 'view-portfolio'],
	portfolio: ['view-portfolio', 'view-property'],
	property: ['view-property', 'view-location'],
	location: ['view-location'],
	'policy-evidence': ['view-evidence'],
	task: ['view-task'],
	contributor: ['view-own-draft'],
};

export function can(role: ViewRole, action: ViewAction): { allowed: boolean; reason: string } {
	const allowed = GRANTS[role].includes(action);
	return {
		allowed,
		reason: allowed ? `${role} may ${action}.` : `${role} may not ${action}.`,
	};
}

export function callPersonalAdapter(id: string): { enabled: false; calls: 0; reason: string } {
	return { enabled: false, calls: 0, reason: `${id} is a disabled personal-insurance adapter.` };
}

export type ResearchViewState = 'loading' | 'error' | 'empty' | 'offline' | 'review' | 'permission' | 'conflict' | 'ready';

export function layoutAt(width: number): 'stack' | 'split' | 'wide' {
	if (width < 768) return 'stack';
	if (width < 1280) return 'split';
	return 'wide';
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function presentResearchView(input: {
	role: ViewRole;
	action: ViewAction;
	state: ResearchViewState;
	title: string;
	conflict?: { left: string; right: string };
}): { html: string; indexable: false; state: ResearchViewState } {
	const gate = can(input.role, input.action);
	const state = gate.allowed ? input.state : 'permission';
	const title = state === 'permission' ? 'Permission required' : escapeHtml(input.title);
	const left = escapeHtml(input.conflict?.left ?? '');
	const right = escapeHtml(input.conflict?.right ?? '');
	const body = state === 'loading'
		? '<p role="status">Loading the fixture portfolio.</p>'
		: state === 'error'
			? '<p role="alert">The fixture view failed. Nothing was invented.</p>'
			: state === 'empty'
				? '<p role="status">No properties are in this portfolio.</p>'
				: state === 'offline'
					? '<p role="status">Offline. The last fixture copy is not being refreshed.</p>'
					: state === 'review'
						? '<p role="status">This view is in review and is not published.</p>'
						: state === 'permission'
							? `<p role="status">${escapeHtml(gate.reason)}</p>`
							: state === 'conflict'
								? `<section aria-label="First reading"><p>${left}</p></section><section aria-label="Second reading"><p>${right}</p></section>`
								: '<p>Commercial property and liability are the lines in this fixture view.</p>';
	const html = `<!doctype html><html lang="en"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<style>
.view { display: block; }
@media (min-width: 768px) { .view { display: grid; grid-template-columns: 1fr 1fr; } }
@media (min-width: 1280px) { .view { grid-template-columns: 16rem 1fr 20rem; } }
</style>
</head><body><main class="view" data-state="${state}">
<h1>${title}</h1>
${body}
</main></body></html>`;
	return { html, indexable: false, state };
}
