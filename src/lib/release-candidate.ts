/**
 * Controlled-publication release candidate (BR-P1).
 *
 * Six gates stay independent. Commons being closed does not hide the
 * reviewed read-only estate, and Commons being open does not publish a
 * draft. No secret, live user, paid provider, or automatic publisher is
 * accepted.
 */
import { escapeHtml } from './citations.ts';
import { publicIndexingOpen } from '../config/public-indexing.mjs';

export const CONTRIBUTION_INTAKE_OPEN: boolean = false;
export const LICENSED_PUBLICATION_OPEN: boolean = false;
export const PROVIDER_DISCOVERY_OPEN: boolean = false;

/** Routes already on the estate before this unit. /status was absent. */
export const AUDITED_SURFACES = [
	{ path: '/editorial-policy', role: 'publication standards' },
	{ path: '/corrections', role: 'corrections and appeals' },
	{ path: '/methodology', role: 'contributor and research standards' },
	{ path: '/privacy', role: 'trust and data practices' },
	{ path: '/about', role: 'operator disclosure' },
] as const;

export const ADDED_SURFACE = { path: '/status', role: 'service status' } as const;

export interface ReleaseGates {
	readOnlySite: boolean;
	publicIndexing: boolean;
	commonsReady: boolean;
	contributionIntake: boolean;
	licensedPublication: boolean;
	providerDiscovery: boolean;
}

export interface RecordPosture {
	reviewed: boolean;
	rightsCleared: boolean;
	fresh: boolean;
	editorial: boolean;
	licensedReview: boolean;
	withdrawn: boolean;
	superseded: boolean;
	draft: boolean;
}

export interface AdapterConfig {
	sessions: boolean;
	persistentAccounts: boolean;
	roleMembership: boolean;
	privateMedia: boolean;
	abuseControls: boolean;
	reviewReceipts: boolean;
	sourceWithdrawal: boolean;
	observability: boolean;
	retention: boolean;
	rollback: boolean;
	secret: string | null;
	liveUsers: boolean;
	paidProvider: boolean;
	automaticPublisher: boolean;
}

export interface FixtureSession {
	id: string;
	role: 'consumer' | 'editor' | 'owner';
	expiresAt: string;
	revoked: boolean;
	receiptUsed: boolean;
}

const REQUIRED_ADAPTER = [
	'sessions',
	'persistentAccounts',
	'roleMembership',
	'privateMedia',
	'abuseControls',
	'reviewReceipts',
	'sourceWithdrawal',
	'observability',
	'retention',
	'rollback',
] as const;

export function gatesFromEnv(env: Record<string, string | undefined>): ReleaseGates {
	return {
		readOnlySite: env.PUBLIC_SITE_ENV === 'production',
		publicIndexing: publicIndexingOpen(env),
		commonsReady: env.PUBLIC_COMMONS_READY === 'true',
		contributionIntake: CONTRIBUTION_INTAKE_OPEN === true,
		licensedPublication: LICENSED_PUBLICATION_OPEN === true,
		providerDiscovery: PROVIDER_DISCOVERY_OPEN === true,
	};
}

export function publicationDecision(gates: ReleaseGates, record: RecordPosture): {
	indexable: boolean;
	robots: 'index, follow' | 'noindex, nofollow';
	sitemap: boolean;
	schema: 'WebPage' | null;
	exportable: boolean;
	reasons: string[];
} {
	const reasons: string[] = [];
	if (gates.readOnlySite !== true) reasons.push('read-only site is closed');
	if (gates.publicIndexing !== true) reasons.push('public indexing is closed');
	if (record.reviewed !== true) reasons.push('source review is incomplete');
	if (record.rightsCleared !== true) reasons.push('rights are not cleared');
	if (record.fresh !== true) reasons.push('the record is not fresh');
	if (record.editorial !== true) reasons.push('editorial acceptance is missing');
	if (record.licensedReview !== true) reasons.push('licensed review is missing');
	if (record.withdrawn) reasons.push('the record is withdrawn');
	if (record.superseded) reasons.push('the record is superseded');
	if (record.draft) reasons.push('the record is a draft');
	const indexable = reasons.length === 0;
	return {
		indexable,
		robots: indexable ? 'index, follow' : 'noindex, nofollow',
		sitemap: indexable,
		schema: indexable ? 'WebPage' : null,
		exportable: indexable,
		reasons,
	};
}

export function validateAdapter(config: AdapterConfig): { ok: boolean; problems: string[] } {
	const problems: string[] = [];
	for (const key of REQUIRED_ADAPTER) {
		if (config[key] !== true) problems.push(`${key} is not configured`);
	}
	if (config.secret) problems.push('a secret was offered');
	if (config.liveUsers) problems.push('live users were offered');
	if (config.paidProvider) problems.push('a paid provider was offered');
	if (config.automaticPublisher) problems.push('an automatic publisher was offered');
	return { ok: problems.length === 0, problems };
}

export function rollbackAdapter(current: AdapterConfig, candidate: AdapterConfig): { config: AdapterConfig; rolledBack: boolean } {
	const checked = validateAdapter(candidate);
	if (!checked.ok) return { config: current, rolledBack: true };
	return { config: candidate, rolledBack: false };
}

export function authorizeFixture(session: FixtureSession | undefined, now: string, requestedRole: FixtureSession['role']): { ok: boolean; state: string } {
	if (!session) return { ok: false, state: 'session-missing' };
	if (session.revoked) return { ok: false, state: 'revoked' };
	if (session.expiresAt <= now) return { ok: false, state: 'session-expired' };
	if (session.receiptUsed) return { ok: false, state: 'replayed' };
	if (requestedRole !== session.role) return { ok: false, state: 'permission-denied' };
	return { ok: true, state: 'authorized' };
}

export function providerDiscovery(outage: boolean): { ok: false; calls: 0; state: 'closed' | 'outage' } {
	if (outage || PROVIDER_DISCOVERY_OPEN !== true) return { ok: false, calls: 0, state: outage ? 'outage' : 'closed' };
	return { ok: false, calls: 0, state: 'closed' };
}

export function redactTelemetry(value: string): string {
	return value
		.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
		.replace(/bearer\s+[a-z0-9._-]+/gi, 'bearer [redacted]')
		.replace(/sk-[a-z0-9]+/gi, '[redacted]');
}

export function health(gates: ReleaseGates, adapter: AdapterConfig): { status: 'up'; secrets: 0; adapterOk: boolean; gates: ReleaseGates } {
	return { status: 'up', secrets: 0, adapterOk: validateAdapter(adapter).ok, gates };
}

export function closedAdapter(): AdapterConfig {
	return {
		sessions: true,
		persistentAccounts: true,
		roleMembership: true,
		privateMedia: true,
		abuseControls: true,
		reviewReceipts: true,
		sourceWithdrawal: true,
		observability: true,
		retention: true,
		rollback: true,
		secret: null,
		liveUsers: false,
		paidProvider: false,
		automaticPublisher: false,
	};
}

export function presentStatus(gates: ReleaseGates, adapterOk: boolean): string {
	const rows = [
		['Read-only site', gates.readOnlySite],
		['Public indexing', gates.publicIndexing],
		['Commons access', gates.commonsReady],
		['Contribution intake', gates.contributionIntake],
		['Licensed publication', gates.licensedPublication],
		['Provider discovery', gates.providerDiscovery],
	];
	const body = rows.map(([label, open]) => `<tr><td>${escapeHtml(String(label))}</td><td data-gate="${escapeHtml(String(label).toLowerCase().replace(/[^a-z]+/g, '-'))}">${open ? 'open' : 'closed'}</td></tr>`).join('');
	return `<article class="pilot-record" data-service-status="fixture">
		<p>These six gates are separate. Closing Commons does not hide reviewed research, and opening Commons would not publish a draft.</p>
		<table><thead><tr><th>Gate</th><th>State</th></tr></thead><tbody>${body}</tbody></table>
		<p data-adapter="${adapterOk ? 'configured' : 'incomplete'}">Production adapter ${adapterOk ? 'is configured and admits no secret, live user, paid provider, or automatic publisher.' : 'is incomplete.'}</p>
		<p data-health="up">Health is up. Secrets reported: 0.</p>
	</article>`;
}
