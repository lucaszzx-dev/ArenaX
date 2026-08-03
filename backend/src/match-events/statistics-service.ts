import type { Championship } from "../championships/championship-repository.js";
import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchRepository } from "../matches/match-repository.js";
import type { MatchEventRepository } from "./match-event-repository.js";
import { isCountedMatch } from "./stats-calculators.js";
import {
  computeClubStandings,
  computeHeadToHead,
  computeHighlights,
  computePlayerStatistics,
  paginate,
  type ClubStandingRow,
  type HeadToHeadRow,
  type Highlight,
  type Page,
  type PlayerStatistic
} from "./statistics-engine.js";

export type StatisticsFilters = {
  sport?: string | undefined;
  teamId?: string | undefined;
  playerId?: string | undefined;
};

export type RankingKind = "scorer" | "aces" | "blocks" | "points";

const rankingKindToLabel: Record<RankingKind, string> = {
  scorer: "Artilheiro",
  aces: "Líder de aces",
  blocks: "Líder de bloqueios",
  points: "Líder em pontos"
};

export class StatisticsService {
  constructor(
    private readonly repository: MatchEventRepository,
    private readonly matches: MatchRepository,
    private readonly championships: ChampionshipService
  ) {}

  async statistics(
    championshipId: string,
    filters: StatisticsFilters = {},
    page = 1,
    limit = 20,
    ownerId?: string
  ): Promise<Page<PlayerStatistic>> {
    const championship = await this.requireChampionship(championshipId, ownerId);
    const [events, entries, matches] = await Promise.all([
      this.repository.listByChampionship(championshipId),
      this.matches.listEntries(championshipId),
      this.matches.listByChampionship(championshipId)
    ]);
    const sport = filters.sport ?? championship.sport;
    const countedMatchIds = new Set(
      matches
        .filter((match) => isCountedMatch(match))
        .map((match) => match.id)
    );
    let rows = computePlayerStatistics(
      events.filter((event) => countedMatchIds.has(event.matchId)),
      sport
    );
    if (filters.teamId) {
      rows = rows.filter((row) =>
        entries.some(
          (entry) => entry.id === row.entryId && entry.teamId === filters.teamId
        )
      );
    }
    if (filters.playerId) {
      rows = rows.filter((row) => row.teamMemberId === filters.playerId);
    }
    return paginate(rows, page, limit);
  }

  async clubStandings(
    championshipId: string,
    filters: StatisticsFilters = {},
    ownerId?: string
  ): Promise<ClubStandingRow[]> {
    const championship = await this.requireChampionship(championshipId, ownerId);
    const [entries, matches] = await Promise.all([
      this.matches.listEntries(championshipId),
      this.matches.listByChampionship(championshipId)
    ]);
    let rows = computeClubStandings(matches, entries, championship);
    if (filters.teamId) {
      rows = rows.filter((row) => row.teamId === filters.teamId);
    }
    return rows;
  }

  async streakStats(
    championshipId: string,
    filters: StatisticsFilters = {},
    ownerId?: string
  ): Promise<ClubStandingRow[]> {
    return this.clubStandings(championshipId, filters, ownerId);
  }

  async headToHead(
    championshipId: string,
    entryAId: string,
    entryBId: string,
    ownerId?: string
  ): Promise<HeadToHeadRow[]> {
    await this.requireChampionship(championshipId, ownerId);
    const [entries, matches] = await Promise.all([
      this.matches.listEntries(championshipId),
      this.matches.listByChampionship(championshipId)
    ]);
    return computeHeadToHead(matches, entries, entryAId, entryBId);
  }

  async highlights(
    championshipId: string,
    filters: StatisticsFilters = {},
    ownerId?: string
  ): Promise<Highlight[]> {
    const championship = await this.requireChampionship(championshipId, ownerId);
    const [events, entries, matches] = await Promise.all([
      this.repository.listByChampionship(championshipId),
      this.matches.listEntries(championshipId),
      this.matches.listByChampionship(championshipId)
    ]);
    const sport = filters.sport ?? championship.sport;
    const countedMatchIds = new Set(
      matches
        .filter((match) => isCountedMatch(match))
        .map((match) => match.id)
    );
    let rows = computePlayerStatistics(
      events.filter((event) => countedMatchIds.has(event.matchId)),
      sport
    );
    if (filters.teamId) {
      rows = rows.filter((row) =>
        entries.some(
          (entry) => entry.id === row.entryId && entry.teamId === filters.teamId
        )
      );
    }
    if (filters.playerId) {
      rows = rows.filter((row) => row.teamMemberId === filters.playerId);
    }
    return computeHighlights(rows, sport);
  }

  async ranking(
    championshipId: string,
    kind: RankingKind,
    filters: StatisticsFilters = {},
    page = 1,
    limit = 20,
    ownerId?: string
  ): Promise<Page<PlayerStatistic>> {
    const championship = await this.requireChampionship(championshipId, ownerId);
    const [events, entries, matches] = await Promise.all([
      this.repository.listByChampionship(championshipId),
      this.matches.listEntries(championshipId),
      this.matches.listByChampionship(championshipId)
    ]);
    const sport = filters.sport ?? championship.sport;
    const countedMatchIds = new Set(
      matches
        .filter((match) => isCountedMatch(match))
        .map((match) => match.id)
    );
    let rows = computePlayerStatistics(
      events.filter((event) => countedMatchIds.has(event.matchId)),
      sport
    );
    if (filters.teamId) {
      rows = rows.filter((row) =>
        entries.some(
          (entry) => entry.id === row.entryId && entry.teamId === filters.teamId
        )
      );
    }
    if (filters.playerId) {
      rows = rows.filter((row) => row.teamMemberId === filters.playerId);
    }
    const metric = (row: PlayerStatistic) =>
      kind === "scorer" ? row.goals :
      kind === "aces" ? row.aces :
      kind === "blocks" ? row.blocks : row.points;
    rows = rows
      .filter((row) => metric(row) > 0)
      .sort(
        (a, b) =>
          metric(b) - metric(a) ||
          a.actorName.localeCompare(b.actorName, "pt-BR")
      );
    return paginate(rows, page, limit);
  }

  rankingLabel(kind: RankingKind): string {
    return rankingKindToLabel[kind];
  }

  private async requireChampionship(
    championshipId: string,
    ownerId?: string
  ): Promise<Championship> {
    const championship = ownerId
      ? await this.championships.getMine(ownerId, championshipId)
      : await this.championships.getChampionshipById(championshipId);
    if (!championship) {
      throw new AppError(
        "Campeonato não encontrado.",
        404,
        "CHAMPIONSHIP_NOT_FOUND"
      );
    }
    return championship;
  }
}


