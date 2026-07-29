import { AppError } from "../../src/errors/app-error.js";
import type {
  KnockoutNode,
  KnockoutRepository,
  SaveKnockoutNode
} from "../../src/knockout/knockout-repository.js";
import type { InMemoryMatchRepository } from "./in-memory-match-repository.js";

export class InMemoryKnockoutRepository implements KnockoutRepository {
  readonly nodes: KnockoutNode[] = [];

  constructor(private readonly matches: InMemoryMatchRepository) {}

  async list(championshipId: string) {
    return this.nodes
      .filter((node) => node.championshipId === championshipId)
      .sort((a, b) => a.roundNumber - b.roundNumber || a.position - b.position);
  }

  async createBracket(championshipId: string, inputs: SaveKnockoutNode[]) {
    for (const input of inputs) {
      const now = new Date();
      const node: KnockoutNode = {
        id: crypto.randomUUID(),
        championshipId,
        ...input,
        matchId: null,
        createdAt: now,
        updatedAt: now
      };
      if (node.homeEntryId && node.awayEntryId) {
        const match = await this.matches.create({
          championshipId,
          homeEntryId: node.homeEntryId,
          awayEntryId: node.awayEntryId,
          scheduledAt: null,
          roundNumber: node.roundNumber,
          generated: true
        });
        node.matchId = match.id;
      }
      this.nodes.push(node);
    }
    return this.list(championshipId);
  }

  async advanceWinner(matchId: string, winnerEntryId: string) {
    const source = this.nodes.find((node) => node.matchId === matchId);
    if (!source) return;
    const next = this.nodes.find((node) =>
      node.championshipId === source.championshipId &&
      node.roundNumber === source.roundNumber + 1 &&
      node.position === Math.ceil(source.position / 2)
    );
    if (!next) return;
    if (source.position % 2 === 1) next.homeEntryId = winnerEntryId;
    else next.awayEntryId = winnerEntryId;
    if (!next.matchId && next.homeEntryId && next.awayEntryId) {
      const match = await this.matches.create({
        championshipId: next.championshipId,
        homeEntryId: next.homeEntryId,
        awayEntryId: next.awayEntryId,
        scheduledAt: null,
        roundNumber: next.roundNumber,
        generated: true
      });
      next.matchId = match.id;
    }
  }

  async prepareReopen(matchId: string) {
    const source = this.nodes.find((node) => node.matchId === matchId);
    if (!source) return;
    const next = this.nodes.find((node) =>
      node.championshipId === source.championshipId &&
      node.roundNumber === source.roundNumber + 1 &&
      node.position === Math.ceil(source.position / 2)
    );
    if (!next) return;
    if (next.matchId) {
      throw new AppError(
        "Não é possível reabrir: a partida da fase seguinte já foi formada.",
        409,
        "NEXT_KNOCKOUT_MATCH_ALREADY_CREATED"
      );
    }
    if (source.position % 2 === 1) next.homeEntryId = null;
    else next.awayEntryId = null;
  }
}
