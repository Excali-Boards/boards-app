import { themeColor } from './types';

export const defaultMeta = [
	{ charset: 'utf-8' },
	{ name: 'viewport', content: 'width=device-width, initial-scale=1' },

	{ title: 'Boards' },
	{ name: 'description', content: 'A collaborative whiteboard application with real-time features.' },

	{ property: 'og:title', content: 'Boards' },
	{ property: 'og:description', content: 'A collaborative whiteboard application with real-time features.' },
	{ property: 'og:image', content: '/banner.webp' },

	{ name: 'twitter:title', content: 'Boards' },
	{ name: 'twitter:description', content: 'A collaborative whiteboard application with real-time features.' },
	{ name: 'twitter:card', content: 'summary_large_image' },
	{ name: 'twitter:image', content: '/banner.webp' },

	{ name: 'theme-color', content: themeColor },
];
