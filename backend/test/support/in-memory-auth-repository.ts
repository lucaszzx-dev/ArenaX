import type {
  AuthRepository,
  CreateSessionInput,
  CreateUserInput,
  PublicUser,
  UserWithPassword
} from "../../src/auth/auth-repository.js";

type StoredSession = CreateSessionInput;

export class InMemoryAuthRepository implements AuthRepository {
  readonly users: UserWithPassword[] = [];
  readonly sessions: StoredSession[] = [];

  async createUser(input: CreateUserInput): Promise<PublicUser> {
    const user: UserWithPassword = {
      id: crypto.randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      avatarUrl: null,
      bio: null
    };

    this.users.push(user);

    return this.toPublicUser(user);
  }

  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserBySessionTokenHash(
    tokenHash: string
  ): Promise<PublicUser | null> {
    const session = this.sessions.find(
      (item) => item.tokenHash === tokenHash && item.expiresAt > new Date()
    );
    const user = this.users.find((item) => item.id === session?.userId);

    return user ? this.toPublicUser(user) : null;
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    this.sessions.push(input);
  }

  async deleteSession(tokenHash: string): Promise<void> {
    const index = this.sessions.findIndex(
      (session) => session.tokenHash === tokenHash
    );

    if (index >= 0) {
      this.sessions.splice(index, 1);
    }
  }

  private toPublicUser(user: UserWithPassword): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio
    };
  }
}
