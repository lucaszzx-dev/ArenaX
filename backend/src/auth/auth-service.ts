import type {
  AuthRepository,
  OAuthProfile,
  PublicUser,
  UpdateProfileInput
} from "./auth-repository.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createSessionToken, hashSessionToken } from "./session-token.js";
import { AppError } from "../errors/app-error.js";
import { SafeDevelopmentEmailProvider, type DevelopmentEmailProvider, type EmailProvider } from "../email/email-provider.js";
import { createHash, randomInt } from "node:crypto";
import { createTrustedDeviceToken, hashTrustedDeviceToken } from "./trusted-device-token.js";

export type TrustedDeviceResult = {
  token: string;
  expiresAt: Date;
};

export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResult = {
  user: PublicUser;
  sessionToken: string;
  expiresAt: Date;
};

export type LoginVerificationRequired = {
  requiresVerification: true;
  challengeToken: string;
  expiresAt: Date;
};

export type LoginResult = AuthResult | LoginVerificationRequired;

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly sessionTtlDays: number,
    private readonly emailProvider: EmailProvider = new SafeDevelopmentEmailProvider(),
    private readonly trustedDeviceTtlDays = 30
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const existingUser = await this.repository.findUserByEmail(email);

    if (existingUser) {
      throw new AppError(
        "Já existe uma conta com este e-mail.",
        409,
        "EMAIL_ALREADY_IN_USE"
      );
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.repository.createUser({
      email,
      passwordHash,
      displayName: input.displayName.trim()
    });

    return this.createSession(user);
  }

  async login(input: LoginInput, trustedDeviceToken?: string): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    const now = new Date();
    const security = await this.repository.findLoginSecurity(email);
    if (security?.lockUntil && security.lockUntil > now) {
      throw new AppError("Muitas tentativas. Aguarde e tente novamente.", 429, "LOGIN_TEMPORARILY_LOCKED");
    }
    const user = await this.repository.findUserByEmail(email);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      const failure = await this.repository.recordLoginFailure(email, now);
      if (failure.lockUntil && failure.lockUntil > now) {
        throw new AppError("Muitas tentativas. Aguarde e tente novamente.", 429, "LOGIN_TEMPORARILY_LOCKED");
      }
      throw new AppError(
        "E-mail ou senha incorretos.",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    await this.repository.clearLoginFailures(email);
    if (trustedDeviceToken && await this.validateTrustedDevice(trustedDeviceToken)) {
      return this.createSession(user);
    }
    return this.createLoginVerificationChallenge(user);
  }

  async verifyLoginVerification(challengeToken: string, code: string): Promise<AuthResult & { trustedDevice: TrustedDeviceResult }> {
    const challengeHash = hashSecret(challengeToken);
    const challenge = await this.repository.findLoginVerificationChallenge(challengeHash);
    const invalid = () => { throw new AppError("Codigo invalido ou expirado.", 400, "INVALID_LOGIN_VERIFICATION_CODE"); };
    if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date() || challenge.attempts >= 5) return invalid();
    if (hashSecret(code) !== challenge.codeHash) {
      await this.repository.incrementLoginVerificationAttempts(challengeHash);
      return invalid();
    }
    const userId = await this.repository.consumeLoginVerificationChallenge(challengeHash, hashSecret(code), new Date());
    if (!userId) return invalid();
    const user = await this.repository.findUserById(userId);
    if (!user) return invalid();
    const [session, trustedDevice] = await Promise.all([this.createSession(user), this.createTrustedDevice(user.id)]);
    return { ...session, trustedDevice };
  }

  async resendLoginVerification(challengeToken: string): Promise<void> {
    const challengeHash = hashSecret(challengeToken);
    const challenge = await this.repository.findLoginVerificationChallenge(challengeHash);
    const invalid = () => { throw new AppError("Desafio de confirmacao invalido ou expirado.", 400, "INVALID_LOGIN_VERIFICATION_CHALLENGE"); };
    if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date()) return invalid();
    if (challenge.resendCount >= 5) throw new AppError("Limite de reenvios atingido.", 429, "LOGIN_VERIFICATION_RESEND_LIMIT");
    if (challenge.lastSentAt.getTime() > Date.now() - 60_000) throw new AppError("Aguarde antes de reenviar o codigo.", 429, "LOGIN_VERIFICATION_RESEND_COOLDOWN");
    const user = await this.repository.findUserById(challenge.userId);
    if (!user) return invalid();
    const code = createVerificationCode();
    await this.repository.replaceLoginVerificationCode(challengeHash, hashSecret(code), new Date());
    await this.emailProvider.sendLoginVerification({ to: user.email, code });
  }

  getDevelopmentLoginVerificationCode(email: string): string | null {
    const provider = this.emailProvider as Partial<DevelopmentEmailProvider>;
    return provider.getLatestLoginVerificationCode?.(email) ?? null;
  }

  private async createLoginVerificationChallenge(user: PublicUser): Promise<LoginVerificationRequired> {
    const challengeToken = createSessionToken();
    const code = createVerificationCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60_000);
    await this.repository.createLoginVerificationChallenge({
      userId: user.id,
      challengeTokenHash: hashSecret(challengeToken),
      codeHash: hashSecret(code),
      expiresAt,
      attempts: 0,
      resendCount: 0,
      lastSentAt: now
    });
    await this.emailProvider.sendLoginVerification({ to: user.email, code });
    return { requiresVerification: true, challengeToken, expiresAt };
  }

  async loginWithOAuth(profile: OAuthProfile): Promise<AuthResult> {
    const email = profile.email.trim().toLowerCase();
    const normalizedProfile = { ...profile, email };
    const oauthUser = await this.repository.findUserByOAuthAccount(
      profile.provider,
      profile.providerAccountId
    );

    if (oauthUser) {
      return this.createSession(oauthUser);
    }

    const existingUser = await this.repository.findUserByEmail(email);

    if (existingUser) {
      await this.repository.linkOAuthAccount(existingUser.id, normalizedProfile);
      return this.createSession(existingUser);
    }

    const user = await this.repository.createUserFromOAuth(normalizedProfile);
    return this.createSession(user);
  }

  async logout(sessionToken: string): Promise<void> {
    await this.repository.deleteSession(hashSessionToken(sessionToken));
  }

  async createTrustedDevice(userId: string): Promise<TrustedDeviceResult> {
    const token = createTrustedDeviceToken();
    const expiresAt = new Date(Date.now() + this.trustedDeviceTtlDays * 24 * 60 * 60_000);
    await this.repository.createTrustedDevice({
      userId,
      tokenHash: hashTrustedDeviceToken(token),
      expiresAt
    });
    return { token, expiresAt };
  }

  async validateTrustedDevice(token: string): Promise<boolean> {
    const device = await this.repository.findTrustedDeviceByTokenHash(hashTrustedDeviceToken(token));
    return Boolean(device && !device.revokedAt && device.expiresAt > new Date());
  }

  async isTrustedDeviceExpired(token: string): Promise<boolean> {
    const device = await this.repository.findTrustedDeviceByTokenHash(hashTrustedDeviceToken(token));
    return Boolean(device && device.expiresAt <= new Date());
  }

  async revokeCurrentTrustedDevice(token: string): Promise<void> {
    await this.repository.revokeTrustedDevice(hashTrustedDeviceToken(token));
  }

  async revokeAllTrustedDevices(userId: string): Promise<void> {
    await this.repository.revokeTrustedDevicesForUser(userId);
  }

  async getCurrentUser(sessionToken: string): Promise<PublicUser | null> {
    return this.repository.findUserBySessionTokenHash(
      hashSessionToken(sessionToken)
    );
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<PublicUser> {
    return this.repository.updateProfile(userId, {
      displayName: input.displayName.trim(),
      avatarUrl: input.avatarUrl,
      bio: input.bio?.trim() || null
    });
  }

  async requestPasswordReset(emailInput: string): Promise<void> {
    const user = await this.repository.findUserByEmail(emailInput.trim().toLowerCase());
    if (!user) return;
    const existing = await this.repository.findPasswordResetRequest(user.id);
    if (existing && existing.createdAt.getTime() > Date.now() - 60_000) return;
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await this.repository.savePasswordResetRequest({
      userId: user.id, codeHash: hashSecret(code), verificationTokenHash: null,
      expiresAt, attempts: 0, verifiedAt: null, usedAt: null
    });
    await this.emailProvider.sendPasswordReset({ to: user.email, code });
  }

  async verifyPasswordReset(emailInput: string, code: string): Promise<string> {
    const user = await this.repository.findUserByEmail(emailInput.trim().toLowerCase());
    const invalid = () => { throw new AppError("Codigo invalido ou expirado.", 400, "INVALID_RESET_CODE"); };
    if (!user) return invalid();
    const request = await this.repository.findPasswordResetRequest(user.id);
    if (!request || request.usedAt || request.expiresAt <= new Date() || request.attempts >= 5) return invalid();
    if (hashSecret(code) !== request.codeHash) {
      await this.repository.incrementPasswordResetAttempts(user.id);
      return invalid();
    }
    const verificationToken = createSessionToken();
    await this.repository.markPasswordResetVerified(user.id, hashSecret(verificationToken));
    return verificationToken;
  }

  async resetPassword(emailInput: string, verificationToken: string, password: string): Promise<void> {
    const user = await this.repository.findUserByEmail(emailInput.trim().toLowerCase());
    const invalid = () => { throw new AppError("Solicitacao de redefinicao invalida ou expirada.", 400, "INVALID_RESET_TOKEN"); };
    if (!user) return invalid();
    const request = await this.repository.findPasswordResetRequest(user.id);
    if (!request || request.usedAt || request.expiresAt <= new Date() || !request.verifiedAt || request.verificationTokenHash !== hashSecret(verificationToken)) return invalid();
    const reset = await this.repository.resetPassword(user.id, await hashPassword(password), hashSecret(verificationToken));
    if (!reset) return invalid();
  }

  private async createSession(user: PublicUser): Promise<AuthResult> {
    const sessionToken = createSessionToken();
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + this.sessionTtlDays);

    await this.repository.createSession({
      userId: user.id,
      tokenHash: hashSessionToken(sessionToken),
      expiresAt
    });

    return {
      user,
      sessionToken,
      expiresAt
    };
  }
}

function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
