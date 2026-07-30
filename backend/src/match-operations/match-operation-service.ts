import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchAuditService } from "../match-audit/match-audit-service.js";
import type { MatchRepository } from "../matches/match-repository.js";
import type {
  LineupRole,
  MatchMetadata,
  MatchOperationRepository
} from "./match-operation-repository.js";

export class MatchOperationService {
  constructor(
    private readonly repository: MatchOperationRepository,
    private readonly matches: MatchRepository,
    private readonly championships: ChampionshipService,
    private readonly audit?: MatchAuditService
  ) {}

  async getMine(organizerId: string, championshipId: string, matchId: string) {
    await this.championships.getMine(organizerId, championshipId);
    await this.requireMatch(championshipId, matchId);
    return this.getDetails(matchId);
  }

  async getPublic(championshipId: string, matchId: string) {
    await this.requireMatch(championshipId, matchId);
    return this.getDetails(matchId);
  }

  async updateMetadata(
    organizerId: string,
    championshipId: string,
    matchId: string,
    input: MatchMetadata
  ) {
    await this.championships.getMine(organizerId, championshipId);
    await this.requireMatch(championshipId, matchId);
    const before = await this.repository.getMetadata(matchId);
    const metadata = await this.repository.updateMetadata(matchId, input);
    await this.audit?.record(organizerId, matchId, "MATCH_METADATA_CHANGED", {
      before,
      after: metadata
    });
    return metadata;
  }

  async replaceLineup(
    organizerId: string,
    championshipId: string,
    matchId: string,
    entryId: string,
    players: Array<{ teamMemberId: string; role: LineupRole }>
  ) {
    await this.championships.getMine(organizerId, championshipId);
    const match = await this.requireMatch(championshipId, matchId);
    if (match.status !== "SCHEDULED") {
      throw new AppError(
        "Reabra a partida antes de alterar a escalação.",
        409,
        "LINEUP_REQUIRES_SCHEDULED_MATCH"
      );
    }
    if (entryId !== match.homeEntryId && entryId !== match.awayEntryId) {
      throw new AppError(
        "A equipe não participa desta partida.",
        400,
        "LINEUP_ENTRY_NOT_IN_MATCH"
      );
    }
    if (new Set(players.map((player) => player.teamMemberId)).size !== players.length) {
      throw new AppError(
        "Um jogador não pode aparecer duas vezes na escalação.",
        400,
        "DUPLICATE_LINEUP_MEMBER"
      );
    }
    const teamId = await this.repository.findEntryTeam(entryId);
    if (!teamId) {
      throw new AppError(
        "Escalações estão disponíveis apenas para equipes com elenco.",
        409,
        "LINEUP_REQUIRES_TEAM"
      );
    }
    const validMembers = new Set(await this.repository.listValidMemberIds(teamId));
    if (players.some((player) => !validMembers.has(player.teamMemberId))) {
      throw new AppError(
        "Um dos jogadores não pertence à equipe.",
        400,
        "LINEUP_MEMBER_NOT_IN_TEAM"
      );
    }
    const before = await this.repository.listLineup(matchId);
    const lineup = await this.repository.replaceLineup(matchId, entryId, players);
    await this.audit?.record(organizerId, matchId, "MATCH_LINEUP_CHANGED", {
      entryId,
      before: before.filter((item) => item.entryId === entryId),
      after: lineup.filter((item) => item.entryId === entryId)
    });
    return lineup;
  }

  private async getDetails(matchId: string) {
    const [metadata, lineup] = await Promise.all([
      this.repository.getMetadata(matchId),
      this.repository.listLineup(matchId)
    ]);
    if (!metadata) throw new AppError("Partida não encontrada.", 404, "MATCH_NOT_FOUND");
    return { metadata, lineup };
  }

  private async requireMatch(championshipId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match || match.championshipId !== championshipId) {
      throw new AppError("Partida não encontrada.", 404, "MATCH_NOT_FOUND");
    }
    return match;
  }
}
