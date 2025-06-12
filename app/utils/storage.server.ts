import { createCookie, createCookieSessionStorage } from '@remix-run/node';
import config from '~/utils/config.server';

if (!config.sessionSecret) throw new Error('Session secret is not set!');

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: '__session',
		httpOnly: true,
		path: '/',
		sameSite: 'none',
		secure: true,
		secrets: [config.sessionSecret],
		maxAge: 60 * 60 * 24 * 7 * 2, // 2 weeks
	},
});

export const loginInfo = createCookie('login-info', {
	secrets: [config.sessionSecret],
	httpOnly: false,
	maxAge: 60 * 60, // 1 hour
});
