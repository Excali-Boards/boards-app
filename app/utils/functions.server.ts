import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Platforms } from '@excali-boards/boards-api-client/prisma/generated';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
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

export const securityUtils = {
	encrypt: (text: string) => {
		const iv = Buffer.alloc(16, 0);
		const cipher = createCipheriv('aes-256-cbc', config.apiToken.slice(0, 32) || '', iv);
		const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

		return encrypted.toString('hex');
	},
	decrypt: (text: string) => {
		const iv = Buffer.alloc(16, 0);
		const encryptedText = Buffer.from(text, 'hex');
		const decipher = createDecipheriv('aes-256-cbc', config.apiToken.slice(0, 32) || '', iv);
		const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

		return decrypted.toString('utf8');
	},
	hash: (text: string) => {
		return createHash('sha256').update(text).digest('hex');
	},
	randomString: (length: number) => {
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
	return 500;
}

export function makeResponse(data: unknown, message: string): Response {
	return new Response(getError(data, message), { status: getCode(data), statusText: data && typeof data === 'object' && 'errorName' in data ? data.errorName as string : undefined });
}

export function makeResObject<T>(data: T | null, message: string): T | { status: number; error: string; } {
	return data || { status: getCode(data), error: getError(data, message) };
}
