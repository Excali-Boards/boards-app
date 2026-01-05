import { ExcalidrawElement, InitializedExcalidrawImageElement, ExcalidrawImageElement, ExcalidrawTextElement, FontString, FontFamilyValues } from '@excalidraw/excalidraw/element/types';
import { ResolvablePromise } from '@excalidraw/excalidraw/utils';

let textMetricsProvider: CanvasTextMetricsProvider | null = null;

export const CJK_HAND_DRAWN_FALLBACK_FONT = 'Xiaolai';
export const WINDOWS_EMOJI_FALLBACK_FONT = 'Segoe UI Emoji';

export const SANS_SERIF_GENERIC_FONT = 'sans-serif';
export const MONOSPACE_GENERIC_FONT = 'monospace';

export const FONT_FAMILY_GENERIC_FALLBACKS = {
	[SANS_SERIF_GENERIC_FONT]: 998,
	[MONOSPACE_GENERIC_FONT]: 999,
};

export const FONT_FAMILY_FALLBACKS = {
	[CJK_HAND_DRAWN_FALLBACK_FONT]: 100,
	...FONT_FAMILY_GENERIC_FALLBACKS,
	[WINDOWS_EMOJI_FALLBACK_FONT]: 1000,
};

export const FONT_FAMILY = {
	Virgil: 1,
	Helvetica: 2,
	Cascadia: 3,
	// leave 4 unused as it was historically used for Assistant (which we don't use anymore) or custom font (Obsidian)
	Excalifont: 5,
	Nunito: 6,
	'Lilita One': 7,
	'Comic Shanns': 8,
	'Liberation Sans': 9,
	Assistant: 10,
};

export class CanvasTextMetricsProvider {
	private canvas: HTMLCanvasElement;

	constructor () {
		this.canvas = document.createElement('canvas');
	}

	/**
	 * We need to use the advance width as that's the closest thing to the browser wrapping algo, hence using it for:
	 * - text wrapping
	 * - wysiwyg editor (+padding)
	 *
	 * > The advance width is the distance between the glyph's initial pen position and the next glyph's initial pen position.
	 */
	public getLineWidth(text: string, fontString: FontString): number {
		const context = this.canvas.getContext('2d')!;
		context.font = fontString;
		const metrics = context.measureText(text);
		const advanceWidth = metrics.width;

		return advanceWidth;
	}
}

export const throttleRAF = <T extends unknown[]>(
	fn: (...args: T) => void,
	opts?: { trailing?: boolean },
) => {
	let timerId: number | null = null;
	let lastArgs: T | null = null;
	let lastArgsTrailing: T | null = null;

	const scheduleFunc = (args: T) => {
		timerId = window.requestAnimationFrame(() => {
			timerId = null;
			fn(...args);
			lastArgs = null;

			if (lastArgsTrailing) {
				lastArgs = lastArgsTrailing;
				lastArgsTrailing = null;
				scheduleFunc(lastArgs);
			}
		});
	};

	const ret = (...args: T) => {
		if (import.meta.env.MODE === 'test') {
			fn(...args);
			return;
		}

		lastArgs = args;

		if (timerId === null) scheduleFunc(lastArgs);
		else if (opts?.trailing) lastArgsTrailing = args;
	};

	ret.flush = () => {
		if (timerId !== null) {
			cancelAnimationFrame(timerId);
			timerId = null;
		}

		if (lastArgs) {
			fn(...(lastArgsTrailing || lastArgs));
			lastArgs = lastArgsTrailing = null;
		}
	};

	ret.cancel = () => {
		lastArgs = lastArgsTrailing = null;

		if (timerId !== null) {
			cancelAnimationFrame(timerId);
			timerId = null;
		}
	};

	return ret;
};

export const resolvablePromise = <T,>() => {
	type Pr = { resolve: (value: T) => void; reject: (value: T) => void; };

	let resolve!: Pr['resolve'];
	let reject!: Pr['reject'];

	const promise = new Promise((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	}) as unknown as Pr;

	promise.resolve = resolve;
	promise.reject = reject;

	return promise as ResolvablePromise<T>;
};

export const isInitializedImageElement = (element: ExcalidrawElement | null): element is InitializedExcalidrawImageElement => {
	return !!element && element.type === 'image' && !!element.fileId;
};

export const isImageElement = (element: ExcalidrawElement | null): element is ExcalidrawImageElement => {
	return !!element && element.type === 'image';
};

export const isTextElement = (element: ExcalidrawElement | null): element is ExcalidrawTextElement => {
	return element != null && element.type === 'text';
};

export const measureText = (text: string, font: FontString, lineHeight: ExcalidrawTextElement['lineHeight']) => {
	const _text = text
		.split('\n')
		// replace empty lines with single space because leading/trailing empty
		// lines would be stripped from computation
		.map((x) => x || ' ')
		.join('\n');

	const fontSize = parseFloat(font);
	const height = getTextHeight(_text, fontSize, lineHeight);
	const width = getTextWidth(_text, font);

	return { width, height };
};

export const normalizeEOL = (str: string) => {
	return str.replace(/\r?\n|\r/g, '\n');
};

export const normalizeText = (text: string) => {
	return (
		normalizeEOL(text)
			// replace tabs with spaces so they render and measure correctly
			.replace(/\t/g, '        ')
	);
};

const splitIntoLines = (text: string) => {
	return normalizeText(text).split('\n');
};

export const getLineWidth = (text: string, font: FontString) => {
	if (!textMetricsProvider) textMetricsProvider = new CanvasTextMetricsProvider();
	return textMetricsProvider.getLineWidth(text, font);
};

export const getTextWidth = (text: string, font: FontString) => {
	const lines = splitIntoLines(text);
	let width = 0;
	lines.forEach((line) => {
		width = Math.max(width, getLineWidth(line, font));
	});

	return width;
};

export const getLineHeightInPx = (fontSize: ExcalidrawTextElement['fontSize'], lineHeight: ExcalidrawTextElement['lineHeight']) => {
	return fontSize * lineHeight;
};

export const getTextHeight = (text: string, fontSize: number, lineHeight: ExcalidrawTextElement['lineHeight']) => {
	const lineCount = splitIntoLines(text).length;
	return getLineHeightInPx(fontSize, lineHeight) * lineCount;
};

export const getFontString = ({ fontSize, fontFamily }: {
	fontSize: number;
	fontFamily: FontFamilyValues;
}) => {
	return `${fontSize}px ${getFontFamilyString({ fontFamily })}` as FontString;
};

export const getFontFamilyString = ({ fontFamily }: {
	fontFamily: FontFamilyValues;
}) => {
	for (const [fontFamilyString, id] of Object.entries(FONT_FAMILY)) {
		if (id === fontFamily) {
			return `${fontFamilyString}${getFontFamilyFallbacks(id)
				.map((x) => `, ${x}`)
				.join('')}`;
		}
	}

	return WINDOWS_EMOJI_FALLBACK_FONT;
};

export const getGenericFontFamilyFallback = (fontFamily: number): keyof typeof FONT_FAMILY_GENERIC_FALLBACKS => {
	switch (fontFamily) {
		case FONT_FAMILY.Cascadia:
		case FONT_FAMILY['Comic Shanns']:
			return MONOSPACE_GENERIC_FONT;
		default:
			return SANS_SERIF_GENERIC_FONT;
	}
};

export const getFontFamilyFallbacks = (fontFamily: number): Array<keyof typeof FONT_FAMILY_FALLBACKS> => {
	const genericFallbackFont = getGenericFontFamilyFallback(fontFamily);

	switch (fontFamily) {
		case FONT_FAMILY.Excalifont:
			return [
				CJK_HAND_DRAWN_FALLBACK_FONT,
				genericFallbackFont,
				WINDOWS_EMOJI_FALLBACK_FONT,
			];
		default:
			return [genericFallbackFont, WINDOWS_EMOJI_FALLBACK_FONT];
	}
};
