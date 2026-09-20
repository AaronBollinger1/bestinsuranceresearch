/**
 * Keep machine-readable citation indexes aligned with the visible review
 * contract. A date on an under-review record identifies the record, not a
 * completed licensed review.
 */
export function machineReviewDate(reviewState: string | undefined, date: string): string {
	const label = reviewState === 'under-review' ? 'record date' : 'last reviewed';
	return `${label}: ${date}${reviewState ? ` | review state: ${reviewState}` : ''}`;
}
