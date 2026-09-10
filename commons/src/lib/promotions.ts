import { randomUUID } from 'node:crypto';
import type { Post, PromotionRequest, Thread } from './store';

/** A moderator invitation is created only for the visible post it names. */
export function newPromotionRequestId(): string {
	return randomUUID();
}

export function promotionRequestFromPost(
	post: Post,
	thread: Thread,
	id: string,
	createdAt: string,
): PromotionRequest {
	if (post.threadId !== thread.id) throw new Error('The post does not belong to the selected thread.');
	if (post.state !== 'visible') throw new Error('Only a visible post can be invited to become a case report.');
	return {
		id,
		postId: post.id,
		threadId: thread.id,
		subjectId: thread.subjectId,
		email: post.email,
		state: 'pending',
		createdAt,
	};
}
