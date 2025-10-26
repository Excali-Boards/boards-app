import { CollabUser, GetUsersOutput } from '@excali-boards/boards-api-client';
import { createContext } from 'react';
import { BoardInfo } from './Layout';

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
	user: GetUsersOutput | null;
	token: string | null;
};

export const RootContext = createContext<RootContextType>(null);
