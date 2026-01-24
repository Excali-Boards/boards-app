import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import AnalyticsUsers from '~/components/analytics/AnalyticsUsers';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { useLoaderData } from '@remix-run/react';
import { validateParams } from '~/other/utils';
import { api } from '~/utils/web.server';
import { FaLink } from 'react-icons/fa';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId, categoryId } = validateParams(params, ['groupId', 'categoryId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBGroup = await api?.groups.getGroup({ auth: token, groupId, headers: ipHeaders });
	if (!DBGroup || 'error' in DBGroup) throw makeResponse(DBGroup, 'Failed to get group.');

	const category = DBGroup.data.categories.find((c) => c.id === categoryId);
	if (!category) throw makeResponse(null, 'Category not found.');

	const DBAnalytics = await api?.analytics.getCategoryAnalytics({ auth: token, categoryId, groupId, headers: ipHeaders });
	if (!DBAnalytics || 'error' in DBAnalytics) throw makeResponse(DBAnalytics, 'Failed to get category analytics.');

	return {
		group: DBGroup.data.group,
		category,
		analytics: DBAnalytics.data,
	};
};

export default function CategoryAnalytics() {
	const { group, category, analytics } = useLoaderData<typeof loader>();

	return (
		<AnalyticsUsers
			analytics={analytics}
			emptyMessage='No activity data available for this category yet.'
			menuBar={{
				name: `Analytics: ${category.name}`,
				description: 'View activity analytics for all boards in this category.',
				goBackPath: `/groups/${group.id}`,
				goBackWindow: true,
				customButtons: [{
					type: 'link',
					icon: <FaLink />,
					label: 'View Category',
					tooltip: 'View category',
					to: `/groups/${group.id}/categories/${category.id}`,
				}],
			}}
		/>
	);
}

