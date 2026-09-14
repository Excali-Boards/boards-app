export const qrSessionDurations = [
	{ label: '15 minutes', value: '900' },
	{ label: '30 minutes', value: '1800' },
	{ label: '1 hour', value: '3600' },
	{ label: '8 hours', value: '28800' },
	{ label: '24 hours', value: '86400' },
	{ label: '7 days', value: '604800' },
];

export type QrLoginData = {
	userCode: string;
	approvalUrl: string;
	expiresAt: string;
	requestDevice: string | null;
	backTo: string;
};

export type QrPollResponse = {
	status: 'pending' | 'approved' | 'denied' | 'expired';
	expiresAt?: string;
	redirectDelay?: boolean;
	error?: string;
};

export function getSafeBackTo(value: string | null | undefined) {
	if (!value) return '/';

	const baseUrl = 'https://boards.invalid';
	try {
		const url = new URL(value, baseUrl);
		if (url.origin !== baseUrl) return '/';
		return `${url.pathname}${url.search}${url.hash}` || '/';
	} catch {
		return '/';
	}
}
