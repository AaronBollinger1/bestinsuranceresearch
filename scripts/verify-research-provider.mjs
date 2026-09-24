import test from 'node:test';
import assert from 'node:assert/strict';

const {
	buildPerplexitySearchRequest,
	normalizePerplexitySearchResponse,
	sanitizeResearchQuery,
} = await import('../src/lib/research-provider.ts');

const brief = {
	id: 'brief-ca-earthquake',
	topic: 'California earthquake insurance',
	jurisdiction: 'California, United States',
	asOf: '2026-09-11',
	requestedSourceClasses: ['regulator-guidance'],
	question: 'What does a California earthquake policy generally address?',
};

test('provider requests are bounded, filtered, and do not put the key in the body', () => {
	const request = buildPerplexitySearchRequest({
		brief,
		query: 'What does a California earthquake policy generally address?',
		sourceClass: 'regulator-guidance',
		allowedDomains: ['insurance.ca.gov'],
	}, { apiKey: 'test-secret', maxResults: 99 });
	const body = JSON.parse(request.init.body);
	assert.equal(request.endpoint, 'https://api.perplexity.ai/search');
	assert.equal(body.max_results, 20);
	assert.deepEqual(body.search_domain_filter, ['insurance.ca.gov']);
	assert.equal(body.country, 'US');
	assert.equal(body.max_tokens, 6000);
	assert.match(request.init.headers.Authorization, /^Bearer test-secret$/);
	assert.ok(!request.init.body.includes('test-secret'));
});

test('privacy screen refuses identifying policy and claim details', () => {
	assert.throws(() => sanitizeResearchQuery('Can you review policy number ABC-123 for me?'), /private, local review path/);
	assert.throws(() => sanitizeResearchQuery(''), /research query is required/);
	assert.equal(sanitizeResearchQuery('  How does a deductible work?  '), 'How does a deductible work?');
});

test('normalization keeps only HTTPS allowlisted candidates and de-duplicates URLs', () => {
	const result = normalizePerplexitySearchResponse({
		id: 'provider-request-1',
		results: [
			{ title: 'Official guidance', url: 'https://insurance.ca.gov/earthquake#overview', snippet: 'Read the official guidance.', date: '2026-01-02' },
			{ title: 'Duplicate', url: 'https://insurance.ca.gov/earthquake', snippet: 'Same page.' },
			{ title: 'Untrusted', url: 'https://example.com/earthquake', snippet: 'Not allowlisted.' },
			{ title: 'Insecure', url: 'http://insurance.ca.gov/earthquake', snippet: 'Not HTTPS.' },
		],
	}, {
		brief,
		query: brief.question,
		sourceClass: 'regulator-guidance',
		allowedDomains: ['insurance.ca.gov'],
	}, '2026-09-11T12:00:00.000Z');
	assert.equal(result.sources.length, 1);
	assert.equal(result.sources[0].status, 'candidate');
	assert.equal(result.sources[0].url, 'https://insurance.ca.gov/earthquake');
	assert.equal(result.sources[0].publishedOn, '2026-01-02');
	assert.equal(result.provider.requestId, 'provider-request-1');
});
