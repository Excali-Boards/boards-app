import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Platforms } from '@excali-boards/boards-api-client';
import config from '~/utils/config.server';
import * as pako from 'pako';

export async function axiosFetch<T, D = unknown>(config: AxiosRequestConfig<D>): Promise<AxiosResponse<T, D>> {
	return axios<T>(config);
}

export function randomIndex(max: number) {
	const now = new Date();
	const randomValue = now.getMilliseconds() + now.getSeconds() * 1000;
	return randomValue % max;
}

const cryptoOptions = {
	ivLength: 12,
	keyLength: 16,
	saltLength: 12,
	authTagLength: 16,
	pbkdf2Iterations: 50000,

	key: createHash('sha256').update(config.apiToken).digest(),
	iv: Buffer.alloc(12, 0),
};

export const securityUtils = {
	encrypt: (input: string): string => {

		const cipher = createCipheriv('aes-256-gcm', cryptoOptions.key, cryptoOptions.iv);
		const encrypted = Buffer.concat([cipher.update(input, 'utf8'), cipher.final()]);
		const authTag = cipher.getAuthTag();

		const result = Buffer.concat([encrypted, authTag]);
		return result.toString('hex');
	},
	decrypt: (hex: string): string => {
		const data = Buffer.from(hex, 'hex');

		const encrypted = data.subarray(0, data.length - cryptoOptions.authTagLength);
		const authTag = data.subarray(data.length - cryptoOptions.authTagLength);

		const decipher = createDecipheriv('aes-256-gcm', cryptoOptions.key, cryptoOptions.iv);
		decipher.setAuthTag(authTag);

		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
		return decrypted.toString('utf8');
	},

	hash: (text: string): string => {
		return createHash('sha256').update(text).digest('hex');
	},
	randomString: (length: number): string => {
		return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
	},
};

export function convertPlatform(platform: Lowercase<Platforms>) {
	switch (platform) {
		case 'discord': return 'Discord';
		case 'google': return 'Google';
		case 'github': return 'GitHub';
		case 'microsoft': return 'Microsoft';
	}
}

export function compressJSON(data: object) {
	const jsonStr = JSON.stringify(data);
	const compressed = pako.gzip(jsonStr);
	return Buffer.from(compressed);
}

export function decompressJSON(compressed: Buffer) {
	const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
	return JSON.parse(decompressed);
}

export function getError(error: unknown, fallback?: string): string {
	if (typeof error === 'object' && error && 'error' in error) return getError(error.error, fallback);
	if (typeof error === 'object' && error && 'message' in error) return getError(error.message, fallback);
	if (typeof error === 'string') return error;
	return fallback || 'An unknown error occurred.';
}

export function getCode(data: unknown): number {
	if (typeof data === 'object' && data && 'status' in data) return getCode(data.status);
	if (typeof data === 'object' && data && 'code' in data) return getCode(data.code);
	if (typeof data === 'number') return data;
	return 400;
}

export function makeResponse(data: unknown, message: string): Response {
	return new Response(getError(data, message), { status: getCode(data), statusText: data && typeof data === 'object' && 'errorName' in data ? data.errorName as string : undefined });
}

export function makeResObject<T>(data: T | null, message: string | null): T | { status: number; error: string; } {
	return data || { status: getCode(data), error: getError(data, message || 'An unknown error occurred.') };
}

export function getClientIp(request: Request): string | null {
	const cfIp = request.headers.get('cf-connecting-ip');
	if (cfIp) return cfIp;

	const realIp = request.headers.get('x-real-ip');
	if (realIp) return realIp;

	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) {
		const ips = forwarded.split(',').map((ip) => ip.trim());
		return ips[0] || null;
	}

	const trueClientIp = request.headers.get('true-client-ip');
	if (trueClientIp) return trueClientIp;
	if (config.isDev) return '127.0.0.1';

	return null;
}

export function getIpHeaders(request: Request): Record<string, string> | null {
	const ip = getClientIp(request);
	if (!ip) return null;

	return {
		'Content-Type': 'application/json',
		'X-Forwarded-For': ip,
	};
}
