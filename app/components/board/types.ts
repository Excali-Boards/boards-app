import { CollabUser, GetUsersOutput } from '@excali-boards/boards-api-client';
import { ClientToServerEvents, ServerToClientEvents } from '~/other/types';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { Socket } from 'socket.io-client';

export type BoardProps = {
	updateCollaborators: (users: CollabUser[]) => void;
	useOppositeColorForBoard: boolean;
	colorMode: 'light' | 'dark';
	hideCollaborators: boolean;
	canReallyEdit: boolean;
	user: GetUsersOutput;
	categoryId: string;
	currentUrl: string;
	isMobile: boolean;
	socketUrl: string;
	canEdit: boolean;
	s3Bucket: string;
	boardId: string;
	groupId: string;
	s3Url: string;
	token: string;
	name: string;
};

export type TldrawBoardProps = BoardProps & {
	licenseKey?: string;
};

export type DefaultBoardState = {
	connectedBefore: boolean;
	isInitialized: boolean;
	isFirstTime: boolean;
	isConnected: boolean;
	isKicked: boolean;
	isSaved: boolean;
};

export type BoardExcalidrawState = {
	excalidrawAPI: ExcalidrawImperativeAPI | null;
	socketIO: Socket<ServerToClientEvents, ClientToServerEvents> | null;
} & DefaultBoardState;

export type PreparedElement = {
	id: string;
	x: number;
	y: number;
	height: number;
	width: number;
	patch: {
		autoResize: true;
		text: string;
		originalText: string;
		width: number;
		height: number;
	};
};
