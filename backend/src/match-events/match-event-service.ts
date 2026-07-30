import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchRepository } from "../matches/match-repository.js";
import type {
  MatchEventType,
  MatchEventRepository
} from "./match-event-repository.js";
import type { MatchAuditService } from "../match-audit/match-audit-service.js";

const eventRules: Record<string, Partial<Record<MatchEventType, number>>> = {
  Futebol: {
    GOAL: 1,
    OWN_GOAL: 1,
    YELLOW_CARD: 1,
    RED_CARD: 1
  },
  Futsal: {
    GOAL: 1,
    OWN_GOAL: 1,
    YELLOW_CARD: 1,
    RED_CARD: 1
  },
  Basquete: {
    FREE_THROW: 1,
    TWO_POINT_SHOT: 2,
    THREE_POINT_SHOT: 3
  },
  "Vôlei": {
    VOLLEYBALL_POINT: 1,
    ACE: 1,
    BLOCK: 1
  }
};

export type AddMatchEventInput = {
  entryId: string;
  teamMemberId: string | null;
  type: MatchEventType;
  periodNumber: number | null;
  clockSeconds: number | null;
  notes: string | null;
};

export type PlayerStatistic = {
  teamMemberId: string | null;
  entryId: string;
  actorName: string;
  goals: number;
  points: number;
  aces: number;
  blocks: number;
  yellowCards: number;
  redCards: number;
  events: number;
};

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
    const statistics = new Map<string, PlayerStatistic>();

    for (const event of events) {
      if (!event.actorName) continue;
      const key = event.teamMemberId ?? `${event.entryId}:${event.actorName}`;
      const statistic = statistics.get(key) ?? {
        teamMemberId: event.teamMemberId,
        entryId: event.entryId,
        actorName: event.actorName,
        goals: 0,
        points: 0,
        aces: 0,
        blocks: 0,
        yellowCards: 0,
        redCards: 0,
        events: 0
      };
      statistic.events += 1;
      if (event.type === "GOAL") statistic.goals += 1;
      if (
        event.type === "FREE_THROW" ||
        event.type === "TWO_POINT_SHOT" ||
        event.type === "THREE_POINT_SHOT" ||
        event.type === "VOLLEYBALL_POINT" ||
        event.type === "ACE" ||
        event.type === "BLOCK"
      ) statistic.points += event.value;
      if (event.type === "ACE") statistic.aces += 1;
      if (event.type === "BLOCK") statistic.blocks += 1;
      if (event.type === "YELLOW_CARD") statistic.yellowCards += 1;
      if (event.type === "RED_CARD") statistic.redCards += 1;
      statistics.set(key, statistic);
    }

    return [...statistics.values()].sort((a, b) =>
      primaryMetric(b, sport) - primaryMetric(a, sport) ||
      b.events - a.events ||
      a.actorName.localeCompare(b.actorName, "pt-BR")
    );
  }

  async playerStats(
    championshipId: string,
    memberId: string
  ): Promise<PlayerStatistic | null> {
    const events = await this.repository.listByChampionship(championshipId);
    const playerEvents = events.filter((e) => e.teamMemberId === memberId && e.actorName);
    if (!playerEvents.length) return null;
    const stat: PlayerStatistic = {
      teamMemberId: memberId,
      entryId: playerEvents[0]!.entryId,
      actorName: playerEvents[0]!.actorName ?? "",
      goals: 0, points: 0, aces: 0, blocks: 0,
      yellowCards: 0, redCards: 0, events: 0
    };
    for (const e of playerEvents) {
      stat.events += 1;
      if (e.type === "GOAL") stat.goals += 1;
      if (["FREE_THROW","TWO_POINT_SHOT","THREE_POINT_SHOT","VOLLEYBALL_POINT","ACE","BLOCK"].includes(e.type)) stat.points += e.value;
      if (e.type === "ACE") stat.aces += 1;
      if (e.type === "BLOCK") stat.blocks += 1;
      if (e.type === "YELLOW_CARD") stat.yellowCards += 1;
      if (e.type === "RED_CARD") stat.redCards += 1;
    }
    return stat;
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

    const match = await this.requireEditableMatch(championshipId, matchId);

    const eventValue = rules[input.type];
    if (eventValue === undefined) {
      throw new AppError(
        "Esse tipo de evento não é aceito para o esporte da arena.",
        400,
        "INVALID_MATCH_EVENT_TYPE"
      );
    }

    const entry = await this.repository.findEntry(input.entryId);
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

    let actorName: string | null = null;
    if (input.teamMemberId) {
      const member = await this.repository.findTeamMember(input.teamMemberId);
      if (!member || !entry.teamId || member.teamId !== entry.teamId) {
        throw new AppError(
          "O jogador não pertence à equipe selecionada.",
          400,
          "EVENT_MEMBER_NOT_IN_ENTRY"
        );
      }
      actorName = member.displayName;
    }

    const event = await this.repository.create({
      matchId,
      entryId: input.entryId,
      teamMemberId: input.teamMemberId,
      actorName,
      type: input.type,
      value: eventValue,
      periodNumber: input.periodNumber,
      clockSeconds: input.clockSeconds,
      notes: input.notes
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
    const championship = await this.championships.getMine(
      organizerId,
      championshipId
    );
    const rules = this.requireSupportedSport(championship.sport);
    const match = await this.requireEditableMatch(championshipId, matchId);
    const eventValue = rules[input.type];
    if (eventValue === undefined) {
      throw new AppError(
        "Esse tipo de evento não é aceito para o esporte da arena.",
        400,
        "INVALID_MATCH_EVENT_TYPE"
      );
    }
    const entry = await this.repository.findEntry(input.entryId);
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
    let actorName: string | null = null;
    if (input.teamMemberId) {
      const member = await this.repository.findTeamMember(input.teamMemberId);
      if (!member || !entry.teamId || member.teamId !== entry.teamId) {
        throw new AppError(
          "O jogador não pertence à equipe selecionada.",
          400,
          "EVENT_MEMBER_NOT_IN_ENTRY"
        );
      }
      actorName = member.displayName;
    }
    return {
      matchId,
      entryId: input.entryId,
      teamMemberId: input.teamMemberId,
      actorName,
      type: input.type,
      value: eventValue,
      periodNumber: input.periodNumber,
      clockSeconds: input.clockSeconds,
      notes: input.notes
    };
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

function primaryMetric(statistic: PlayerStatistic, sport: string) {
  if (sport === "Futebol" || sport === "Futsal") return statistic.goals;
  return statistic.points;
}
