import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { makeResponse } from '~/utils/functions.server';
import { authenticator } from '~/utils/auth.server';
import { validateParams } from '~/other/utils';
import { api } from '~/utils/web.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupName, categoryName, boardName } = validateParams(params, ['groupName', 'categoryName', 'boardName']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const boardInfo = await api?.utils.resolveBoard({ auth: token, body: { groupName, categoryName, boardName } });
	if (!boardInfo || 'error' in boardInfo) throw makeResponse(boardInfo, 'Failed to resolve board.');

	return redirect(`/groups/${boardInfo.data.groupId}/${boardInfo.data.categoryId}/${boardInfo.data.boardId}`);
};

export default function Resolve() {
	return <div>Redirecting..</div>;
}
