import { ExcalidrawElement, InitializedExcalidrawImageElement, ExcalidrawImageElement } from '@excalidraw/excalidraw/element/types';
import { ResolvablePromise } from '@excalidraw/excalidraw/utils';
import { bgColor, TimeUnits } from '~/other/types';
import { TypedResponse } from '@remix-run/node';
import { ColorMode } from '@chakra-ui/react';
import { ZodError, ZodIssue } from 'zod';

export function getBackground(colorMode: ColorMode): string {
	return colorMode === 'light' ? 'white' : bgColor;
}

export function getBaseUrlClient(urlString: string) {
	const baseDomain = getBaseDomainClient(urlString);
	if (!baseDomain) return;

	const url = new URL(urlString);
	return `${url.protocol}//${baseDomain}`;
}

export function getBaseDomainClient(urlString: string) {
	try {
		const url = new URL(urlString);
		const hostname = url.hostname;

		if (hostname === 'localhost' || /^[\d.]+$/.test(hostname)) return;
		return hostname;
	} catch {
		return;
	}
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	else return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getCardDeletionTime(date: Date | null) {
	if (!date) return { bg: 'alpha100', borderColor: 'alpha200', text: 'Not scheduled for deletion', badge: 'alpha500' };

	const now = new Date();
	const diffTime = date.getTime() - now.getTime();
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

	const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
	const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

	const timeString = diffDays > 0 ? `${diffDays}d ${hours}h ${minutes}m` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

	if (diffDays <= 0) return { bg: 'red.100', borderColor: 'red.200', text: timeString, badge: 'red.500' };
	if (diffDays <= 3) return { bg: 'orange.100', borderColor: 'orange.200', text: timeString, badge: 'orange.500' };
	return { bg: 'yellow.100', borderColor: 'yellow.200', text: timeString, badge: 'yellow.500' };
}

export function parseZodError(error: ZodError) {
	const errors: string[] = [];

	const formatSchemaPath = (path: (string | number)[]) => {
		return !path.length ? 'Schema' : `Schema.${path.join('.')}`;
	};

	const firstLetterToLowerCase = (str: string) => {
		return str.charAt(0).toLowerCase() + str.slice(1);
	};

	const makeSureItsString = (value: unknown) => {
		return typeof value === 'string' ? value : JSON.stringify(value);
	};

	const parseZodIssue = (issue: ZodIssue) => {
		switch (issue.code) {
			case 'invalid_type': return `${formatSchemaPath(issue.path)} must be a ${issue.expected} (invalid_type)`;
			case 'invalid_literal': return `${formatSchemaPath(issue.path)} must be a ${makeSureItsString(issue.expected)} (invalid_literal)`;
			case 'custom': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (custom)`;
			case 'invalid_union': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_union)`;
			case 'invalid_union_discriminator': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_union_discriminator)`;
			case 'invalid_enum_value': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_enum_value)`;
			case 'unrecognized_keys': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (unrecognized_keys)`;
			case 'invalid_arguments': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_arguments)`;
			case 'invalid_return_type': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_return_type)`;
			case 'invalid_date': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_date)`;
			case 'invalid_string': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_string)`;
			case 'too_small': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (too_small)`;
			case 'too_big': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (too_big)`;
			case 'invalid_intersection_types': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_intersection_types)`;
			case 'not_multiple_of': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (not_multiple_of)`;
			case 'not_finite': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (not_finite)`;
			default: return `Schema has an unknown error (JSON: ${JSON.stringify(issue)})`;
		}
	};

	for (const issue of error.issues) {
		const parsedIssue = parseZodIssue(issue) + '.';
		if (parsedIssue) errors.push(parsedIssue);
	}

	return errors;
}

export function time(number: number, from: TimeUnits = 's', to: TimeUnits = 'ms'): number {
	const units: Record<TimeUnits, number> = {
		'ns': 1,
		'µs': 1000,
		'ms': 1000000,
		's': 1000000000,
		'm': 60000000000,
		'h': 3600000000000,
		'd': 86400000000000,
		'w': 604800000000000,
	};

	if (from === to) return number;
	else return (number * units[from]) / units[to];
}

export function formatTime(t: number | Date, from: TimeUnits = 'ms', short?: boolean, withColons?: boolean): string {
	if (t instanceof Date) t = t.getTime();
	if (from !== 'ms') t = time(t, from, 'ms');

	const units = [
		{ label: 'day', shortLabel: 'd', value: 86400000 },
		{ label: 'hour', shortLabel: 'h', value: 3600000 },
		{ label: 'minute', shortLabel: 'm', value: 60000 },
		{ label: 'second', shortLabel: 's', value: 1000 },
	];

	const timeParts = units.map(({ label, shortLabel, value }) => {
		const amount = Math.floor(t / value) % (label === 'day' ? Infinity : label === 'hour' ? 24 : 60);
		(t as number) %= value;
		if (withColons) return amount.toString().padStart(2, '0');
		if (amount > 0) return `${amount}${short ? shortLabel : ` ${label}${amount > 1 ? 's' : ''}`}`;
		return withColons ? '00' : '';
	});

	if (withColons) {
		const nonZeroIndex = timeParts.findIndex((part) => part !== '00');
		const filteredParts = timeParts.slice(nonZeroIndex === -1 ? timeParts.length - 1 : nonZeroIndex);
		return filteredParts.join(':');
	}

	return timeParts.filter(Boolean).join(' ').trim();
}

export function validateParams<T extends string[], J extends boolean = false>(params: Record<string, string | undefined>, requiredParams: T, json = false): J extends false ? Record<T[number], string> : Record<T[number], string> | TypedResponse<{ error: string; status: number; }> {
	const validatedParams = {} as Record<T[number], string>;

	for (const param of requiredParams) {
		if (!params[param]) {
			if (json) return { error: `Missing ${param}.`, status: 400 } as unknown as J extends false ? Record<T[number], string> : Record<T[number], string> | TypedResponse<{ error: string; status: number; }>;
			else throw new Response(`${param} not found.`, { status: 400 });
		}

		validatedParams[param as T[number]] = params[param]!;
	}

	return validatedParams;
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

export const isInitializedImageElement = (
	element: ExcalidrawElement | null,
): element is InitializedExcalidrawImageElement => {
	return !!element && element.type === 'image' && !!element.fileId;
};

export const isImageElement = (
	element: ExcalidrawElement | null,
): element is ExcalidrawImageElement => {
	return !!element && element.type === 'image';
};
