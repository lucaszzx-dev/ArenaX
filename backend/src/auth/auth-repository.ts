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
  findUserBySessionTokenHash(tokenHash: string): Promise<PublicUser | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
}
