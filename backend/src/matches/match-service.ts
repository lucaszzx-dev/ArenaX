import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type {
  CreateMatchInput,
  Match,
  MatchRepository
} from "./match-repository.js";

export type ScheduleMatchInput = Omit<CreateMatchInput, "championshipId">;

export class MatchService {
  constructor(
    private readonly repository: MatchRepository,
    private readonly championships: ChampionshipService
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
}
