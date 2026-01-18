import { CalendarType } from '@schedule-x/calendar';

export const calendarColors = {
	skyline: '#9676ca',
	granite: '#999999',
	mintwave: '#7bcba7',
	sunset: '#f5a17d',
	honeyglow: '#f5d76e',
	emberrose: '#f17f7e',
	periwisp: '#7fa8f5',
	seabreeze: '#76c3ca',
	leaflight: '#8edc8a',
	blushmist: '#f58ca1',
	clearsky: '#7dbbf5',
	amethyst: '#cfa6f2',
	sandbar: '#f2c97f',
	silverfog: '#c0c0c0',
} as const;

export const colorsArray = Object.values(calendarColors);

export const colorCalendars: Record<string, CalendarType> = Object.entries(calendarColors).reduce((acc, [key, color]) => {
	acc[color] = {
		colorName: key,
		label: key.charAt(0).toUpperCase() + key.slice(1),
		lightColors: { main: color, container: color, onContainer: '#ffffff' },
		darkColors: { main: color, container: color, onContainer: '#000000' },
	};

	return acc;
}, {} as Record<string, CalendarType>);

export function getRandomCalendarColor() {
	const colors = Object.values(calendarColors);
	return colors[Math.floor(Math.random() * colors.length)]!;
}
