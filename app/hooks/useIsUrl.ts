import { useCallback } from 'react';

export function useIsUrl() {
	return useCallback((url: string) => {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}, []);
}
