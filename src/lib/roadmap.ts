/**
 * The lines this library has not published yet, named rather than faked.
 *
 * `/insurance` tells the reader plainly that these have "no route, no sitemap
 * entry, and no navigation link until a reviewed page exists". That is a claim
 * about the build, made in prose, from a hand-maintained list — and nothing
 * pruned the list as pages were written. Twelve of its lines had a published
 * page, a route and a sitemap entry while the callout above them said they had
 * none. Somebody looking for renters insurance read "planned" on the index of a
 * library that has a renters page.
 *
 * EVERY LINE CARRIES THE SLUG IT WOULD BECOME. That is the whole reason for the
 * shape: it turns a prose claim into something the suite can measure exactly,
 * with no fuzzy matching between "Scheduled valuables" and "Scheduled personal
 * property (California)" to get wrong.
 *
 * The suite fails the build when one of these ids resolves to a published
 * coverage. It deliberately does NOT filter the list at render time, which
 * would have been the shorter fix: filtering hides the stale entry instead of
 * removing it, so the list rots quietly and forever. Pruning stays a deliberate
 * edit that a person makes when they publish the page. A checked invariant
 * survives a careless edit; a computed one hides it.
 *
 * The slug is a statement of intent, not a reservation. Writing the page is
 * free to choose a better one — the check simply stops meaning anything for
 * that line, which is why the check is on the id AND the suite requires every
 * line to render.
 */
export interface RoadmapLine {
	/** As the reader sees it on the index. */
	name: string;
	/** The coverage id this line would be published under. */
	id: string;
}

export interface RoadmapFamily {
	family: string;
	lines: RoadmapLine[];
}

export const ROADMAP: RoadmapFamily[] = [
	{
		family: 'Personal lines',
		lines: [
			{ name: 'Personal umbrella', id: 'personal-umbrella-california' },
			{ name: 'High-net-worth programs', id: 'high-net-worth-california' },
		],
	},
	{
		family: 'Commercial lines',
		lines: [
			{ name: 'Business owners package', id: 'business-owners-package' },
			{ name: 'Commercial umbrella and excess', id: 'commercial-umbrella-excess' },
			{ name: 'Crime', id: 'commercial-crime' },
			{ name: 'Builders risk', id: 'builders-risk' },
			{ name: 'Equipment breakdown', id: 'equipment-breakdown' },
		],
	},
	{
		family: 'Life',
		lines: [
			{ name: 'Term life', id: 'term-life-california' },
			{ name: 'Permanent life', id: 'permanent-life-california' },
			{ name: 'Key person', id: 'key-person-life' },
			{ name: 'Buy-sell funding', id: 'buy-sell-funding' },
		],
	},
	{
		family: 'Health and benefits',
		lines: [
			{ name: 'Employee benefits', id: 'employee-benefits' },
			{ name: 'COBRA continuation', id: 'cobra-continuation-federal' },
			{ name: 'Public program explanations', id: 'public-program-explanations' },
		],
	},
];

/** Every roadmap line, flattened. */
export function roadmapLines(): RoadmapLine[] {
	return ROADMAP.flatMap((group) => group.lines);
}
