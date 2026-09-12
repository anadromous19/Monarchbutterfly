export interface AuthSession {
  identityId: string; // Cognito guest identity ID: e.g. "us-east-1:xxxx"
  token: string;
  isGuest: boolean;
  expiresAt: string; // ISO-8601
}
