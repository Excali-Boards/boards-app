import { useEffect, useRef } from 'react';

export default function useInterval<T extends () => void>(callback: T, delay: number | null) {
	const callbacRef = useRef<T>();

	useEffect(() => {
		callbacRef.current = callback;
	});

	useEffect(() => {
		if (!delay) return () => {};

		const interval = setInterval(() => callbacRef.current && callbacRef.current(), delay);

		return () => clearInterval(interval);
	}, [delay]);
}
