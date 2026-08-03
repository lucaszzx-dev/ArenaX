import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchRepository } from "../matches/match-repository.js";
import type {
  MatchEventType,
  MatchEventRepository
} from "./match-event-repository.js";
import type { MatchAuditService } from "../match-audit/match-audit-service.js";
import { eventRules } from "./event-rules.js";
import {
  computePlayerStatistics,
  computePlayerStatisticsForMember,
  type PlayerStatistic
} from "./statistics-engine.js";

export type AddMatchEventInput = {
  entryId: string;
  teamMemberId: string | null;
  type: MatchEventType;
  periodNumber: number | null;
  clockSeconds: number | null;
  notes: string | null;
  relatedEventId?: string | null;
};
export type { PlayerStatistic };

export class MatchEventService {
  constructor(
    private readonly repository: MatchEventRepository,
    private readonly matches: MatchRepository,
    private readonly championships: ChampionshipService,
    private readonly audit?: MatchAuditService
  ) {}

  async list(
    organizerId: string,
    championshipId: string,
    matchId: string
  ) {
    await this.championships.getMine(organizerId, championshipId);
    await this.requireMatch(championshipId, matchId);
    return this.repository.list(matchId);
  }

  async listPublic(championshipId: string, matchId: string) {
    await this.requireMatch(championshipId, matchId);
    return this.repository.list(matchId);
  }

  async statisticsPublic(
    championshipId: string,
    sport: string
  ): Promise<PlayerStatistic[]> {
    const events = await this.repository.listByChampionship(championshipId);
    return computePlayerStatistics(events, sport);
  }

  async playerStats(
    championshipId: string,
    memberId: string
  ): Promise<PlayerStatistic | null> {
    const events = await this.repository.listByChampionship(championshipId);
    return computePlayerStatisticsForMember(events, memberId);
  }

  async create(
    organizerId: string,
    championshipId: string,
    matchId: string,
    input: AddMatchEventInput
  ) {
    const championship = await this.championships.getMine(
      organizerId,
      championshipId
    );
    const rules = this.requireSupportedSport(championship.sport);

    await this.requireEditableMatch(championshipId, matchId);

    const eventValue = rules[input.type];
    if (eventValue === undefined) {
      throw new AppError(
        "Esse tipo de evento não é aceito para o esporte da competição.",
        400,
        "INVALID_MATCH_EVENT_TYPE"
      );
    }

    const entry = await this.validateEntry(input.entryId, championshipId, matchId);
    const actorName = await this.validateTeamMember(input.teamMemberId, entry);

    await this.validateAssist(input, matchId);

    const event = await this.repository.create({
      matchId,
      entryId: input.entryId,
      teamMemberId: input.teamMemberId,
      actorName,
      type: input.type,
      value: eventValue,
      periodNumber: input.periodNumber,
      clockSeconds: input.clockSeconds,
      notes: input.notes,
      relatedEventId: input.relatedEventId ?? null
    });
    await this.audit?.record(organizerId, matchId, "MATCH_EVENT_CREATED", {
      event
    });
    return event;
  }

  async update(
    organizerId: string,
    championshipId: string,
    matchId: string,
    eventId: string,
    input: AddMatchEventInput
  ) {
    const existing = await this.repository.findById(eventId);
    if (!existing || existing.matchId !== matchId) {
      throw new AppError("Evento não encontrado.", 404, "MATCH_EVENT_NOT_FOUND");
    }
    const replacement = await this.validateEvent(
      organizerId,
      championshipId,
      matchId,
      input
    );
    const event = await this.repository.update(eventId, replacement);
    await this.audit?.record(organizerId, matchId, "MATCH_EVENT_CHANGED", {
      before: existing,
      after: event
    });
    return event;
  }

  async delete(
    organizerId: string,
    championshipId: string,
    matchId: string,
    eventId: string
  ) {
    await this.championships.getMine(organizerId, championshipId);
    await this.requireEditableMatch(championshipId, matchId);

    const event = await this.repository.findById(eventId);
    if (!event || event.matchId !== matchId) {
      throw new AppError(
        "Evento não encontrado.",
        404,
        "MATCH_EVENT_NOT_FOUND"
      );
    }

    await this.repository.delete(eventId);
    await this.audit?.record(organizerId, matchId, "MATCH_EVENT_DELETED", {
      event
    });
  }

  private async validateEvent(
    organizerId: string,
    championshipId: string,
    matchId: string,
    input: AddMatchEventInput
  ) {
    await this.championships.getMine(organizerId, championshipId);
    const championship = await this.championships.getChampionshipById(championshipId);
    const rules = this.requireSupportedSport(championship?.sport ?? "");
    const eventValue = rules[input.type];
    if (eventValue === undefined) {
      throw new AppError(
        "Esse tipo de evento não é aceito para o esporte da competição.",
        400,
        "INVALID_MATCH_EVENT_TYPE"
      );
    }
    const entry = await this.validateEntry(input.entryId, championshipId, matchId);
    const actorName = await this.validateTeamMember(input.teamMemberId, entry);
    await this.validateAssist(input, matchId);
    return {
      matchId,
      entryId: input.entryId,
      teamMemberId: input.teamMemberId,
      actorName,
      type: input.type,
      value: eventValue,
      periodNumber: input.periodNumber,
      clockSeconds: input.clockSeconds,
      notes: input.notes,
      relatedEventId: input.relatedEventId ?? null
    };
  }

  async suspendedPlayers(championshipId: string, entryId: string) {
    const championship = await this.championships.getChampionshipById(championshipId);
    if (!championship || !championship.maxYellowCards) return [];
    const events = await this.repository.listByChampionship(championshipId);
    const cards = new Map<string, { yellowCount: number; hasRed: boolean }>();
    for (const event of events) {
      if (event.entryId !== entryId || !event.teamMemberId) continue;
      if (event.type === "YELLOW_CARD") {
        const record = cards.get(event.teamMemberId) ?? { yellowCount: 0, hasRed: false };
        record.yellowCount += 1;
        cards.set(event.teamMemberId, record);
      }
      if (event.type === "RED_CARD") {
        const record = cards.get(event.teamMemberId) ?? { yellowCount: 0, hasRed: true };
        record.hasRed = true;
        cards.set(event.teamMemberId, record);
      }
    }
    const suspended: string[] = [];
    for (const [memberId, record] of cards) {
      if (record.hasRed || (championship.maxYellowCards > 0 && record.yellowCount >= championship.maxYellowCards)) {
        suspended.push(memberId);
      }
    }
    return suspended;
  }

  private async validateAssist(input: AddMatchEventInput, matchId: string) {
    if (input.type !== "ASSIST") return;
    if (!input.relatedEventId) {
      throw new AppError(
        "Assistência deve estar vinculada a um gol.",
        400,
        "ASSIST_REQUIRES_RELATED_GOAL"
      );
    }
    const targetEvent = await this.repository.findById(input.relatedEventId);
    if (!targetEvent || targetEvent.matchId !== matchId || targetEvent.type !== "GOAL") {
      throw new AppError(
        "Assistência deve estar vinculada a um gol válido da mesma partida.",
        400,
        "ASSIST_REQUIRES_RELATED_GOAL"
      );
    }
    if (targetEvent.entryId !== input.entryId) {
      throw new AppError(
        "Assistência deve ser da mesma equipe do gol.",
        400,
        "ASSIST_MUST_BE_SAME_TEAM"
      );
    }
  }

  private async validateEntry(
    entryId: string,
    championshipId: string,
    matchId: string
  ) {
    const match = await this.requireMatch(championshipId, matchId);
    const entry = await this.repository.findEntry(entryId);
    if (
      !entry ||
      entry.championshipId !== championshipId ||
      (entry.id !== match.homeEntryId && entry.id !== match.awayEntryId)
    ) {
      throw new AppError(
        "A equipe do evento não participa desta partida.",
        400,
        "EVENT_ENTRY_NOT_IN_MATCH"
      );
    }
    return entry;
  }

  private async validateTeamMember(
    teamMemberId: string | null,
    entry: { teamId: string | null }
  ): Promise<string | null> {
    if (!teamMemberId) return null;
    const member = await this.repository.findTeamMember(teamMemberId);
    if (!member || !entry.teamId || member.teamId !== entry.teamId) {
      throw new AppError(
        "O jogador não pertence à equipe selecionada.",
        400,
        "EVENT_MEMBER_NOT_IN_ENTRY"
      );
    }
    return member.displayName;
  }
  private requireSupportedSport(sport: string) {
    const rules = eventRules[sport];
    if (!rules) {
      throw new AppError(
        "A súmula detalhada ainda não está disponível para este esporte.",
        409,
        "MATCH_EVENTS_NOT_SUPPORTED_FOR_SPORT"
      );
    }
    return rules;
  }

  private async requireMatch(championshipId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match || match.championshipId !== championshipId) {
      throw new AppError("Partida não encontrada.", 404, "MATCH_NOT_FOUND");
    }
    return match;
  }

  private async requireEditableMatch(
    championshipId: string,
    matchId: string
  ) {
    const match = await this.requireMatch(championshipId, matchId);
    if (match.status !== "SCHEDULED") {
      throw new AppError(
        "Reabra a partida antes de alterar a súmula.",
        409,
        "MATCH_EVENT_REQUIRES_SCHEDULED_MATCH"
      );
    }
    return match;
  }
}
