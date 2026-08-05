import { and, eq, gt, isNull, sql } from "drizzle-orm";

import type {
  AuthRepository,
  CreateSessionInput,
  CreateUserInput,
  LoginSecurityState,
  OAuthProfile,
  PasswordResetRequest,
  PublicUser,
  UpdateProfileInput,
  UserWithPassword
} from "./auth-repository.js";
import type { Database } from "../db/client.js";
import { loginSecurity, oauthAccounts, passwordResetRequests, profiles, sessions, users } from "../db/schema.js";

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: Database) {}

  async createUser(input: CreateUserInput): Promise<PublicUser> {
    return this.db.transaction(async (transaction) => {
      const [user] = await transaction
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash
        })
        .returning({
          id: users.id,
          email: users.email
        });

      if (!user) {
        throw new Error("Não foi possível criar o usuário.");
      }

      const [profile] = await transaction
        .insert(profiles)
        .values({
          userId: user.id,
          displayName: input.displayName
        })
        .returning({
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
          bio: profiles.bio
        });

      if (!profile) {
        throw new Error("Não foi possível criar o perfil.");
      }

      return {
        ...user,
        ...profile
      };
    });
  }

  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    const [result] = await this.db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.email, email))
      .limit(1);

    return result ?? null;
  }

  async findUserByOAuthAccount(
    provider: OAuthProfile["provider"],
    providerAccountId: string
  ): Promise<PublicUser | null> {
    const [result] = await this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio
      })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId)
        )
      )
      .limit(1);

    return result ?? null;
  }

  async createUserFromOAuth(profile: OAuthProfile): Promise<PublicUser> {
    return this.db.transaction(async (transaction) => {
      const [user] = await transaction
        .insert(users)
        .values({
          email: profile.email,
          passwordHash: null
        })
        .returning({
          id: users.id,
          email: users.email
        });

      if (!user) {
        throw new Error("Não foi possível criar o usuário OAuth.");
      }

      const [createdProfile] = await transaction
        .insert(profiles)
        .values({
          userId: user.id,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl
        })
        .returning({
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
          bio: profiles.bio
        });

      await transaction.insert(oauthAccounts).values({
        userId: user.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId
      });

      if (!createdProfile) {
        throw new Error("Não foi possível criar o perfil OAuth.");
      }

      return {
        ...user,
        ...createdProfile
      };
    });
  }

  async linkOAuthAccount(
    userId: string,
    profile: OAuthProfile
  ): Promise<void> {
    await this.db.insert(oauthAccounts).values({
      userId,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId
    });
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<PublicUser> {
    await this.db
      .update(profiles)
      .set({
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        bio: input.bio,
        updatedAt: new Date()
      })
      .where(eq(profiles.userId, userId));

    const [result] = await this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!result) {
      throw new Error("Perfil não encontrado após a atualização.");
    }

    return result;
  }

  async findUserBySessionTokenHash(
    tokenHash: string
  ): Promise<PublicUser | null> {
    const [result] = await this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    return result ?? null;
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.db.insert(sessions).values(input);
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  async deleteSessionsForUser(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async savePasswordResetRequest(
    input: Omit<PasswordResetRequest, "createdAt">
  ): Promise<void> {
    await this.db.insert(passwordResetRequests).values(input).onConflictDoUpdate({
      target: passwordResetRequests.userId,
      set: {
        codeHash: input.codeHash,
        verificationTokenHash: null,
        expiresAt: input.expiresAt,
        attempts: 0,
        verifiedAt: null,
        usedAt: null,
        createdAt: new Date()
      }
    });
  }

  async findPasswordResetRequest(userId: string): Promise<PasswordResetRequest | null> {
    const [result] = await this.db.select({
      userId: passwordResetRequests.userId,
      codeHash: passwordResetRequests.codeHash,
      verificationTokenHash: passwordResetRequests.verificationTokenHash,
      expiresAt: passwordResetRequests.expiresAt,
      attempts: passwordResetRequests.attempts,
      verifiedAt: passwordResetRequests.verifiedAt,
      usedAt: passwordResetRequests.usedAt,
      createdAt: passwordResetRequests.createdAt
    }).from(passwordResetRequests).where(eq(passwordResetRequests.userId, userId)).limit(1);
    return result ?? null;
  }

  async incrementPasswordResetAttempts(userId: string): Promise<number> {
    const [result] = await this.db.update(passwordResetRequests)
      .set({ attempts: sql`${passwordResetRequests.attempts} + 1` })
      .where(eq(passwordResetRequests.userId, userId))
      .returning({ attempts: passwordResetRequests.attempts });
    return result?.attempts ?? 0;
  }

  async markPasswordResetVerified(userId: string, verificationTokenHash: string): Promise<void> {
    await this.db.update(passwordResetRequests)
      .set({ verificationTokenHash, verifiedAt: new Date() })
      .where(and(eq(passwordResetRequests.userId, userId), isNull(passwordResetRequests.usedAt)));
  }

  async resetPassword(userId: string, passwordHash: string, verificationTokenHash: string): Promise<boolean> {
    return this.db.transaction(async (transaction) => {
      const [consumed] = await transaction.update(passwordResetRequests)
        .set({ usedAt: new Date(), verificationTokenHash: null })
        .where(and(eq(passwordResetRequests.userId, userId), eq(passwordResetRequests.verificationTokenHash, verificationTokenHash), isNull(passwordResetRequests.usedAt)))
        .returning({ userId: passwordResetRequests.userId });
      if (!consumed) return false;
      await transaction.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
      await transaction.delete(sessions).where(eq(sessions.userId, userId));
      return true;
    });
  }

  async findLoginSecurity(email: string): Promise<LoginSecurityState | null> {
    const [state] = await this.db.select().from(loginSecurity).where(eq(loginSecurity.email, email)).limit(1);
    return state ?? null;
  }

  async recordLoginFailure(email: string, now: Date): Promise<LoginSecurityState> {
    const state = await this.findLoginSecurity(email);
    const windowExpired = !state || state.windowStartedAt.getTime() <= now.getTime() - 15 * 60_000;
    const failures = windowExpired ? 1 : state.failureCount + 1;
    const lockUntil = failures >= 5 ? new Date(now.getTime() + 15 * 60_000) : null;
    const [saved] = await this.db.insert(loginSecurity).values({ email, failureCount: failures, windowStartedAt: windowExpired ? now : state.windowStartedAt, lockUntil, updatedAt: now })
      .onConflictDoUpdate({ target: loginSecurity.email, set: { failureCount: failures, windowStartedAt: windowExpired ? now : state.windowStartedAt, lockUntil, updatedAt: now } }).returning();
    if (!saved) throw new Error("Não foi possível registrar a tentativa de login.");
    return saved;
  }

  async clearLoginFailures(email: string): Promise<void> {
    await this.db.delete(loginSecurity).where(eq(loginSecurity.email, email));
  }
}
