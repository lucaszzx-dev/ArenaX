import type {
  AuthRepository,
  CreateTrustedDeviceInput,
  CreateSessionInput,
  CreateUserInput,
  LoginSecurityState,
  LoginVerificationChallenge,
  OAuthProfile,
  PasswordResetRequest,
  PublicUser,
  UpdateProfileInput,
  UserWithPassword,
  TrustedDevice
} from "../../src/auth/auth-repository.js";

type StoredSession = CreateSessionInput;

export class InMemoryAuthRepository implements AuthRepository {
  readonly users: UserWithPassword[] = [];
  readonly sessions: StoredSession[] = [];
  readonly trustedDevices: TrustedDevice[] = [];
  readonly oauthAccounts: Array<{
    userId: string;
    provider: OAuthProfile["provider"];
    providerAccountId: string;
  }> = [];
  readonly passwordResetRequests: PasswordResetRequest[] = [];
  readonly loginSecurity: LoginSecurityState[] = [];
  readonly loginVerificationChallenges: LoginVerificationChallenge[] = [];

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
  async findUserById(userId: string): Promise<PublicUser | null> {
    const user = this.users.find((item) => item.id === userId);
    return user ? this.toPublicUser(user) : null;
  }

  async findUserByOAuthAccount(
    provider: OAuthProfile["provider"],
    providerAccountId: string
  ): Promise<PublicUser | null> {
    const account = this.oauthAccounts.find(
      (item) =>
        item.provider === provider &&
        item.providerAccountId === providerAccountId
    );
    const user = this.users.find((item) => item.id === account?.userId);

    return user ? this.toPublicUser(user) : null;
  }

  async createUserFromOAuth(profile: OAuthProfile): Promise<PublicUser> {
    const user: UserWithPassword = {
      id: crypto.randomUUID(),
      email: profile.email,
      passwordHash: null,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: null
    };
    this.users.push(user);
    this.oauthAccounts.push({
      userId: user.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId
    });

    return this.toPublicUser(user);
  }

  async linkOAuthAccount(
    userId: string,
    profile: OAuthProfile
  ): Promise<void> {
    this.oauthAccounts.push({
      userId,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId
    });
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

  async deleteSessionsForUser(userId: string): Promise<void> {
    for (let index = this.sessions.length - 1; index >= 0; index -= 1) {
      if (this.sessions[index]?.userId === userId) this.sessions.splice(index, 1);
    }
  }

  async createTrustedDevice(input: CreateTrustedDeviceInput): Promise<void> {
    this.trustedDevices.push({ ...input, createdAt: new Date(), revokedAt: null });
  }

  async findTrustedDeviceByTokenHash(tokenHash: string): Promise<TrustedDevice | null> {
    return this.trustedDevices.find((device) => device.tokenHash === tokenHash) ?? null;
  }

  async revokeTrustedDevice(tokenHash: string): Promise<void> {
    const device = await this.findTrustedDeviceByTokenHash(tokenHash);
    if (device && !device.revokedAt) device.revokedAt = new Date();
  }

  async revokeTrustedDevicesForUser(userId: string): Promise<void> {
    for (const device of this.trustedDevices) {
      if (device.userId === userId && !device.revokedAt) device.revokedAt = new Date();
    }
  }

  async createLoginVerificationChallenge(input: Omit<LoginVerificationChallenge, "createdAt" | "usedAt">): Promise<void> {
    this.loginVerificationChallenges.push({ ...input, createdAt: new Date(), usedAt: null });
  }
  async findLoginVerificationChallenge(challengeTokenHash: string): Promise<LoginVerificationChallenge | null> {
    return this.loginVerificationChallenges.find((item) => item.challengeTokenHash === challengeTokenHash) ?? null;
  }
  async incrementLoginVerificationAttempts(challengeTokenHash: string): Promise<void> {
    const challenge = await this.findLoginVerificationChallenge(challengeTokenHash);
    if (challenge && !challenge.usedAt) challenge.attempts += 1;
  }
  async replaceLoginVerificationCode(challengeTokenHash: string, codeHash: string, now: Date): Promise<void> {
    const challenge = await this.findLoginVerificationChallenge(challengeTokenHash);
    if (challenge && !challenge.usedAt) { challenge.codeHash = codeHash; challenge.lastSentAt = now; challenge.resendCount += 1; }
  }
  async consumeLoginVerificationChallenge(challengeTokenHash: string, codeHash: string, now: Date): Promise<string | null> {
    const challenge = await this.findLoginVerificationChallenge(challengeTokenHash);
    if (!challenge || challenge.usedAt || challenge.codeHash !== codeHash || challenge.expiresAt <= now || challenge.attempts >= 5) return null;
    challenge.usedAt = now;
    return challenge.userId;
  }

  async savePasswordResetRequest(input: Omit<PasswordResetRequest, "createdAt">): Promise<void> {
    const index = this.passwordResetRequests.findIndex((item) => item.userId === input.userId);
    const request = { ...input, createdAt: new Date() };
    if (index >= 0) this.passwordResetRequests[index] = request;
    else this.passwordResetRequests.push(request);
  }

  async findPasswordResetRequest(userId: string): Promise<PasswordResetRequest | null> {
    return this.passwordResetRequests.find((item) => item.userId === userId) ?? null;
  }

  async incrementPasswordResetAttempts(userId: string): Promise<number> {
    const request = await this.findPasswordResetRequest(userId);
    if (!request) return 0;
    request.attempts += 1;
    return request.attempts;
  }

  async markPasswordResetVerified(userId: string, verificationTokenHash: string): Promise<void> {
    const request = await this.findPasswordResetRequest(userId);
    if (request && !request.usedAt) {
      request.verificationTokenHash = verificationTokenHash;
      request.verifiedAt = new Date();
    }
  }

  async resetPassword(userId: string, passwordHash: string, verificationTokenHash: string): Promise<boolean> {
    const user = this.users.find((item) => item.id === userId);
    const request = await this.findPasswordResetRequest(userId);
    if (!user || !request || request.usedAt || request.verificationTokenHash !== verificationTokenHash) return false;
    user.passwordHash = passwordHash;
    {
      request.usedAt = new Date();
      request.verificationTokenHash = null;
    }
    await this.deleteSessionsForUser(userId);
    await this.revokeTrustedDevicesForUser(userId);
    return true;
  }

  async findLoginSecurity(email: string): Promise<LoginSecurityState | null> {
    return this.loginSecurity.find((state) => state.email === email) ?? null;
  }

  async recordLoginFailure(email: string, now: Date): Promise<LoginSecurityState> {
    const existing = await this.findLoginSecurity(email);
    const freshWindow = !existing || existing.windowStartedAt.getTime() <= now.getTime() - 15 * 60_000;
    const state: LoginSecurityState = {
      email, failureCount: freshWindow ? 1 : existing.failureCount + 1,
      windowStartedAt: freshWindow ? now : existing.windowStartedAt,
      lockUntil: null
    };
    if (state.failureCount >= 5) state.lockUntil = new Date(now.getTime() + 15 * 60_000);
    const index = this.loginSecurity.findIndex((item) => item.email === email);
    if (index >= 0) this.loginSecurity[index] = state; else this.loginSecurity.push(state);
    return state;
  }

  async clearLoginFailures(email: string): Promise<void> {
    const index = this.loginSecurity.findIndex((state) => state.email === email);
    if (index >= 0) this.loginSecurity.splice(index, 1);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<PublicUser> {
    const user = this.users.find((item) => item.id === userId);

    if (!user) {
      throw new Error("Perfil não encontrado.");
    }

    user.displayName = input.displayName;
    user.avatarUrl = input.avatarUrl;
    user.bio = input.bio;

    return this.toPublicUser(user);
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
