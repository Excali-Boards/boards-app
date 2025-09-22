import type { ServerBuild } from '@remix-run/server-runtime';
import { serveStatic } from '@hono/node-server/serve-static';
import { HttpBindings, serve } from '@hono/node-server';
import LoggerModule from '~/utils/logger.server';
import configServer from '~/utils/config.server';
import { createMiddleware } from 'hono/factory';
import { remix } from 'remix-hono/handler';
import { compress } from 'hono/compress';
import { time } from '~/other/utils';
import { cors } from 'hono/cors';
import { config } from 'dotenv';
import { Hono } from 'hono';

config({ path: '../.env' });

const isProd = process.env.NODE_ENV === 'production';
const app = new Hono<{ Bindings: HttpBindings; }>();

app.use(cors({
	origin: isProd ? [
		configServer.baseUrl,
	] : [
		configServer.baseUrl,
		'http://localhost:3000',
	],
	maxAge: 86400,
	credentials: true,
	allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
	allowHeaders: ['Authorization', 'Content-Type'],
}));

if (isProd) app.use(compress());

app.use('*', cacheMiddleware(time(1, 'h', 's')), serveStatic({ root: isProd ? './build/client' : './public' }));
// app.use('*', logger((m, ...rest) => LoggerModule('Server', m, 'blue', ...rest)));

const viteDevServer = isProd
	? undefined
	: await import('vite').then((vite) =>
		vite.createServer({
			server: { middlewareMode: true },
			appType: 'custom',
		}),
	);

app.use(async (c, next) => {
	const build = viteDevServer
		? await viteDevServer.ssrLoadModule('virtual:remix/server-build') as unknown as ServerBuild
		// @ts-ignore
		// eslint-disable-next-line
		: await import('../build/server/remix.js') as unknown as ServerBuild;

	return remix({
		build,
		mode: isProd ? 'production' : 'development',
	})(c, next);
});

if (isProd) {
	serve({
		...app,
		port: configServer.port,
	}, async (info) => {
		console.clear();
		LoggerModule('Hono', `🚀 Server started on port ${info.port}!\n`, 'green');
	});
}

export default app;
export function cacheMiddleware(seconds: number) {
	return createMiddleware(async (c, next) => {
		if (
			!c.req.path.match(/\.[a-zA-Z0-9]+$/) ||
			c.req.path.endsWith('.data')
		) return next();

		await next();

		if (!c.res.ok) return;
		c.res.headers.set('cache-control', `public, max-age=${seconds}`);
	});
}
