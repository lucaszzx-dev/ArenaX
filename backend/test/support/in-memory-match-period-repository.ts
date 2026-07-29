import type {
  MatchPeriod,
  MatchPeriodRepository
} from "../../src/match-periods/match-period-repository.js";

export class InMemoryMatchPeriodRepository implements MatchPeriodRepository {
  readonly periods: MatchPeriod[] = [];

  async list(matchId: string) {
    return this.periods
      .filter((period) => period.matchId === matchId)
      .sort((a, b) => a.periodNumber - b.periodNumber);
  }

  async upsert(
    input: Omit<MatchPeriod, "id" | "createdAt" | "updatedAt">
  ) {
    const current = this.periods.find(
      (period) =>
        period.matchId === input.matchId &&
        period.periodNumber === input.periodNumber
    );
    if (current) {
      Object.assign(current, input, { updatedAt: new Date() });
      return current;
    }
    const now = new Date();
    const period = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    this.periods.push(period);
    return period;
  }

  async delete(matchId: string, periodNumber: number) {
    const index = this.periods.findIndex(
      (period) =>
        period.matchId === matchId && period.periodNumber === periodNumber
    );
    if (index < 0) return false;
    this.periods.splice(index, 1);
    return true;
  }
}
