import { BoardsManager } from '@excali-boards/boards-api-client';

export const apiClient = (url: string) => new BoardsManager(url);
