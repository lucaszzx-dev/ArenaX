import type {
  AuthRepository,
  OAuthProfile,
  PublicUser
} from "./auth-repository.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createSessionToken, hashSessionToken } from "./session-token.js";
import { AppError } from "../errors/app-error.js";

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
    private readonly sessionTtlDays: number
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
    const user = await this.repository.findUserByEmail(email);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(
        "E-mail ou senha incorretos.",
        401,
        "INVALID_CREDENTIALS"
      );
    }

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

  async getCurrentUser(sessionToken: string): Promise<PublicUser | null> {
    return this.repository.findUserBySessionTokenHash(
      hashSessionToken(sessionToken)
    );
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
