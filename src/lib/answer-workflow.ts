/**
 * The evidence-first answer, citation, and conflict workflow (BR-C2).
 *
 * An answer here is not prose that cites things afterwards. It is an ASSEMBLY
 * of atomic claim studies (BR-C1) over a canonical question (BR-2), and every
 * sentence a composed answer contains IS the current wording of a confirmed
 * claim, verbatim - the composer can select and order claims, and can do
 * nothing else. A verifier test holds that property: no sentence exists in
 * the output that is not byte-identical to an input claim's wording, so an
 * invented fact is not a policy violation, it is unrepresentable.
 *
 * Missing evidence produces an honest state, never a filled gap: an assembly
 * with no eligible claims composes nothing and says whether the next step is
 * research (nothing supports an answer yet) or review (evidence exists and a
 * person must act). A composed answer exposes, on its own object, claim-level
 * citations, effective dates (or an explicit statement that the source gives
 * none), conflicts, wording corrections, residual uncertainty, and
 * scope/jurisdiction limits. Consumer and professional audiences receive the
 * same evidence; the audience is named in the scope, not smuggled into the
 * sentences.
 *
 * Seven gates, independently testable and each returning its own named
 * result: canonical-intent, claim-source, conflict, freshness, rights,
 * editorial, licensed-review. Composition succeeds only when every gate
 * passes; a failed gate names its reasons so a queue can route them.
 *
 * THE TWO STANDING P3s ARE RESOLVED HERE, AS DECISIONS:
 *
 *  - Who may declare stakes: stakes are declared at claim opening (never
 *    inferred) and RATCHET UPWARD ONLY. This workflow adds a structural
 *    floor - HIGH_STAKES_ANSWER_TOPICS - a declared registry of answer
 *    topics whose claims are held to the licensed gate regardless of their
 *    declared stakes, via publicationEligibility's treatAsHighStakes. An
 *    editor can raise stakes; nobody, at any layer, can lower them below
 *    the floor.
 *  - Pinning licensed-review wording: a licensed review pins the exact
 *    wording current when it was recorded (source-study.ts,
 *    licensedReviewedText); a claim reworded afterwards is blocked until
 *    the new wording is re-reviewed. This module inherits that through
 *    publicationEligibility rather than restating it.
 *
 * Nothing here writes, fetches, calls a provider, or publishes. Publication,
 * versioning, and the noindex lifecycle are BR-C3; this module ends at "this
 * assembly is composable" or an honest reason it is not.
 */
import type { QuestionRegistry } from './question-registry.ts';
import {
	publicationEligibility,
	quotationAllowed,
	evaluateFreshness,
	type SourceStudy,
	type ClaimStudySnapshot,
	type ExtractedProposition,
} from './source-study.ts';

/* ------------------------------------------------------------------ */
/* The stakes floor: half of the resolved P3 pair                      */
/* ------------------------------------------------------------------ */

/**
 * Answer topics whose claims are held to the licensed gate no matter how
 * their studies declared stakes. A declared registry, not a classifier:
 * adding a topic is a deliberate reviewed edit here, and the verifier pins
 * the list so it cannot drift silently. These are the subjects where a
 * wrong published sentence is an unlicensed determination, not a typo.
 */
export const HIGH_STAKES_ANSWER_TOPICS = [
	'coverage-determination',
	'eligibility',
	'claims-outcome',
	'legal-interpretation',
	'tax-consequence',
] as const;

export type HighStakesTopic = (typeof HIGH_STAKES_ANSWER_TOPICS)[number];

export function topicForcesHighStakes(topics: readonly string[]): boolean {
	return topics.some((topic) => (HIGH_STAKES_ANSWER_TOPICS as readonly string[]).includes(topic));
}

/** Audiences an answer may name. The evidence does not change between them. */
export const ANSWER_AUDIENCES = ['consumer', 'professional'] as const;
export type AnswerAudience = (typeof ANSWER_AUDIENCES)[number];

export function isAnswerAudience(audience: string): audience is AnswerAudience {
	return (ANSWER_AUDIENCES as readonly string[]).includes(audience);
}

/* ------------------------------------------------------------------ */
/* Assembly input                                                      */
/* ------------------------------------------------------------------ */

export interface AnswerAssembly {
	/** A canonical question id from the BR-2 registry. Never free text. */
	questionId: string;
	/** Two-letter state code, or 'national'. */
	jurisdiction: string;
	/** `consumer` or `professional`. Named in the scope; never written into a sentence. */
	audience: string;
	/** Answer topics, checked against the high-stakes floor. Declared, not inferred. */
	topics: string[];
	/** The claim studies this answer is assembled from, in reading order. */
	claims: ClaimStudySnapshot[];
	/** The source studies backing them - the citation metadata and the known-id set. */
	sources: SourceStudy[];
	/**
	 * The freshness policy in force and the date it is evaluated against.
	 * Explicit because staleness is a policy decision (BR-C1); an assembly
	 * without a policy cannot pass the freshness gate.
	 */
	asOf: string;
	freshnessPolicy: { staleAfterDays: number } | null;
	/** The named human who composed this assembly. Composition is editorial work. */
	editor: { name: string; at: string; note: string } | null;
	/**
	 * Verbatim source excerpts beyond the claim wordings themselves. Allowed
	 * only when every quoted source has recorded rights - which today is no
	 * source at all, so this stays empty everywhere but the negative test.
	 */
	verbatimExcerpts: Array<{ sourceId: string; text: string }>;
}

/* ------------------------------------------------------------------ */
/* Gates                                                                */
/* ------------------------------------------------------------------ */

export const ANSWER_GATES = [
	'canonical-intent',
	'claim-source',
	'conflict',
	'freshness',
	'rights',
	'editorial',
	'licensed-review',
] as const;

export type AnswerGate = (typeof ANSWER_GATES)[number];

export interface GateResult {
	gate: AnswerGate;
	ok: boolean;
	reasons: string[];
}

/**
 * Run every gate, independently. Each gate computes its own verdict from the
 * assembly alone, so a test can fail exactly one while the others pass -
 * that independence is itself asserted by the verifier.
 */
export function answerGates(assembly: AnswerAssembly, registry: QuestionRegistry): GateResult[] {
	const knownSourceIds = new Set(assembly.sources.map((s) => s.sourceId));
	const studiesById = new Map(assembly.sources.map((s) => [s.sourceId, s]));
	const forcedHigh = topicForcesHighStakes(assembly.topics);
	const results: GateResult[] = [];

	/* 1. Canonical intent: the answer belongs to exactly one registered
	   question, in a jurisdiction that question actually addresses, for an
	   audience this workflow knows how to label. */
	{
		const reasons: string[] = [];
		const entry = registry.byId.get(assembly.questionId);
		if (!entry) {
			reasons.push(`${assembly.questionId} is not a canonical question`);
		} else {
			const claimed = entry.jurisdictions.length > 0 ? entry.jurisdictions : ['national'];
			if (!claimed.includes(assembly.jurisdiction)) {
				reasons.push(`the canonical question addresses ${claimed.join(', ')}, not ${assembly.jurisdiction}`);
			}
		}
		if (!isAnswerAudience(assembly.audience)) {
			reasons.push(`audience ${JSON.stringify(assembly.audience)} is not consumer or professional`);
		}
		results.push({ gate: 'canonical-intent', ok: reasons.length === 0, reasons });
	}

	/* 2. Claim/source: every claim is eligible - knownSourceIds is ALWAYS
	   passed, by construction - and every claim address resolves to an
	   extracted proposition. Conflict, staleness, and licensed blockers
	   belong to their own gates. A disputed state is deferred to the
	   conflict gate only while an unresolved conflict explains it; a dispute
	   of the claim itself stays here, because nothing else would catch it. */
	{
		const reasons: string[] = [];
		if (assembly.claims.length === 0) reasons.push('the assembly contains no claims');
		for (const claim of assembly.claims) {
			const verdict = publicationEligibility(claim, { knownSourceIds, treatAsHighStakes: forcedHigh });
			const unresolved = claim.conflicts.some((conflict) => !conflict.resolution);
			for (const blocker of verdict.blockers) {
				if (/^unresolved conflict\b/.test(blocker) || /\bstale\b/.test(blocker) || /licensed/.test(blocker)) continue;
				if (unresolved && blocker === 'the claim is disputed, not confirmed') continue;
				reasons.push(`${claim.claimRef ?? 'unopened claim'}: ${blocker}`);
			}
			for (const id of claim.supporting) {
				if (!studiesById.has(id)) reasons.push(`${claim.claimRef}: supporting source ${id} has no study in this assembly`);
			}
			const proposition = propositionFor(claim, studiesById);
			if (!proposition) {
				reasons.push(`${claim.claimRef ?? 'unopened claim'}: no extracted proposition with that address is in this assembly`);
			} else {
				const original = claim.wordingHistory[0]?.was ?? claim.text;
				if (original !== proposition.text) {
					reasons.push(`${claim.claimRef}: the claim wording does not match the extracted proposition, and no correction records the change`);
				}
			}
		}
		results.push({ gate: 'claim-source', ok: reasons.length === 0, reasons });
	}

	/* 3. Conflict: no unresolved conflict may stand, and every conflict -
	   resolved or not - must remain visible in whatever is composed. The
	   visibility half is enforced structurally: composeAnswer copies every
	   conflict into the output, and the verifier asserts the copy is total. */
	{
		const reasons: string[] = [];
		for (const claim of assembly.claims) {
			for (const conflict of claim.conflicts) {
				if (!conflict.resolution) {
					reasons.push(`${claim.claimRef}: unresolved conflict between ${conflict.between[0]} and ${conflict.between[1]}`);
				}
			}
		}
		results.push({ gate: 'conflict', ok: reasons.length === 0, reasons });
	}

	/* 4. Freshness: an explicit policy, applied to every cited study. An
	   assembly without a policy fails closed - freshness that cannot be
	   evaluated is not freshness. */
	{
		const reasons: string[] = [];
		if (!assembly.freshnessPolicy) {
			reasons.push('no freshness policy is declared for this assembly');
		} else {
			const cited = new Set(assembly.claims.flatMap((c) => c.supporting));
			for (const id of cited) {
				const study = studiesById.get(id);
				if (!study) continue; /* the claim-source gate owns missing studies */
				const verdict = evaluateFreshness(study, assembly.asOf, assembly.freshnessPolicy);
				if (verdict !== 'fresh') reasons.push(`${id} is ${verdict} under the declared policy as of ${assembly.asOf}`);
			}
			for (const claim of assembly.claims) {
				if (claim.staleSinceRefresh) reasons.push(`${claim.claimRef}: the claim itself is marked stale and unrefreshed`);
			}
		}
		results.push({ gate: 'freshness', ok: reasons.length === 0, reasons });
	}

	/* 5. Rights: claim wordings are Birch's own recorded propositions and
	   carry their source's rights note visibly; anything BEYOND them - a
	   verbatim excerpt of the source itself - needs recorded rights, which
	   today no source has. */
	{
		const reasons: string[] = [];
		for (const excerpt of assembly.verbatimExcerpts) {
			const study = studiesById.get(excerpt.sourceId);
			if (!study) {
				reasons.push(`excerpt cites ${excerpt.sourceId}, which has no study in this assembly`);
				continue;
			}
			const verdict = quotationAllowed(study);
			if (!verdict.allowed) reasons.push(`${excerpt.sourceId}: ${verdict.reason}`);
		}
		results.push({ gate: 'rights', ok: reasons.length === 0, reasons });
	}

	/* 6. Editorial: composition is a named human's work, with a note. */
	{
		const reasons: string[] = [];
		if (!assembly.editor || !assembly.editor.name.trim() || !assembly.editor.note.trim()) {
			reasons.push('the assembly names no composing editor');
		}
		results.push({ gate: 'editorial', ok: reasons.length === 0, reasons });
	}

	/* 7. Licensed review: the effective stakes - declared, or forced by the
	   topic floor - are held against the recorded licensed reviews, wording
	   pin included, via the single eligibility authority. */
	{
		const reasons: string[] = [];
		for (const claim of assembly.claims) {
			const verdict = publicationEligibility(claim, { knownSourceIds, treatAsHighStakes: forcedHigh });
			for (const blocker of verdict.blockers) {
				if (/licensed/.test(blocker)) reasons.push(`${claim.claimRef}: ${blocker}`);
			}
		}
		results.push({ gate: 'licensed-review', ok: reasons.length === 0, reasons });
	}

	return results;
}

/* ------------------------------------------------------------------ */
/* Composition                                                          */
/* ------------------------------------------------------------------ */

export interface AnswerCitation {
	sourceId: string;
	title: string;
	publisher: string;
	url: string;
	authorityTier: string;
	jurisdiction: string;
	/** null when the source states none. Never a guessed date. */
	effectiveDate: string | null;
	/** The date, or the exact words "no effective date stated". */
	effectiveDateLabel: string;
	publishedDate: string | null;
	accessedDate: string;
	rightsNote: string;
}

export interface AnswerSentence {
	/** Byte-identical to the claim study's current wording. Never edited here. */
	text: string;
	claimRef: string;
	citations: AnswerCitation[];
}

export interface ComposedAnswer {
	questionId: string;
	jurisdiction: string;
	audience: string;
	sentences: AnswerSentence[];
	/** Every conflict from every included claim, resolutions attached. Total copy. */
	conflicts: Array<{ claimRef: string; between: [string, string]; note: string; resolution?: { how: string; note: string; at: string } }>;
	/** Every narrowing, with the wording it replaced and the wording that followed. */
	corrections: Array<{ claimRef: string; at: string; note: string; was: string; now: string }>;
	/**
	 * Evidence gaps that do not by themselves block a confirmed standard-stakes
	 * answer: a missing effective date, unrecorded rights. Empty only when
	 * every cited source states an effective date and recorded rights.
	 */
	uncertainty: string[];
	scope: {
		jurisdiction: string;
		audience: string;
		limits: string[];
	};
	editor: { name: string; at: string; note: string };
}

export type CompositionOutcome =
	| { status: 'composed'; answer: ComposedAnswer; gates: GateResult[] }
	| {
			/** Honest states, never invented facts: research-required means no
			 * evidence supports an answer yet; review-required means evidence
			 * exists and a person or gate must act before anything composes. */
			status: 'research-required' | 'review-required';
			gates: GateResult[];
			reasons: string[];
			/** Why nothing was composed. Distinct from an answer's residual uncertainty. */
			uncertainty: string[];
	  };

const NO_EFFECTIVE_DATE = 'no effective date stated';

function propositionFor(
	claim: ClaimStudySnapshot,
	studiesById: Map<string, SourceStudy>,
): ExtractedProposition | undefined {
	if (!claim.claimRef) return undefined;
	const hash = claim.claimRef.indexOf('#');
	if (hash < 0) return undefined;
	const study = studiesById.get(claim.claimRef.slice(0, hash));
	return study?.propositions.find((proposition) => proposition.address === claim.claimRef);
}

function correctionsFor(claim: ClaimStudySnapshot): ComposedAnswer['corrections'] {
	return claim.wordingHistory.map((entry, index, history) => ({
		claimRef: claim.claimRef ?? '',
		at: entry.at,
		note: entry.note,
		was: entry.was,
		now: history[index + 1]?.was ?? claim.text ?? '',
	}));
}

function uncertaintyFor(citations: AnswerCitation[]): string[] {
	const notes: string[] = [];
	const seen = new Set<string>();
	for (const citation of citations) {
		if (seen.has(citation.sourceId)) continue;
		seen.add(citation.sourceId);
		if (!citation.effectiveDate) {
			notes.push(`${citation.sourceId} states no effective date; none is invented here.`);
		}
		if (/unrecorded|no rights field/i.test(citation.rightsNote)) {
			notes.push(`Rights for ${citation.sourceId} are unrecorded, so this answer cites it and does not quote it in bulk.`);
		}
	}
	return notes;
}

export function composeAnswer(assembly: AnswerAssembly, registry: QuestionRegistry): CompositionOutcome {
	const gates = answerGates(assembly, registry);
	const failed = gates.filter((g) => !g.ok);

	if (failed.length > 0) {
		/* No claims, or none with support, is a research gap; everything else
		   is a review queue. Either way nothing composes and nothing is
		   invented to stand in. */
		const noEvidence =
			assembly.claims.length === 0 || assembly.claims.every((claim) => claim.supporting.length === 0);
		const status = noEvidence ? 'research-required' : 'review-required';
		return {
			status,
			gates,
			reasons: failed.flatMap((g) => g.reasons.map((r) => `${g.gate}: ${r}`)),
			uncertainty: [
				status === 'research-required'
					? 'No confirmed evidence supports an answer yet. Nothing was filled in.'
					: 'Evidence exists and is not composable until the named gates are cleared. Nothing was filled in.',
			],
		};
	}

	const studiesById = new Map(assembly.sources.map((s) => [s.sourceId, s]));
	const sentences: AnswerSentence[] = assembly.claims.map((claim) => ({
		text: claim.text ?? '',
		claimRef: claim.claimRef ?? '',
		citations: claim.supporting.map((id) => {
			const study = studiesById.get(id);
			if (!study) throw new Error(`gate escape: ${id} passed the gates without a study`);
			return {
				sourceId: study.sourceId,
				title: study.title,
				publisher: study.publisher,
				url: study.url,
				authorityTier: study.authorityTier,
				jurisdiction: study.jurisdiction,
				effectiveDate: study.dates.effective,
				effectiveDateLabel: study.dates.effective ?? NO_EFFECTIVE_DATE,
				publishedDate: study.dates.published,
				accessedDate: study.dates.accessed,
				rightsNote: study.rights.note,
			};
		}),
	}));

	const scopeLimits = [
		`Written for a ${assembly.audience} reader.`,
		`This answer addresses ${assembly.jurisdiction === 'national' ? 'no single state' : assembly.jurisdiction} and is not a statement about any other jurisdiction.`,
		'Every sentence is a confirmed claim quoted verbatim with its sources beside it; nothing here is individualized advice or a coverage determination.',
	];
	const uncertainty = uncertaintyFor(sentences.flatMap((sentence) => sentence.citations));

	return {
		status: 'composed',
		gates,
		answer: {
			questionId: assembly.questionId,
			jurisdiction: assembly.jurisdiction,
			audience: assembly.audience,
			sentences,
			conflicts: assembly.claims.flatMap((claim) =>
				claim.conflicts.map((c) => ({
					claimRef: claim.claimRef ?? '',
					between: c.between,
					note: c.note,
					...(c.resolution ? { resolution: c.resolution } : {}),
				})),
			),
			corrections: assembly.claims.flatMap((claim) => correctionsFor(claim)),
			uncertainty,
			scope: { jurisdiction: assembly.jurisdiction, audience: assembly.audience, limits: scopeLimits },
			editor: assembly.editor as { name: string; at: string; note: string },
		},
	};
}
