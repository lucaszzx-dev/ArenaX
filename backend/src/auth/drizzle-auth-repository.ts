import { and, eq, gt } from "drizzle-orm";

import type {
  AuthRepository,
  CreateSessionInput,
  CreateUserInput,
  OAuthProfile,
  PublicUser,
  UserWithPassword
} from "./auth-repository.js";
import type { Database } from "../db/client.js";
import { oauthAccounts, profiles, sessions, users } from "../db/schema.js";

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
}
