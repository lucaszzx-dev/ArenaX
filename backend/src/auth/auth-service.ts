import type {
  AuthRepository,
  OAuthProfile,
  PublicUser,
  UpdateProfileInput
} from "./auth-repository.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createSessionToken, hashSessionToken } from "./session-token.js";
import { AppError } from "../errors/app-error.js";
import { SafeDevelopmentEmailProvider, type EmailProvider } from "../email/email-provider.js";
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

  async login(input: LoginInput): Promise<AuthResult> {
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

    return this.createSession(user);
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
