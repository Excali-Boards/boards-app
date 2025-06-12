import { useEffect, useMemo, useState } from 'react';

export function useScroll() {
	const [scrollPos, setScrollPos] = useState(0);

	useEffect(() => {
		function handleScroll() {
			setScrollPos(window.scrollY);
		}

		handleScroll();
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	return useMemo(() => {
		return {
			scrollPos,
			isScrolled: scrollPos > 0,
		};
	}, [scrollPos]);
}
