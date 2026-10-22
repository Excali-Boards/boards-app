import { AuthenticateOptions, Strategy, StrategyVerifyCallback } from 'remix-auth';
import type { AppLoadContext, SessionStorage } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/node';
import * as oidc from 'openid-client';

export type OIDCProfile = {
	claims: oidc.IDToken;
	userInfo?: oidc.UserInfoResponse;
	tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
	request: Request;
	context?: AppLoadContext;
};

export type OIDCStrategyOptions = {
	issuerUrl: string;
	clientId: string;
	clientSecret: string;
	baseUrl: string;
	scopes: string[];
};

type OIDCTransaction = {
	state: string;
	nonce: string;
	codeVerifier: string;
};

const transactionKey = 'oidc:transaction';

export class OIDCStrategy<User> extends Strategy<User, OIDCProfile> {
	public name = 'oidc';
	private readonly options: OIDCStrategyOptions;
	private discoveryPromise: Promise<oidc.Configuration> | null = null;

	public constructor(options: OIDCStrategyOptions, verify: StrategyVerifyCallback<User, OIDCProfile>) {
		super(verify);
		this.options = options;
	}

	private discover(): Promise<oidc.Configuration> {
		if (!this.discoveryPromise) {
			this.discoveryPromise = (async () => {
				const configuration = await oidc.discovery(
					new URL(this.options.issuerUrl),
					this.options.clientId,
					this.options.clientSecret,
				);

				// Require signature validation for ID tokens returned by the token endpoint.
				oidc.enableNonRepudiationChecks(configuration);
				return configuration;
			})();
		}

		return this.discoveryPromise;
	}

	private callbackUrl(request: Request): URL {
		const requestUrl = new URL(request.url);
		const callbackUrl = new URL('/callback/oidc', this.options.baseUrl || requestUrl.origin);
		callbackUrl.search = requestUrl.search;
		return callbackUrl;
	}

	private async failureFrom(error: unknown, request: Request, sessionStorage: SessionStorage, options: AuthenticateOptions): Promise<never> {
		if (error instanceof Response) throw error;
		const message = error instanceof Error ? error.message : 'OIDC authentication failed.';
		return this.failure(message, request, sessionStorage, options, error instanceof Error ? error : undefined);
	}

	public async authenticate(request: Request, sessionStorage: SessionStorage, options: AuthenticateOptions): Promise<User> {
		try {
			const url = new URL(request.url);
			const callbackUrl = this.callbackUrl(request);
			const session = await sessionStorage.getSession(request.headers.get('Cookie'));
			const isCallback = url.searchParams.has('code') || url.searchParams.has('error');
			const configuration = await this.discover();

			if (!isCallback) {
				const state = oidc.randomState();
				const nonce = oidc.randomNonce();
				const codeVerifier = oidc.randomPKCECodeVerifier();
				const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

				session.set(transactionKey, { state, nonce, codeVerifier } satisfies OIDCTransaction);
				const authorizationUrl = oidc.buildAuthorizationUrl(configuration, {
					client_id: this.options.clientId,
					redirect_uri: callbackUrl.origin + callbackUrl.pathname,
					response_type: 'code',
					scope: this.options.scopes.join(' '),
					state,
					nonce,
					code_challenge: codeChallenge,
					code_challenge_method: 'S256',
				});

				throw redirect(authorizationUrl.href, {
					headers: { 'Set-Cookie': await sessionStorage.commitSession(session) },
				});
			}

			const transaction = session.get(transactionKey) as OIDCTransaction | undefined;
			session.unset(transactionKey);
			if (!transaction) return this.failure('OIDC authentication state is missing or expired.', request, sessionStorage, options);
			if (url.searchParams.has('error')) {
				return this.failure(url.searchParams.get('error_description') || 'OIDC authentication was denied.', request, sessionStorage, options);
			}

			const tokens = await oidc.authorizationCodeGrant(configuration, callbackUrl, {
				pkceCodeVerifier: transaction.codeVerifier,
				expectedState: transaction.state,
				expectedNonce: transaction.nonce,
				idTokenExpected: true,
			});
			const claims = tokens.claims();
			if (!claims?.sub || claims.iss !== configuration.serverMetadata().issuer) {
				return this.failure('OIDC identity claims are invalid.', request, sessionStorage, options);
			}

			let userInfo: oidc.UserInfoResponse | undefined;
			if (configuration.serverMetadata().userinfo_endpoint) {
				userInfo = await oidc.fetchUserInfo(configuration, tokens.access_token, claims.sub);
			}

			const user = await this.verify({ claims, userInfo, tokens, request, context: options.context });
			return this.success(user, request, sessionStorage, options);
		} catch (error) {
			return this.failureFrom(error, request, sessionStorage, options);
		}
	}
}
