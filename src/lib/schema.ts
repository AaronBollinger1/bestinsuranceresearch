import { siteConfig } from '../config/site';

/**
 * JSON-LD builders.
 *
 * Rule: structured data may only describe content that is visible on the same
 * page. No hidden FAQ blocks, no review/rating/price/offer markup, no Dataset
 * without a real public file and license.
 */

type Json = Record<string, unknown>;

const abs = (path: string) => new URL(path, siteConfig.origin).toString();

export const organizationId = `${siteConfig.origin}/#organization`;
export const websiteId = `${siteConfig.origin}/#website`;

/**
 * The publisher is the operator. BestInsurance Research does not present itself
 * as a regulator, rating agency, carrier, or independent consumer organization.
 */
export function organization(): Json {
	return {
		'@type': 'Organization',
		'@id': organizationId,
		name: siteConfig.name,
		url: siteConfig.origin,
		description: siteConfig.description,
		logo: abs('/android-chrome-512x512.png'),
		/* One business, eleven properties. Without this the hub is the only page in
		   the estate that does not declare the relationship. */
		sameAs: [...siteConfig.operator.estateSameAs],
		parentOrganization: {
			'@type': 'InsuranceAgency',
			name: siteConfig.operator.dba,
			legalName: siteConfig.operator.legalName,
			url: siteConfig.bollinsureOrigin,
			identifier: {
				'@type': 'PropertyValue',
				name: `${siteConfig.operator.licenseAuthority} license`,
				value: siteConfig.operator.agencyLicense,
			},
			areaServed: { '@type': 'State', name: siteConfig.operator.state },
			/* Contact belongs on the agency, not on the publication. The
			   publication is not a separate physical business, and giving it an
			   address of its own would assert that it is. */
			telephone: siteConfig.contact.phoneE164,
			address: {
				'@type': 'PostalAddress',
				streetAddress: siteConfig.contact.address.street,
				addressLocality: siteConfig.contact.address.locality,
				addressRegion: siteConfig.contact.address.region,
				postalCode: siteConfig.contact.address.postalCode,
				addressCountry: siteConfig.contact.address.country,
			},
			/* By @id, not by value. Each Person node carries its own licence on
			   its own page, so the number exists once in the graph. A reviewer a
			   reader cannot identify is not a review. */
			employee: siteConfig.operator.peopleSlugs.map((slug) => ({
				"@id": abs(`/authors/${slug}#person`),
			})),
		},
	};
}

export function website(): Json {
	return {
		'@type': 'WebSite',
		'@id': websiteId,
		name: siteConfig.name,
		url: siteConfig.origin,
		description: siteConfig.description,
		publisher: { '@id': organizationId },
		inLanguage: 'en-US',
		// The target below is a real, working, server-rendered route.
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${siteConfig.origin}/ask?q={search_term_string}`,
			},
			'query-input': 'required name=search_term_string',
		},
	};
}

export function breadcrumbs(trail: Array<{ name: string; path: string }>): Json {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: trail.map((step, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: step.name,
			item: abs(step.path),
		})),
	};
}

export function collectionPage(input: {
	name: string;
	path: string;
	description: string;
	items: Array<{ name: string; path: string }>;
}): Json {
	return {
		'@type': 'CollectionPage',
		'@id': abs(input.path),
		url: abs(input.path),
		name: input.name,
		description: input.description,
		isPartOf: { '@id': websiteId },
		publisher: { '@id': organizationId },
		mainEntity: {
			'@type': 'ItemList',
			numberOfItems: input.items.length,
			itemListElement: input.items.map((item, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: item.name,
				url: abs(item.path),
			})),
		},
	};
}

/**
 * The claim and source corpus, as a Dataset.
 *
 * This is the one schema addition that is straightforwardly true: a versioned,
 * freely accessible, machine-readable collection of records with stated
 * provenance is a dataset, and Dataset is how a dataset says so.
 *
 * Deliberately ONE Dataset with several distributions, not a DataCatalog of 244
 * datasets: modelling each source record as its own dataset would inflate the
 * apparent scale 244-fold without adding a single checkable fact.
 *
 * Deliberately NOT schema.org Claim or ClaimReview. Those are fact-checking
 * vocabulary and carry a verdict. We record what a source supports; we do not
 * adjudicate whether it is true, and saying otherwise in markup would be a
 * false statement about who is speaking.
 */
export function dataset(input: {
	path: string;
	name: string;
	description: string;
	version: string;
	dateModified: string;
	license: string;
	distributions: Array<{ name: string; path: string; encodingFormat: string; description: string }>;
	measurements: Array<{ name: string; value: number }>;
}): Json {
	return {
		'@type': 'Dataset',
		'@id': `${abs(input.path)}#dataset`,
		url: abs(input.path),
		name: input.name,
		description: input.description,
		creator: { '@id': organizationId },
		publisher: { '@id': organizationId },
		isPartOf: { '@id': websiteId },
		isAccessibleForFree: true,
		version: input.version,
		dateModified: input.dateModified,
		license: input.license,
		distribution: input.distributions.map((d) => ({
			'@type': 'DataDownload',
			name: d.name,
			description: d.description,
			encodingFormat: d.encodingFormat,
			contentUrl: abs(d.path),
		})),
		variableMeasured: input.measurements.map((m) => ({
			'@type': 'PropertyValue',
			name: m.name,
			value: m.value,
		})),
	};
}

export function techArticle(input: {
	headline: string;
	path: string;
	description: string;
	datePublished: string;
	dateModified: string;
	author: string;
	reviewer: string;
	sections: string[];
	citations: Array<{ name: string; url: string; publisher: string }>;
	about?: string[];
}): Json {
	return {
		'@type': 'TechArticle',
		'@id': `${abs(input.path)}#article`,
		url: abs(input.path),
		headline: input.headline,
		description: input.description,
		datePublished: input.datePublished,
		dateModified: input.dateModified,
		inLanguage: 'en-US',
		isPartOf: { '@id': websiteId },
		publisher: { '@id': organizationId },
		author: { '@type': 'Person', name: input.author },
		reviewedBy: { '@type': 'Person', name: input.reviewer },
		articleSection: input.sections,
		about: input.about?.map((term) => ({ '@type': 'Thing', name: term })),
		citation: input.citations.map((source) => ({
			'@type': 'CreativeWork',
			name: source.name,
			url: source.url,
			publisher: { '@type': 'Organization', name: source.publisher },
		})),
		isAccessibleForFree: true,
	};
}

/** A coverage line is a defined term inside the coverage library term set. */
export function definedTerm(input: {
	name: string;
	path: string;
	description: string;
	setName: string;
	setPath: string;
}): Json {
	return {
		'@type': 'DefinedTerm',
		'@id': `${abs(input.path)}#term`,
		name: input.name,
		description: input.description,
		url: abs(input.path),
		inDefinedTermSet: {
			'@type': 'DefinedTermSet',
			'@id': `${abs(input.setPath)}#termset`,
			name: input.setName,
			url: abs(input.setPath),
		},
	};
}

export function webApplication(input: {
	name: string;
	path: string;
	description: string;
	features: string[];
}): Json {
	return {
		'@type': 'WebApplication',
		'@id': `${abs(input.path)}#app`,
		name: input.name,
		url: abs(input.path),
		description: input.description,
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Any modern web browser',
		browserRequirements: 'Works without JavaScript for reading; interaction requires JavaScript.',
		featureList: input.features,
		isAccessibleForFree: true,
		publisher: { '@id': organizationId },
	};
}

/** Organizations we describe: regulators, standards bodies, public entities. */
export function describedOrganization(input: {
	legalName: string;
	path: string;
	description: string;
	url: string;
	orgType: string;
	sameAs: string[];
}): Json {
	const type =
		input.orgType === 'regulator' || input.orgType === 'public-entity'
			? 'GovernmentOrganization'
			: 'Organization';
	return {
		'@type': type,
		'@id': `${abs(input.path)}#subject`,
		name: input.legalName,
		description: input.description,
		url: input.url,
		sameAs: input.sameAs,
		mainEntityOfPage: { '@type': 'WebPage', '@id': abs(input.path) },
	};
}

/** Wrap one or more nodes into a single @graph document. */
export function graph(...nodes: Array<Json | undefined | null>): Json {
	return {
		'@context': 'https://schema.org',
		'@graph': nodes.filter(Boolean) as Json[],
	};
}
