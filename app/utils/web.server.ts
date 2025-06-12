import { WebDataManager } from '@excali-boards/boards-api-client';
import config from '~/utils/config.server';

let api: WebDataManager | undefined;

declare global {
	// eslint-disable-next-line no-var
	var __api: WebDataManager | undefined;
}

if (!config.apiUrl) console.error('No API_URL provided!');
else {
	if (process.env.NODE_ENV === 'production') {
		api = new WebDataManager(config.apiUrl);
	} else {
		if (!global.__api) {
			global.__api = new WebDataManager(config.apiUrl);
		}

		api = global.__api;
	}
}

export { api };
