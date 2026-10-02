import { OAuth2Client, type TokenPayload } from 'google-auth-library';

export interface VerifiedGoogleIdentity {
  sub: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export class GoogleIdentityError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'GoogleIdentityError';
  }
}

export type GoogleIdTokenVerifier = (idToken: string, audiences: string[]) => Promise<VerifiedGoogleIdentity>;

const oauthClient = new OAuth2Client();
const transientNetworkErrors = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN', 'ENETUNREACH', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT',
]);

function toVerifiedIdentity(payload: TokenPayload): VerifiedGoogleIdentity {
  if (
    !payload.sub
    || (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com')
  ) {
    throw new GoogleIdentityError('invalid_google_id_token', 401);
  }

  let photoURL: string | undefined;
  if (payload.picture) {
    try {
      const picture = new URL(payload.picture);
      if (picture.protocol === 'https:') photoURL = picture.toString();
    } catch {
      // The optional avatar must never make an otherwise valid identity fail.
    }
  }

  return {
    sub: payload.sub,
    email: payload.email || '',
    displayName: payload.name || payload.email || 'Użytkownik Google',
    ...(photoURL ? { photoURL } : {}),
  };
}

export async function verifyGoogleIdToken(idToken: string, audiences: string[]): Promise<VerifiedGoogleIdentity> {
  if (!audiences.length) throw new GoogleIdentityError('google_auth_not_configured', 503);
  if (!idToken || idToken.length > 16_384) throw new GoogleIdentityError('invalid_google_id_token', 401);

  try {
    const ticket = await oauthClient.verifyIdToken({ idToken, audience: audiences });
    const payload = ticket.getPayload();
    if (
      !payload
      || !payload.aud
      || !audiences.includes(payload.aud)
      || !payload.exp
      || payload.exp <= Date.now() / 1000
    ) {
      throw new GoogleIdentityError('invalid_google_id_token', 401);
    }
    return toVerifiedIdentity(payload);
  } catch (error) {
    if (error instanceof GoogleIdentityError) throw error;

    const cause = error && typeof error === 'object' ? error as {
      code?: string;
      response?: { status?: number };
    } : {};
    const status = cause.response?.status;
    if ((status !== undefined && status >= 429) || transientNetworkErrors.has(cause.code || '')) {
      throw new GoogleIdentityError('google_identity_provider_unavailable', 503);
    }
    throw new GoogleIdentityError('invalid_google_id_token', 401);
  }
}
