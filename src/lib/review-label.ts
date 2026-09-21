export type PublicReviewState = 'reviewed' | 'under-review' | 'corrected';

/** Use a neutral date label until a licensed reviewer has signed off a record. */
export function reviewDateLabel(reviewState: PublicReviewState, reviewedLabel = 'Reviewed'): string {
	return reviewState === 'under-review' ? 'Record date' : reviewedLabel;
}
