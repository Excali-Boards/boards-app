import { CollabUser, GetUsersOutput } from '@excali-boards/boards-api-client';
import { BoardInfo, SidebarType } from './Layout';
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
