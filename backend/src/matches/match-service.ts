import type { ChampionshipService } from "../championships/championship-service.js";
import type { Championship } from "../championships/championship-repository.js";
import { AppError } from "../errors/app-error.js";
import type {
  CreateMatchInput,
  Match,
  MatchRepository,
  Standing
} from "./match-repository.js";
import type { MatchAuditService } from "../match-audit/match-audit-service.js";

export type ScheduleMatchInput = Omit<CreateMatchInput, "championshipId">;

export class MatchService {
  constructor(
    private readonly repository: MatchRepository,
    private readonly championships: ChampionshipService,
    private readonly audit?: MatchAuditService
  ) {}

  async list(organizerId: string, championshipId: string) {
    await this.championships.getMine(organizerId, championshipId);
    const [entries, matches] = await Promise.all([
      this.repository.listEntries(championshipId),
      this.repository.listByChampionship(championshipId)
    ]);

    return { entries, matches };
  }

  async create(
    organizerId: string,
    championshipId: string,
    input: ScheduleMatchInput
  ): Promise<Match> {
    await this.championships.getMine(organizerId, championshipId);

    if (input.homeEntryId === input.awayEntryId) {
      throw new AppError(
        "Escolha dois adversários diferentes.",
        400,
        "MATCH_REQUIRES_DISTINCT_ENTRIES"
      );
    }

    const [homeEntry, awayEntry] = await Promise.all([
      this.repository.findEntry(input.homeEntryId),
      this.repository.findEntry(input.awayEntryId)
    ]);

    if (
      !homeEntry ||
      !awayEntry ||
      homeEntry.championshipId !== championshipId ||
      awayEntry.championshipId !== championshipId
    ) {
      throw new AppError(
        "Um dos adversários não pertence a esta arena.",
        400,
        "ENTRY_NOT_IN_CHAMPIONSHIP"
      );
    }

    return this.repository.create({ championshipId, ...input });
  }

  async delete(
    organizerId: string,
    championshipId: string,
    matchId: string
  ) {
    await this.championships.getMine(organizerId, championshipId);
    const match = await this.repository.findById(matchId);

    if (!match || match.championshipId !== championshipId) {
      throw new AppError("Partida não encontrada.", 404, "MATCH_NOT_FOUND");
    }
    if (match.status === "FINISHED") {
      throw new AppError(
        "Remova o placar antes de excluir uma partida finalizada.",
        409,
        "FINISHED_MATCH_CANNOT_BE_DELETED"
      );
    }

    await this.repository.delete(championshipId, matchId);
  }

  async recordScore(
    organizerId: string,
    championshipId: string,
    matchId: string,
    homeScore: number,
    awayScore: number
  ) {
    const championship = await this.championships.getMine(
      organizerId,
      championshipId
    );
    const match = await this.repository.findById(matchId);

    if (!match || match.championshipId !== championshipId) {
      throw new AppError("Partida não encontrada.", 404, "MATCH_NOT_FOUND");
    }
    if (!championship.allowsDraw && homeScore === awayScore) {
      throw new AppError(
        "Esta arena não permite partidas empatadas.",
        400,
        "DRAW_NOT_ALLOWED"
      );
    }

    const previousScore = {
      homeScore: match.homeScore,
      awayScore: match.awayScore
    };
    const updated = await this.repository.updateScore(matchId, homeScore, awayScore);
    await this.audit?.record(organizerId, matchId, "SCORE_CHANGED", {
      before: previousScore,
      after: { homeScore, awayScore }
    });
    return updated;
  }

  async updateSchedule(
    organizerId: string,
    championshipId: string,
    matchId: string,
    scheduledAt: Date | null
  ) {
    await this.championships.getMine(organizerId, championshipId);
    const match = await this.requireMatch(championshipId, matchId);
    if (match.status !== "SCHEDULED") {
      throw new AppError(
        "Reabra a partida antes de alterar o agendamento.",
        409,
        "MATCH_NOT_SCHEDULED"
      );
    }
    return this.repository.updateSchedule(matchId, scheduledAt);
  }

  async changeMatchStatus(
    organizerId: string,
    championshipId: string,
    matchId: string,
    action: "CANCEL" | "REOPEN"
  ) {
    await this.championships.getMine(organizerId, championshipId);
    const match = await this.requireMatch(championshipId, matchId);
    if (action === "CANCEL") {
      if (match.status === "CANCELED") return match;
      const previousStatus = match.status;
      const updated = await this.repository.updateStatus(matchId, "CANCELED", false);
      await this.audit?.record(organizerId, matchId, "MATCH_CANCELED", {
        previousStatus
      });
      return updated;
    }
    if (match.status === "SCHEDULED") return match;
    const previousState = {
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore
    };
    const updated = await this.repository.updateStatus(matchId, "SCHEDULED", true);
    await this.audit?.record(organizerId, matchId, "MATCH_REOPENED", {
      previousStatus: previousState.status,
      clearedScore: {
        homeScore: previousState.homeScore,
        awayScore: previousState.awayScore
      }
    });
    return updated;
  }

  async standings(
    organizerId: string,
    championshipId: string
  ): Promise<Standing[]> {
    const championship = await this.championships.getMine(
      organizerId,
      championshipId
    );
    return this.calculateStandings(championship);
  }

  async publicOverview(championship: Championship) {
    const [entries, matches, standings] = await Promise.all([
      this.repository.listEntries(championship.id),
      this.repository.listByChampionship(championship.id),
      this.calculateStandings(championship)
    ]);
    return { entries, matches, standings };
  }

  async changeChampionshipStatus(
    organizerId: string,
    championshipId: string,
    status: "DRAFT" | "PUBLISHED" | "FINISHED"
  ) {
    const championship = await this.championships.getMine(
      organizerId,
      championshipId
    );

    if (status === "PUBLISHED" && championship.status === "DRAFT") {
      const [entries, matches] = await Promise.all([
        this.repository.listEntries(championshipId),
        this.repository.listByChampionship(championshipId)
      ]);
      if (entries.length < 2) {
        throw new AppError(
          "Cadastre pelo menos dois participantes antes de publicar.",
          409,
          "CHAMPIONSHIP_NEEDS_ENTRIES"
        );
      }
      if (matches.length < 1) {
        throw new AppError(
          "Crie pelo menos uma partida antes de publicar.",
          409,
          "CHAMPIONSHIP_NEEDS_MATCH"
        );
      }
    }

    return this.championships.setStatus(
      organizerId,
      championshipId,
      status
    );
  }

  private async calculateStandings(
    championship: Championship
  ): Promise<Standing[]> {
    const [entries, matches] = await Promise.all([
      this.repository.listEntries(championship.id),
      this.repository.listByChampionship(championship.id)
    ]);
    const table = new Map(entries.map((entry) => [
      entry.id,
      {
        entryId: entry.id,
        position: 0,
        displayName: entry.displayName,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        scoreFor: 0,
        scoreAgainst: 0,
        scoreDifference: 0,
        points: 0
      } satisfies Standing
    ]));

    for (const match of matches) {
      if (
        match.status !== "FINISHED" ||
        match.homeScore === null ||
        match.awayScore === null
      ) continue;

      const home = table.get(match.homeEntryId);
      const away = table.get(match.awayEntryId);
      if (!home || !away) continue;
      home.played += 1;
      away.played += 1;
      home.scoreFor += match.homeScore;
      home.scoreAgainst += match.awayScore;
      away.scoreFor += match.awayScore;
      away.scoreAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        home.wins += 1;
        away.losses += 1;
        home.points += championship.winPoints;
        away.points += championship.lossPoints;
      } else if (match.homeScore < match.awayScore) {
        away.wins += 1;
        home.losses += 1;
        away.points += championship.winPoints;
        home.points += championship.lossPoints;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += championship.drawPoints;
        away.points += championship.drawPoints;
      }
    }

    return [...table.values()]
      .map((row) => ({
        ...row,
        scoreDifference: row.scoreFor - row.scoreAgainst
      }))
      .sort((a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.scoreDifference - a.scoreDifference ||
        b.scoreFor - a.scoreFor ||
        a.displayName.localeCompare(b.displayName, "pt-BR")
      )
      .map((row, index) => ({ ...row, position: index + 1 }));
  }

  private async requireMatch(championshipId: string, matchId: string) {
    const match = await this.repository.findById(matchId);
    if (!match || match.championshipId !== championshipId) {
      throw new AppError("Partida não encontrada.", 404, "MATCH_NOT_FOUND");
    }
    return match;
  }
}
