import { PresenceContext, PresenceContextValue, PresenceSocket, RootContext } from '~/components/Context';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { useBreakpointValue, useColorMode } from '@chakra-ui/react';
import { ExcalidrawBoard } from '~/components/board/Excalidraw';
import { TldrawBoard } from '~/components/board/Tldraw';
import { canEdit, validateParams } from '~/other/utils';
import { authenticator } from '~/utils/auth.server';
import configServer from '~/utils/config.server';
import { useLoaderData } from '@remix-run/react';
import InfoComponent from '~/components/Info';
import { PresenceState } from '~/other/types';
import { api } from '~/utils/web.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { boardId, groupId, categoryId } = validateParams(params, ['boardId', 'groupId', 'categoryId']);

	const previewQuery = new URL(request.url).searchParams.get('preview');
	const isPreview = previewQuery === 'true';

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
		isPreview,
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
	const { socketUrl, board, category, group, webUrl, currentUrl, s3Url, s3Bucket, licenseKey, isPreview } = useLoaderData<typeof loader>();
	const { useOppositeColorForBoard, boardInfo, user, token, setBoardActiveCollaborators, setBoardInfo } = useContext(RootContext) || {};
	const isMobile = useBreakpointValue({ base: true, md: false });
	const { colorMode } = useColorMode();

	const [presenceSocket, setPresenceSocket] = useState<PresenceSocket | null>(null);
	const presenceSocketRef = useRef<PresenceSocket | null>(null);
	const currentStateRef = useRef<PresenceState>('active');
	const idleTimerRef = useRef<number | null>(null);

	useEffect(() => {
		setBoardInfo?.({ accessLevel: board.accessLevel, hideCollaborators: false, hasFlashCards: board.hasFlashcards });
	}, [setBoardInfo, board.accessLevel, board.hasFlashcards]);

	useEffect(() => {
		window.EXCALIDRAW_ASSET_PATH = '/';
	}, [webUrl]);

	useEffect(() => {
		presenceSocketRef.current = presenceSocket;
	}, [presenceSocket]);

	const setPresence = useCallback((state: PresenceState) => {
		if (state === currentStateRef.current) return;
		currentStateRef.current = state;
		presenceSocketRef.current?.emit?.('presenceUpdate', { state });
	}, []);

	const bumpActivity = useCallback(() => {
		if (document.hidden || !document.hasFocus()) return;
		setPresence('active');

		if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
		idleTimerRef.current = window.setTimeout(() => setPresence('idle'), 90_000);
	}, [setPresence]);

	useEffect(() => {
		const activityEvents = ['mousemove', 'keydown', 'wheel', 'touchstart', 'pointerdown', 'scroll'] as const;
		const handleVisibilityChange = () => {
			if (document.hidden) setPresence('away');
			else bumpActivity();
		};

		const handleFocus = () => bumpActivity();
		const handleBlur = () => setPresence('away');

		for (const evt of activityEvents) window.addEventListener(evt, bumpActivity, { passive: true });
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('focus', handleFocus);
		window.addEventListener('blur', handleBlur);

		return () => {
			for (const evt of activityEvents) window.removeEventListener(evt, bumpActivity);

			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('focus', handleFocus);
			window.removeEventListener('blur', handleBlur);

			if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
		};
	}, [bumpActivity, setPresence]);

	useEffect(() => {
		if (!presenceSocket) return;
		const handleConnect = () => bumpActivity();
		presenceSocket.on?.('connect', handleConnect);
		if (presenceSocket.connected) bumpActivity();

		return () => {
			presenceSocket.off?.('connect', handleConnect);
		};
	}, [presenceSocket, bumpActivity]);

	const Component = board.type === 'Excalidraw' ? ExcalidrawBoard : board.type === 'Tldraw' ? TldrawBoard : null;
	const presenceContextValue = useMemo<PresenceContextValue>(() => ({
		socket: presenceSocket,
		setSocket: setPresenceSocket,
	}), [presenceSocket]);

	if (!Component) return <div>Board type not supported.</div>;

	if (!token || !user) return (
		<InfoComponent
			title='401 | Unauthorized.'
			text='You are not authorized to view this page.'
		/>
	);

	return (
		<PresenceContext.Provider value={presenceContextValue}>
			<Component
				updateCollaborators={setBoardActiveCollaborators || (() => { })}
				canEdit={isPreview ? false : canEdit(board.accessLevel, user?.isDev)}
				useOppositeColorForBoard={useOppositeColorForBoard || false}
				hideCollaborators={boardInfo?.hideCollaborators || false}
				canReallyEdit={canEdit(board.accessLevel, user?.isDev)}
				name={`${category.name} - ${board.name}`}
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
		</PresenceContext.Provider>
	);
}
