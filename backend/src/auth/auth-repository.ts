export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

export type UserWithPassword = PublicUser & {
  passwordHash: string;
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

export interface AuthRepository {
  createUser(input: CreateUserInput): Promise<PublicUser>;
  findUserByEmail(email: string): Promise<UserWithPassword | null>;
  findUserBySessionTokenHash(tokenHash: string): Promise<PublicUser | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
}
