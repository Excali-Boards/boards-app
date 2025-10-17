import { useEventListener } from '@chakra-ui/react';

export type Key = {
	key: string;
	special?: ('ctrl' | 'shift' | 'alt')[];
} | string;

export function useHotkeys(keys: Key[], callback: (k: Key) => void, dontIf?: boolean) {
	return useEventListener('keydown', (event) => {
		if (dontIf) return;

		const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator?.platform);
		const formatSpecialKey = (specialKey: 'ctrl' | 'shift' | 'alt') => ((specialKey === 'ctrl' ? isMac ? 'meta' : 'ctrl' : specialKey) + 'Key') as ('metaKey' | 'shiftKey' | 'altKey' | 'ctrlKey');

		const someMatch = keys.find((key) => {
			if (typeof key === 'string') return event.key.toLowerCase() === key.toLowerCase();

			const keyMatch = event.key.toLowerCase() === key.key.toLowerCase();
			const allSpecialMatch = key.special?.length ? key.special?.every((specialKey) => event[formatSpecialKey(specialKey)]) : true;

			return keyMatch && allSpecialMatch;
		});

		if (someMatch) {
			event.preventDefault();
			callback(someMatch);
		}
	});
}
