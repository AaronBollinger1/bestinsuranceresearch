import { commons } from '../config/commons';

/**
 * Sending the one kind of mail this site sends.
 *
 * There is exactly one template, because there is exactly one reason to email
 * anybody: a sign-in link they asked for a second ago. No newsletter, no digest,
 * no "we noticed you haven't posted", no notification of a reply. Those all
 * require an unsubscribe mechanism, a preference store and a reason to keep
 * sending mail, and none of them is why this property exists.
 *
 * If a second template is ever added, that is the moment to ask whether the
 * Commons has quietly become something that mails people.
 */
export interface Mailer {
	sendSignInLink(to: string, url: string): Promise<void>;
}

/**
 * Development. Prints the link instead of sending it.
 *
 * This is what makes the whole flow runnable with no accounts anywhere: start
 * the server, submit an address, copy the link off the console. It refuses to
 * load in production rather than silently swallowing mail, because a sign-in
 * that appears to work and sends nothing is the worst of the three outcomes.
 */
export function consoleMailer(): Mailer {
	return {
		async sendSignInLink(to, url) {
			console.log(`\n  [dev mailer] sign-in link for ${to}\n  ${url}\n`);
		},
	};
}

/**
 * Resend.
 *
 * Untested against the live API from the session that wrote it - there was no
 * network egress and no key. The surface it depends on is one POST and one
 * status code, which is the reason the mailer is an interface: everything above
 * it is exercised against `consoleMailer`, and this is the only part that has
 * to be confirmed by actually sending a message.
 *
 * The first real send is the test. Send one to yourself before opening sign-in
 * to anybody else.
 */
export function resendMailer(apiKey: string, from: string): Mailer {
	return {
		async sendSignInLink(to, url) {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					from,
					to,
					subject: `Sign in to ${commons.name}`,
					text: [
						`Somebody asked to sign in to ${commons.name} with this address.`,
						'',
						'Open this link within 15 minutes:',
						url,
						'',
						'It works once. If you did not ask for it, nothing has happened and',
						'you can ignore this message - no account was created and nobody',
						'was told you have one.',
						'',
						'We only ever email sign-in links. No newsletters, no notifications.',
					].join('\n'),
				}),
			});

			if (!response.ok) {
				/* The body may name the address. Log the status only. */
				throw new Error(`Sign-in mail rejected with ${response.status}`);
			}
		},
	};
}

/**
 * Pick one from the environment.
 *
 * Production without a key is a hard failure rather than a fallback to the
 * console. A deployment that prints sign-in links into a log is a deployment
 * that hands out sessions to anyone who can read the log.
 */
export function mailerFromEnv(env: Record<string, string | undefined>, isProduction: boolean): Mailer {
	const key = env.RESEND_API_KEY;
	const from = env.COMMONS_MAIL_FROM;

	if (key && from) return resendMailer(key, from);

	if (isProduction) {
		throw new Error(
			'RESEND_API_KEY and COMMONS_MAIL_FROM are required in production. Refusing to print sign-in links to a log.',
		);
	}
	return consoleMailer();
}
