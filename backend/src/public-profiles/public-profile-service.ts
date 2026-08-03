import type { ChampionshipRepository } from "../championships/championship-repository.js";
import { AppError } from "../errors/app-error.js";
import type { Match, MatchRepository } from "../matches/match-repository.js";
import type { MatchEvent, MatchEventRepository } from "../match-events/match-event-repository.js";
import type {
  PublicClub,
  PublicMemberContext,
  PublicProfileRepository
} from "./public-profile-repository.js";

export type PlayerHistoryFilters = {
  sport?: string | undefined;
  championshipId?: string | undefined;
};

export type PlayerMatchEvent = {
  id: string;
  type: string;
  value: number;
  periodNumber: number | null;
  clockSeconds: number | null;
  notes: string | null;
};

export type PlayerMatchHistory = {
  matchId: string;
  entryId: string;
  teamName: string;
  teamLogoUrl: string | null;
  opponentEntryId: string;
  opponentDisplayName: string;
  championship: {
    id: string;
    name: string;
    slug: string;
    sport: string;
  };
  scheduledAt: Date | null;
  status: "SCHEDULED" | "FINISHED" | "CANCELED";
  homeScore: number | null;
  awayScore: number | null;
  result: "WIN" | "DRAW" | "LOSS" | null;
  events: PlayerMatchEvent[];
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type PlayerHistoryResult = {
  player: {
    memberId: string;
    displayName: string;
    teamName: string;
    teamLogoUrl: string | null;
  };
  championship: {
    id: string;
    name: string;
    slug: string;
    sport: string;
  };
  items: PlayerMatchHistory[];
  total: number;
  page: number;
  limit: number;
};

export type OrganizerProfile = {
  organizer: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
  };
  sports: string[];
  championships: {
    active: Array<{
      id: string;
      name: string;
      slug: string;
      sport: string;
      status: "PUBLISHED";
      startsAt: Date | null;
      endsAt: Date | null;
    }>;
    finished: Array<{
      id: string;
      name: string;
      slug: string;
      sport: string;
      status: "FINISHED";
      startsAt: Date | null;
      endsAt: Date | null;
    }>;
  };
};

export type ClubProfile = {
  club: PublicClub;
  sports: string[];
  championships: Array<{
    championshipId: string;
    championshipName: string;
    championshipSlug: string;
    championshipSport: string;
    championshipStatus: "PUBLISHED" | "FINISHED";
    teamId: string;
    teamName: string;
    teamLogoUrl: string | null;
  }>;
};

export class PublicProfileService {
  constructor(
    private readonly repository: PublicProfileRepository,
    private readonly matches: MatchRepository,
    private readonly events: MatchEventRepository,
    private readonly championships: ChampionshipRepository
  ) {}

  async playerHistory(
    memberId: string,
    filters: PlayerHistoryFilters = {},
    page = 1,
    limit = 20
  ): Promise<PlayerHistoryResult> {
    const context = await this.repository.findMemberContext(memberId);
    if (!context) {
      throw new AppError("Jogador não encontrado.", 404, "PLAYER_NOT_FOUND");
    }
    if (context.championshipStatus === "DRAFT") {
      throw new AppError("Jogador não encontrado.", 404, "PLAYER_NOT_FOUND");
    }
    if (
      filters.championshipId &&
      filters.championshipId !== context.championshipId
    ) {
      throw new AppError("Jogador não encontrado.", 404, "PLAYER_NOT_FOUND");
    }
    if (filters.sport && filters.sport !== context.championshipSport) {
      throw new AppError("Jogador não encontrado.", 404, "PLAYER_NOT_FOUND");
    }

    const [matches, events] = await Promise.all([
      this.matches.listByChampionship(context.championshipId),
      this.events.listByChampionship(context.championshipId)
    ]);

    const playerMatches = matches.filter(
      (match) =>
        match.homeEntryId === context.entryId ||
        match.awayEntryId === context.entryId
    );

    const items = playerMatches.map((match) =>
      this.toHistoryItem(match, context, events)
    );

    const pageResult = paginate(items, page, limit);
    return {
      player: {
        memberId: context.memberId,
        displayName: context.displayName,
        teamName: context.teamName,
        teamLogoUrl: context.teamLogoUrl
      },
      championship: {
        id: context.championshipId,
        name: context.championshipName,
        slug: context.championshipSlug,
        sport: context.championshipSport
      },
      ...pageResult
    };
  }

  async organizerProfile(userId: string): Promise<OrganizerProfile> {
    const profile = await this.repository.findProfile(userId);
    if (!profile) {
      throw new AppError("Organizador não encontrado.", 404, "ORGANIZER_NOT_FOUND");
    }
    const organized = (await this.championships.listByOrganizer(userId)).filter(
      (championship) =>
        championship.status === "PUBLISHED" ||
        championship.status === "FINISHED"
    );
    const active = organized
      .filter((championship) => championship.status === "PUBLISHED")
      .map((championship) => ({
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport,
        status: "PUBLISHED" as const,
        startsAt: championship.startsAt,
        endsAt: championship.endsAt
      }));
    const finished = organized
      .filter((championship) => championship.status === "FINISHED")
      .map((championship) => ({
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport,
        status: "FINISHED" as const,
        startsAt: championship.startsAt,
        endsAt: championship.endsAt
      }));
    const sports = [...new Set(organized.map((championship) => championship.sport))].sort(
      (a, b) => a.localeCompare(b, "pt-BR")
    );
    return {
      organizer: {
        userId: profile.userId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio
      },
      sports,
      championships: { active, finished }
    };
  }

  async clubProfile(clubId: string): Promise<ClubProfile> {
    const participations = await this.repository.listClubParticipations(clubId);
    const publicParticipations = participations.filter(
      (participation) =>
        participation.championshipStatus === "PUBLISHED" ||
        participation.championshipStatus === "FINISHED"
    );
    if (publicParticipations.length === 0) {
      throw new AppError("Clube não encontrado.", 404, "CLUB_NOT_FOUND");
    }
    const club = await this.repository.findClub(clubId);
    if (!club) {
      throw new AppError("Clube não encontrado.", 404, "CLUB_NOT_FOUND");
    }
    const championships = publicParticipations
      .map((participation) => ({
        championshipId: participation.championshipId,
        championshipName: participation.championshipName,
        championshipSlug: participation.championshipSlug,
        championshipSport: participation.championshipSport,
        championshipStatus: participation.championshipStatus as
          | "PUBLISHED"
          | "FINISHED",
        teamId: participation.teamId,
        teamName: participation.teamName,
        teamLogoUrl: participation.teamLogoUrl
      }));
    const sports = [
      ...new Set(championships.map((championship) => championship.championshipSport))
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));

    return {
      club: {
        id: club.id,
        name: club.name,
        shortName: club.shortName,
        logoUrl: club.logoUrl,
        members: club.members
      },
      sports,
      championships
    };
  }

  private toHistoryItem(
    match: Match,
    context: PublicMemberContext,
    events: MatchEvent[]
  ): PlayerMatchHistory {
    const opponent =
      match.homeEntryId === context.entryId ? match.awayEntry : match.homeEntry;
    const playerEvents = events
      .filter(
        (event) =>
          event.matchId === match.id && event.teamMemberId === context.memberId
      )
      .map((event) => ({
        id: event.id,
        type: event.type,
        value: event.value,
        periodNumber: event.periodNumber,
        clockSeconds: event.clockSeconds,
        notes: event.notes
      }));

    return {
      matchId: match.id,
      entryId: context.entryId,
      teamName: context.teamName,
      teamLogoUrl: context.teamLogoUrl,
      opponentEntryId: opponent.id,
      opponentDisplayName: opponent.displayName,
      championship: {
        id: context.championshipId,
        name: context.championshipName,
        slug: context.championshipSlug,
        sport: context.championshipSport
      },
      scheduledAt: match.scheduledAt,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      result: matchResult(match, context.entryId),
      events: playerEvents
    };
  }
}

function matchResult(
  match: Match,
  entryId: string
): "WIN" | "DRAW" | "LOSS" | null {
  if (
    match.status !== "FINISHED" ||
    match.homeScore === null ||
    match.awayScore === null
  ) {
    return null;
  }
  const entryScore =
    match.homeEntryId === entryId ? match.homeScore : match.awayScore;
  const opponentScore =
    match.homeEntryId === entryId ? match.awayScore : match.homeScore;
  if (entryScore > opponentScore) return "WIN";
  if (entryScore < opponentScore) return "LOSS";
  return "DRAW";
}

function paginate<T>(rows: T[], page: number, limit: number): Page<T> {
  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit < 1 ? 1 : limit;
  const start = (safePage - 1) * safeLimit;
  return {
    items: rows.slice(start, start + safeLimit),
    total: rows.length,
    page: safePage,
    limit: safeLimit
  };
}


