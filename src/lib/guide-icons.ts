/**
 * The side mark for a guide.
 *
 * One glyph per canonical line, so a reader with three guides open can tell them
 * apart before reading a word, and so a link to a guide is recognisable in a
 * list.
 *
 * Deliberately not one icon per family: a family mark would put the same glyph
 * on eight commercial guides, which is decoration rather than identification.
 * Where a line genuinely has no distinct glyph it falls back to its family mark,
 * and that fallback is written down here rather than left to whichever icon was
 * nearest to hand.
 */
import type { CanonicalLine } from './lines';

export type IconName =
	| 'ShieldCheck'
	| 'Building2'
	| 'House'
	| 'KeyRound'
	| 'Activity'
	| 'Truck'
	| 'Car'
	| 'HardHat'
	| 'Users'
	| 'Lock'
	| 'Gavel'
	| 'Package'
	| 'Umbrella'
	| 'Waves'
	| 'Gem'
	| 'Landmark'
	| 'HeartPulse'
	| 'FileSignature'
	| 'Flame';

/** Canonical line to glyph. */
const BY_LINE: Partial<Record<CanonicalLine, IconName>> = {
	'commercial-general-liability': 'ShieldCheck',
	'commercial-property': 'Building2',
	'business-income': 'Activity',
	'commercial-auto': 'Truck',
	auto: 'Car',
	'workers-compensation': 'HardHat',
	'employers-liability': 'HardHat',
	'employment-practices-liability': 'Users',
	'third-party-employment-practices-liability': 'Users',
	'wage-and-hour-defense': 'Users',
	'cyber-liability': 'Lock',
	'privacy-and-network-security': 'Lock',
	'technology-errors-and-omissions': 'Lock',
	'crime-and-social-engineering': 'Lock',
	'professional-liability': 'Gavel',
	'medical-professional-liability': 'HeartPulse',
	'errors-and-omissions': 'Gavel',
	'directors-and-officers': 'Landmark',
	'umbrella-excess': 'Umbrella',
	homeowners: 'House',
	'dwelling-fire': 'KeyRound',
	'condominium-unit-owners': 'Building2',
	renters: 'KeyRound',
	mobilehome: 'House',
	'residential-earthquake': 'Waves',
	flood: 'Waves',
	'residential-flood': 'Waves',
	'difference-in-conditions': 'Flame',
	'scheduled-personal-property': 'Gem',
	wildfire: 'Flame',
	'inland-marine': 'Package',
	'builders-risk': 'HardHat',
	'motor-truck-cargo': 'Truck',
	'surplus-lines': 'Landmark',
	surety: 'FileSignature',
	'contract-surety': 'FileSignature',
	'license-and-permit-bonds': 'FileSignature',
	'court-bonds': 'Gavel',
	'contractual-risk-transfer': 'FileSignature',
	'additional-insured': 'FileSignature',
	'group-health': 'HeartPulse',
	'employee-benefits': 'HeartPulse',
	'term-life': 'HeartPulse',
	'permanent-life': 'HeartPulse',
	'key-person': 'Users',
	'buy-sell': 'FileSignature',
	bop: 'Building2',
};

/** Fallback by family, used only where a line has no glyph of its own. */
const BY_FAMILY: Record<string, IconName> = {
	commercial: 'ShieldCheck',
	personal: 'House',
	health: 'HeartPulse',
	life: 'HeartPulse',
};

export function iconFor(line: string | undefined, family: string): IconName {
	const byLine = line ? BY_LINE[line as CanonicalLine] : undefined;
	return byLine ?? BY_FAMILY[family] ?? 'ShieldCheck';
}
