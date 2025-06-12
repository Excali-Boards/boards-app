import { ActionFunctionArgs, LoaderFunctionArgs, MetaArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { useBreakpointValue, useColorMode } from '@chakra-ui/react';
import { Board as BoardComponent } from '~/components/board/Main';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import configServer from '~/utils/config.server';
import { useLoaderData } from '@remix-run/react';
import { validateParams } from '~/other/utils';
import { defaultMeta } from '~/other/keywords';
import { useContext, useEffect } from 'react';
import { themeColor } from '~/other/types';
import { api } from '~/utils/web.server';

export function meta({ data }: MetaArgs<typeof loader>) {
	if (!data) return defaultMeta;

	return [
		{ charset: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' },

		{ title: `Boards - ${data.category.name} - ${data.board.name}` },
		{ name: 'description', content: `Board ${data.board.name} in the ${data.category.name} category.` },

		{ property: 'og:site_name', content: 'Boards' },
		{ property: 'og:title', content: `Boards - ${data.category.name} - ${data.board.name}` },
		{ property: 'og:description', content: `Board ${data.board.name} in the ${data.category.name} category.` },
		{ property: 'og:image', content: '/banner.webp' },

		{ name: 'twitter:title', content: `Boards - ${data.category.name} - ${data.board.name}` },
		{ name: 'twitter:description', content: `Board ${data.board.name} in the ${data.category.name} category.` },
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:image', content: '/banner.webp' },

		{ name: 'theme-color', content: themeColor },
	];
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { boardId, groupId, categoryId } = validateParams(params, ['boardId', 'groupId', 'categoryId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const boardInfo = await api?.boards.getBoard({ auth: token, boardId, groupId, categoryId });
	if (!boardInfo || 'error' in boardInfo) throw makeResponse(boardInfo, 'Failed to get board.');

	return {
		...boardInfo.data,
		webUrl: configServer.baseUrl,
		currentUrl: configServer.baseUrl + `/groups/${boardInfo.data.group.id}/${boardInfo.data.category.id}/${boardInfo.data.board.id}`,
		socketUrl: configServer.apiUrl,
		s3Bucket: configServer.s3Bucket,
		s3Url: configServer.s3Url,
	};
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { groupId, categoryId, boardId } = validateParams(params, ['groupId', 'categoryId', 'boardId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'kickUser': {
			const userId = formData.get('userId') as string;

			const isKicked = await api?.boards.kickUserFromRoom({ auth: token, categoryId, groupId, userId, boardId });
			if (!isKicked || 'error' in isKicked) return makeResObject(isKicked, 'Failed to kick user from board.');

			return { status: 200, data: 'User kicked successfully.' };
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Board() {
	const { socketUrl, board, isAdmin, category, group, webUrl, currentUrl,s3Url, s3Bucket } = useLoaderData<typeof loader>();
	const { useOppositeColorForBoard, hideCollaborators, user, setBoardActiveCollaborators } = useContext(RootContext) || {};
	const isMobile = useBreakpointValue({ base: true, md: false });
	const { colorMode } = useColorMode();

	useEffect(() => {
		window.EXCALIDRAW_ASSET_PATH = '/';
	}, [webUrl]);

	return (
		<BoardComponent
			updateCollaborators={setBoardActiveCollaborators || (() => {})}
			useOppositeColorForBoard={useOppositeColorForBoard || false}
			canEdit={isAdmin || board.accessLevel === 'Write'}
			hideCollaborators={hideCollaborators || false}
			name={`${category.name} - ${board.name}`}
			isMobile={isMobile || false}
			categoryId={category.id}
			currentUrl={currentUrl}
			colorMode={colorMode}
			socketUrl={socketUrl}
			s3Bucket={s3Bucket}
			boardId={board.id}
			groupId={group.id}
			s3Url={s3Url}
			user={user!}
		/>
	);
}
