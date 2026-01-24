import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import AnalyticsUsers from '~/components/analytics/AnalyticsUsers';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { useLoaderData } from '@remix-run/react';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBAnalytics = await api?.analytics.getGlobalAnalytics({ auth: token, headers: ipHeaders });
	if (!DBAnalytics || 'error' in DBAnalytics) throw makeResponse(DBAnalytics, 'Failed to get group analytics.');

	return {
		analytics: DBAnalytics.data,
	};
};

export default function GroupAnalytics() {
	const { analytics } = useLoaderData<typeof loader>();

	return (
		<AnalyticsUsers
			analytics={analytics}
			emptyMessage='No activity data available yet.'
			menuBar={{
				name: 'Analytics Overview',
				description: 'View activity analytics for all users across all boards.',
				goBackPath: '/groups',
				goBackWindow: true,
			}}
		/>
	);
}
