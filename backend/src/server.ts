import { loadEnvFile } from "node:process";

import { buildApp } from "./app.js";
import { DrizzleAuthRepository } from "./auth/drizzle-auth-repository.js";
import { AuthService } from "./auth/auth-service.js";
import { ChampionshipService } from "./championships/championship-service.js";
import { DrizzleChampionshipRepository } from "./championships/drizzle-championship-repository.js";
import { parseEnv } from "./config/env.js";
import { createDatabase } from "./db/client.js";
import { DrizzleParticipantRepository } from "./participants/drizzle-participant-repository.js";
import { ParticipantService } from "./participants/participant-service.js";
import { DrizzleMatchRepository } from "./matches/drizzle-match-repository.js";
import { MatchService } from "./matches/match-service.js";
import { DrizzleMatchEventRepository } from "./match-events/drizzle-match-event-repository.js";
import { MatchEventService } from "./match-events/match-event-service.js";

try {
  loadEnvFile();
} catch {
  // Production platforms usually provide environment variables directly.
}

const env = parseEnv();
const database = createDatabase(env.DATABASE_URL);
const authRepository = new DrizzleAuthRepository(database.db);
const authService = new AuthService(authRepository, env.SESSION_TTL_DAYS);
const championshipRepository = new DrizzleChampionshipRepository(database.db);
const championshipService = new ChampionshipService(championshipRepository);
const participantRepository = new DrizzleParticipantRepository(database.db);
const participantService = new ParticipantService(
  participantRepository,
  championshipService
);
const matchRepository = new DrizzleMatchRepository(database.db);
const matchService = new MatchService(matchRepository, championshipService);
const matchEventRepository = new DrizzleMatchEventRepository(database.db);
const matchEventService = new MatchEventService(
  matchEventRepository,
  matchRepository,
  championshipService
);
const app = buildApp({
  authService,
  championshipService,
  participantService,
  matchService,
  matchEventService,
  env
});

app.addHook("onClose", async () => {
  await database.close();
});

try {
  await app.listen({
    host: env.HOST,
    port: env.PORT
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
