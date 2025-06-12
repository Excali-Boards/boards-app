import { WebDataManager } from '@excali-boards/boards-api-client';

export const apiClient = (url: string) => new WebDataManager(url);
