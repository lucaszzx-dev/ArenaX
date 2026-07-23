import { describe, expect, it } from "vitest";

import { parseEnv } from "../src/config/env.js";

const validEnv = {
  DATABASE_URL: "postgresql://arenax:secret@localhost:5432/arenax",
  FRONTEND_URL: "http://localhost:5173"
};

describe("parseEnv", () => {
  it("parses valid variables and applies safe defaults", () => {
    expect(parseEnv(validEnv)).toMatchObject({
      NODE_ENV: "development",
      PORT: 3333,
      SESSION_TTL_DAYS: 7
    });
  });

  it("rejects an invalid database URL", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: "mysql://localhost/arenax"
      })
    ).toThrow("Variáveis de ambiente inválidas");
  });
});
