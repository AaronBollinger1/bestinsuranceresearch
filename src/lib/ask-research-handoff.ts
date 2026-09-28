/**
 * Unanswered Ask routing (BR-F7).
 *
 * The reviewed corpus stays first. An unmatched question is explained as a
 * private research handoff. This planner never fetches, never reads an
 * environment key, and never exposes a live provider endpoint.
 */
import type { CompositionOutcome } from './answer-workflow.ts';
import type { QuestionRegistry } from './question-registry.ts';
import {
	considerSourceCandidates,
	type AdapterLimits,
	type AdapterResult,
	type FixtureProviderPayload,
} from './source-candidate-adapter.ts';

export const ASK_RESEARCH_ROUTE = [
	{ id: 'corpus', text: 'Search the reviewed Birch corpus on this device first.' },
	{ id: 'cited-answer', text: 'A match opens the cited answer. The question is not sent to a provider.' },
	{ id: 'candidates', text: 'No match can become cited public-source candidates, not a generated answer.' },
	{ id: 'draft', text: 'Those candidates stay in a noindex draft.' },
	{ id: 'editorial', text: 'Editorial review reads the draft before it can change.' },
	{ id: 'licensed', text: 'Licensed review is a separate gate and stays closed here.' },
	{ id: 'version', text: 'A later correction is a new version, not a silent overwrite.' },
	{ id: 'publication', text: 'Publication is possible only after those gates. Nothing on this page publishes automatically.' },
] as const;

export type AskHandoffStatus = 'disabled' | 'missing-credential' | 'provider-failure' | 'zero-provider-fallback';

export interface AskHandoffPlan {
	status: AskHandoffStatus;
	providerCalls: 0;
	liveEndpointExposed: false;
	indexable: false;
	publicationEligible: false;
	route: typeof ASK_RESEARCH_ROUTE;
	adapter: AdapterResult;
}

const LIMITS: AdapterLimits = { maxCostUnits: 0, spentCostUnits: 0, maxRequestsPerWindow: 0, requestsInWindow: 0 };

function localClosed(status: 'disabled' | 'security' | 'outage', reason: string): AdapterResult {
	return { status, candidates: [], draft: null, reasons: [reason] };
}

function planBase(status: AskHandoffStatus, adapter: AdapterResult): AskHandoffPlan {
	return {
		status,
		providerCalls: 0,
		liveEndpointExposed: false,
		indexable: false,
		publicationEligible: false,
		route: ASK_RESEARCH_ROUTE,
		adapter,
	};
}

export function planUnansweredAskHandoff(input: {
	enabled?: boolean;
	credential?: string;
	fixture?: FixtureProviderPayload;
	registry?: QuestionRegistry;
	birchOutcome?: CompositionOutcome;
	questionId?: string;
	query?: string;
	asOf?: string;
}): AskHandoffPlan {
	if (input.enabled !== true) {
		return planBase('disabled', considerSourceCandidates({
			enabled: false,
			query: input.query ?? 'general insurance question',
			questionId: input.questionId ?? 'unanswered',
			registry: input.registry ?? ({ byId: new Map() } as QuestionRegistry),
			birchOutcome: input.birchOutcome ?? ({ status: 'research-required', questionId: input.questionId ?? 'unanswered' } as CompositionOutcome),
			fixture: input.fixture ?? { fixtureId: 'ask-disabled', kind: 'outage' },
			limits: LIMITS,
			asOf: input.asOf ?? '2026-09-28',
		}));
	}
	if (!input.credential?.trim()) {
		return planBase('missing-credential', localClosed('security', 'No research credential is configured. No provider was contacted.'));
	}
	const failure = input.fixture?.kind;
	if (failure === 'outage' || failure === 'malformed' || failure === 'rate-limited' || failure === 'over-budget') {
		if (!input.registry || !input.birchOutcome || !input.questionId || !input.query || !input.fixture) {
			return planBase('provider-failure', localClosed('outage', 'The fixture provider failed before any candidate was invented.'));
		}
		return planBase('provider-failure', considerSourceCandidates({
			enabled: true,
			query: input.query,
			questionId: input.questionId,
			registry: input.registry,
			birchOutcome: input.birchOutcome,
			fixture: input.fixture,
			limits: { maxCostUnits: 10, spentCostUnits: 0, maxRequestsPerWindow: 5, requestsInWindow: 0 },
			asOf: input.asOf ?? '2026-09-28',
		}));
	}
	return planBase('zero-provider-fallback', localClosed('disabled', 'Ask does not call the live search adapter. The question remains in the local handoff.'));
}
