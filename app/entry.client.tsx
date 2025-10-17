import createEmotionCache, { defaultCache } from './context/createEmotionCache';
import { ClientStyleContext } from './context/context';
import { RemixBrowser } from '@remix-run/react';
import { CacheProvider } from '@emotion/react';
import * as ReactDOM from 'react-dom/client';
import React, { useState } from 'react';
import 'temporal-polyfill/global';

function ClientCacheProvider({ children }: { children: React.ReactNode; }) {
	const [cache, setCache] = useState(defaultCache);

	function reset() {
		setCache(createEmotionCache());
	}

	return (
		<ClientStyleContext.Provider value={{ reset }}>
			<CacheProvider value={cache}>{children}</CacheProvider>
		</ClientStyleContext.Provider>
	);
}

const hydrate = () => {
	React.startTransition(() => {
		ReactDOM.hydrateRoot(
			document,
			<ClientCacheProvider>
				<RemixBrowser />
			</ClientCacheProvider>,
		);
	});
};

if (window.requestIdleCallback) window.requestIdleCallback(hydrate);
else setTimeout(hydrate, 1);
