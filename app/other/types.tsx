import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { GetAllSortedOutput } from '@excali-boards/boards-api-client';
import type { Collaborator } from '@excalidraw/excalidraw/types';
import { RoomSnapshot } from '@tldraw/sync';

export type Simplify<T> = {
	[K in keyof T]: T[K];
};

export type NoNestedReadonly<T> = {
	-readonly [P in keyof T]: T[P];
};

export type TimeUnits = 'ns' | 'µs' | 'ms' | 's' | 'm' | 'h' | 'd' | 'w';

export type PickFromUnion<T, K extends T> = K;
export type ObjectWithout<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type WebReturnType<T> = { status: 200; data: T; } | { status: 400 | 401 | 403 | 500; error: string; };

export const themeColor = '#6966db';
export const themeColorLight = '#A6A4F0';
export const bgColor = '#1a1a1a';

declare global {
	interface Window {
		EXCALIDRAW_ASSET_PATH: string;
	}
}

export type BackendRooms = {
	boardId: string;
	collaborators: {
		id: string;
		username: string;
		avatarUrl: string;
	}[];
	elements: number;
}[];

export type ClientData = {
	elements: ExcalidrawElement[];
} | {
	snapshot: RoomSnapshot | null;
}

export type SceneBroadcastData = {
	elements: ExcalidrawElement[];
};

export type CollaboratorPointer = {
	socketId: string;
	username: string;
	state?: 'active' | 'idle' | 'away';
	selectedElementIds?: string[];
	button?: 'up' | 'down';
	pointer?: {
		tool: 'pointer' | 'laser';
		x: number;
		y: number;
	};
};

export type UserToFollow = {
	socketId: string;
	username: string;
};

export type OnUserFollowedPayload = {
	userToFollow: UserToFollow;
	action: 'follow' | 'unfollow';
};

export type SceneBounds = readonly [
	sceneX: number,
	sceneY: number,
	sceneX2: number,
	sceneY2: number,
];


export type BoundsData<T extends string> = {
	[x in T]: string;
} & {
	bounds: SceneBounds;
};

export type SnapshotData = SceneBroadcastData;

export type ActionType = 'add' | 'remove';
export type FileActionData<T extends ActionType> = {
	action: T;
	files: T extends 'add' ? UploadFile[] : string[];
};

export type UploadFile = {
	id: string;
	mimeType: string;
	data: string | File | ArrayBuffer | Uint8Array | Buffer;
};

export type StatsData = {
	success: number;
	failed: number;
	total: number;
};

// Other.
export type FindConflictsProps = {
	allData: GetAllSortedOutput;

	selectedGroups: string[];
	selectedCategories: string[];
	selectedBoards: string[];

	groupRole: string | null;
	categoryRole: string | null;
	boardRole: string | null;
};

// For: socket.emit or io.to().emit, io.emit
export type ServerToClientEvents = {
	init: (data: ClientData) => unknown;
	isSaved: () => unknown;
	kick: () => unknown;

	// Board.
	tldraw: (data: string) => unknown;

	// Excalidraw.
	filesUpdated: (stats?: StatsData) => unknown;
	preloadFiles: (files: string[]) => unknown;
	followedBy: (data: string[]) => unknown;
	setCollaborators: (collaborators: Collaborator[]) => unknown;
	broadcastScene: (data: SceneBroadcastData) => unknown;
	collaboratorPointerUpdate: (data: CollaboratorPointer) => unknown;
	relayVisibleSceneBounds: (data: BoundsData<'socketId'>) => unknown;
	sendSnapshot: (data: SnapshotData) => unknown;
};

// For: socket.on
export type ClientToServerEvents = {
	tldraw: (data: string) => unknown;

	// Excalidraw.
	sendSnapshot: (data: SnapshotData) => unknown;
	broadcastScene: (data: SceneBroadcastData) => unknown;
	collaboratorPointerUpdate: (data: CollaboratorPointer) => unknown;
	userFollow: (data: OnUserFollowedPayload) => unknown;
	relayVisibleSceneBounds: (data: BoundsData<'roomId'>) => unknown;
};
