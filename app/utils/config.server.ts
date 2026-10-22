import { Platforms } from '@excali-boards/boards-api-client/prisma/generated/client';
import { parseZodError } from '~/other/utils';
import { z } from 'zod';

const config = {
	baseUrl: (process.env.BASE_URL || '').replace(/\/$/, ''),
	apiUrl: (process.env.API_URL || '').replace(/\/$/, ''),

	sessionSecret: process.env.SESSION_SECRET!,
	apiToken: process.env.API_TOKEN!,

	showSearches: process.env.SHOW_SEARCHES === 'true',
	qrLogin: process.env.USE_QR_LOGIN !== 'false',
	tldrawLicense: process.env.TLDRAW_LICENSE || null,

	port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3002,
	isDev: process.env.NODE_ENV === 'development',

	s3Url: (process.env.S3_URL || '').replace(/\/$/, ''),
	s3Bucket: process.env.S3_BUCKET || '',

	auth: {
		google: process.env.USE_GOOGLE === 'true' ? {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			redirectUri: process.env.GOOGLE_REDIRECT_URI!,
		} : null,
		github: process.env.USE_GITHUB === 'true' ? {
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
			redirectUri: process.env.GITHUB_REDIRECT_URI!,
		} : null,
		discord: process.env.USE_DISCORD === 'true' ? {
			clientId: process.env.DISCORD_CLIENT_ID!,
			clientSecret: process.env.DISCORD_CLIENT_SECRET!,
			redirectUri: process.env.DISCORD_REDIRECT_URI!,
		} : null,
		microsoft: process.env.USE_MICROSOFT === 'true' ? {
			clientId: process.env.MICROSOFT_CLIENT_ID!,
			clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
			redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
			tenantId: process.env.MICROSOFT_TENANT_ID!,
		} : null,
		oidc: process.env.USE_OIDC === 'true' ? {
			issuerUrl: process.env.OIDC_ISSUER_URL!,
			clientId: process.env.OIDC_CLIENT_ID!,
			clientSecret: process.env.OIDC_CLIENT_SECRET!,
			displayName: process.env.OIDC_DISPLAY_NAME || 'OpenID Connect',
			scopes: (process.env.OIDC_SCOPES || 'openid profile email').split(/\s+/).filter(Boolean),
		} : null,
	},
} satisfies z.infer<typeof ConfigSchema>;

const ConfigSchema = z.object({
	baseUrl: z.string(),
	apiUrl: z.string(),

	sessionSecret: z.string(),
	apiToken: z.string(),

	showSearches: z.coerce.boolean().default(false),
	qrLogin: z.boolean(),
	tldrawLicense: z.string().nullable(),

	port: z.number().int().min(1).max(65535),
	isDev: z.boolean(),

	s3Url: z.string().nonempty(),
	s3Bucket: z.string().optional(),

	auth: z.object({
		google: z.object({
			clientId: z.string(),
			clientSecret: z.string(),
			redirectUri: z.string(),
		}).nullable(),
		github: z.object({
			clientId: z.string(),
			clientSecret: z.string(),
			redirectUri: z.string(),
		}).nullable(),
		discord: z.object({
			clientId: z.string(),
			clientSecret: z.string(),
			redirectUri: z.string(),
		}).nullable(),
		microsoft: z.object({
			clientId: z.string(),
			clientSecret: z.string(),
			redirectUri: z.string(),
			tenantId: z.string(),
		}).nullable(),
		oidc: z.object({
			issuerUrl: z.url(),
			clientId: z.string(),
			clientSecret: z.string(),
			displayName: z.string().min(1),
			scopes: z.array(z.string().min(1)).min(1),
		}).nullable(),
	}),
});

const validatedConfig = ConfigSchema.safeParse(config);
if (!validatedConfig.success) throw new Error(JSON.stringify(parseZodError(validatedConfig.error), null, 5));

export default validatedConfig.data;

export type AllowedPlatforms = keyof typeof config.auth;
export const allowedPlatforms = [
	...(config.auth.google ? ['google'] : []),
	...(config.auth.github ? ['github'] : []),
	...(config.auth.discord ? ['discord'] : []),
	...(config.auth.oidc ? ['oidc'] : []),
	...(config.auth.microsoft ? ['microsoft'] : []),
] as AllowedPlatforms[];

export function convertName(name: AllowedPlatforms): Platforms {
	switch (name) {
		case 'google': return 'Google';
		case 'github': return 'GitHub';
		case 'discord': return 'Discord';
		case 'oidc': return 'OIDC' as Platforms;
		case 'microsoft': return 'Microsoft';
	}
}

export const oidcDisplayName = config.auth.oidc?.displayName || 'OpenID Connect';
export const qrLoginEnabled = config.qrLogin;
