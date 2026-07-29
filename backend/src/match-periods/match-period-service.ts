import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchRepository } from "../matches/match-repository.js";
import type { MatchPeriodRepository } from "./match-period-repository.js";

const periodLimits: Record<string, number> = {
  Basquete: 8,
  "Vôlei": 5
};

export class MatchPeriodService {
  constructor(
    private readonly repository: MatchPeriodRepository,
    private readonly matches: MatchRepository,
    private readonly championships: ChampionshipService
  ) {}

  async listMine(organizerId: string, championshipId: string, matchId: string) {
    await this.championships.getMine(organizerId, championshipId);
    await this.requireMatch(championshipId, matchId);
    return this.repository.list(matchId);
  }

  async listPublic(championshipId: string, matchId: string) {
    await this.requireMatch(championshipId, matchId);
    return this.repository.list(matchId);
  }

  async save(
    organizerId: string,
    championshipId: string,
    matchId: string,
    input: { periodNumber: number; homeScore: number; awayScore: number }
  ) {
    const championship = await this.championships.getMine(
      organizerId,
      championshipId
    );
    const maxPeriods = periodLimits[championship.sport];
    if (!maxPeriods) {
      throw new AppError(
        "Parciais ainda não estão disponíveis para este esporte.",
        409,
        "MATCH_PERIODS_NOT_SUPPORTED"
      );
    }
    if (input.periodNumber > maxPeriods) {
      throw new AppError(
        `Este esporte permite no máximo ${maxPeriods} períodos.`,
        400,
        "INVALID_MATCH_PERIOD"
      );
    }
    if (championship.sport === "Vôlei" && input.homeScore === input.awayScore) {
      throw new AppError(
        "Um set de vôlei não pode terminar empatado.",
        400,
        "VOLLEYBALL_SET_CANNOT_DRAW"
      );
    }
    const match = await this.requireMatch(championshipId, matchId);
    if (match.status !== "SCHEDULED") {
      throw new AppError(
        "Reabra a partida antes de alterar as parciais.",
        409,
        "MATCH_PERIOD_REQUIRES_SCHEDULED_MATCH"
      );
    }
    return this.repository.upsert({ matchId, ...input });
  }

  async delete(
    organizerId: string,
    championshipId: string,
    matchId: string,
    periodNumber: number
  ) {
    await this.championships.getMine(organizerId, championshipId);
    const match = await this.requireMatch(championshipId, matchId);
    if (match.status !== "SCHEDULED") {
      throw new AppError(
        "Reabra a partida antes de alterar as parciais.",
        409,
        "MATCH_PERIOD_REQUIRES_SCHEDULED_MATCH"
      );
    }
    await this.repository.delete(matchId, periodNumber);
  }

  private async requireMatch(championshipId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match || match.championshipId !== championshipId) {
      throw new AppError("Partida não encontrada.", 404, "MATCH_NOT_FOUND");
    }
    return match;
  }
}
