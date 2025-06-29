import { BoardsManager } from '@excali-boards/boards-api-client';
import config from '~/utils/config.server';

let api: BoardsManager | undefined;

declare global {
	// eslint-disable-next-line no-var
	var __api: BoardsManager | undefined;
}

if (!config.apiUrl) console.error('No API_URL provided!');
else {
	if (process.env.NODE_ENV === 'production') {
		api = new BoardsManager(config.apiUrl);
	} else {
		if (!global.__api) {
			global.__api = new BoardsManager(config.apiUrl);
		}

		api = global.__api;
	}
}

export { api };
