import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { validateParams } from '~/other/utils';
import { api } from '~/utils/web.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId, categoryId, boardId } = validateParams(params, ['groupId', 'categoryId', 'boardId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBFlashcardData = await api?.flashcards.getDeck({ auth: token, groupId, categoryId, boardId, headers: ipHeaders });
	if (!DBFlashcardData || 'error' in DBFlashcardData) {
		const DBFlashcardInit = await api?.flashcards.initializeDeck({ auth: token, groupId, categoryId, boardId, headers: ipHeaders });
		if (!DBFlashcardInit || 'error' in DBFlashcardInit) throw makeResponse(null, 'Failed to initialize flashcard deck.');

		return redirect(`/flashcards/${groupId}/${categoryId}/${boardId}`);
	}

	return redirect(`/flashcards/${groupId}/${categoryId}/${boardId}`);
};

export default function InitializeFlashcards() {
	return <div>Redirecting..</div>;
}
