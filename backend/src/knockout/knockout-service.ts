import type { ChampionshipService } from "../championships/championship-service.js";
import type { NotificationService } from "../notifications/notification-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchRepository } from "../matches/match-repository.js";
import type {
  KnockoutRepository,
  SaveKnockoutNode
} from "./knockout-repository.js";

export class KnockoutService {
  constructor(
    private readonly repository: KnockoutRepository,
    private readonly matches: MatchRepository,
    private readonly championships: ChampionshipService,
    private readonly notifications?: NotificationService
  ) {}

  async getMine(organizerId: string, championshipId: string) {
    const championship = await this.championships.getMine(organizerId, championshipId);
    return this.getBracket(championship.id);
  }

  async getPublic(slug: string) {
    const championship = await this.championships.getPublic(slug);
    return this.getBracket(championship.id);
  }

  async generate(organizerId: string, championshipId: string, thirdPlace?: boolean) {
    const championship = await this.championships.getMine(organizerId, championshipId);
    if (championship.format !== "KNOCKOUT") {
      throw new AppError(
        "Esta competição não utiliza o formato mata-mata.",
        409,
        "CHAMPIONSHIP_IS_NOT_KNOCKOUT"
      );
    }
    if (championship.status !== "DRAFT") {
      throw new AppError(
        "O chaveamento só pode ser gerado enquanto a competição é rascunho.",
        409,
        "BRACKET_REQUIRES_DRAFT"
      );
    }
    const [entries, matches, nodes] = await Promise.all([
      this.matches.listEntries(championshipId),
      this.matches.listByChampionship(championshipId),
      this.repository.list(championshipId)
    ]);
    if (entries.length < 2) {
      throw new AppError(
        "Cadastre pelo menos dois participantes antes de gerar o chaveamento.",
        409,
        "BRACKET_NEEDS_ENTRIES"
      );
    }
    if (matches.length || nodes.length) {
      throw new AppError(
        "O calendário e o chaveamento precisam estar vazios para a geração.",
        409,
        "BRACKET_ALREADY_GENERATED"
      );
    }

    const bracketSize = nextPowerOfTwo(entries.length);
    const totalRounds = Math.log2(bracketSize);
    const firstRoundGames = bracketSize / 2;
    const byes = bracketSize - entries.length;
    const nodesToSave: SaveKnockoutNode[] = [];
    let entryIndex = 0;

    for (let position = 1; position <= firstRoundGames; position += 1) {
      const homeEntryId = entries[entryIndex]?.id ?? null;
      entryIndex += 1;
      const awayEntryId = position <= byes
        ? null
        : entries[entryIndex]?.id ?? null;
      if (position > byes) entryIndex += 1;
      nodesToSave.push({ roundNumber: 1, position, homeEntryId, awayEntryId });
    }
    for (let round = 2; round <= totalRounds; round += 1) {
      const games = bracketSize / 2 ** round;
      for (let position = 1; position <= games; position += 1) {
        nodesToSave.push({
          roundNumber: round,
          position,
          homeEntryId: null,
          awayEntryId: null
        });
      }
    }

    for (const node of nodesToSave.filter((item) => item.roundNumber === 1)) {
      const automaticWinner = node.homeEntryId && !node.awayEntryId
        ? node.homeEntryId
        : node.awayEntryId && !node.homeEntryId
          ? node.awayEntryId
          : null;
      if (!automaticWinner || totalRounds === 1) continue;
      const next = nodesToSave.find((item) =>
        item.roundNumber === 2 && item.position === Math.ceil(node.position / 2)
      );
      if (!next) continue;
      if (node.position % 2 === 1) next.homeEntryId = automaticWinner;
      else next.awayEntryId = automaticWinner;
    }

    const hasThirdPlace = thirdPlace ?? true;
    if (hasThirdPlace && totalRounds >= 2) {
      nodesToSave.push({
        roundNumber: totalRounds + 1,
        position: 2,
        homeEntryId: null,
        awayEntryId: null
      });
    }

    const created = await this.repository.createBracket(
      championshipId,
      nodesToSave
    );
    return {
      nodes: created,
      totalRounds: hasThirdPlace && totalRounds >= 2 ? totalRounds + 1 : totalRounds,
      bracketSize,
      byes
    };
  }

  async advanceWinner(
    organizerId: string,
    matchId: string,
    winnerEntryId: string
  ) {
    await this.repository.advanceWinner(matchId, winnerEntryId);
    await this.notifyAdvance(organizerId, matchId, winnerEntryId, "NEXT_ROUND");
  }

  async advanceLoser(
    organizerId: string,
    matchId: string,
    loserEntryId: string
  ) {
    await this.repository.advanceLoser(matchId, loserEntryId);
    await this.notifyAdvance(organizerId, matchId, loserEntryId, "THIRD_PLACE");
  }

  private async notifyAdvance(
    organizerId: string,
    matchId: string,
    entryId: string,
    phase: "NEXT_ROUND" | "THIRD_PLACE"
  ) {
    if (!this.notifications) return;
    const match = await this.matches.findById(matchId);
    const championship = match
      ? await this.championships.getChampionshipById(match.championshipId)
      : null;
    if (!match || !championship) return;
    await this.notifications.notifyKnockoutAdvance(
      organizerId,
      championship,
      match,
      entryId,
      phase
    );
  }

  async getChampion(organizerId: string, championshipId: string) {
    await this.championships.getMine(organizerId, championshipId);
    const bracket = await this.getBracket(championshipId);
    const maxRound = Math.max(...bracket.nodes.map((n) => n.roundNumber));
    const finalNode = bracket.nodes.find((n) =>
      n.roundNumber === (bracket.nodes.some((x) => x.roundNumber === maxRound && x.position === 2) ? maxRound - 1 : maxRound)
    );
    const finalMatch = bracket.matches.find((m) => m.id === finalNode?.matchId);
    if (!finalMatch || finalMatch.status !== "FINISHED" ||
        finalMatch.homeScore === null || finalMatch.awayScore === null) {
      return null;
    }
    return finalMatch.homeScore > finalMatch.awayScore
      ? finalMatch.homeEntryId
      : finalMatch.awayEntryId;
  }

  prepareReopen(matchId: string) {
    return this.repository.prepareReopen(matchId);
  }

  private async getBracket(championshipId: string) {
    const [nodes, entries, matches] = await Promise.all([
      this.repository.list(championshipId),
      this.matches.listEntries(championshipId),
      this.matches.listByChampionship(championshipId)
    ]);
    return { nodes, entries, matches };
  }
}

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(value));
}
