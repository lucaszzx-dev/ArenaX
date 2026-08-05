import { describe, expect, it } from "vitest";

import { LocalDevelopmentEmailProvider } from "../src/email/email-provider.js";

describe("LocalDevelopmentEmailProvider", () => {
  it("keeps login verification codes in memory for local development only", async () => {
    const provider = new LocalDevelopmentEmailProvider();
    await provider.sendLoginVerification({ to: "Pessoa@ArenaX.test", code: "123456" });

    expect(provider.getLatestLoginVerificationCode("pessoa@arenax.test")).toBe("123456");
    expect(provider.getLatestLoginVerificationCode("missing@arenax.test")).toBeNull();
  });
});
