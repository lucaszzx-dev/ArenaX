import { loadEnvFile } from "node:process";
import { eq } from "drizzle-orm";

import { hashPassword } from "../auth/password.js";
import { parseEnv } from "../config/env.js";
import { createDatabase } from "./client.js";
import {
  championshipEntries,
  championships,
  matches,
  notifications,
  profiles,
  teamMembers,
  teams,
  users
} from "./schema.js";

const demoEmail = "demo@arenax.local";
const demoPassword = "ArenaXDemo2026!";
const demoSlug = "copa-arenax-demo";

try {
  loadEnvFile();
} catch {
  // Deploy environments provide variables directly.
}

const env = parseEnv();
const database = createDatabase(env.DATABASE_URL);

try {
  const passwordHash = await hashPassword(demoPassword);

  await database.db.transaction(async (transaction) => {
    const [user] = await transaction
      .insert(users)
      .values({ email: demoEmail, passwordHash })
      .onConflictDoUpdate({
        target: users.email,
        set: { passwordHash, updatedAt: new Date() }
      })
      .returning();

    if (!user) throw new Error("Não foi possível preparar o usuário demo.");

    await transaction
      .insert(profiles)
      .values({
        userId: user.id,
        displayName: "Organizador ArenaX",
        bio: "Conta demonstrativa do ArenaX."
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          displayName: "Organizador ArenaX",
          bio: "Conta demonstrativa do ArenaX.",
          updatedAt: new Date()
        }
      });

    await transaction
      .insert(notifications)
      .values({
        userId: user.id,
        type: "MATCH_RESULT",
        title: "Resultado registrado",
        message: "Raios Azuis venceu Fênix Urbana por 3 a 1 na Copa ArenaX Demo.",
        link: `/campeonatos/${demoSlug}`,
        dedupKey: "seed:demo:match-result"
      })
      .onConflictDoUpdate({
        target: [notifications.userId, notifications.dedupKey],
        set: {
          readAt: null,
          title: "Resultado registrado",
          message: "Raios Azuis venceu Fênix Urbana por 3 a 1 na Copa ArenaX Demo.",
          link: `/campeonatos/${demoSlug}`
        }
      });

    await transaction
      .delete(championships)
      .where(eq(championships.slug, demoSlug));

    const [championship] = await transaction
      .insert(championships)
      .values({
        organizerId: user.id,
        name: "Copa ArenaX Demo",
        slug: demoSlug,
        sport: "Futsal",
        description: "Campeonato demonstrativo com equipes, resultados e classificação.",
        entryType: "TEAM",
        status: "PUBLISHED",
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        allowsDraw: true,
        startsAt: new Date("2026-08-01T15:00:00.000Z"),
        endsAt: new Date("2026-08-30T21:00:00.000Z")
      })
      .returning();

    if (!championship) throw new Error("Não foi possível preparar a competição demo.");

    const createdTeams = await transaction
      .insert(teams)
      .values([
        { championshipId: championship.id, name: "Raios Azuis", shortName: "RAI" },
        { championshipId: championship.id, name: "Fênix Urbana", shortName: "FEN" },
        { championshipId: championship.id, name: "Vila Norte", shortName: "VNO" },
        { championshipId: championship.id, name: "Atlético Central", shortName: "ATC" }
      ])
      .returning();

    await transaction.insert(teamMembers).values(
      createdTeams.flatMap((team, index) => [
        { teamId: team.id, displayName: `Jogador ${index * 2 + 1}` },
        { teamId: team.id, displayName: `Jogador ${index * 2 + 2}` }
      ])
    );

    const entries = await transaction
      .insert(championshipEntries)
      .values(createdTeams.map((team) => ({
        championshipId: championship.id,
        kind: "TEAM" as const,
        displayName: team.name,
        teamId: team.id
      })))
      .returning();

    const entryByName = new Map(entries.map((entry) => [entry.displayName, entry]));
    const raios = entryByName.get("Raios Azuis");
    const fenix = entryByName.get("Fênix Urbana");
    const vila = entryByName.get("Vila Norte");
    const atletico = entryByName.get("Atlético Central");
    if (!raios || !fenix || !vila || !atletico) {
      throw new Error("Não foi possível preparar os inscritos demo.");
    }

    await transaction.insert(matches).values([
      {
        championshipId: championship.id,
        homeEntryId: raios.id,
        awayEntryId: fenix.id,
        scheduledAt: new Date("2026-08-02T18:00:00.000Z"),
        status: "FINISHED",
        homeScore: 3,
        awayScore: 1
      },
      {
        championshipId: championship.id,
        homeEntryId: vila.id,
        awayEntryId: atletico.id,
        scheduledAt: new Date("2026-08-02T20:00:00.000Z"),
        status: "FINISHED",
        homeScore: 2,
        awayScore: 2
      },
      {
        championshipId: championship.id,
        homeEntryId: raios.id,
        awayEntryId: vila.id,
        scheduledAt: new Date("2026-08-09T18:00:00.000Z")
      }
    ]);
  });

  console.log("Seed concluído.");
  console.log(`Login: ${demoEmail}`);
  console.log(`Senha: ${demoPassword}`);
  console.log(`ArenaX: http://localhost:5173/campeonatos/${demoSlug}`);
} finally {
  await database.close();
}
