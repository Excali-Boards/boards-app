import { CollabUser, GetUsersOutput } from '@excali-boards/boards-api-client';
import { createContext } from 'react';

export type RootContextType = null | {
	sideBarHeader: 'header' | 'sidebar' | 'none';
	setSiteBarHeader: (type: 'header' | 'sidebar' | 'none') => void;

	hideCollaborators: boolean;
	setHideCollaborators: (value: boolean) => void;

	boardActiveCollaborators: CollabUser[];
	setBoardActiveCollaborators: (users: CollabUser[]) => void;

	useOppositeColorForBoard: boolean;
	setUseOppositeColorForBoard: (value: boolean) => void;

	canInvite: boolean;
	setCanInvite: (value: boolean) => void;

	showAllBoards?: boolean;
	setShowAllBoards?: (value: boolean) => void;

	allowedPlatforms: string[];
	user: GetUsersOutput | null;
	token: string | null;
};

export const RootContext = createContext<RootContextType>(null);
