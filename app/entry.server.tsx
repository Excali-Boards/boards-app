import createEmotionCache from '~/context/createEmotionCache';
import { renderToPipeableStream } from 'react-dom/server';
import { ServerStyleContext } from '~/context/context';
import type { EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { CacheProvider } from '@emotion/react';
import { PassThrough } from 'stream';

export default function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
) {
	return new Promise((resolve, reject) => {
		const stream = new PassThrough();
		const cache = createEmotionCache();
		let didError = false;

		const { pipe, abort } = renderToPipeableStream(
			<ServerStyleContext.Provider value={null}>
				<CacheProvider value={cache}>
					<RemixServer context={remixContext} url={request.url} />
				</CacheProvider>
			</ServerStyleContext.Provider>,
			{
				onShellReady() {
					const readableStream = new ReadableStream({
						start(controller) {
							stream.on('data', (chunk) => {
								controller.enqueue(new TextEncoder().encode(chunk));
							});

							stream.on('end', () => {
								controller.close();
							});

							stream.on('error', (err) => {
								console.error(err);
								controller.error(err);
							});
						},
					});

					responseHeaders.set('Content-Security-Policy', "frame-ancestors 'none'; img-src * data: blob:");
					responseHeaders.set('X-Content-Type-Options', 'nosniff');
					responseHeaders.set('Referrer-Policy', 'no-referrer');
					responseHeaders.set('Content-Type', 'text/html');
					responseHeaders.set('X-Frame-Options', 'DENY');

					resolve(
						new Response(readableStream, {
							status: didError ? 500 : responseStatusCode,
							headers: responseHeaders,
						}),
					);

					pipe(stream);
				},
				onShellError(err) {
					reject(err);
				},
				onError(err) {
					didError = true;
					console.error(err);
				},
			},
		);

		setTimeout(abort, 5000);
	});
}
