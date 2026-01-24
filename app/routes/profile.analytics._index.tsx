import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { useLoaderData } from '@remix-run/react';
import { formatTime } from '~/other/utils';
import { api } from '~/utils/web.server';
import AnalyticsList from '~/components/analytics/AnalyticsList';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBAnalytics = await api?.analytics.getUserAnalytics({ auth: token, headers: ipHeaders });
	if (!DBAnalytics || 'error' in DBAnalytics) throw makeResponse(DBAnalytics, 'Failed to get analytics.');

	return { analytics: DBAnalytics.data };
};

export default function UserAnalytics() {
	const { analytics } = useLoaderData<typeof loader>();

	const totalStats = analytics.reduce((acc, item) => ({
		totalSessions: acc.totalSessions + item.totalSessions,
		totalActiveSeconds: acc.totalActiveSeconds + item.totalActiveSeconds,
	}), { totalSessions: 0, totalActiveSeconds: 0 });

	const stats = [
		{ value: analytics.length, label: 'Boards Viewed' },
		{ value: totalStats.totalSessions, label: 'Total Sessions' },
		{ value: formatTime(totalStats.totalActiveSeconds, 's', true), label: 'Total Active Time' },
		{ value: analytics.length > 0 ? formatTime(totalStats.totalActiveSeconds / analytics.length, 's', true) : '0s', label: 'Avg Time per Board' },
	];

	return (
		<AnalyticsList
			menuBar={{
				name: 'My Activity Analytics',
				description: 'View your activity across all boards you have access to.',
				goBackPath: '/profile',
			}}
			stats={stats}
			items={analytics.map((info) => ({
				id: info.board.boardId,
				title: info.board.name,
				subtitle: `${info.board.category.group.name} • ${info.board.category.name}`,
				sessions: info.totalSessions,
				activeSeconds: info.totalActiveSeconds,
			}))}
			tableTitle='All Boards'
			nameLabel='Board'
			emptyMessage='No activity data available yet.'
		/>
	);
}
