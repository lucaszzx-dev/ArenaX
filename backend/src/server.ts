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
import { DrizzleMatchPeriodRepository } from "./match-periods/drizzle-match-period-repository.js";
import { MatchPeriodService } from "./match-periods/match-period-service.js";
import { MatchAuditService } from "./match-audit/match-audit-service.js";
import { ClubService } from "./clubs/club-service.js";
import { DrizzleClubRepository } from "./clubs/drizzle-club-repository.js";
import { DrizzleKnockoutRepository } from "./knockout/drizzle-knockout-repository.js";
import { KnockoutService } from "./knockout/knockout-service.js";

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
const clubRepository = new DrizzleClubRepository(database.db);
const clubService = new ClubService(clubRepository, championshipService);
const matchRepository = new DrizzleMatchRepository(database.db);
const knockoutRepository = new DrizzleKnockoutRepository(database.db);
const knockoutService = new KnockoutService(
  knockoutRepository,
  matchRepository,
  championshipService
);
const matchAuditService = new MatchAuditService(
  database.db,
  matchRepository,
  championshipService
);
const matchService = new MatchService(
  matchRepository,
  championshipService,
  matchAuditService,
  knockoutService
);
const matchEventRepository = new DrizzleMatchEventRepository(database.db);
const matchEventService = new MatchEventService(
  matchEventRepository,
  matchRepository,
  championshipService
);
const matchPeriodRepository = new DrizzleMatchPeriodRepository(database.db);
const matchPeriodService = new MatchPeriodService(
  matchPeriodRepository,
  matchRepository,
  championshipService
);
const app = buildApp({
  authService,
  championshipService,
  participantService,
  matchService,
  matchEventService,
  matchPeriodService,
  matchAuditService,
  clubService,
  knockoutService,
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
