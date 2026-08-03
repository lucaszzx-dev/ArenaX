import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchAuditService } from "../match-audit/match-audit-service.js";
import type { MatchRepository } from "../matches/match-repository.js";
import type { MatchService } from "../matches/match-service.js";
import type { MatchPeriodRepository } from "./match-period-repository.js";

const periodLimits: Record<string, number> = {
  Basquete: 8,
  "V\u00f4lei": 5
};

function validateVolleyballSet(
  championship: { sport: string; bestOfSets: number },
  periodNumber: number,
  homeScore: number,
  awayScore: number
) {
  if (championship.sport !== "V\u00f4lei") return;
  const totalSets = Math.max(championship.bestOfSets, 3);
  const isTieBreak = periodNumber >= totalSets;
  const targetPoints = isTieBreak ? 15 : 25;
  const scoreDiff = Math.abs(homeScore - awayScore);
  const maxScore = Math.max(homeScore, awayScore);

  if (homeScore === awayScore) {
    throw new AppError(
      "Um set de v\u00f4lei n\u00e3o pode terminar empatado.",
      400,
      "VOLLEYBALL_SET_CANNOT_DRAW"
    );
  }
  if (maxScore < targetPoints && scoreDiff < 2) {
    throw new AppError(
      "O set precisa de pelo menos " + targetPoints + " pontos com diferen\u00e7a m\u00ednima de 2.",
      400,
      "VOLLEYBALL_SET_NOT_COMPLETE"
    );
  }
  if (scoreDiff < 2) {
    throw new AppError(
      "Diferen\u00e7a m\u00ednima de 2 pontos necess\u00e1ria para encerrar o set.",
      400,
      "VOLLEYBALL_SET_MIN_DIFFERENCE"
    );
  }
}

function countSetWins(
  periods: Array<{ periodNumber: number; homeScore: number; awayScore: number }>,
  bestOfSets: number
) {
  const totalSets = Math.max(bestOfSets, 3);
  const needed = Math.floor(totalSets / 2) + 1;
  let homeWins = 0;
  let awayWins = 0;
  for (const period of periods) {
    if (period.homeScore > period.awayScore) homeWins += 1;
    else if (period.awayScore > period.homeScore) awayWins += 1;
  }
  return {
    homeWins,
    awayWins,
    decided: homeWins >= needed || awayWins >= needed
  };
}

export class MatchPeriodService {
  constructor(
    private readonly repository: MatchPeriodRepository,
    private readonly matches: MatchRepository,
    private readonly championships: ChampionshipService,
    private readonly matchService?: MatchService,
    private readonly audit?: MatchAuditService
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
        "Parciais ainda n\u00e3o est\u00e3o dispon\u00edveis para este esporte.",
        409,
        "MATCH_PERIODS_NOT_SUPPORTED"
      );
    }
    if (input.periodNumber > maxPeriods) {
      throw new AppError(
        "Este esporte permite no m\u00e1ximo " + maxPeriods + " per\u00edodos.",
        400,
        "INVALID_MATCH_PERIOD"
      );
    }
    validateVolleyballSet(championship, input.periodNumber, input.homeScore, input.awayScore);
    const match = await this.requireMatch(championshipId, matchId);
    if (match.status !== "SCHEDULED") {
      throw new AppError(
        "Reabra a partida antes de alterar as parciais.",
        409,
        "MATCH_PERIOD_REQUIRES_SCHEDULED_MATCH"
      );
    }
    await this.assertNoDecidedWinner(championship, matchId);
    const period = await this.repository.upsert({ matchId, ...input });
    await this.syncMatchOutcome(
      organizerId,
      championshipId,
      matchId,
      championship
    );
    return period;
  }

  async delete(
    organizerId: string,
    championshipId: string,
    matchId: string,
    periodNumber: number
  ) {
    const championship = await this.championships.getMine(
      organizerId,
      championshipId
    );
    const match = await this.requireMatch(championshipId, matchId);
    const isVolleyball = championship.sport === "V\u00f4lei";
    if (!isVolleyball && match.status !== "SCHEDULED") {
      throw new AppError(
        "Reabra a partida antes de alterar as parciais.",
        409,
        "MATCH_PERIOD_REQUIRES_SCHEDULED_MATCH"
      );
    }
    await this.repository.delete(matchId, periodNumber);
    await this.syncMatchOutcome(organizerId, championshipId, matchId, championship);
  }

  private async assertNoDecidedWinner(
    championship: { sport: string; bestOfSets: number },
    matchId: string
  ) {
    if (championship.sport !== "V\u00f4lei") return;
    const periods = await this.repository.list(matchId);
    const { decided } = countSetWins(periods, championship.bestOfSets);
    if (decided) {
      throw new AppError(
        "A partida j\u00e1 foi decidida pelos sets registrados. Reabra antes de alterar as parciais.",
        409,
        "VOLLEYBALL_MATCH_ALREADY_DECIDED"
      );
    }
  }

  private async syncMatchOutcome(
    organizerId: string,
    championshipId: string,
    matchId: string,
    championship: { sport: string; bestOfSets: number }
  ) {
    if (championship.sport !== "V\u00f4lei") return;
    const periods = await this.repository.list(matchId);
    const { homeWins, awayWins, decided } = countSetWins(
      periods,
      championship.bestOfSets
    );

    if (decided) {
      if (this.matchService) {
        return this.matchService.recordScore(
          organizerId,
          championshipId,
          matchId,
          homeWins,
          awayWins
        );
      }
      return this.matches.updateScore(matchId, homeWins, awayWins);
    }

    if (this.matchService) {
      await this.matchService.changeMatchStatus(
        organizerId,
        championshipId,
        matchId,
        "REOPEN"
      );
      return this.matches.findById(matchId);
    }
    return this.matches.updateStatus(matchId, "SCHEDULED", true);
  }

  private async requireMatch(championshipId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match || match.championshipId !== championshipId) {
      throw new AppError("Partida n\u00e3o encontrada.", 404, "MATCH_NOT_FOUND");
    }
    return match;
  }
}