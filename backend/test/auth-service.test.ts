import { describe, expect, it } from "vitest";

import { AuthService } from "../src/auth/auth-service.js";
import type { AppError } from "../src/errors/app-error.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";
import type { EmailProvider, LoginVerificationEmail, PasswordResetEmail } from "../src/email/email-provider.js";

const registration = {
  displayName: "Jogador Arena",
  email: "JOGADOR@EXEMPLO.COM",
  password: "senha-segura"
};

function createSubject() {
  const repository = new InMemoryAuthRepository();
  const sent: PasswordResetEmail[] = [];
  const loginVerifications: LoginVerificationEmail[] = [];
  const emailProvider: EmailProvider = {
    sendPasswordReset: async (email) => { sent.push(email); },
    sendLoginVerification: async (email) => { loginVerifications.push(email); }
  };
  const service = new AuthService(repository, 7, emailProvider);

  return { repository, service, sent, loginVerifications };
}

describe("AuthService", () => {
  it("registers a user with normalized email and a hashed password", async () => {
    const { repository, service } = createSubject();

    const result = await service.register(registration);

    expect(result.user.email).toBe("jogador@exemplo.com");
    expect(result.sessionToken).toBeTruthy();
    expect(repository.users[0]?.passwordHash).not.toContain("senha-segura");
    expect(repository.sessions).toHaveLength(1);
  });

  it("does not register the same email twice", async () => {
    const { service } = createSubject();
    await service.register(registration);

    await expect(service.register(registration)).rejects.toMatchObject({
      statusCode: 409,
      code: "EMAIL_ALREADY_IN_USE"
    } satisfies Partial<AppError>);
  });

  it("rejects invalid login credentials without revealing which field failed", async () => {
    const { service } = createSubject();
    await service.register(registration);

    await expect(
      service.login({
        email: registration.email,
        password: "senha-errada"
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS"
    } satisfies Partial<AppError>);
  });

  it("temporarily locks five invalid password attempts and clears failures after a valid login", async () => {
    const { repository, service } = createSubject();
    await service.register(registration);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(service.login({ email: registration.email, password: "errada" })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    }
    await expect(service.login({ email: registration.email, password: "errada" })).rejects.toMatchObject({ statusCode: 429, code: "LOGIN_TEMPORARILY_LOCKED" });
    await expect(service.login({ email: registration.email, password: registration.password })).rejects.toMatchObject({ statusCode: 429 });
    repository.loginSecurity[0]!.lockUntil = new Date(Date.now() - 1);
    await expect(service.login({ email: registration.email, password: registration.password })).resolves.toMatchObject({ requiresVerification: true });
    expect(repository.loginSecurity).toHaveLength(0);
  });

  it("invalidates the current session on logout", async () => {
    const { service } = createSubject();
    const registrationResult = await service.register(registration);

    await service.logout(registrationResult.sessionToken);

    await expect(
      service.getCurrentUser(registrationResult.sessionToken)
    ).resolves.toBeNull();
  });

  it("creates an opaque trusted-device token and persists only its hash", async () => {
    const { repository, service } = createSubject();
    const registered = await service.register(registration);
    const trustedDevice = await service.createTrustedDevice(registered.user.id);

    expect(trustedDevice.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(repository.trustedDevices).toEqual([expect.objectContaining({
      userId: registered.user.id,
      expiresAt: trustedDevice.expiresAt,
      revokedAt: null
    })]);
    expect(repository.trustedDevices[0]!.tokenHash).not.toBe(trustedDevice.token);
    expect(await service.validateTrustedDevice(trustedDevice.token)).toBe(true);
  });

  it("requires a login code when trust is absent, without creating a session", async () => {
    const { repository, service, loginVerifications } = createSubject();
    await service.register(registration);
    const result = await service.login({ email: registration.email, password: registration.password });

    expect(result).toMatchObject({ requiresVerification: true });
    expect(repository.sessions).toHaveLength(1);
    expect(repository.loginVerificationChallenges).toHaveLength(1);
    expect(repository.loginVerificationChallenges[0]!.codeHash).not.toBe(loginVerifications[0]!.code);
  });

  it("allows a valid trusted device to log in without a code", async () => {
    const { service, loginVerifications } = createSubject();
    const registered = await service.register(registration);
    const trusted = await service.createTrustedDevice(registered.user.id);
    const result = await service.login({ email: registration.email, password: registration.password }, trusted.token);

    expect(result).toMatchObject({ user: { id: registered.user.id } });
    expect("requiresVerification" in result).toBe(false);
    expect(loginVerifications).toHaveLength(0);
  });

  it("requires a code when trusted-device trust has expired", async () => {
    const { repository, service, loginVerifications } = createSubject();
    const registered = await service.register(registration);
    const trusted = await service.createTrustedDevice(registered.user.id);
    repository.trustedDevices[0]!.expiresAt = new Date(Date.now() - 1);

    await expect(service.login({ email: registration.email, password: registration.password }, trusted.token)).resolves.toMatchObject({ requiresVerification: true });
    expect(loginVerifications).toHaveLength(1);
  });

  it("consumes a valid login code once and creates a renewed trusted device", async () => {
    const { repository, service, loginVerifications } = createSubject();
    await service.register(registration);
    const login = await service.login({ email: registration.email, password: registration.password });
    if (!("requiresVerification" in login)) throw new Error("verification was expected");
    const verified = await service.verifyLoginVerification(login.challengeToken, loginVerifications[0]!.code);

    expect(verified.user.email).toBe("jogador@exemplo.com");
    expect(verified.trustedDevice.token).toBeTruthy();
    expect(repository.sessions).toHaveLength(2);
    expect(repository.trustedDevices).toHaveLength(1);
    await expect(service.verifyLoginVerification(login.challengeToken, loginVerifications[0]!.code)).rejects.toMatchObject({ code: "INVALID_LOGIN_VERIFICATION_CODE" });
  });

  it("rejects invalid, expired and exhausted login verification codes", async () => {
    const { repository, service, loginVerifications } = createSubject();
    await service.register(registration);
    const login = await service.login({ email: registration.email, password: registration.password });
    if (!("requiresVerification" in login)) throw new Error("verification was expected");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(service.verifyLoginVerification(login.challengeToken, "000000")).rejects.toMatchObject({ code: "INVALID_LOGIN_VERIFICATION_CODE" });
    }
    await expect(service.verifyLoginVerification(login.challengeToken, loginVerifications[0]!.code)).rejects.toMatchObject({ code: "INVALID_LOGIN_VERIFICATION_CODE" });
    const next = await service.login({ email: registration.email, password: registration.password });
    if (!("requiresVerification" in next)) throw new Error("verification was expected");
    repository.loginVerificationChallenges[1]!.expiresAt = new Date(Date.now() - 1);
    await expect(service.verifyLoginVerification(next.challengeToken, loginVerifications[1]!.code)).rejects.toMatchObject({ code: "INVALID_LOGIN_VERIFICATION_CODE" });
  });

  it("enforces resend cooldown and replaces the previous login code", async () => {
    const { repository, service, loginVerifications } = createSubject();
    await service.register(registration);
    const login = await service.login({ email: registration.email, password: registration.password });
    if (!("requiresVerification" in login)) throw new Error("verification was expected");
    await expect(service.resendLoginVerification(login.challengeToken)).rejects.toMatchObject({ code: "LOGIN_VERIFICATION_RESEND_COOLDOWN" });
    repository.loginVerificationChallenges[0]!.lastSentAt = new Date(Date.now() - 60_001);
    const oldCode = loginVerifications[0]!.code;
    await service.resendLoginVerification(login.challengeToken);
    expect(loginVerifications).toHaveLength(2);
    await expect(service.verifyLoginVerification(login.challengeToken, oldCode)).rejects.toMatchObject({ code: "INVALID_LOGIN_VERIFICATION_CODE" });
    await expect(service.verifyLoginVerification(login.challengeToken, loginVerifications[1]!.code)).resolves.toMatchObject({ user: { email: "jogador@exemplo.com" } });
  });

  it("rejects invalid, expired and revoked trusted-device tokens", async () => {
    const { repository, service } = createSubject();
    const registered = await service.register(registration);
    const trustedDevice = await service.createTrustedDevice(registered.user.id);

    expect(await service.validateTrustedDevice("invalid-token")).toBe(false);
    repository.trustedDevices[0]!.expiresAt = new Date(Date.now() - 1);
    expect(await service.isTrustedDeviceExpired(trustedDevice.token)).toBe(true);
    expect(await service.validateTrustedDevice(trustedDevice.token)).toBe(false);
    repository.trustedDevices[0]!.expiresAt = new Date(Date.now() + 60_000);
    await service.revokeCurrentTrustedDevice(trustedDevice.token);
    expect(await service.validateTrustedDevice(trustedDevice.token)).toBe(false);
  });

  it("revokes every trusted device when requested", async () => {
    const { repository, service } = createSubject();
    const registered = await service.register(registration);
    const first = await service.createTrustedDevice(registered.user.id);
    const second = await service.createTrustedDevice(registered.user.id);

    await service.revokeAllTrustedDevices(registered.user.id);
    expect(repository.trustedDevices.every((device) => device.revokedAt)).toBe(true);
    expect(await service.validateTrustedDevice(first.token)).toBe(false);
    expect(await service.validateTrustedDevice(second.token)).toBe(false);
  });

  it("creates a user and session from a verified OAuth profile", async () => {
    const { repository, service } = createSubject();

    const result = await service.loginWithOAuth({
      provider: "google",
      providerAccountId: "google-user-123",
      email: "oauth@arenax.test",
      displayName: "Pessoa OAuth",
      avatarUrl: "https://example.com/avatar.png"
    });

    expect(result.user).toMatchObject({
      email: "oauth@arenax.test",
      displayName: "Pessoa OAuth"
    });
    expect(repository.users[0]?.passwordHash).toBeNull();
    expect(repository.oauthAccounts).toHaveLength(1);
    expect(repository.sessions).toHaveLength(1);
  });

  it("links Google to an existing account with the same verified email", async () => {
    const { repository, service } = createSubject();
    const passwordAccount = await service.register(registration);

    const result = await service.loginWithOAuth({
      provider: "google",
      providerAccountId: "google-existing-123",
      email: registration.email,
      displayName: registration.displayName,
      avatarUrl: null
    });

    expect(result.user.id).toBe(passwordAccount.user.id);
    expect(repository.users).toHaveLength(1);
    expect(repository.oauthAccounts).toHaveLength(1);
  });

  it("completes password recovery once and invalidates old sessions", async () => {
    const { repository, service, sent } = createSubject();
    const registered = await service.register(registration);
    const trustedDevice = await service.createTrustedDevice(registered.user.id);
    await service.login({ email: registration.email, password: registration.password });
    await service.requestPasswordReset(registration.email);
    const token = await service.verifyPasswordReset(registration.email, sent[0]!.code);
    await service.resetPassword(registration.email, token, "nova-senha-segura");
    await expect(service.getCurrentUser(registered.sessionToken)).resolves.toBeNull();
    await expect(service.validateTrustedDevice(trustedDevice.token)).resolves.toBe(false);
    await expect(service.login({ email: registration.email, password: registration.password })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(service.login({ email: registration.email, password: "nova-senha-segura" })).resolves.toMatchObject({ requiresVerification: true });
    await expect(service.resetPassword(registration.email, token, "outra-senha"))
      .rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
    expect(repository.sessions).toHaveLength(0);
  });

  it("rejects invalid, expired and exhausted reset codes", async () => {
    const { repository, service, sent } = createSubject();
    await service.register(registration);
    await service.requestPasswordReset(registration.email);
    await expect(service.verifyPasswordReset(registration.email, "000000")).rejects.toMatchObject({ code: "INVALID_RESET_CODE" });
    repository.passwordResetRequests[0]!.expiresAt = new Date(Date.now() - 1);
    await expect(service.verifyPasswordReset(registration.email, sent[0]!.code)).rejects.toMatchObject({ code: "INVALID_RESET_CODE" });
    await service.requestPasswordReset(registration.email);
    repository.passwordResetRequests[0]!.attempts = 5;
    await expect(service.verifyPasswordReset(registration.email, sent[0]!.code)).rejects.toMatchObject({ code: "INVALID_RESET_CODE" });
  });

  it("uses a resend cooldown and does not reveal absent accounts", async () => {
    const { service, sent } = createSubject();
    await service.requestPasswordReset("missing@arenax.test");
    await service.register(registration);
    await service.requestPasswordReset(registration.email);
    await service.requestPasswordReset(registration.email);
    expect(sent).toHaveLength(1);
  });
});
