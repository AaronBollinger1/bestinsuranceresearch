import { randomUUID } from 'node:crypto';
import type { ProfessionalKind, VerificationRequest } from './store';

export const PROFESSIONAL_ROLES: Record<ProfessionalKind, string> = {
	broker: 'Insurance broker',
	adjuster: 'Claims adjuster',
	attorney: 'Insurance attorney',
};

export interface VerificationDraft {
	kind: ProfessionalKind;
	licenseNumber: string;
	authority: string;
	registerUrl: string;
}

export interface VerificationFieldError {
	field: keyof VerificationDraft;
	message: string;
}

const trimmed = (input: Record<string, string>, field: string) => (input[field] ?? '').trim();

function validRegisterUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && Boolean(url.hostname);
	} catch {
		return false;
	}
}

/**
 * Validate only the public facts needed to start a verification request.
 * Approval is intentionally a separate moderator action: this function never
 * turns a contributor's assertion into a badge.
 */
export function validateVerificationRequest(input: Record<string, string>): {
	errors: VerificationFieldError[];
	draft: VerificationDraft | null;
} {
	const errors: VerificationFieldError[] = [];
	const kind = trimmed(input, 'kind') as ProfessionalKind;
	const licenseNumber = trimmed(input, 'licenseNumber');
	const authority = trimmed(input, 'authority');
	const registerUrl = trimmed(input, 'registerUrl');

	if (!(kind in PROFESSIONAL_ROLES)) {
		errors.push({ field: 'kind', message: 'Choose one of the available professional roles.' });
	}
	if (licenseNumber.length < 4 || licenseNumber.length > 40) {
		errors.push({ field: 'licenseNumber', message: 'A public licence number needs to be between 4 and 40 characters.' });
	}
	if (authority.length < 4 || authority.length > 120) {
		errors.push({ field: 'authority', message: 'Name the public authority that issued or maintains the licence.' });
	}
	if (!validRegisterUrl(registerUrl)) {
		errors.push({ field: 'registerUrl', message: 'Use the direct HTTPS URL for the public register or lookup.' });
	}

	return {
		errors,
		draft:
			errors.length === 0
				? { kind, licenseNumber, authority, registerUrl }
				: null,
	};
}

export function newVerificationRequestId(): string {
	return randomUUID();
}

export function verificationRecord(
	email: string,
	draft: VerificationDraft,
	submittedAt: string,
	id = newVerificationRequestId(),
): VerificationRequest {
	return {
		id,
		email,
		...draft,
		state: 'pending',
		submittedAt,
	};
}
