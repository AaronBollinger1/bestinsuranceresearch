const required = [
	'COMMONS_ENV',
	'PUBLIC_COMMONS_READY',
	'COMMONS_DATABASE_URL',
	'RESEND_API_KEY',
	'COMMONS_MAIL_FROM',
	'COMMONS_MODERATORS',
	'PUBLIC_COMMONS_ORIGIN',
	'PUBLIC_RECORD_ORIGIN',
];

const expectedOrigins = {
	PUBLIC_COMMONS_ORIGIN: 'https://commons.birch.insure',
	PUBLIC_RECORD_ORIGIN: 'https://birch.insure',
};

const missing = required.filter((name) => !process.env[name]?.trim());
const problems = [];

if (process.env.COMMONS_ENV && process.env.COMMONS_ENV !== 'production') {
	problems.push('COMMONS_ENV must equal production');
}

if (process.env.PUBLIC_COMMONS_READY && !['true', 'false'].includes(process.env.PUBLIC_COMMONS_READY)) {
	problems.push('PUBLIC_COMMONS_READY must equal true or false');
}

function requireHttps(name) {
	const value = process.env[name];
	if (!value) return;
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:') problems.push(`${name} must use https`);
		if (url.username || url.password) problems.push(`${name} must not contain credentials`);
	} catch {
		problems.push(`${name} must be a valid URL`);
	}
}

function requireExpectedOrigin(name, expected) {
	const value = process.env[name];
	if (!value) return;
	try {
		if (new URL(value).origin !== expected) {
			problems.push(`${name} must be ${expected} in production`);
		}
	} catch {
		/* requireHttps reports malformed URLs without duplicating the detail. */
	}
}

function requirePostgresUrl(name) {
	const value = process.env[name];
	if (!value) return;
	try {
		const url = new URL(value);
		if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
			problems.push(`${name} must use a postgres or postgresql URL`);
		}
	} catch {
		problems.push(`${name} must be a valid Postgres URL`);
	}
}

function isEmail(value) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requireFromAddress(name) {
	const value = process.env[name];
	if (!value) return;
	const match = value.match(/<([^<>]+)>$/);
	if (!isEmail(match ? match[1] : value)) {
		problems.push(`${name} must be an email address or a display name followed by one`);
	}
}

function requireModerators(name) {
	const value = process.env[name];
	if (!value) return;
	const emails = value.split(',').map((email) => email.trim()).filter(Boolean);
	if (!emails.length || emails.some((email) => !isEmail(email))) {
		problems.push(`${name} must contain one or more comma-separated email addresses`);
	}
}

requireHttps('PUBLIC_COMMONS_ORIGIN');
requireHttps('PUBLIC_RECORD_ORIGIN');
for (const [name, expected] of Object.entries(expectedOrigins)) requireExpectedOrigin(name, expected);
requirePostgresUrl('COMMONS_DATABASE_URL');
requireFromAddress('COMMONS_MAIL_FROM');
requireModerators('COMMONS_MODERATORS');

if (!process.env.RESEND_API_KEY?.trim() && !missing.includes('RESEND_API_KEY')) {
	problems.push('RESEND_API_KEY must be non-empty');
}

if (missing.length || problems.length) {
	console.error('Commons production preflight failed.');
	for (const name of missing) console.error(`- ${name}: missing`);
	for (const problem of problems) console.error(`- ${problem}`);
	process.exitCode = 1;
} else {
	console.log('Commons production preflight passed: required values are present and shaped correctly.');
	console.log('Secrets were not printed. This check does not replace a database, mail, or domain smoke test.');
}
