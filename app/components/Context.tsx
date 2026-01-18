import type { ClientToServerEvents, ServerToClientEvents } from '~/other/types';
import { CollabUser, GetUsersOutput } from '@excali-boards/boards-api-client';
import { BoardInfo, SidebarType } from './Layout';
import type { Socket } from 'socket.io-client';
import { createContext } from 'react';

export type RootContextType = null | {
	sideBarHeader: 'header' | 'sidebar' | 'none';
	setSiteBarHeader: React.Dispatch<React.SetStateAction<'header' | 'sidebar' | 'none'>>;

	boardActiveCollaborators: CollabUser[];
	setBoardActiveCollaborators: React.Dispatch<React.SetStateAction<CollabUser[]>>;

	useOppositeColorForBoard: boolean;
	setUseOppositeColorForBoard: React.Dispatch<React.SetStateAction<boolean>>;

	canInvite: boolean;
	setCanInvite: React.Dispatch<React.SetStateAction<boolean>>;

	showAllBoards?: boolean;
	setShowAllBoards?: React.Dispatch<React.SetStateAction<boolean>>;

	boardInfo: BoardInfo | null;
	setBoardInfo: React.Dispatch<React.SetStateAction<BoardInfo | null>>;

	allowedPlatforms: string[];
	sideBarType: SidebarType | null;

	user: GetUsersOutput | null;
	token: string | null;
};

export const RootContext = createContext<RootContextType>(null);

export type PresenceSocket = Pick<Socket<ServerToClientEvents, ClientToServerEvents>, 'emit' | 'on' | 'off' | 'connected'>;

export type PresenceContextValue = {
	socket: PresenceSocket | null;
	setSocket: (socket: PresenceSocket | null) => void;
};

export const PresenceContext = createContext<PresenceContextValue | null>(null);
