/**
 * The six layers, and what each one is allowed to assert.
 *
 * The whole proposition is that a reader can tell what a sentence *is* before
 * deciding what to do with it. A statute saying something, Birch explaining it,
 * a licensed broker interpreting it, an insurer responding to it, a
 * professional adding to it, and a policyholder reporting what happened to them
 * are six different kinds of statement. Collapsing any two is the failure this
 * layer model exists to prevent, and it is a failure that reads as authority:
 * the dangerous direction is always something drifting upward into
 * `official-fact` or `licensed-interpretation`.
 *
 * So the rules below are written to fail closed. A node with no layer is not
 * defaulted to anything - it is rejected. A layer that requires a gate returns
 * its gate, and `verify-graph.mjs` asserts that every gated layer is empty for
 * as long as its gate is shut. Today that means: zero licensed interpretation,
 * because zero records carry a licensed sign-off, and zero of the three
 * contribution layers, because Commons is closed.
 */

export const LAYERS = [
	'official-fact',
	'birch-analysis',
	'licensed-interpretation',
	'company-response',
	'professional-contribution',
	'user-experience',
] as const;

export type Layer = (typeof LAYERS)[number];

const LAYER_SET: ReadonlySet<string> = new Set(LAYERS);

export function isLayer(value: string): value is Layer {
	return LAYER_SET.has(value);
}

/**
 * What has to be true before a layer may contain anything.
 *
 * `licensed-review` - a named licensed human recorded a sign-off. No agent may
 * satisfy this, and nothing in this repository can set it.
 * `commons-open` - PUBLIC_COMMONS_READY is genuinely true and Commons has its
 * database, mailer and moderation owner.
 * `none` - the layer is open for use now.
 */
export type LayerGate = 'none' | 'licensed-review' | 'commons-open';

export interface LayerRule {
	layer: Layer;
	/** What a reader is being told when they see something in this layer. */
	meaning: string;
	gate: LayerGate;
	/** May a node in this layer state a fact in its own voice? */
	assertsFact: boolean;
	/** Must every assertion carry a claim-level citation to a source? */
	requiresCitation: boolean;
	/**
	 * Review states a node in this layer may hold. `licensed-interpretation`
	 * lists only 'reviewed' because that is what the layer means; a record that
	 * is still under review has not been interpreted by anyone licensed.
	 */
	allowedReviewStates: readonly ('reviewed' | 'under-review' | 'corrected')[];
}

export const LAYER_RULES: Readonly<Record<Layer, LayerRule>> = {
	'official-fact': {
		layer: 'official-fact',
		meaning: 'What a published source says, quoted or faithfully paraphrased, in the publisher’s voice rather than ours.',
		gate: 'none',
		assertsFact: true,
		requiresCitation: true,
		allowedReviewStates: ['reviewed', 'under-review', 'corrected'],
	},
	'birch-analysis': {
		layer: 'birch-analysis',
		meaning: 'Birch explaining, comparing or organising sourced material. Our voice, our responsibility, not a licensed opinion.',
		gate: 'none',
		assertsFact: false,
		requiresCitation: true,
		allowedReviewStates: ['reviewed', 'under-review', 'corrected'],
	},
	'licensed-interpretation': {
		layer: 'licensed-interpretation',
		meaning: 'A named licensed person applying judgment to sourced material and standing behind it under their licence.',
		gate: 'licensed-review',
		assertsFact: true,
		requiresCitation: true,
		allowedReviewStates: ['reviewed'],
	},
	'company-response': {
		layer: 'company-response',
		meaning: 'An insurer, regulator or other organisation responding in its own words. Published as theirs, never adopted as ours.',
		gate: 'commons-open',
		assertsFact: false,
		requiresCitation: false,
		allowedReviewStates: ['reviewed', 'under-review', 'corrected'],
	},
	'professional-contribution': {
		layer: 'professional-contribution',
		meaning: 'A verified professional adding explanation or sources under their own name and disclosed affiliation.',
		gate: 'commons-open',
		assertsFact: false,
		requiresCitation: true,
		allowedReviewStates: ['reviewed', 'under-review', 'corrected'],
	},
	'user-experience': {
		layer: 'user-experience',
		meaning: 'What one policyholder reports happened to them. An account of an experience, never a statement of what the rule is.',
		gate: 'commons-open',
		assertsFact: false,
		requiresCitation: false,
		allowedReviewStates: ['under-review', 'corrected'],
	},
};

/** Layers that may hold nodes right now, given the two gates. */
export function openLayers(options: { licensedReviewRecorded: boolean; commonsOpen: boolean }): Layer[] {
	return LAYERS.filter((layer) => {
		const { gate } = LAYER_RULES[layer];
		if (gate === 'licensed-review') return options.licensedReviewRecorded;
		if (gate === 'commons-open') return options.commonsOpen;
		return true;
	});
}

/**
 * Whether a node may sit in a layer, and if not, why.
 *
 * Returns a reason string rather than a boolean because the reason is what a
 * failing test needs to print. Fail-closed: an unknown layer is refused, not
 * coerced to the nearest valid one.
 */
export function layerAdmits(
	layer: string,
	node: { reviewState?: string; hasCitation?: boolean },
	gates: { licensedReviewRecorded: boolean; commonsOpen: boolean },
): { ok: true } | { ok: false; reason: string } {
	if (!isLayer(layer)) return { ok: false, reason: `unknown layer ${JSON.stringify(layer)}` };
	const rule = LAYER_RULES[layer];

	if (rule.gate === 'licensed-review' && !gates.licensedReviewRecorded) {
		return { ok: false, reason: `layer ${layer} requires a recorded licensed review, and none exists` };
	}
	if (rule.gate === 'commons-open' && !gates.commonsOpen) {
		return { ok: false, reason: `layer ${layer} requires Commons to be open, and PUBLIC_COMMONS_READY is false` };
	}
	if (node.reviewState !== undefined && !rule.allowedReviewStates.includes(node.reviewState as never)) {
		return { ok: false, reason: `layer ${layer} does not admit reviewState ${JSON.stringify(node.reviewState)}` };
	}
	if (rule.requiresCitation && node.hasCitation === false) {
		return { ok: false, reason: `layer ${layer} requires a claim-level citation and this node has none` };
	}
	return { ok: true };
}
