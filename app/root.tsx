import { Outlet, isRouteErrorResponse, useLoaderData, useMatches, useRouteError } from '@remix-run/react';
import { LoaderFunctionArgs, LinksFunction, MetaFunction } from '@remix-run/node';
import { allowedPlatforms as allowedLoginPlatforms } from '~/utils/config.server';
import { useCallback, useEffect, useState } from 'react';
import { ChakraProvider, Flex } from '@chakra-ui/react';
import { getCachedUser } from './utils/session.server';
import { cssBundleHref } from '@remix-run/css-bundle';
import { authenticator } from './utils/auth.server';
import { RootContext } from '~/components/Context';
import { defaultMeta } from '~/other/keywords';
import InfoComponent from '~/components/Info';
import theme from '~/components/theme/base';
import { ColabUser } from './other/types';
import Layout from '~/components/Layout';
import isMobileDetect from 'is-mobile';
import { Document } from '~/document';
import '~/styles/global.css';

export const links: LinksFunction = () => [
	...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
	{ rel: 'icon', href: '/favicon.ico' },
];

export const meta: MetaFunction = () => {
	return defaultMeta;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await getCachedUser(request);
	if (user?.status === 401) return authenticator.logout(request, {
		redirectTo: '/',
	});

	return {
		user: user && 'data' in user ? user.data : null,
		isMobile: isMobileDetect({ ua: request.headers.get('user-agent') || '' }),
		allowedPlatforms: allowedLoginPlatforms,
		nullHeader: [
			'routes/groups.$groupId.$categoryId.$boardId._index',
		],
	};
};

export default function App() {
	const { user, nullHeader, isMobile, allowedPlatforms } = useLoaderData<typeof loader>();

	const [sideBarHeader, setSiteBarHeader] = useState<'header' | 'sidebar' | 'none'>('header');
	const [sortType, setSortType] = useState<'grid' | 'list'>('list');
	const [hideCollaborators, setHideCollaborators] = useState(false);

	const [boardActiveCollaborators, setBoardActiveCollaborators] = useState<ColabUser[]>([]);
	const [useOppositeColorForBoard, setUseOppositeColorForBoard] = useState(false);
	const [isNavSticky, setIsNavStickyOriginal] = useState(true);

	const matches = useMatches();

	const setIsNavSticky = useCallback((value: boolean) => {
		localStorage.setItem('isNavSticky', value.toString());
		setIsNavStickyOriginal(value);
	}, []);

	useEffect(() => matches.some((match) => nullHeader?.includes(match.id)) ? setSiteBarHeader(isMobile ? 'none' : 'sidebar') : setSiteBarHeader('header'), [isMobile, matches, nullHeader]);
	useEffect(() => sortType ? localStorage.setItem('sortType', sortType) : undefined, [sortType]);

	useEffect(() => {
		setIsNavStickyOriginal(localStorage.getItem('isNavSticky') !== 'false');

		const type = localStorage.getItem('sortType') as 'grid' | 'list';
		if (['grid', 'list'].includes(type)) setSortType(type);
		else setSortType('list');
	}, []); // eslint-disable-line

	return (
		<Document>
			<ChakraProvider theme={theme}>
				<RootContext.Provider value={{
					boardActiveCollaborators, setBoardActiveCollaborators,
					useOppositeColorForBoard, setUseOppositeColorForBoard,
					hideCollaborators, setHideCollaborators,
					sideBarHeader, setSiteBarHeader,
					isNavSticky, setIsNavSticky,
					sortType, setSortType,
					allowedPlatforms,
					user,
				}}>
					<Layout
						user={user}
						sideBarHeader={sideBarHeader}
						isBoardsAdmin={user?.isDev || user?.isBoardsAdmin}
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
				<Layout user={null} isError>
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
