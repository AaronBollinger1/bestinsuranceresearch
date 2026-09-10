export type SiteEnvironment = 'preview' | 'production';

const rawEnv = import.meta.env.PUBLIC_SITE_ENV;
const environment: SiteEnvironment = rawEnv === 'production' ? 'production' : 'preview';
const communityReady = import.meta.env.PUBLIC_COMMONS_READY === 'true';

export const siteConfig = {
	name: 'Birch Research',
	shortName: 'Birch Research',
	brandName: 'Birch',
	brandDescriptor: 'Insurance, with the source attached',
	tagline: 'Understand the policy. Check the source. Share what happened.',
	description:
		'Free insurance research and community conversation. Read sourced answers, compare the context around a policy, and share what happened without turning a person’s experience into a verdict.',
	origin: import.meta.env.PUBLIC_SITE_ORIGIN || 'https://bestinsuranceresearch.com',
	communityOrigin: import.meta.env.PUBLIC_COMMONS_ORIGIN || 'https://birch.insure',
	/**
	 * The Research room must not advertise a Commons origin until the separate
	 * application has a working deployment, database, mailer, and moderation
	 * owner. Keep the default closed so a preview or an incomplete production
	 * promotion cannot ship dead discussion links.
	 */
	communityReady,
	bollinsureOrigin: import.meta.env.PUBLIC_BOLLINSURE_ORIGIN || 'https://www.bollinsure.com',
	environment,
	/**
	 * Preview never loads a third-party marketing script, and production analytics
	 * stay off until an owner supplies the container id deliberately.
	 * See ANALYTICS-EVENT-SPEC.md.
	 */
	analytics: {
		gtmId: import.meta.env.PUBLIC_GTM_ID || '',
		enabled: environment === 'production' && Boolean(import.meta.env.PUBLIC_GTM_ID),
	},
	contact: {
		email: 'quotes@bollinsure.com',
		/*
		 * phoneE164 is the canonical digits and the only form the structured
		 * data emits; phoneDisplay and phoneHref are presentations of it. A
		 * verify assertion holds the three in agreement rather than deriving
		 * them, which is this codebase's habit: an invariant that is checked
		 * survives a careless edit, one that is computed hides it.
		 *
		 * Cross-checked 2026-09-02 against Bollinsure's own site, which
		 * publishes a tel: link with the aria-label "Call Bollinsure at
		 * 562-COVWELL, 562-268-9355", and against this footer, which already
		 * showed the same digits. Deliberately not taken from the specialty
		 * sites: two of those carry reserved 555 numbers in form placeholder
		 * attributes, which is the right use of a fictional number and exactly
		 * what would be wrong to publish as real.
		 */
		phoneE164: '+15622689355',
		phoneDisplay: '(562) 268-9355',
		phoneHref: 'tel:+15622689355',
		phoneVanity: '562-COVWELL',
		/* The office the estate publishes across its live sites. The hub
		   emitted no address at all, which made it the one property a reader
		   could not locate. */
		address: {
			street: '3625 E Thousand Oaks Blvd Ste 292',
			locality: 'Westlake Village',
			region: 'CA',
			postalCode: '91362',
			country: 'US',
		},
	},
	operator: {
		legalName: 'WJB Services, Inc.',
		dba: 'Bollinsure Insurance Services',
		/*
		 * 6013787 is the ENTITY licence held by WJB Services, Inc. dba Bollinsure
		 * Insurance Services. 0D94699 is Brian John Bollinger's own producer
		 * licence, and 4345268 is Aaron Glen Bollinger's.
		 *
		 * These were published the other way round here between 2026-09-02 and
		 * 2026-09-05, on an inference drawn from the specialty sites instead of
		 * from the brokerage's own pages. The inference was wrong and it reached
		 * 383 pages: the footer, the JSON-LD, llms.txt and every machine record.
		 * Confirmed against bollinsure.com production and by the owner directly.
		 *
		 * Worth knowing when reading the eight specialty sites: they pair 0D94699
		 * with the entity name, so they carry the same inversion and are not a
		 * source of truth for this. Bollinsure production is.
		 */
		agencyLicense: '6013787',
		licenseAuthority: 'California Department of Insurance',
		state: 'California',
		/* Slugs only. Names, roles and licences live in the people collection
		   and are emitted by /authors/<slug>; the agency node links to those
		   Person nodes by @id, so each licence number exists once in the
		   graph. Restating them is how the inversion reached 318 pages. */
		peopleSlugs: ['aaron-bollinger', 'brian-bollinger'],
		/*
		 * The sibling properties, so a crawler reads one business rather than
		 * eleven unrelated ones sharing a phone number. The eight specialty sites
		 * already assert this about themselves; this property is the hub and had
		 * no sameAs at all, which made it the one page in the estate that read as
		 * unaffiliated with the brokerage that operates it.
		 */
		estateSameAs: [
			'https://www.bollinsure.com/',
			'https://www.bestho3.com/',
			'https://www.bestdwellingfire.com/',
			'https://www.bestearthquakeinsurance.com/',
			'https://www.bestepli.com/',
			'https://www.bestcyberliability.com/',
			'https://www.bestworkerscompensation.com/',
			'https://www.bestgroupmedical.com/',
			'https://www.bestartinsurance.com/',
		],
		producers: [
			{ name: 'Brian Bollinger', license: '0D94699' },
			{ name: 'Aaron Bollinger', license: '4345268' },
		],
	},
	/** Shown near every licensed-help action. Wording is fixed by the brief. */
	licensedHelpDisclosure:
		'Birch Research provides general information. Licensed help is offered by Bollinsure Insurance Services, a California insurance brokerage.',
	podcast: {
		feed: 'https://feeds.transistor.fm/speaking-of-insurance',
		canonicalArchive: 'https://www.bollinsure.com/podcast',
		name: 'Speaking of Insurance',
	},
	/** Bumped when the published content model changes shape. */
	contentVersion: '2026.08.31',
} as const;

export const isPreview = environment !== 'production';

const communityNavItem = {
	label: 'Community',
	href: `${siteConfig.communityOrigin}/`,
	description: 'Discuss what happened',
	external: true,
} as const;

export const primaryNav = [
	{ label: 'Ask Birch', href: '/ask', description: 'Search the question library' },
	{ label: 'Coverage', href: '/insurance', description: 'Explore coverage, questions and guides' },
	{ label: 'Tools', href: '/tools', description: 'Free decision support' },
	{ label: 'Sources', href: '/sources', description: 'Open the source registry' },
	...(siteConfig.communityReady ? [communityNavItem] : []),
] as const;

export const footerNav = {
		research: [
		{ label: 'Coverage position', href: '/position' },
		{ label: 'Insurance guides', href: '/guides' },
		{ label: 'Ask a question', href: '/ask' },
		{ label: 'Question library', href: '/questions' },
		{ label: 'Every line indexed', href: '/lines' },
		{ label: 'Written coverage pages', href: '/insurance' },
		{ label: 'Companies and regulators', href: '/companies' },
		{ label: 'States', href: '/states' },
		{ label: 'Examples', href: '/examples' },
		{ label: 'Modules and worksheets', href: '/tools' },
		...(siteConfig.communityReady ? [communityNavItem] : []),
	],
	standards: [
		{ label: 'Methodology', href: '/methodology' },
		{ label: 'What changed', href: '/changed' },
		{ label: 'Editorial policy', href: '/editorial-policy' },
		{ label: 'Source registry', href: '/sources' },
		{ label: 'Corrections', href: '/corrections' },
		{ label: 'About the operator', href: '/about' },
		{ label: 'Birch network', href: '/network' },
	],
	machine: [
		{ label: 'Dataset releases', href: '/dataset' },
		{ label: 'RSS feed', href: '/rss.xml' },
		{ label: 'llms.txt', href: '/llms.txt' },
		{ label: 'llms-full.txt', href: '/llms-full.txt' },
		{ label: 'Sitemap', href: '/sitemap-index.xml' },
	],
} as const;
