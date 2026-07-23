import { describe, expect, it } from "vitest";

import { AuthService } from "../src/auth/auth-service.js";
import type { AppError } from "../src/errors/app-error.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";

const registration = {
  displayName: "Jogador Arena",
  email: "JOGADOR@EXEMPLO.COM",
  password: "senha-segura"
};

function createSubject() {
  const repository = new InMemoryAuthRepository();
  const service = new AuthService(repository, 7);

  return { repository, service };
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

  it("invalidates the current session on logout", async () => {
    const { service } = createSubject();
    const registrationResult = await service.register(registration);

    await service.logout(registrationResult.sessionToken);

    await expect(
      service.getCurrentUser(registrationResult.sessionToken)
    ).resolves.toBeNull();
  });
});
