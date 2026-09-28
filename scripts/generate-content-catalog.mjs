import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_LINES } from '../src/lib/lines.ts';

const ROOT = process.cwd();
const PLAN_DIR = join(ROOT, 'planning');
const CATALOG_DATE = process.env.BIRCH_CATALOG_DATE || '2026-09-11';

const LINE_LABELS = {
	'auto': 'auto',
	'bop': 'business owners package',
	'buy-sell': 'buy-sell funding',
	'commercial-general-liability': 'commercial general liability',
	'commercial-property': 'commercial property',
	'crime-and-social-engineering': 'crime and social engineering',
	'cyber-liability': 'cyber liability',
	'difference-in-conditions': 'difference in conditions',
	'directors-and-officers': 'directors and officers',
	'dwelling-fire': 'dwelling fire',
	'employee-benefits': 'employee benefits',
	'employers-liability': 'employers liability',
	'employment-practices-liability': 'employment practices liability',
	'errors-and-omissions': 'errors and omissions',
	'flood': 'flood',
	'group-health': 'group health',
	'individual-life': 'individual life',
	'inland-marine': 'inland marine',
	'key-person': 'key person',
	'license-and-permit-bonds': 'license and permit bonds',
	'medical-professional-liability': 'medical professional liability',
	'mobilehome': 'mobilehome',
	'motor-truck-cargo': 'motor truck cargo',
	'permanent-life': 'permanent life',
	'privacy-and-network-security': 'privacy and network security',
	'professional-liability': 'professional liability',
	'renters': 'renters',
	'residential-earthquake': 'residential earthquake',
	'residential-flood': 'residential flood',
	'scheduled-personal-property': 'scheduled personal property',
	'surety': 'surety bonds',
	'term-life': 'term life',
	'third-party-employment-practices-liability': 'third-party employment practices liability',
	'technology-errors-and-omissions': 'technology errors and omissions',
	'title': 'title',
	'umbrella-excess': 'umbrella and excess',
	'wage-and-hour-defense': 'wage and hour defense',
	'wildfire': 'wildfire',
	'windstorm': 'windstorm',
	'workers-compensation': 'workers compensation',
};

const lineLabel = (line) =>
	LINE_LABELS[line] || line.replace(/-/g, ' ');

const slugify = (value) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const JURISDICTIONS = [
	['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
	['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
	['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
	['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
	['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
	['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
	['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
	['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
	['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
	['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
	['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
	['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
	['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
	['AS', 'American Samoa'], ['GU', 'Guam'], ['MP', 'Northern Mariana Islands'],
	['PR', 'Puerto Rico'], ['VI', 'U.S. Virgin Islands'],
];

const LINE_INTENTS = [
	['definition', (line) => `What is ${line} insurance?`],
	['purpose', (line) => `What is ${line} insurance designed to address?`],
	['who', (line) => `Who might consider ${line} insurance?`],
	['scope', (line) => `What should I ask about the scope of ${line} insurance?`],
	['exclusions', (line) => `What exclusions or limitations should I inspect in ${line} insurance?`],
	['limits', (line) => `What limits, deductibles, or sublimits should I compare for ${line} insurance?`],
	['documents', (line) => `Which documents should I read before deciding about ${line} insurance?`],
	['underwriting-inputs', (line) => `Which facts may change an insurer's questions about ${line} insurance?`],
	['claim-preparation', (line) => `What records should I keep before or after a ${line} insurance claim?`],
	['renewal', (line) => `What should I review before renewing ${line} insurance?`],
	['cancellation', (line) => `What should I check after a ${line} insurance cancellation or nonrenewal notice?`],
	['coordination', (line) => `How can ${line} insurance interact with another policy or contract?`],
	['professional', (line) => `What should I ask a licensed professional about ${line} insurance?`],
	['cost-factors', (line) => `What can affect the cost of ${line} insurance without estimating a premium?`],
	['state-variation', (line) => `What can make ${line} insurance vary by state?`],
	['terms', (line) => `Which terms should I understand when reading ${line} insurance documents?`],
	['example', (line) => `What is a worked example of a ${line} insurance question?`],
	['source', (line) => `Which primary sources should I use to research ${line} insurance?`],
	['dispute', (line) => `What sources and records should I review when a ${line} insurance question is disputed?`],
	['change', (line) => `What recent change could make a ${line} insurance answer need rechecking?`],
];

const STATE_INTENTS = [
	['sources', (line, state) => `Which primary sources govern ${line} insurance questions in ${state}?`],
	['requirements', (line, state) => `What state-specific requirements may matter for ${line} insurance in ${state}?`],
	['verify', (line, state) => `What should I verify about ${line} insurance before acting in ${state}?`],
	['dispute', (line, state) => `What can change a ${line} insurance dispute or claim question in ${state}?`],
];

const USE_CASES = [
	['buying-a-home', 'buying a home'],
	['selling-a-home', 'selling a home'],
	['renting-a-home', 'renting a home'],
	['owning-a-condo', 'owning a condominium unit'],
	['owning-a-mobilehome', 'owning a mobilehome'],
	['owning-a-vacation-home', 'owning a vacation home'],
	['owning-a-high-value-home', 'owning a high-value home'],
	['becoming-a-landlord', 'becoming a landlord'],
	['managing-rental-property', 'managing rental property'],
	['forming-an-hoa', 'forming or managing a community association'],
	['planning-a-renovation', 'planning a renovation'],
	['building-a-structure', 'building or substantially improving a structure'],
	['hiring-a-contractor', 'hiring a contractor'],
	['running-a-contracting-business', 'running a contracting business'],
	['signing-a-contract', 'signing a contract that requires insurance'],
	['providing-a-certificate', 'providing a certificate of insurance'],
	['buying-a-business', 'buying a business'],
	['starting-a-business', 'starting a business'],
	['adding-a-location', 'adding a business location'],
	['hiring-an-employee', 'hiring an employee'],
	['offering-benefits', 'offering employee benefits'],
	['working-remotely', 'working remotely'],
	['handling-customer-data', 'handling customer or patient data'],
	['responding-to-a-breach', 'responding to a suspected data breach'],
	['opening-a-medical-practice', 'opening a medical practice'],
	['providing-professional-services', 'providing professional services'],
	['operating-a-retail-business', 'operating a retail business'],
	['operating-a-restaurant', 'operating a restaurant or hospitality business'],
	['transporting-goods', 'transporting goods for others'],
	['using-commercial-vehicles', 'using commercial vehicles'],
	['hiring-drivers', 'hiring or supervising drivers'],
	['forming-a-nonprofit', 'forming a nonprofit'],
	['running-a-school', 'running a school or childcare program'],
	['planning-business-succession', 'planning business succession'],
	['protecting-a-key-person', 'protecting a key person relationship'],
	['reviewing-a-renewal', 'reviewing a renewal'],
	['receiving-a-nonrenewal', 'receiving a nonrenewal or cancellation notice'],
	['reporting-a-loss', 'reporting a loss or claim'],
	['appealing-a-claim-decision', 'responding to a disputed claim decision'],
	['recovering-after-a-disaster', 'recovering after a natural disaster'],
	['comparing-policy-documents', 'comparing policy documents'],
	['checking-a-company', 'checking an insurance company'],
];

const USE_CASE_INTENTS = [
	['questions', (useCase) => `What insurance questions come up when ${useCase}?`],
	['coverage-lines', (useCase) => `Which insurance lines should I inspect when ${useCase}?`],
	['documents', (useCase) => `Which documents should I gather when ${useCase}?`],
	['facts', (useCase) => `Which facts can change an insurance answer when ${useCase}?`],
	['state-context', (useCase) => `Which state or local rules may change the insurance questions when ${useCase}?`],
	['claim-records', (useCase) => `What records should I keep if a loss occurs when ${useCase}?`],
	['professional', (useCase) => `What should I ask a licensed professional when ${useCase}?`],
	['misunderstandings', (useCase) => `What common misunderstandings should I check when ${useCase}?`],
];

const AUDIENCES = [
	['consumer', 'consumer'],
	['homeowner', 'homeowner'],
	['renter', 'renter'],
	['landlord', 'landlord'],
	['small-business-owner', 'small business owner'],
	['hr-benefits-manager', 'HR or benefits manager'],
	['finance-professional', 'finance professional'],
	['real-estate-professional', 'real estate professional'],
	['contractor', 'contractor'],
	['nonprofit-leader', 'nonprofit leader'],
	['medical-practice-owner', 'medical practice owner'],
	['claims-professional', 'claims professional'],
	['attorney', 'attorney'],
	['insurer-or-regulator-researcher', 'insurer or regulator researcher'],
];

const AUDIENCE_INTENTS = [
	['start', (audience) => `Where should ${audience} start when researching insurance?`],
	['documents', (audience) => `Which insurance documents should ${audience} learn to read?`],
	['questions', (audience) => `Which insurance questions should ${audience} ask next?`],
	['sources', (audience) => `Which insurance sources should ${audience} trust and verify?`],
	['claims', (audience) => `What insurance claim records should ${audience} organize?`],
	['professional', (audience) => `What should ${audience} ask a licensed insurance professional?`],
];

const COMPANY_PAGE_UNIVERSE = [
	{
		id: 'licensed-p-and-c-insurers',
		name: 'Licensed property and casualty insurers',
		priority: 'P0',
		inclusion: 'Every source-verified risk-bearing insurer authorized in a launch jurisdiction, including distinct subsidiaries when the regulator treats them as distinct entities.',
		pageRole: 'Identity, official channels, public regulatory records, filed forms, and sourced coverage relationships. Never a reputation verdict.',
	},
	{
		id: 'licensed-life-annuity-insurers',
		name: 'Licensed life and annuity insurers',
		priority: 'P0',
		inclusion: 'Every source-verified life or annuity risk-bearing entity in the selected jurisdiction.',
		pageRole: 'Identity, official channels, public regulatory records, product-form sources, and jurisdiction context.',
	},
	{
		id: 'licensed-health-and-hmo-entities',
		name: 'Licensed health insurers and HMOs',
		priority: 'P0',
		inclusion: 'Every source-verified health insurer or HMO listed by the relevant regulator.',
		pageRole: 'Identity and official consumer/regulatory information; do not summarize individualized benefits or medical coverage.',
	},
	{
		id: 'surplus-lines-insurers',
		name: 'Surplus lines and nonadmitted insurers',
		priority: 'P0',
		inclusion: 'Entities in an official eligible or approved surplus-lines list for the selected jurisdiction.',
		pageRole: 'Identity, market role, official list status, and public source records. Never imply availability for a risk.',
	},
	{
		id: 'residual-markets-and-facilities',
		name: 'Residual markets, pools, and facilities',
		priority: 'P0',
		inclusion: 'State-created or state-recognized facilities such as FAIR plans, wind pools, earthquake authorities, and assigned-risk plans.',
		pageRole: 'Program identity, eligibility-source links, forms, public notices, and limits of the program record.',
	},
	{
		id: 'guaranty-associations',
		name: 'Insurance guaranty associations',
		priority: 'P1',
		inclusion: 'Official state guaranty associations and their public coverage or receivership materials.',
		pageRole: 'Public program reference only; do not present a guaranty association as an insurer or financial-strength score.',
	},
	{
		id: 'managing-general-agents-and-programs',
		name: 'MGAs, program administrators, and wholesalers',
		priority: 'P1',
		inclusion: 'Organizations with a source-verified role in placing, administering, or distributing insurance, separated from the risk-bearing carrier.',
		pageRole: 'Role and identity record; show the actual insurer when the source names it.',
	},
	{
		id: 'claims-administrators-and-tpas',
		name: 'Claims administrators and TPAs',
		priority: 'P1',
		inclusion: 'Source-verified administrators that consumers may encounter in a claim or benefit process.',
		pageRole: 'Identity and role context; never confuse an administrator with the insurer or promise a claims outcome.',
	},
	{
		id: 'reinsurers-and-industry-entities',
		name: 'Reinsurers and industry entities',
		priority: 'P2',
		inclusion: 'Publicly sourceable entities relevant to industry research, clearly labeled as consumer-facing or industry-facing.',
		pageRole: 'Industry reference pages, not consumer recommendations.',
	},
	{
		id: 'regulators-and-public-entities',
		name: 'Regulators and public insurance entities',
		priority: 'P0',
		inclusion: 'NAIC, state insurance departments, public authorities, residual programs, and official complaint or filing portals.',
		pageRole: 'Authority/source pages that help readers verify licensing, filings, notices, and public programs.',
	},
	{
		id: 'brokers-agents-and-professionals',
		name: 'Brokers, agents, and financial professionals',
		priority: 'P1',
		inclusion: 'Only opted-in profiles with identity, role, jurisdiction, and credential verification appropriate to the proposed contribution.',
		pageRole: 'Contributor profile, not an insurer dossier and not an endorsement.',
	},
	{
		id: 'insurtech-and-distribution-companies',
		name: 'InsurTech and distribution companies',
		priority: 'P2',
		inclusion: 'Publicly sourceable companies that distribute, administer, or provide technology around insurance, with the role explicitly named.',
		pageRole: 'Technology or distribution context; preserve the distinction from a risk-bearing insurer.',
	},
];

const SOURCE_SYSTEMS = [
	{ id: 'naic-cis', name: 'NAIC Consumer Insurance Search', url: 'https://content.naic.org/cis_consumer_information.htm', role: 'company identity and consumer-facing regulator search' },
	{ id: 'naic-fdr', name: 'NAIC Financial Data Repository', url: 'https://content.naic.org/industry_financial_filing.htm', role: 'publicly appropriate financial/regulatory source intake when access and licensing permit' },
	{ id: 'state-doi-company', name: 'State insurance department company records', url: 'https://www.insurance.ca.gov/01-consumers/120-company/', role: 'license status, company lists, complaints, enforcement, rate/form filings, and market conduct records' },
	{ id: 'official-company', name: 'Official company sources', url: null, role: 'legal name, official domain, public forms, notices, and consumer channels; always captured with retrieval date' },
];

function makeRecord({ family, intent, question, lineId = null, jurisdictionCode = null, jurisdictionName = null, contextId = null, audienceId = null }) {
	const idParts = [family, intent, lineId, jurisdictionCode, contextId, audienceId].filter(Boolean);
	return {
		id: `candidate-${slugify(idParts.join('-'))}`,
		question,
		inventoryFamily: family,
		intent,
		lineId,
		line: lineId ? lineLabel(lineId) : null,
		jurisdictionCode,
		jurisdictionName,
		contextId,
		audienceId,
		status: 'candidate',
		publicRoute: null,
		publishable: false,
		sourceIds: [],
		sourceRequirement: 'Attach primary law, regulator guidance, official policy/form material, or another clearly identified authoritative source before drafting.',
		reviewGates: ['research-editor', 'licensed-insurance-reviewer', 'jurisdiction-review-when-applicable', 'compliance-and-conflicts'],
		licenseReviewStatus: 'pending',
		lastChecked: null,
		decisionNote: 'Inventory candidate only. Do not render, index, answer, or publish until it is deduplicated, sourced, drafted, and signed off.',
	};
}

const questions = [];

for (const lineId of CANONICAL_LINES) {
	for (const [intent, render] of LINE_INTENTS) {
		questions.push(makeRecord({
			family: 'coverage-line',
			intent,
			question: render(lineLabel(lineId)),
			lineId,
		}));
	}
}

for (const lineId of CANONICAL_LINES) {
	for (const [jurisdictionCode, jurisdictionName] of JURISDICTIONS) {
		for (const [intent, render] of STATE_INTENTS) {
			questions.push(makeRecord({
				family: 'jurisdiction',
				intent,
				question: render(lineLabel(lineId), jurisdictionName),
				lineId,
				jurisdictionCode,
				jurisdictionName,
			}));
		}
	}
}

for (const [contextId, contextName] of USE_CASES) {
	for (const [intent, render] of USE_CASE_INTENTS) {
		questions.push(makeRecord({
			family: 'use-case',
			intent,
			question: render(contextName),
			contextId,
		}));
	}
}

for (const [audienceId, audienceName] of AUDIENCES) {
	const article = /^[aeiou]/i.test(audienceName) || /^(hr|insurer)/i.test(audienceName) ? 'an' : 'a';
	for (const [intent, render] of AUDIENCE_INTENTS) {
		questions.push(makeRecord({
			family: 'audience',
			intent,
			question: render(`${article} ${audienceName}`),
			audienceId,
		}));
	}
}

questions.sort((a, b) => a.id.localeCompare(b.id));

const existingCompanyRecords = readdirSync(join(ROOT, 'src/content/companies'))
	.filter((file) => file.endsWith('.md') || file.endsWith('.json'))
	.map((file) => file.replace(/\.(md|json)$/, ''))
	.sort();

const manifest = {
	manifestType: 'birch-content-master-inventory',
	generatedOn: CATALOG_DATE,
	status: 'planning-only',
	operator: 'Birch Research',
	product: 'birch.insure',
	questionCandidateCount: questions.length,
	questionCandidateFamilies: Object.fromEntries(
		[...new Set(questions.map((question) => question.inventoryFamily))]
			.map((family) => [family, questions.filter((question) => question.inventoryFamily === family).length]),
	),
	canonicalLineCount: CANONICAL_LINES.length,
	jurisdictionCount: JURISDICTIONS.length,
	useCaseCount: USE_CASES.length,
	audienceCount: AUDIENCES.length,
	companyPageFamilyCount: COMPANY_PAGE_UNIVERSE.length,
	companyPageUniverse: COMPANY_PAGE_UNIVERSE,
	sourceSystems: SOURCE_SYSTEMS,
	existingCompanyRecords,
	publicationRule: 'No candidate becomes a public page until it has source records, a drafted answer, resolved citations, appropriate jurisdiction scope, and licensed review.',
	};

writeFileSync(join(PLAN_DIR, 'birch-question-catalog.ndjson'), `${questions.map((question) => JSON.stringify(question)).join('\n')}\n`);
writeFileSync(join(PLAN_DIR, 'birch-company-page-universe.json'), `${JSON.stringify({
	manifestType: 'birch-company-page-universe',
	generatedOn: CATALOG_DATE,
	status: 'planning-only',
	operator: 'Birch Research',
	pageRule: 'A company page is an identity and source map. It is not a quality score, recommendation, or claims verdict.',
	selectionRule: 'Build the entity list from official regulator/company records for each launch jurisdiction; never treat a manually assembled list as exhaustive.',
	sourceSystems: SOURCE_SYSTEMS,
	families: COMPANY_PAGE_UNIVERSE,
	existingBirchRecords: existingCompanyRecords,
}, null, 2)}\n`);
writeFileSync(join(PLAN_DIR, 'birch-content-master-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
	questionCandidates: questions.length,
	canonicalLines: CANONICAL_LINES.length,
	jurisdictions: JURISDICTIONS.length,
	useCases: USE_CASES.length,
	audiences: AUDIENCES.length,
	companyPageFamilies: COMPANY_PAGE_UNIVERSE.length,
}, null, 2));
