import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { useBreakpointValue, useColorMode } from '@chakra-ui/react';
import { Board as BoardComponent } from '~/components/board/Main';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import configServer from '~/utils/config.server';
import { useLoaderData } from '@remix-run/react';
import { validateParams } from '~/other/utils';
import { useContext, useEffect } from 'react';
import { api } from '~/utils/web.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { boardId, groupId, categoryId } = validateParams(params, ['boardId', 'groupId', 'categoryId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBBoard = await api?.boards.getBoard({ auth: token, boardId, groupId, categoryId });
	if (!DBBoard || 'error' in DBBoard) throw makeResponse(DBBoard, 'Failed to get board.');

	return {
		...DBBoard.data,
		webUrl: configServer.baseUrl,
		currentUrl: configServer.baseUrl + `/groups/${DBBoard.data.group.id}/${DBBoard.data.category.id}/${DBBoard.data.board.id}`,
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

			const result = await api?.boards.kickUserFromRoom({ auth: token, categoryId, groupId, userId, boardId });
			return makeResObject(result, 'Failed to kick user from board.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Board() {
	const { socketUrl, board, category, group, webUrl, currentUrl, s3Url, s3Bucket } = useLoaderData<typeof loader>();
	const { useOppositeColorForBoard, hideCollaborators, user, setBoardActiveCollaborators } = useContext(RootContext) || {};
	const isMobile = useBreakpointValue({ base: true, md: false });
	const { colorMode } = useColorMode();

	useEffect(() => {
		window.EXCALIDRAW_ASSET_PATH = '/';
	}, [webUrl]);

	return (
		<BoardComponent
			updateCollaborators={setBoardActiveCollaborators || (() => { })}
			useOppositeColorForBoard={useOppositeColorForBoard || false}
			hideCollaborators={hideCollaborators || false}
			name={`${category.name} - ${board.name}`}
			canEdit={board.accessLevel !== 'read'}
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
