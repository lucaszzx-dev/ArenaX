import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchRepository } from "../matches/match-repository.js";
import type {
  MatchEventType,
  MatchEventRepository
} from "./match-event-repository.js";

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

export class MatchEventService {
  constructor(
    private readonly repository: MatchEventRepository,
    private readonly matches: MatchRepository,
    private readonly championships: ChampionshipService
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

    return this.repository.create({
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
