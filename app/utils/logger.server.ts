export const baseColors = {
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	green: '\x1b[32m',
	cyan: '\x1b[36m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	white: '\x1b[37m',
	black: '\x1b[30m',
	grey: '\x1b[37m\x1b[2m',
} as const;

const reset = '\x1b[0m';

export type Colors =
	| `${keyof typeof baseColors}Bright`
	| `BG${keyof typeof baseColors}Bright`
	| keyof typeof baseColors;

export const colors: Record<Colors, string> = {
	...baseColors,

	redBright: '\x1b[31m\x1b[1m',
	yellowBright: '\x1b[33m\x1b[1m',
	greenBright: '\x1b[32m\x1b[1m',
	cyanBright: '\x1b[36m\x1b[1m',
	blueBright: '\x1b[34m\x1b[1m',
	magentaBright: '\x1b[35m\x1b[1m',
	whiteBright: '\x1b[37m\x1b[1m',
	blackBright: '\x1b[30m\x1b[1m',
	greyBright: '\x1b[37m\x1b[2m\x1b[1m',

	BGredBright: '\x1b[41m\x1b[1m',
	BGyellowBright: '\x1b[43m\x1b[1m',
	BGgreenBright: '\x1b[42m\x1b[1m',
	BGcyanBright: '\x1b[46m\x1b[1m',
	BGblueBright: '\x1b[44m\x1b[1m',
	BGmagentaBright: '\x1b[45m\x1b[1m',
	BGwhiteBright: '\x1b[47m\x1b[1m',
	BGblackBright: '\x1b[40m\x1b[1m',
	BGgreyBright: '\x1b[47m\x1b[2m\x1b[1m',
} as const;

export function colorize(text: string, color: keyof typeof colors): string {
	return colors[color] + text + reset;
}

export default function LoggerModule(logType: string, input: string, color: keyof typeof baseColors, ...rest: unknown[]) {
	const dot = colorize(' • ', `BG${color}Bright`);
	const text = colorize(input, `${color}Bright`);
	const type = logType ? colorize(` ${logType} `, `BG${color}Bright`) : ' ';
	const time = colorize(` ${new Date().toLocaleString('en-UK', { timeZone: 'Europe/Zagreb' }).split(', ')[1]} `, `BG${color}Bright`);

	const restText = rest.map((item) => typeof item === 'string' ? colorize(item, color) : item).join('');

	console.log(dot, time, type, text, ...restText);
}

// Error.
export class CustomError extends Error {
	constructor(name: string, message: string) {
		super(message);
		this.name = name;
	}
}
