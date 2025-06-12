import { ServerStyleContext, ClientStyleContext } from '~/context/context';
import { Meta, Links, ScrollRestoration, Scripts } from '@remix-run/react';
import { withEmotionCache } from '@emotion/react';
import { useContext, useEffect } from 'react';

export type DocumentProps = {
	children: React.ReactNode;
};

export const Document = withEmotionCache(({ children }: DocumentProps, emotionCache) => {
	const serverStyleData = useContext(ServerStyleContext);
	const clientStyleData = useContext(ClientStyleContext);

	useEffect(() => {
		emotionCache.sheet.container = document.head;

		const tags = emotionCache.sheet.tags;
		emotionCache.sheet.flush();

		for (const tag of tags) {
			(emotionCache.sheet as unknown as { _insertTag: (tag: HTMLStyleElement) => void })._insertTag(tag);
		}

		clientStyleData?.reset();
	}, []); // eslint-disable-line

	return (
		<html lang='hr' suppressHydrationWarning={true}>
			<head>
				<Meta />
				<Links />

				{serverStyleData?.map(({ key, ids, css }) => (
					<style
						key={key}
						data-emotion={`${key} ${ids.join(' ')}`}
						dangerouslySetInnerHTML={{ __html: css }}
					/>
				))}
			</head>
			<body>
				{children}
				<Scripts />
				<ScrollRestoration />
			</body>
		</html>
	);
});
