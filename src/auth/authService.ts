import { AuthSession } from './types';
import { getSecureItem, setSecureItem } from './secureStore';

const IDENTITY_KEY = 'monarch_guest_identity_id';
const TOKEN_KEY = 'monarch_guest_token';

export interface AuthService {
  getSession(): Promise<AuthSession>;
  refreshSession(): Promise<AuthSession>;
  getIdentityId(): Promise<string>;
}

export class CognitoGuestAuthService implements AuthService {
  private cachedSession: AuthSession | null = null;

  async getSession(): Promise<AuthSession> {
    if (this.cachedSession && new Date(this.cachedSession.expiresAt).getTime() > Date.now() + 60000) {
      return this.cachedSession;
    }

    let identityId = await getSecureItem(IDENTITY_KEY);
    if (!identityId) {
      identityId = this.generateGuestId();
      await setSecureItem(IDENTITY_KEY, identityId);
    }

    let token = await getSecureItem(TOKEN_KEY);
    if (!token) {
      token = `guest-token-${Date.now()}`;
      await setSecureItem(TOKEN_KEY, token);
    }

    // 1 hour expiry
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    this.cachedSession = {
      identityId,
      token,
      isGuest: true,
      expiresAt,
    };

    return this.cachedSession;
  }

  async refreshSession(): Promise<AuthSession> {
    this.cachedSession = null;
    return this.getSession();
  }

  async getIdentityId(): Promise<string> {
    const session = await this.getSession();
    return session.identityId;
  }

  private generateGuestId(): string {
    const randomHex = Math.random().toString(16).substring(2, 10);
    return `us-east-1:guest-${randomHex}-${Date.now()}`;
  }
}

export const authService = new CognitoGuestAuthService();
