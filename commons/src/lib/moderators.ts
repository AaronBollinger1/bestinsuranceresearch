/**
 * Who may read the moderation queue.
 *
 * An environment variable, and deliberately nothing else. There is no page that
 * grants moderator status, no field on the account form, and no admin flag a
 * compromised session could flip - which means the whole privilege-escalation
 * surface of this application is a deployment setting that only somebody with
 * access to the deployment can change.
 *
 * `COMMONS.md` section 8 says the same licensed reviewer who signs off the
 * Record moderates the Commons at launch. That is one address. A list this
 * short does not need a table, and giving it one would create the exact surface
 * this avoids.
 */
export function moderators(env: Record<string, string | undefined>): string[] {
	return (env.COMMONS_MODERATORS ?? '')
		.split(',')
		.map((entry) => entry.trim().toLowerCase())
		.filter(Boolean);
}

export function isModerator(email: string | undefined, env: Record<string, string | undefined>): boolean {
	if (!email) return false;
	return moderators(env).includes(email.toLowerCase());
}
