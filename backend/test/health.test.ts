import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

const app = buildApp();

describe("GET /health", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the API health status without a database check", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      database: "skipped"
    });
  });

  it("exposes the health check through the API prefix", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      database: "skipped"
    });

    await app.close();
  });

  it("reports ok when the database is reachable", async () => {
    const app = buildApp({
      checkDatabase: async () => undefined
    });

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      database: "ok"
    });

    await app.close();
  });

  it("reports degraded when the database is unreachable", async () => {
    const app = buildApp({
      checkDatabase: async () => {
        throw new Error("database down");
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "degraded",
      database: "unreachable"
    });

    await app.close();
  });
});
