/**
 * Context hubs are navigation layers over the published corpus.
 *
 * A reader may begin with a role or situation ("I run a construction
 * business") rather than a coverage name. These hubs make that route
 * discoverable by gathering existing, reviewed coverage, question, example,
 * company, and source records. They do not create a new insurance claim of
 * their own, rank carriers, or imply that every item applies to every reader.
 *
 * The definitions below are taxonomy. The substance on each page comes from
 * the records returned by `loadCorpus`, and a hub is only published when it has
 * enough existing material to be useful. That keeps context pages from becoming
 * doorway pages dressed up as comprehensive advice.
 */
import type { Corpus } from './corpus';
import { allLineHubs, type LineHub } from './line-hub';
import { canonicalLine, canonicalLines, type CanonicalLine } from './lines';

export interface IndustryDefinition {
	id: string;
	name: string;
	descriptor: string;
	lines: CanonicalLine[];
}

export const INDUSTRY_DEFINITIONS: IndustryDefinition[] = [
	{
		id: 'homeowners-and-residential-property',
		name: 'Homeowners and residential property',
		descriptor: 'Homes, personal property, perils, deductibles, and the gaps that sit outside a standard policy.',
		lines: ['homeowners', 'residential-earthquake', 'residential-flood', 'flood', 'wildfire', 'scheduled-personal-property', 'difference-in-conditions'],
	},
	{
		id: 'hoa-and-community-associations',
		name: 'HOAs and community associations',
		descriptor: 'The boundary between an association master policy, an owner policy, and the documents that define responsibility.',
		lines: ['community-association', 'condominium-unit-owners', 'residential-earthquake', 'flood', 'contractual-risk-transfer', 'directors-and-officers'],
	},
	{
		id: 'landlords-and-rental-property',
		name: 'Landlords and rental property',
		descriptor: 'Rental dwellings, landlord-owned property, tenant responsibility, and loss scenarios worth checking early.',
		lines: ['dwelling-fire', 'homeowners', 'renters', 'commercial-property', 'umbrella-excess', 'inland-marine'],
	},
	{
		id: 'contractors-and-construction',
		name: 'Contractors and construction',
		descriptor: 'Job sites, contracts, vehicles, employees, materials, and the evidence a project may ask for.',
		lines: ['commercial-general-liability', 'commercial-auto', 'workers-compensation', 'builders-risk', 'inland-marine', 'surety', 'additional-insured', 'contractual-risk-transfer'],
	},
	{
		id: 'small-business',
		name: 'Small business',
		descriptor: 'A practical map of property, liability, income, vehicles, people, and the operational details that change the answer.',
		lines: ['commercial-general-liability', 'commercial-property', 'business-income', 'commercial-auto', 'workers-compensation', 'cyber-liability', 'bop'],
	},
	{
		id: 'real-estate-and-property-professionals',
		name: 'Real estate and property professionals',
		descriptor: 'Transactions, managed property, title, construction, and the professional responsibilities that meet at a property address.',
		lines: ['title', 'commercial-property', 'homeowners', 'dwelling-fire', 'builders-risk', 'professional-liability', 'commercial-general-liability', 'flood'],
	},
	{
		id: 'hospitality-and-retail-operations',
		name: 'Hospitality and retail operations',
		descriptor: 'Customer-facing premises, inventory, income interruption, employees, vehicles, and the systems that keep an operation open.',
		lines: ['commercial-property', 'commercial-general-liability', 'business-income', 'workers-compensation', 'commercial-auto', 'cyber-liability', 'crime-and-social-engineering', 'bop'],
	},
	{
		id: 'nonprofits-and-public-serving-organizations',
		name: 'Nonprofits and public-serving organizations',
		descriptor: 'Mission-driven organizations, boards, employees, volunteers, property, and the public-facing obligations that need separate context.',
		lines: ['commercial-general-liability', 'commercial-property', 'directors-and-officers', 'employment-practices-liability', 'cyber-liability', 'workers-compensation', 'employee-benefits', 'surety'],
	},
	{
		id: 'schools-and-childcare',
		name: 'Schools and childcare',
		descriptor: 'Premises, professional duties, employees, technology, governance, and the questions that depend on the organization’s role.',
		lines: ['commercial-general-liability', 'commercial-property', 'professional-liability', 'employment-practices-liability', 'cyber-liability', 'workers-compensation', 'directors-and-officers'],
	},
	{
		id: 'technology-and-cyber',
		name: 'Technology and cyber',
		descriptor: 'Privacy, network security, technology services, social engineering, and the controls insurers ask about.',
		lines: ['cyber-liability', 'privacy-and-network-security', 'technology-errors-and-omissions', 'crime-and-social-engineering', 'professional-liability'],
	},
	{
		id: 'professional-and-medical-services',
		name: 'Professional and medical services',
		descriptor: 'Advice, services, patient care, professional duties, employment practices, and claims-made details.',
		lines: ['professional-liability', 'errors-and-omissions', 'medical-professional-liability', 'employment-practices-liability', 'directors-and-officers', 'cyber-liability'],
	},
	{
		id: 'transportation-and-logistics',
		name: 'Transportation and logistics',
		descriptor: 'Commercial vehicles, cargo, loading, contracts, employee drivers, and the chain of responsibility.',
		lines: ['commercial-auto', 'motor-truck-cargo', 'inland-marine', 'commercial-general-liability', 'workers-compensation', 'umbrella-excess'],
	},
	{
		id: 'employers-and-benefits',
		name: 'Employers and benefits',
		descriptor: 'Workers compensation, employment practices, health benefits, continuation obligations, and employer-side questions.',
		lines: ['workers-compensation', 'employers-liability', 'employment-practices-liability', 'wage-and-hour-defense', 'group-health', 'employee-benefits', 'cyber-liability'],
	},
	{
		id: 'life-and-succession-planning',
		name: 'Life and succession planning',
		descriptor: 'Individual life, business continuity, key people, ownership changes, and the policy mechanics that matter.',
		lines: ['individual-life', 'term-life', 'permanent-life', 'key-person', 'buy-sell'],
	},
];

export interface IndustryHub {
	id: string;
	name: string;
	descriptor: string;
	lines: CanonicalLine[];
	lineHubs: LineHub[];
	questions: Corpus['questions'];
	coverages: Corpus['coverages'];
	examples: Corpus['examples'];
	companies: Corpus['companies'];
	sourceIds: string[];
	lastReviewed: string;
	hasSubstance: boolean;
}

const ids = (refs: Array<string | { id: string }> = []): string[] =>
	refs.map((ref) => (typeof ref === 'string' ? ref : ref.id));

const matchesLine = (values: string[], lines: Set<CanonicalLine>): boolean =>
	canonicalLines(values).some((line) => lines.has(line));

const latestDate = (values: string[]): string => {
	const dates = values.filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
	return dates.at(-1) ?? 'unknown';
};

export function industryHub(
	corpus: Corpus,
	definition: IndustryDefinition,
	minResources = 3,
): IndustryHub {
	const lines = new Set(definition.lines);
	const lineHubs = allLineHubs(corpus).filter((hub) => lines.has(hub.line) && hub.hasSubstance);
	const questions = corpus.questions.filter((entry) => matchesLine(entry.data.lines, lines));
	const coverages = corpus.coverages.filter((entry) => {
		const line = canonicalLine(entry.data.line);
		return Boolean(line && lines.has(line));
	});
	const examples = corpus.examples.filter((entry) => matchesLine(entry.data.lines, lines));
	const questionIds = new Set(questions.map((entry) => entry.id));
	const companies = corpus.companies.filter((entry) =>
		questions.some((question) => ids(question.data.companies).includes(entry.id)) ||
		entry.data.relatedQuestions.some((question) => questionIds.has(question.id)),
	);

	const sourceIds = new Set<string>();
	for (const hub of lineHubs) for (const sourceId of hub.sourceIds) sourceIds.add(sourceId);
	for (const entry of questions) for (const sourceId of ids(entry.data.sourceIds)) sourceIds.add(sourceId);
	for (const entry of coverages) for (const sourceId of ids(entry.data.sourceIds)) sourceIds.add(sourceId);
	for (const entry of examples) for (const sourceId of ids(entry.data.sourceIds)) sourceIds.add(sourceId);
	for (const entry of companies) for (const sourceId of ids(entry.data.sourceIds)) sourceIds.add(sourceId);

	const reviewDates = [
		...questions.map((entry) => entry.data.lastReviewed),
		...coverages.map((entry) => entry.data.lastReviewed),
		...examples.map((entry) => entry.data.lastReviewed),
		...companies.map((entry) => entry.data.lastReviewed),
	];
	const resourceCount = questions.length + coverages.length + examples.length + companies.length;

	return {
		id: definition.id,
		name: definition.name,
		descriptor: definition.descriptor,
		lines: definition.lines,
		lineHubs,
		questions,
		coverages,
		examples,
		companies,
		sourceIds: [...sourceIds],
		lastReviewed: latestDate(reviewDates),
		hasSubstance: resourceCount >= minResources && sourceIds.size >= 2,
	};
}

export function allIndustryHubs(corpus: Corpus, minResources = 3): IndustryHub[] {
	return INDUSTRY_DEFINITIONS.map((definition) => industryHub(corpus, definition, minResources)).sort(
		(a, b) => Number(b.hasSubstance) - Number(a.hasSubstance) || a.name.localeCompare(b.name),
	);
}
