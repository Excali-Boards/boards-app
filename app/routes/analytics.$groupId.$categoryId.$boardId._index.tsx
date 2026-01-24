import { formatRelativeTime, formatTime, validateParams } from '~/other/utils';
import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import AnalyticsList from '~/components/analytics/AnalyticsList';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { useLoaderData } from '@remix-run/react';
import { api } from '~/utils/web.server';
import { FaLink } from 'react-icons/fa';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId, categoryId, boardId } = validateParams(params, ['groupId', 'categoryId', 'boardId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBBoard = await api?.boards.getBoard({ auth: token, boardId, categoryId, groupId, headers: ipHeaders });
	if (!DBBoard || 'error' in DBBoard) throw makeResponse(DBBoard, 'Failed to get board.');

	const DBAnalytics = await api?.analytics.getBoardAnalytics({ auth: token, boardId, categoryId, groupId, headers: ipHeaders });
	if (!DBAnalytics || 'error' in DBAnalytics) throw makeResponse(DBAnalytics, 'Failed to get board analytics.');

	return {
		board: DBBoard.data.board,
		category: DBBoard.data.category,
		group: DBBoard.data.group,
		analytics: DBAnalytics.data,
	};
};

export default function BoardAnalytics() {
	const { board, category, group, analytics } = useLoaderData<typeof loader>();

	const totalStats = analytics.reduce((acc, item) => ({
		totalSessions: acc.totalSessions + item.totalSessions,
		totalActiveSeconds: acc.totalActiveSeconds + item.totalActiveSeconds,
	}), { totalSessions: 0, totalActiveSeconds: 0 });

	const uniqueUsers = new Set(analytics.map((a) => a.user.userId)).size;

	const stats = [
		{ value: uniqueUsers, label: 'Total Unique Viewers' },
		{ value: totalStats.totalSessions, label: 'Total Sessions' },
		{ value: formatTime(totalStats.totalActiveSeconds, 's', true), label: 'Total Active Time' },
		{ value: uniqueUsers > 0 ? formatTime(totalStats.totalActiveSeconds / uniqueUsers, 's', true) : '0s', label: 'Avg Time per Viewer' },
	];

	return (
		<AnalyticsList
			menuBar={{
				name: `Analytics: ${board.name}`,
				description: 'View user activity analytics for this board.',
				goBackPath: `/groups/${group.id}/${category.id}`,
				goBackWindow: true,
				customButtons: [{
					type: 'link',
					icon: <FaLink />,
					label: 'View Board',
					tooltip: 'View board',
					to: `/groups/${group.id}/categories/${category.id}/boards/${board.id}`,
				}],
			}}
			stats={stats}
			items={analytics.map((item) => ({
				id: item.user.userId,
				title: item.user.displayName,
				avatarUrl: item.user.avatarUrl,
				sessions: item.totalSessions,
				activeSeconds: item.totalActiveSeconds,
				lastActive: formatRelativeTime(new Date(item.lastActivityAt), true),
			}))}
			nameLabel='User'
			tableTitle='All Users'
			emptyMessage='No activity data available for this board yet.'
			showLastActive={true}
		/>
	);
}

