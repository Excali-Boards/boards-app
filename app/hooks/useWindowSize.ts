import { useState, useEffect } from 'react';

export type WindowSizeState = {
	width: number;
	height: number;
	offsetTop: number;
}

export function useWindowSize(): WindowSizeState {
	const [windowSize, setWindowSize] = useState<WindowSizeState>({
		width: 0,
		height: 0,
		offsetTop: 0,
	});

	useEffect(() => {
		handleResize();

		function handleResize() {
			if (typeof window === 'undefined') return;

			const vp = window.visualViewport;
			if (!vp) return;

			const { width = 0, height = 0, offsetTop = 0 } = vp;

			setWindowSize((state) => {
				if (width === state.width && height === state.height && offsetTop === state.offsetTop) return state;
				return { width, height, offsetTop };
			});
		}

		const visualViewport = window.visualViewport;
		if (visualViewport) {
			visualViewport.addEventListener('resize', handleResize);
			visualViewport.addEventListener('scroll', handleResize);
		}

		return () => {
			if (visualViewport) {
				visualViewport.removeEventListener('resize', handleResize);
				visualViewport.removeEventListener('scroll', handleResize);
			}
		};
	}, []);

	return windowSize;
}
