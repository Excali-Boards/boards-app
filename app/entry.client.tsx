import createEmotionCache, { defaultCache } from '~/context/createEmotionCache';
import { startTransition, StrictMode, useState } from 'react';
import { ClientStyleContext } from '~/context/context';
import { RemixBrowser } from '@remix-run/react';
import { hydrateRoot } from 'react-dom/client';
import { CacheProvider } from '@emotion/react';

function ClientCacheProvider({ children }: { children: React.ReactNode; }) {
	const [cache, setCache] = useState(defaultCache);

	return (
		<ClientStyleContext.Provider value={{ reset: () => setCache(createEmotionCache()) }}>
			<CacheProvider value={cache}>
				{children}
			</CacheProvider>
		</ClientStyleContext.Provider>
	);
}

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<ClientCacheProvider>
				<RemixBrowser />
			</ClientCacheProvider>
		</StrictMode>,
	);
});
