import { Outlet, isRouteErrorResponse, useLoaderData, useMatches, useRouteError } from '@remix-run/react';
import { LoaderFunctionArgs, LinksFunction, MetaFunction } from '@remix-run/node';
import { allowedPlatforms as allowedLoginPlatforms } from '~/utils/config.server';
import { CachedResponse, getCachedUser } from './utils/session.server';
import { CollabUser } from '@excali-boards/boards-api-client';
import Layout, { BoardInfo } from '~/components/Layout';
import { ChakraProvider, Flex } from '@chakra-ui/react';
import { cssBundleHref } from '@remix-run/css-bundle';
import { authenticator } from './utils/auth.server';
import { RootContext } from '~/components/Context';
import InfoComponent from '~/components/Info';
import theme from '~/components/theme/base';
import { useEffect, useState } from 'react';
import { themeColor } from './other/types';
import isMobileDetect from 'is-mobile';
import { Document } from '~/document';
import '~/styles/global.css';

export const links: LinksFunction = () => [
	...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
	{ rel: 'icon', href: '/favicon.ico' },
];

export const meta: MetaFunction = () => {
	return [
		{ charset: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' },

		{ title: 'Boards' },
		{ name: 'description', content: 'A collaborative whiteboard application with real-time features.' },

		{ property: 'og:title', content: 'Boards' },
		{ property: 'og:description', content: 'A collaborative whiteboard application with real-time features.' },
		{ property: 'og:image', content: '/banner.webp' },

		{ name: 'twitter:title', content: 'Boards' },
		{ name: 'twitter:description', content: 'A collaborative whiteboard application with real-time features.' },
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:image', content: '/banner.webp' },

		{ name: 'theme-color', content: themeColor },
	];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	let data: CachedResponse;

	try {
		data = await getCachedUser(request);
		if (data?.data?.status === 401) throw new Error('Unauthorized.');
	} catch {
		return authenticator.logout(request, { redirectTo: '/' });
	}

	return {
		token: data?.token || null,
		user: data?.data && 'data' in data.data ? data.data.data : null,
		isMobile: isMobileDetect({ ua: request.headers.get('user-agent') || '' }),
		allowedPlatforms: allowedLoginPlatforms,
		nullHeader: [
			'routes/groups.$groupId.$categoryId.$boardId._index',
			'routes/groups.$groupId.calendar._index',
		],
	};
};

export default function App() {
	const { user, token, nullHeader, isMobile, allowedPlatforms } = useLoaderData<typeof loader>();

	const [sideBarHeader, setSiteBarHeader] = useState<'header' | 'sidebar' | 'none'>('header');
	const [boardActiveCollaborators, setBoardActiveCollaborators] = useState<CollabUser[]>([]);
	const [useOppositeColorForBoard, setUseOppositeColorForBoard] = useState(false);
	const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null);
	const [canInvite, setCanInvite] = useState(user?.isDev || false);
	const [showAllBoards, setShowAllBoards] = useState(true);

	const matches = useMatches();

	useEffect(() => {
		if (matches.some((match) => nullHeader?.includes(match.id))) setSiteBarHeader(isMobile ? 'none' : 'sidebar');
		else setSiteBarHeader('header');
	}, [isMobile, matches, nullHeader]);

	return (
		<Document>
			<ChakraProvider theme={theme}>
				<RootContext.Provider value={{
					boardActiveCollaborators, setBoardActiveCollaborators,
					useOppositeColorForBoard, setUseOppositeColorForBoard,
					sideBarHeader, setSiteBarHeader,
					showAllBoards, setShowAllBoards,
					boardInfo, setBoardInfo,
					canInvite, setCanInvite,
					allowedPlatforms,
					token,
					user,
				}}>
					<Layout
						user={user}
						sideBarHeader={sideBarHeader}
					>
						<Outlet />
					</Layout>
				</RootContext.Provider>
			</ChakraProvider>
		</Document>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<Document>
			<ChakraProvider theme={theme}>
				<Layout user={null}>
					<Flex
						alignItems={'center'}
						justifyContent={'center'}
						flexDir={'column'}
						mt={'30vh'}
					>
						{isRouteErrorResponse(error) ? (
							<InfoComponent
								title={'Error ' + error.status}
								text={error.statusText || error.data}
								button={error.statusText.includes('contact') ? {
									redirectUrl: 'https://github.com/Excali-Boards',
									text: 'Contact Support',
									isLink: true,
								} : undefined}
							/>
						) : (error instanceof Error ? (
							<InfoComponent
								title={'Error'}
								text={error.message}
							/>
						) : (
							<InfoComponent
								title={'Error'}
								text={'An error occurred while loading this page.'}
							/>
						))}
					</Flex>
				</Layout>
			</ChakraProvider>
		</Document>
	);
}
