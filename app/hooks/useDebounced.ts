import { useEffect, useRef, useState } from 'react';

export function useDebounced<T, D>(value: T, deps: D[], timeout: number) {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, timeout);

		return () => clearTimeout(handler);
	}, [timeout, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

	return debouncedValue;
}

export function useDebounce<T extends (...args: unknown[]) => void>(callback: T, timeout: number) {
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	return function debouncedCallback(...args: Parameters<T>) {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);

		timeoutRef.current = setTimeout(() => {
			callback(...args);
		}, timeout);
	};
}
