import { Device } from '@excali-boards/boards-api-client/prisma/generated/client';
import { Platforms } from '@excali-boards/boards-api-client';
import { MicrosoftStrategy } from 'remix-auth-microsoft';
import { sessionStorage } from '~/utils/storage.server';
import { DiscordStrategy } from 'remix-auth-discord';
import { CustomError } from '~/utils/logger.server';
import { GoogleStrategy } from 'remix-auth-google';
import { GitHubStrategy } from 'remix-auth-github';
import configServer from '~/utils/config.server';
import { Authenticator } from 'remix-auth';
import { api } from '~/utils/web.server';
import { z } from 'zod';

export type AuthUser = z.infer<typeof zodUser>;
const zodUser = z.object({
	email: z.string(),
	displayName: z.string(),
	avatarUrl: z.string().nullable(),
	platform: z.enum(Platforms),
});

export const authenticator = new Authenticator<string | null>(sessionStorage, {
	throwOnError: true,
});

const discordStrategy = configServer.auth.discord ? new DiscordStrategy({
	clientID: configServer.auth.discord.clientId,
	clientSecret: configServer.auth.discord.clientSecret,
	callbackURL: configServer.auth.discord.redirectUri,
	scope: ['identify', 'email'],
	prompt: 'none',
}, async ({ profile, context }) => {
	const parsedUser = zodUser.safeParse({
		email: profile.emails?.[0].value,
		displayName: profile.displayName,
		avatarUrl: profile.photos?.[0].value || null,
		platform: 'Discord' as Platforms,
	});

	if (!parsedUser.success) return null;
	else return createSession({
		...parsedUser.data,
		avatarUrl: parsedUser.data.avatarUrl ? `https://cdn.discordapp.com/avatars/${profile.id}/${parsedUser.data.avatarUrl}.${parsedUser.data.avatarUrl.startsWith('a_') ? 'gif' : 'png'}` : null,
	}, context);
}) : null;

const googleStrategy = configServer.auth.google ? new GoogleStrategy({
	clientID: configServer.auth.google.clientId,
	clientSecret: configServer.auth.google.clientSecret,
	callbackURL: configServer.auth.google.redirectUri,
}, async ({ profile, context }) => {
	const parsedUser = zodUser.safeParse({
		email: profile.emails?.[0].value,
		displayName: profile.displayName,
		avatarUrl: profile.photos?.[0].value || null,
		platform: 'Google' as Platforms,
	});

	if (!parsedUser.success) return null;
	else return createSession({
		...parsedUser.data,
		avatarUrl: parsedUser.data.avatarUrl || null,
	}, context);
}) : null;

const githubStrategy = configServer.auth.github ? new GitHubStrategy({
	clientId: configServer.auth.github.clientId,
	clientSecret: configServer.auth.github.clientSecret,
	redirectURI: configServer.auth.github.redirectUri,
}, async ({ profile, context }) => {
	const parsedUser = zodUser.safeParse({
		email: profile.emails?.[0]?.value,
		displayName: profile.displayName,
		avatarUrl: profile.photos?.[0]?.value || null,
		platform: 'GitHub' as Platforms,
	});

	if (!parsedUser.success) return null;
	else return createSession({
		...parsedUser.data,
		avatarUrl: parsedUser.data.avatarUrl || null,
	}, context);
}) : null;

const microsoftStrategy = configServer.auth.microsoft ? new MicrosoftStrategy({
	clientId: configServer.auth.microsoft.clientId,
	clientSecret: configServer.auth.microsoft.clientSecret,
	redirectUri: configServer.auth.microsoft.redirectUri,
	tenantId: configServer.auth.microsoft.tenantId,
	scope: 'openid profile email',
	prompt: 'consent',
}, async ({ profile, context }) => {
	const parsedUser = zodUser.safeParse({
		email: profile.emails?.[0].value,
		displayName: profile.displayName || profile.name.givenName,
		avatarUrl: profile.photos?.[0]?.value || null,
		platform: 'Microsoft' as Platforms,
	});

	if (!parsedUser.success) return null;
	else return createSession({
		...parsedUser.data,
		avatarUrl: parsedUser.data.avatarUrl || null,
	}, context);
}) : null;

async function createSession(strategyData: AuthUser, extra?: Partial<Record<'ip' | 'currentUserId' | 'device', string>>) {
	const DBUser = await api?.sessions.createSession({
		auth: configServer.apiToken,
		body: {
			email: strategyData.email,
			platform: strategyData.platform,
			displayName: strategyData.displayName,
			avatarUrl: strategyData.avatarUrl || null,
			currentUserId: 'currentUserId' in (extra || {}) ? extra?.currentUserId : undefined,
			device: 'device' in (extra || {}) ? extra?.device as Device : undefined,
			ip: 'ip' in (extra || {}) ? extra?.ip : undefined,
		},
	});

	if (!DBUser || 'error' in DBUser) throw new CustomError('Current user not found.', 'CustomError');
	return DBUser.data.token;
}

if (microsoftStrategy) authenticator.use(microsoftStrategy);
if (discordStrategy) authenticator.use(discordStrategy);
if (googleStrategy) authenticator.use(googleStrategy);
if (githubStrategy) authenticator.use(githubStrategy);
