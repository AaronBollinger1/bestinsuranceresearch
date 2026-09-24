/**
 * The provider-neutral contract for Birch's future research desk.
 *
 * This file intentionally contains no network call and no provider SDK import.
 * The current site is a static, preview-gated research library. Keeping the
 * contract separate lets a future server route use Perplexity (or another
 * provider) without exposing a key to the browser or allowing a model response
 * to become a public Birch record by itself.
 */

export type ResearchSourceClass =
	| 'statute'
	| 'regulation'
	| 'legislative-record'
	| 'court-decision'
	| 'regulator-guidance'
	| 'regulator-record'
	| 'official-filing'
	| 'company-material'
	| 'professional-report'
	| 'user-experience';

export type ResearchReviewState = 'draft' | 'needs-review' | 'approved' | 'rejected';

export type ResearchSourceStatus = 'candidate' | 'verified' | 'unavailable' | 'superseded' | 'disputed';

export interface ResearchBrief {
	id: string;
	topic: string;
	jurisdiction: string;
	asOf: string;
	requestedSourceClasses: ResearchSourceClass[];
	question: string;
}

export interface ResearchProviderTrace {
	name: 'perplexity' | 'other';
	outputMode: 'search-results' | 'structured-draft';
	requestedAt: string;
	modelId?: string;
	requestId?: string;
}

export interface ResearchSourceRecord {
	id: string;
	url: string;
	title: string;
	publisher: string;
	jurisdiction: string;
	sourceClass: ResearchSourceClass;
	officialHost: boolean;
	accessedOn: string;
	lastChecked?: string;
	status: ResearchSourceStatus;
}

export interface ResearchClaim {
	id: string;
	text: string;
	sourceIds: string[];
	claimKind: 'descriptive' | 'timeline' | 'reported-context' | 'user-experience';
	reviewState: ResearchReviewState;
}

export interface ResearchPacket {
	brief: ResearchBrief;
	provider?: ResearchProviderTrace;
	sources: ResearchSourceRecord[];
	claims: ResearchClaim[];
	caveats: string[];
	review: {
	state: ResearchReviewState;
	 reviewer?: string;
	 reviewedOn?: string;
	};
}

export interface ResearchGateResult {
	state: 'blocked' | 'ready';
	blockers: string[];
}

/**
 * A public Birch record must be sourced, dated, and signed off. The function
 * is deliberately conservative: a missing source or reviewer is a blocker,
 * even when a model produced a polished draft.
 */
export function researchGate(packet: ResearchPacket): ResearchGateResult {
	const blockers: string[] = [];

	if (!packet.brief.topic.trim() || !packet.brief.jurisdiction.trim() || !packet.brief.asOf.trim()) {
		blockers.push('The brief needs a topic, jurisdiction, and as-of date.');
	}
	if (packet.sources.length === 0) blockers.push('At least one source record is required.');
	if (packet.sources.some((source) => !source.url.startsWith('https://'))) {
		blockers.push('Every source record needs a canonical HTTPS URL.');
	}
	const sourcesById = new Map(packet.sources.map((source) => [source.id, source]));
	if (packet.claims.some((claim) => claim.sourceIds.length === 0)) {
		blockers.push('Every public claim must point to one or more source records.');
	}
	if (packet.claims.some((claim) => claim.sourceIds.some((sourceId) => !sourcesById.has(sourceId)))) {
		blockers.push('Every claim-to-source reference must resolve to a source record.');
	}
	if (packet.claims.some((claim) => claim.sourceIds.some((sourceId) => sourcesById.get(sourceId)?.status !== 'verified'))) {
		blockers.push('A public claim can only cite a source marked verified.');
	}
	if (packet.claims.some((claim) => claim.reviewState !== 'approved')) {
		blockers.push('Every claim must be reviewed before publication.');
	}
	if (packet.review.state !== 'approved' || !packet.review.reviewer) {
		blockers.push('A named reviewer must approve the packet.');
	}

	return { state: blockers.length > 0 ? 'blocked' : 'ready', blockers };
}
