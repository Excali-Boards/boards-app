import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { validateParams } from '~/other/utils';
import { api } from '~/utils/web.server';
import type { AdminS3Board } from './admin.boards._index';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { boardId } = validateParams(params, ['boardId']);
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const result = await api?.request<AdminS3Board[]>({ method: 'GET', auth: token, headers: ipHeaders, endpoint: '/admin/boards' });
	if (!result || 'error' in result) throw makeResponse(result, 'Failed to resolve board.');

	const storedBoard = result.data.find((entry) => entry.boardId === boardId);
	if (!storedBoard?.board) throw makeResponse(null, 'Unresolved board.');

	const { board } = storedBoard;
	if (board.isPersonal && board.userId) return redirect(`/personal/${board.userId}/${board.categoryId}/${boardId}`);
	return redirect(`/groups/${board.groupId}/${board.categoryId}/${boardId}`);
};

export default function AdminBoard() {
	return null;
}
