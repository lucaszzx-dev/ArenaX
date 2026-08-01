import type {
  PublicClub,
  PublicClubParticipation,
  PublicMemberContext,
  PublicProfile,
  PublicProfileRepository
} from "../../src/public-profiles/public-profile-repository.js";

export class InMemoryPublicProfileRepository
  implements PublicProfileRepository
{
  readonly memberContexts: PublicMemberContext[] = [];
  readonly profiles: PublicProfile[] = [];
  readonly clubs: PublicClub[] = [];
  readonly clubsByOwner: Array<{
    ownerId: string;
    id: string;
    name: string;
    shortName: string | null;
    logoUrl: string | null;
  }> = [];
  readonly clubParticipations: Array<{
    clubId: string;
    participation: PublicClubParticipation;
  }> = [];

  async findMemberContext(memberId: string) {
    return this.memberContexts.find((context) => context.memberId === memberId) ?? null;
  }

  async findProfile(userId: string) {
    return this.profiles.find((profile) => profile.userId === userId) ?? null;
  }

  async findClub(clubId: string) {
    return this.clubs.find((club) => club.id === clubId) ?? null;
  }

  async listClubsByOwner(ownerId: string) {
    return this.clubsByOwner.filter((club) => club.ownerId === ownerId);
  }

  async listClubParticipations(clubId: string) {
    return this.clubParticipations
      .filter((item) => item.clubId === clubId)
      .map((item) => item.participation);
  }
}
