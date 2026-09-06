/**
 * The estate redirect map.
 *
 * Fifty-nine `best*` domains are held in the Porkbun account. This file is the
 * single record of where each one is meant to land, and it exists as code rather
 * than as prose in a manifest so that two things can be enforced rather than
 * hoped for:
 *
 *  1. A domain marked `redirect` must name a route this build actually produces.
 *     A 301 to a 404 is worse than no redirect, and it is permanent by design.
 *  2. A domain with no adequate destination is marked `park` and says what it
 *     would need. That is a content decision recorded honestly, not a domain
 *     quietly pointed at the homepage to make a table look finished.
 *
 * STILL NOT EXECUTED, but no longer for the reasons first recorded here. All
 * three of the original blockers are gone as of 2026-09-05, and the note is
 * corrected rather than deleted because a stale blocker list is how a plan gets
 * executed on assumptions that stopped being true:
 *
 *  - `bestinsuranceresearch.com` is registered and live. It is attached to the
 *    Vercel project, DNS is an A record to 76.76.21.21 at Porkbun, and the
 *    Porkbun URL forward that sent it to a parking page has been deleted.
 *  - The research site is deployed and serves that domain, so the origin exists
 *    and every target route below resolves.
 *  - API access is NOT the barrier the note claimed. `apiAccess` reads 0 on
 *    `bestinsuranceresearch.com` and on the parked domains, yet DNS writes and
 *    forward reads both succeed against them. The flag does not gate these
 *    operations, whatever it reports.
 *
 * What blocks execution now is a decision, not a capability, and it is the one
 * thing the original note got wrong about the estate: THESE DOMAINS ARE NOT
 * IDLE. Sampled 2026-09-05, they already carry live permanent redirects:
 *
 *    bestgeneralliability.com  301 -> www.bollinsure.com/general-liability
 *    bestreplacementcost.com   301 -> www.bollinsure.com/bollinsure-replacement-cost-estimator-2026
 *    bestjewelryinsurance.com  301 -> www.bestartinsurance.com/jewelry
 *
 * So executing the map below does not light up dormant domains. It repoints
 * live 301s away from the licensed brokerage and the specialty sites and onto
 * this one, which moves inbound traffic off bollinsure.com. That is an owner's
 * decision about where the estate's traffic should go, it is the kind of change
 * this file already argues is expensive to reverse once equity has moved, and
 * nobody should make it by reading a table of `action: 'redirect'` and assuming
 * the destinations are empty.
 *
 * Anyone executing this should first re-read each domain's current forward and
 * decide, per domain, whether what it points at today is worse than what this
 * map proposes. For a good number of them it will not be.
 */

/**
 * `retain` is a third state and not a variant of the other two. A parked
 * domain has nowhere good to go; a retained one has somewhere good to go and
 * deliberately does not go there, because it is a property in its own right.
 * Its `target` is the hub page it should link to, not one it redirects to.
 */
export type RedirectAction = 'redirect' | 'park' | 'retain';

export interface DomainRoute {
	domain: string;
	action: RedirectAction;
	/** Required when action is 'redirect'. Must be a built route. */
	target?: string;
	/** Why this destination, or for a park, what it is waiting on. */
	note: string;
	/** True where the domain currently serves a live site of its own. */
	liveSite?: boolean;
}

/**
 * The eight domains that currently serve their own live site.
 *
 * Redirecting these retires real pages: 608 between them, plus eight working
 * application funnels. That was raised and the decision was to consolidate
 * anyway, so they are recorded here as `redirect`. Two notes worth keeping with
 * the decision rather than losing it:
 *
 *  - Export each site's indexed URL list before the switch. A single 301 to a
 *    module discards the deep pages (50 class-code pages on workers
 *    compensation, 28 county pages on earthquake, 35 guides on group medical),
 *    and per-URL mapping is the only way to keep that equity.
 *  - The application funnels have no equivalent on the research property, which
 *    publishes no price and takes no application. Whatever they currently
 *    convert stops converting at the moment of the switch.
 */
/*
 * These eight keep their own authority, by decision on 2026-09-05. They are
 * not redirected and not parked: each is a live property with its own
 * content and its own rankings, and a 301 would spend a known asset to feed
 * an unproven one. The relationship to the hub is cross-linking, so `target`
 * here names the page each site should link to rather than one it redirects
 * to. Reversing this later is cheap; reversing a 301 after the equity has
 * moved is not, which is the asymmetry that decides it.
 */
export const LIVE_SITE_DOMAINS: DomainRoute[] = [
	{ domain: 'bestho3.com', action: 'retain', target: '/tools/property-position', liveSite: true, note: '71 pages, ACORD 80 application. Module records 36 fields and runs 34 checks.' },
	{ domain: 'bestdwellingfire.com', action: 'retain', target: '/insurance/landlord-rental-dwelling', liveSite: true, note: '11 pages, thinnest of the eight. Coverage page is published and reviewed; intent is definitional.' },
	{ domain: 'bestearthquakeinsurance.com', action: 'retain', target: '/tools/earthquake-pathways', liveSite: true, note: '87 pages including 28 county pages. Export those URLs before switching.' },
	{ domain: 'bestepli.com', action: 'retain', target: '/tools/epli-readiness', liveSite: true, note: '76 pages, two carrier applications, e-signature. The only domain with Porkbun API access already on.' },
	{ domain: 'bestcyberliability.com', action: 'retain', target: '/tools/cyber-control-readiness', liveSite: true, note: '109 pages. Module keys to a dated framework edition.' },
	{ domain: 'bestworkerscompensation.com', action: 'retain', target: '/tools/workers-comp-classification', liveSite: true, note: '96 pages including 50 class-code pages. Highest equity loss of the eight on a single-hop redirect.' },
	{ domain: 'bestgroupmedical.com', action: 'retain', target: '/tools/group-benefits-renewal', liveSite: true, note: '127 pages, the largest property in the estate. Destination built in this pass.' },
	{ domain: 'bestartinsurance.com', action: 'retain', target: '/tools/valuables-schedule', liveSite: true, note: '31 pages, Markel application. Destination built in this pass.' },
];

/** Domains with no site of their own and a genuine match in the corpus. */
export const MATCHED_DOMAINS: DomainRoute[] = [
	{ domain: 'bestgeneralliability.com', action: 'redirect', target: '/insurance/commercial-general-liability', note: 'Exact line match to a published, reviewed coverage page.' },
	{ domain: 'bestliability.com', action: 'redirect', target: '/insurance/commercial-general-liability', note: 'Generic liability intent resolves to the CGL page.' },
	{ domain: 'bestcommercialpropertyinsurance.com', action: 'redirect', target: '/insurance/commercial-property', note: 'Exact line match to a published, reviewed coverage page for this line.' },
	{ domain: 'bestpropinsurance.com', action: 'redirect', target: '/insurance/commercial-property', note: 'Abbreviated form of the same line.' },
	{ domain: 'besthomeownerscoverage.com', action: 'redirect', target: '/insurance/homeowners', note: 'Exact line match to a published, reviewed coverage page for this line.' },
	{ domain: 'besthighvaluehomeinsurance.com', action: 'redirect', target: '/insurance/homeowners', note: 'High-value is a segment of the same line; no separate page exists.' },
	{ domain: 'bestreplacementcost.com', action: 'redirect', target: '/questions/replacement-cost-vs-market-value', note: 'The domain names the exact question the page answers.' },
	{ domain: 'bestinlandmarine.com', action: 'redirect', target: '/questions/inland-marine-uses', note: 'The domain names the exact question this published page answers.' },
	{ domain: 'bestjewelryinsurance.com', action: 'redirect', target: '/tools/valuables-schedule', note: 'Jewellery is scheduled on the same basis the module records.' },
	{ domain: 'bestjewleryinsurance.com', action: 'redirect', target: '/tools/valuables-schedule', note: 'Misspelling held defensively. Same destination as the correct spelling.' },
	{ domain: 'bestcontractorbonds.com', action: 'redirect', target: '/questions/surety-bond-vs-insurance', note: 'The published question distinguishes a bond from insurance, which is the intent.' },
	{ domain: 'bestprofessionalliability.com', action: 'redirect', target: '/questions/general-liability-vs-professional-liability', note: 'The domain names the exact question this published page answers.' },
	{ domain: 'besterrorsandomissions.com', action: 'redirect', target: '/questions/general-liability-vs-professional-liability', note: 'E&O is the same line under another name.' },
	{ domain: 'bestgrouphealthinsurance.com', action: 'redirect', target: '/tools/group-benefits-renewal', note: 'Same line as bestgroupmedical.' },
	{ domain: 'bestemployerbenefits.com', action: 'redirect', target: '/tools/group-benefits-renewal', note: 'Employer-side benefits intent resolves to the renewal module.' },
	{ domain: 'bestdic.com', action: 'redirect', target: '/examples/fair-plan-named-peril-gaps', note: 'Difference in conditions is only meaningful next to a FAIR Plan policy, which is what the example reads.' },
	{ domain: 'bestcoveragereview.com', action: 'redirect', target: '/position', note: 'Reviewing your own coverage is what the instrument does.' },
	{ domain: 'bestpolicyreview.com', action: 'redirect', target: '/position', note: 'Same intent as bestcoveragereview.' },
	{ domain: 'bestcommerciallines.com', action: 'redirect', target: '/insurance', note: 'Family-level intent resolves to the coverage index.' },
	{ domain: 'bestpersonallines.com', action: 'redirect', target: '/insurance', note: 'Family-level intent resolves to the coverage index.' },
	{ domain: 'bestcommercialauto.com', action: 'redirect', target: '/insurance/commercial-auto', note: 'The commercial auto coverage page reads the ISO CA 00 01 form symbol by symbol, which is the question this domain carries.' },
	{ domain: 'bestpersonalauto.com', action: 'redirect', target: '/insurance/personal-auto-california', note: 'The page is California-scoped because every source under it is California statute. The domain is not, so the destination understates its own reach until a second state is built; that is the honest direction to err in.' },
	{ domain: 'bestindependentinsurance.com', action: 'redirect', target: '/about', note: 'Independence is a claim about the operator, and /about is where the operator and its licence are disclosed.' },
	{ domain: 'bestinsurancepartner.com', action: 'redirect', target: '/', note: 'Generic. Homepage is the honest destination.' },
	{ domain: 'bestgeneralcontractorinsurance.com', action: 'redirect', target: '/tools/contract-requirements', note: 'A general contractor arrives with an insurance requirement clause, which is what the module maps.' },
	{ domain: 'bestcontractorcoverage.com', action: 'redirect', target: '/tools/contract-requirements', note: 'Same contractual-requirement intent as the other contractor domains.' },
	{ domain: 'bestqualitycontractors.com', action: 'redirect', target: '/tools/contract-requirements', note: 'Same contractual-requirement intent as the other contractor domains.' },
	{ domain: 'bestservicecontractors.com', action: 'redirect', target: '/tools/contract-requirements', note: 'Same contractual-requirement intent as the other contractor domains.' },
	{ domain: 'bestlocalgeneralcontractors.com', action: 'redirect', target: '/tools/contract-requirements', note: 'Same contractual-requirement intent as the other contractor domains.' },
	/* Promoted out of PARKED_DOMAINS once /lines gave each of these a
	   destination with cited material behind it rather than a homepage. */
	{ domain: 'bestdando.com', action: 'redirect', target: '/lines/directors-and-officers', note: 'The line index carries 11 source records and 73 recorded claims on D&O with no written page yet, and says so on arrival. Both D&O domains point at the same index; when a coverage page is written, repoint both to it.' },
	{ domain: 'bestdirectorsandofficers.com', action: 'redirect', target: '/lines/directors-and-officers', note: 'Same line as bestdando. Pointing both at one index is correct; pointing them at two different pages would be the mistake.' },
	{ domain: 'bestproductliability.com', action: 'redirect', target: '/lines/commercial-general-liability', note: 'Products and completed operations is a coverage part of the CGL form rather than a line of its own, so the CGL index is the honest destination until a products page exists.' },
	{ domain: 'bestexcess.com', action: 'redirect', target: '/lines/umbrella-excess', note: '40 source records and 279 recorded claims sit behind this line through the contract-requirements checks, which is what a reader arriving on an excess domain is asking about.' },
	{ domain: 'bestbuildersrisk.com', action: 'redirect', target: '/lines/builders-risk', note: '9 source records behind the line. Thin, and the index states that plainly rather than dressing it up.' },
	{ domain: 'bestphysicianinsurance.com', action: 'redirect', target: '/lines/medical-professional-liability', note: 'Physician intent resolves to the medical professional liability line rather than to a specialty page, which would be an industry page this site has not built.' },
	{ domain: 'besttruckerinsurance.com', action: 'redirect', target: '/lines/motor-truck-cargo', note: 'Trucking intent splits across motor truck cargo and commercial auto; cargo is the more specific line and its index links to the commercial auto page.' },
];

/**
 * Domains with no adequate destination.
 *
 * Each says what would have to be published first. Pointing these at the
 * homepage or at a loosely related page would be a worse outcome than leaving
 * them parked: a 301 is permanent, and a mismatched one teaches a crawler that
 * the destination is not about the query.
 */
/*
 * What is left here is almost entirely industry rather than line: car wash,
 * concrete, country club, franchise, HOA, HVAC, manufacturing, plumbing,
 * remodelling, staffing, tech. The line indexes cannot serve them, because a
 * trade is not a line: a plumbing contractor wants to know which lines its
 * exposures fall under, which is a different page and a different claim.
 *
 * They stay parked deliberately. Pointing an industry domain at a line index
 * or at the homepage is the permanent mismatch this manifest warns about, and
 * "clear value add" is the test these have to pass before they move. What they
 * need is an industry layer: a mapping from a trade to the lines that bear on
 * it, built on cited law where the requirement is statutory (contractor
 * licence bonds under Business and Professions Code 7071.6 and the workers
 * compensation requirement under Labor Code 3700 are both already source
 * records here) and labelled as commonly relevant rather than determined
 * everywhere else. That is the next build, not a redirect decision.
 */
export const PARKED_DOMAINS: DomainRoute[] = [
	{ domain: 'bestsurpluslines.com', action: 'park', note: 'Needs a surplus lines page covering the diligent-search requirement. This is a placement-pathways topic and is on the roadmap.' },
	{ domain: 'bestemployerpayroll.com', action: 'park', note: 'Payroll is not an insurance line. Either retire or point at the workers compensation module once a payroll-records page exists.' },
	{ domain: 'bestcarwashinsurance.com', action: 'park', note: 'Industry page, not a line. No industry pages are published.' },
	{ domain: 'bestconcreteinsurance.com', action: 'park', note: 'Wants an industry page rather than a line page, and no industry pages are published. Park until one exists.' },
	{ domain: 'bestcountryclubinsurance.com', action: 'park', note: 'Wants an industry page rather than a line page, and no industry pages are published. Park until one exists.' },
	{ domain: 'bestfranchiseinsurance.com', action: 'park', note: 'Wants an industry page rather than a line page, and no industry pages are published. Park until one exists.' },
	{ domain: 'besthoainsurance.com', action: 'park', note: 'Needs an HOA page. The earthquake module records master-policy status but no HOA line page exists.' },
	{ domain: 'besthvacinsurance.com', action: 'park', note: 'Wants an industry page rather than a line page, and no industry pages are published. Park until one exists.' },
	{ domain: 'bestmanufacturinginsurance.com', action: 'park', note: 'Wants an industry page rather than a line page, and no industry pages are published. Park until one exists.' },
	{ domain: 'bestplumberinsurance.com', action: 'park', note: 'Wants an industry page rather than a line page, and no industry pages are published. Park until one exists.' },
	{ domain: 'bestplumbersinsurance.com', action: 'park', note: 'Plural variant of bestplumberinsurance. Park both, and point both at one page if an industry page is ever built.' },
	{ domain: 'bestremodelinsurance.com', action: 'park', note: 'Wants an industry page rather than a line page, and no industry pages are published. Park until one exists.' },
	{ domain: 'beststaffinginsurance.com', action: 'park', note: 'Needs an industry page. Staffing carries a workers compensation classification angle the module touches but does not explain, and none exists.' },
	{ domain: 'besttechinsurance.com', action: 'park', note: 'Needs an industry page. The cyber module covers technology E&O as a line, but no industry page exists.' },
];

export const DOMAIN_ROUTES: DomainRoute[] = [
	...LIVE_SITE_DOMAINS,
	...MATCHED_DOMAINS,
	...PARKED_DOMAINS,
];

/** Domains held in the account that are deliberately not part of this plan. */
export const OUT_OF_SCOPE = [
	'bestams.com',
	'bollinsure.com',
	'bollinsure.net',
	'covwell.com',
] as const;
