import { AccessLevel, PermissionHierarchy, SimplePermissionHierarchy } from '@excali-boards/boards-api-client';
import { bgColor, FindConflictsProps, TimeUnits } from '~/other/types';
import { ColorMode } from '@chakra-ui/react';
import { z, ZodError } from 'zod';

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
	if (bytes < 1024) return `${bytes} Bytes`;
	else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	else return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getCardDeletionTime(date: Date | null, colorMode: ColorMode) {
	if (!date) return { bg: 'alpha100', borderColor: 'alpha200', text: null };

	const now = new Date();
	const diffTime = date.getTime() - now.getTime();
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays <= 0) {
		return {
			bg: colorMode === 'light' ? 'red.100' : 'red.400',
			borderColor: 'red.200',
		};
	}

	if (diffDays <= 3) {
		return {
			bg: colorMode === 'light' ? 'orange.100' : 'orange.400',
			borderColor: 'orange.200',
		};
	}

	return {
		bg: colorMode === 'light' ? 'yellow.100' : 'yellow.400',
		borderColor: 'yellow.200',
	};
}

export function parseZodError(error: ZodError) {
	const errors: string[] = [];

	const formatSchemaPath = (path: PropertyKey[]) => {
		return !path.length ? 'Schema' : `Schema.${path.join('.')}`;
	};

	const firstLetterToLowerCase = (str: string) => {
		return str.charAt(0).toLowerCase() + str.slice(1);
	};

	const makeSureItsString = (value: unknown) => {
		return typeof value === 'string' ? value : JSON.stringify(value);
	};

	const parseZodIssue = (issue: z.core.$ZodIssue) => {
		switch (issue.code) {
			case 'invalid_type': return `${formatSchemaPath(issue.path)} must be a ${issue.expected} (invalid_type)`;
			case 'too_big': return `${formatSchemaPath(issue.path)} must be at most ${issue.maximum}${issue.inclusive ? '' : ' (exclusive)'} (too_big)`;
			case 'too_small': return `${formatSchemaPath(issue.path)} must be at least ${issue.minimum}${issue.inclusive ? '' : ' (exclusive)'} (too_small)`;
			case 'invalid_format': return `${formatSchemaPath(issue.path)} must be a valid ${issue.format} (invalid_format)`;
			case 'not_multiple_of': return `${formatSchemaPath(issue.path)} must be a multiple of ${issue.divisor} (not_multiple_of)`;
			case 'unrecognized_keys': return `${formatSchemaPath(issue.path)} has unrecognized keys: ${issue.keys.map((key) => `'${key}'`).join(', ')} (unrecognized_keys)`;
			case 'invalid_union': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_union)`;
			case 'invalid_key': return `${formatSchemaPath(issue.path)} has an invalid key: ${makeSureItsString(issue.message)} (invalid_key)`;
			case 'invalid_element': return `${formatSchemaPath(issue.path)} has an invalid element: ${firstLetterToLowerCase(issue.message)} (invalid_element)`;
			case 'invalid_value': return `${formatSchemaPath(issue.path)} has an invalid value: ${firstLetterToLowerCase(issue.message)} (invalid_value)`;
			case 'custom': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (custom)`;
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
		{ label: 'year', shortLabel: 'y', value: 31536000000 },
		{ label: 'month', shortLabel: 'mo', value: 2592000000 },
		{ label: 'day', shortLabel: 'd', value: 86400000 },
		{ label: 'hour', shortLabel: 'h', value: 3600000 },
		{ label: 'minute', shortLabel: 'm', value: 60000 },
		{ label: 'second', shortLabel: 's', value: 1000 },
	];

	let remaining = t;
	const amounts: number[] = [];
	const timeParts = units.map(({ label, shortLabel, value }, i) => {
		const amount = Math.floor(remaining / value);
		amounts[i] = amount;
		remaining %= value;

		if (withColons) return amount.toString().padStart(2, '0');
		if (amount > 0) return `${amount}${short ? shortLabel : ` ${label}${amount > 1 ? 's' : ''}`}`;
		return '';
	});

	const lastIndex = units.length - 1;
	let mainIndex = amounts.findIndex((a, i) => a > 0 && i < lastIndex);
	if (mainIndex === -1) mainIndex = lastIndex;

	const shown = new Array(units.length).fill(false);
	shown[mainIndex] = true;
	if (mainIndex < lastIndex) shown[mainIndex + 1] = true;

	if (withColons) return timeParts.filter((_, i) => shown[i]).join(':');

	if (mainIndex < lastIndex && timeParts[mainIndex + 1] === '') {
		const u = units[mainIndex + 1]!;
		timeParts[mainIndex + 1] = short ? `0${u.shortLabel}` : `0 ${u.label}s`;
	}

	const result = timeParts.filter((_, i) => shown[i] && timeParts[i]).join(' ').trim();
	return result || (short ? '0s' : '0 seconds');
}

export function formatRelativeTime(date: Date, short = false): string {
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const isFuture = diffMs > 0;
	const diff = Math.abs(diffMs);

	const units = [
		{ label: 'year', shortLabel: 'y', value: 1000 * 60 * 60 * 24 * 365 },
		{ label: 'month', shortLabel: 'mo', value: 1000 * 60 * 60 * 24 * 30 },
		{ label: 'week', shortLabel: 'w', value: 1000 * 60 * 60 * 24 * 7 },
		{ label: 'day', shortLabel: 'd', value: 1000 * 60 * 60 * 24 },
		{ label: 'hour', shortLabel: 'h', value: 1000 * 60 * 60 },
		{ label: 'minute', shortLabel: 'm', value: 1000 * 60 },
		{ label: 'second', shortLabel: 's', value: 1000 },
	];

	let remaining = diff;
	const amounts: number[] = [];
	const parts = units.map((u, i) => {
		const amount = Math.floor(remaining / u.value);
		amounts[i] = amount;
		remaining %= u.value;

		if (amount > 0) return short ? `${amount}${u.shortLabel}` : `${amount} ${u.label}${amount !== 1 ? 's' : ''}`;
		return '';
	});

	const lastIndex = units.length - 1;
	let mainIndex = amounts.findIndex((a, i) => a > 0 && i < lastIndex);
	if (mainIndex === -1) mainIndex = lastIndex;

	const shown = new Array(units.length).fill(false);
	shown[mainIndex] = true;
	if (mainIndex < lastIndex) shown[mainIndex + 1] = true;

	if (mainIndex < lastIndex && parts[mainIndex + 1] === '') {
		const u = units[mainIndex + 1]!;
		parts[mainIndex + 1] = short ? `0${u.shortLabel}` : `0 ${u.label}s`;
	}

	const sep = short ? ' ' : ', ';
	const result = parts.filter((_, i) => shown[i] && parts[i]).join(sep).trim() || (short ? '0s' : '0 seconds');
	return isFuture ? result : short ? `${result} ago` : `${result} ago`;
}

export function validateParams<T extends string>(params: Record<string, string | undefined>, requiredParams: T[]): Record<T, string> {
	const validatedParams = {} as Record<T[number], string>;

	for (const param of requiredParams) {
		if (!params[param]) throw new Response(`${param} not found.`, { status: 400 });
		validatedParams[param as T[number]] = params[param]!;
	}

	return validatedParams;
}

export function canEdit(role: AccessLevel, isDev?: boolean) {
	return isDev || role === 'write' || role === 'manage' || role === 'admin';
}

export function canManage(role: AccessLevel, isDev?: boolean) {
	return isDev || role === 'manage' || role === 'admin';
}

export function canGrantRole(granterRole: string, targetRole: string): boolean {
	const granterLevel = getRoleLevel(granterRole);
	const targetLevel = getRoleLevel(targetRole);

	if (granterLevel === undefined || targetLevel === undefined) return false;
	return granterLevel > targetLevel;
}

export function canInviteAndPermit(role: AccessLevel, isDev?: boolean) {
	return isDev || role === 'admin';
}

export function firstToUpperCase<T extends string>(str: T): Capitalize<T> {
	return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
}

export function getRandomColorScheme(key: string): string {
	const colorSchemes = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink'];
	const hash = Array.from(key).reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return colorSchemes[hash % colorSchemes.length]!;
}

export function getLevel(role: string | null): number {
	if (!role) return 0;
	return getRoleLevel(role) ?? 0;
}

function getRoleLevel(role: string): number | undefined {
	const fullLevel = PermissionHierarchy[role as keyof typeof PermissionHierarchy];
	if (fullLevel !== undefined) return fullLevel;

	return SimplePermissionHierarchy[role as keyof typeof SimplePermissionHierarchy];
}

export function findConflicts({ allData, selectedGroups, selectedCategories, selectedBoards, groupRole, categoryRole, boardRole }: FindConflictsProps) {
	const conflicts: { type: 'category' | 'board'; name: string; reason: string; }[] = [];

	const groupLevel = groupRole ? getLevel(groupRole) : 0;
	const categoryLevel = categoryRole ? getLevel(categoryRole) : 0;
	const boardLevel = boardRole ? getLevel(boardRole) : 0;

	for (const group of allData) {
		if (groupRole && selectedGroups.includes(group.id) && groupLevel > 0) {
			for (const category of group.categories) {
				if (categoryRole && selectedCategories.includes(category.id) && getLevel(categoryRole) <= groupLevel) {
					conflicts.push({
						type: 'category',
						name: `${group.name} → ${category.name}`,
						reason: `Already covered by "${groupRole}" on group "${group.name}"`,
					});
				}

				for (const board of category.boards) {
					if (boardRole && selectedBoards.includes(board.id) && boardLevel <= groupLevel) {
						conflicts.push({
							type: 'board',
							name: `${group.name} → ${category.name} → ${board.name}`,
							reason: `Already covered by "${boardRole}" on group "${group.name}"`,
						});
					}
				}
			}
		}

		for (const category of group.categories) {
			if (categoryRole && selectedCategories.includes(category.id) && categoryLevel > 0) {
				for (const board of category.boards) {
					if (boardRole && selectedBoards.includes(board.id) && boardLevel <= categoryLevel) {
						conflicts.push({
							type: 'board',
							name: `${group.name} → ${category.name} → ${board.name}`,
							reason: `Already covered by "${categoryRole}" on category "${category.name}"`,
						});
					}
				}
			}
		}
	}

	return conflicts;
}

export function closest15MinuteCreate(dateTime: Temporal.ZonedDateTime) {
	const startDate = new Date(dateTime.epochMilliseconds);
	const minutes = startDate.getMinutes();
	const roundedMinutes = Math.round(minutes / 15) * 15;

	startDate.setMinutes(roundedMinutes, 0, 0);

	const endDate = new Date(startDate);
	endDate.setHours(endDate.getHours() + 1);

	const startISO = startDate.toISOString();
	const endISO = endDate.toISOString();

	return { start: startISO, end: endISO };
}

export function getRoleColor(role: string): string {
	switch (role) {
		case 'BoardViewer':
		case 'CategoryViewer':
		case 'GroupViewer':
			return 'blue.300';
		case 'BoardCollaborator':
		case 'CategoryCollaborator':
		case 'GroupCollaborator':
			return 'purple.300';
		case 'CategoryManager':
		case 'GroupManager':
			return 'yellow.300';
		case 'CategoryAdmin':
		case 'GroupAdmin':
			return 'red.300';
		default:
			return 'gray.300';
	}
}

export function getGrantInfo(grantType: 'explicit' | 'implicit') {
	switch (grantType) {
		case 'explicit':
			return {
				color: 'green.300',
				label: 'Direct',
			};
		case 'implicit':
			return {
				color: 'purple.300',
				label: 'Inherited',
			};
		default:
			return {
				color: 'gray.300',
				label: 'Unknown',
			};
	}
}
