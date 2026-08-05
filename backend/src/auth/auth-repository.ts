export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

export type UserWithPassword = PublicUser & {
  passwordHash: string | null;
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  displayName: string;
};

export type CreateSessionInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type CreateTrustedDeviceInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type TrustedDevice = CreateTrustedDeviceInput & {
  createdAt: Date;
  revokedAt: Date | null;
};

export type PasswordResetRequest = {
  userId: string;
  codeHash: string;
  verificationTokenHash: string | null;
  expiresAt: Date;
  attempts: number;
  verifiedAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
};
export type LoginSecurityState = { email: string; failureCount: number; windowStartedAt: Date; lockUntil: Date | null; };

export type UpdateProfileInput = {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

export type OAuthProfile = {
  provider: "google";
  providerAccountId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export interface AuthRepository {
  createUser(input: CreateUserInput): Promise<PublicUser>;
  findUserByEmail(email: string): Promise<UserWithPassword | null>;
  findUserByOAuthAccount(
    provider: OAuthProfile["provider"],
    providerAccountId: string
  ): Promise<PublicUser | null>;
  createUserFromOAuth(profile: OAuthProfile): Promise<PublicUser>;
  linkOAuthAccount(userId: string, profile: OAuthProfile): Promise<void>;
  updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<PublicUser>;
  findUserBySessionTokenHash(tokenHash: string): Promise<PublicUser | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsForUser(userId: string): Promise<void>;
  createTrustedDevice(input: CreateTrustedDeviceInput): Promise<void>;
  findTrustedDeviceByTokenHash(tokenHash: string): Promise<TrustedDevice | null>;
  revokeTrustedDevice(tokenHash: string): Promise<void>;
  revokeTrustedDevicesForUser(userId: string): Promise<void>;
  savePasswordResetRequest(input: Omit<PasswordResetRequest, "createdAt">): Promise<void>;
  findPasswordResetRequest(userId: string): Promise<PasswordResetRequest | null>;
  incrementPasswordResetAttempts(userId: string): Promise<number>;
  markPasswordResetVerified(userId: string, verificationTokenHash: string): Promise<void>;
  resetPassword(userId: string, passwordHash: string, verificationTokenHash: string): Promise<boolean>;
  findLoginSecurity(email: string): Promise<LoginSecurityState | null>;
  recordLoginFailure(email: string, now: Date): Promise<LoginSecurityState>;
  clearLoginFailures(email: string): Promise<void>;
}
