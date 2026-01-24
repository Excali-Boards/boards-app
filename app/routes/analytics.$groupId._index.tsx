import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import AnalyticsUsers from '~/components/analytics/AnalyticsUsers';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { useLoaderData } from '@remix-run/react';
import { validateParams } from '~/other/utils';
import { api } from '~/utils/web.server';
import { FaLink } from 'react-icons/fa';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId } = validateParams(params, ['groupId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBGroup = await api?.groups.getGroup({ auth: token, groupId, headers: ipHeaders });
	if (!DBGroup || 'error' in DBGroup) throw makeResponse(DBGroup, 'Failed to get group.');

	const DBAnalytics = await api?.analytics.getGroupAnalytics({ auth: token, groupId, headers: ipHeaders });
	if (!DBAnalytics || 'error' in DBAnalytics) throw makeResponse(DBAnalytics, 'Failed to get group analytics.');

	return {
		group: DBGroup.data.group,
		analytics: DBAnalytics.data,
	};
};

export default function GroupAnalytics() {
	const { group, analytics } = useLoaderData<typeof loader>();

	return (
		<AnalyticsUsers
			analytics={analytics}
			emptyMessage='No activity data available for this group yet.'
			menuBar={{
				name: `Analytics: ${group.name}`,
				description: 'View activity analytics for all boards in this group.',
				goBackPath: '/groups',
				goBackWindow: true,
				customButtons: [{
					type: 'link',
					icon: <FaLink />,
					label: 'View Group',
					tooltip: 'View group',
					to: `/groups/${group.id}`,
				}],
			}}
		/>
	);
}
