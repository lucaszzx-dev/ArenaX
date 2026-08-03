import type { ChampionshipService } from "../championships/championship-service.js";
import type { Championship } from "../championships/championship-repository.js";
import type { Match } from "../matches/match-repository.js";
import { AppError } from "../errors/app-error.js";
import type {
  NewNotification,
  NotificationPage,
  NotificationRepository,
  UpcomingMatchRow
} from "./notification-repository.js";

const DEFAULT_UPCOMING_WINDOW_MS = 24 * 60 * 60 * 1000;

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly championships: ChampionshipService
  ) {}

  async list(userId: string, page = 1, limit = 20): Promise<NotificationPage> {
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
    const result = await this.repository.listByUser(
      userId,
      safePage,
      safeLimit
    );
    return {
      ...result,
      page: safePage,
      limit: safeLimit
    };
  }

  async unreadCount(userId: string) {
    return this.repository.countUnread(userId);
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.repository.markRead(
      userId,
      notificationId
    );
    if (!notification) {
      throw new AppError("Notificação não encontrada.", 404, "NOTIFICATION_NOT_FOUND");
    }
    return notification;
  }

  async markAllRead(userId: string) {
    return this.repository.markAllRead(userId);
  }

  async notifyMatchResult(
    organizerId: string,
    championship: Championship,
    match: Match,
    homeScore: number,
    awayScore: number
  ) {
    const title = "Resultado registrado";
    const resultText = homeScore === awayScore
      ? `${match.homeEntry.displayName} empatou com ${match.awayEntry.displayName} em ${homeScore} a ${awayScore}.`
      : homeScore > awayScore
        ? `${match.homeEntry.displayName} venceu ${match.awayEntry.displayName} por ${homeScore} a ${awayScore}.`
        : `${match.awayEntry.displayName} venceu ${match.homeEntry.displayName} por ${awayScore} a ${homeScore}.`;

    await this.notifyEntryUsers({
      championship,
      entryIds: [match.homeEntryId, match.awayEntryId],
      excludeUserId: organizerId,
      type: "MATCH_RESULT",
      title,
      message: resultText,
      link: publicMatchLink(championship, match.id),
      dedupKey: `match:${match.id}:result:${homeScore}-${awayScore}`
    });
  }

  async notifyMatchScheduleChanged(
    organizerId: string,
    championship: Championship,
    match: Match,
    scheduledAt: Date | null
  ) {
    const when = scheduledAt
      ? formatDateTime(scheduledAt)
      : "a definir";
    await this.notifyEntryUsers({
      championship,
      entryIds: [match.homeEntryId, match.awayEntryId],
      excludeUserId: organizerId,
      type: "MATCH_SCHEDULE_CHANGED",
      title: "Data do jogo alterada",
      message: `O confronto entre ${match.homeEntry.displayName} e ${match.awayEntry.displayName} foi remarcado para ${when}.`,
      link: publicMatchLink(championship, match.id),
      dedupKey: `match:${match.id}:schedule:${scheduledAt ? scheduledAt.toISOString() : "none"}`
    });
  }

  async notifyMatchUpcoming(
    championship: Championship,
    match: Match
  ) {
    await this.notifyEntryUsers({
      championship,
      entryIds: [match.homeEntryId, match.awayEntryId],
      excludeUserId: null,
      type: "MATCH_UPCOMING",
      title: "Partida próxima",
      message: `O confronto entre ${match.homeEntry.displayName} e ${match.awayEntry.displayName} começa em breve na competição ${championship.name}.`,
      link: publicMatchLink(championship, match.id),
      dedupKey: `match:${match.id}:upcoming`
    });
  }

  async notifyKnockoutAdvance(
    organizerId: string,
    championship: Championship,
    match: Match,
    entryId: string,
    phase: "NEXT_ROUND" | "THIRD_PLACE"
  ) {
    const entryName = match.homeEntryId === entryId
      ? match.homeEntry.displayName
      : match.awayEntryId === entryId
        ? match.awayEntry.displayName
        : entryId;
    const message = phase === "NEXT_ROUND"
      ? `${entryName} avançou para a próxima fase do mata-mata na competição ${championship.name}.`
      : `${entryName} disputará o terceiro lugar do mata-mata na competição ${championship.name}.`;

    await this.notifyEntryUsers({
      championship,
      entryIds: [entryId],
      excludeUserId: organizerId,
      type: "KNOCKOUT_ADVANCE",
      title: phase === "NEXT_ROUND" ? "Avanço no mata-mata" : "Disputa de terceiro lugar",
      message,
      link: publicMatchLink(championship, match.id),
      dedupKey: `match:${match.id}:advance:${entryId}`
    });
  }

  async notifySquadUpdated(
    organizerId: string,
    championship: Championship,
    input: {
      teamId: string;
      event: "MEMBER_ADDED" | "MEMBER_REMOVED" | "CAPTAIN_CHANGED";
      memberId: string;
      memberDisplayName?: string | null;
      teamName: string;
    }
  ) {
    const { teamId, event, memberId, memberDisplayName, teamName } = input;
    const title = "Elenco atualizado";
    const message = event === "MEMBER_ADDED"
      ? `${memberDisplayName ?? "Um jogador"} foi convocado para o time ${teamName} na competição ${championship.name}.`
      : event === "MEMBER_REMOVED"
        ? `${memberDisplayName ?? "Um jogador"} foi removido do time ${teamName} na competição ${championship.name}.`
        : `O capitão do time ${teamName} foi alterado na competição ${championship.name}.`;

    const memberUsers = await this.repository.findTeamMemberUserIds(teamId);
    const notified = new Set<string>();
    for (const userId of memberUsers) {
      if (userId === organizerId || notified.has(userId)) continue;
      notified.add(userId);
      await this.push({
        userId,
        type: "SQUAD_UPDATED",
        title,
        message,
        link: `/campeonatos/${championship.slug}/equipes/${teamId}`,
        dedupKey: `squad:${teamId}:${event.toLowerCase()}:${memberId}`
      });
    }
  }

  async notifyUpcomingMatches(
    now = new Date(),
    windowMs = DEFAULT_UPCOMING_WINDOW_MS
  ) {
    const end = new Date(now.getTime() + windowMs);
    const rows = await this.repository.listUpcomingMatches(now, end);
    for (const row of rows) {
      const championship = await this.championships.getChampionshipById(
        row.championshipId
      );
      if (!championship) continue;
      const match = toMatch(row);
      await this.notifyMatchUpcoming(championship, match);
    }
    return rows.length;
  }

  private async notifyEntryUsers(input: {
    championship: Championship;
    entryIds: string[];
    excludeUserId: string | null;
    type: NewNotification["type"];
    title: string;
    message: string;
    link: string;
    dedupKey: string;
  }) {
    const userIds = await this.repository.findEntryUserIds(input.entryIds);
    const notified = new Set<string>();
    for (const userId of userIds) {
      if (input.excludeUserId && userId === input.excludeUserId) continue;
      if (notified.has(userId)) continue;
      notified.add(userId);
      await this.push({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        dedupKey: input.dedupKey
      });
    }
  }

  private async push(row: NewNotification) {
    await this.repository.createMany([row]);
  }
}

function publicMatchLink(championship: Championship, matchId: string) {
  return `/campeonatos/${championship.slug}/partidas/${matchId}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function toMatch(row: UpcomingMatchRow): Match {
  return {
    id: row.matchId,
    championshipId: row.championshipId,
    homeEntryId: row.homeEntryId,
    awayEntryId: row.awayEntryId,
    scheduledAt: row.scheduledAt,
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
    roundNumber: null,
    generated: true,
    mvpId: null,
    venue: null,
    referee: null,
    operationalNotes: null,
    createdAt: row.scheduledAt,
    updatedAt: row.scheduledAt,
    homeEntry: {
      id: row.homeEntryId,
      championshipId: row.championshipId,
      displayName: row.homeDisplayName
    },
    awayEntry: {
      id: row.awayEntryId,
      championshipId: row.championshipId,
      displayName: row.awayDisplayName
    }
  };
}
