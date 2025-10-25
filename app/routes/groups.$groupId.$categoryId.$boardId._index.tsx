import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { useBreakpointValue, useColorMode } from '@chakra-ui/react';
import { ExcalidrawBoard } from '~/components/board/Excalidraw';
import { TldrawBoard } from '~/components/board/Tldraw';
import { canEdit, validateParams } from '~/other/utils';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import configServer from '~/utils/config.server';
import { useLoaderData } from '@remix-run/react';
import InfoComponent from '~/components/Info';
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
		licenseKey: configServer.tldrawLicense,
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
	const { socketUrl, board, category, group, webUrl, currentUrl, s3Url, s3Bucket, licenseKey } = useLoaderData<typeof loader>();
	const { useOppositeColorForBoard, hideCollaborators, user, token, setBoardActiveCollaborators } = useContext(RootContext) || {};
	const isMobile = useBreakpointValue({ base: true, md: false });
	const { colorMode } = useColorMode();

	useEffect(() => {
		window.EXCALIDRAW_ASSET_PATH = '/';
	}, [webUrl]);

	const Component = board.type === 'Excalidraw' ? ExcalidrawBoard : board.type === 'Tldraw' ? TldrawBoard : null;
	if (!Component) return <div>Board type not supported.</div>;

	if (!token || !user) return (
		<InfoComponent
			title='401 | Unauthorized.'
			text='You are not authorized to view this page.'
		/>
	);

	return (
		<Component
			updateCollaborators={setBoardActiveCollaborators || (() => { })}
			useOppositeColorForBoard={useOppositeColorForBoard || false}
			hideCollaborators={hideCollaborators || false}
			name={`${category.name} - ${board.name}`}
			canEdit={canEdit(board.accessLevel)}
			licenseKey={licenseKey || undefined}
			isMobile={isMobile || false}
			categoryId={category.id}
			currentUrl={currentUrl}
			colorMode={colorMode}
			socketUrl={socketUrl}
			s3Bucket={s3Bucket}
			boardId={board.id}
			groupId={group.id}
			token={token}
			s3Url={s3Url}
			user={user}
		/>
	);
}
