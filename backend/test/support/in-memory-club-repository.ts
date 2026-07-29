import type {
  Club,
  ClubIdentity,
  ClubMember,
  ClubRepository
} from "../../src/clubs/club-repository.js";

export class InMemoryClubRepository implements ClubRepository {
  readonly clubs: Club[] = [];
  readonly imports: Array<{ club: Club; championshipId: string; teamId: string }> = [];

  async listByOwner(ownerId: string) {
    return this.clubs.filter((club) => club.ownerId === ownerId);
  }

  async findById(clubId: string) {
    return this.clubs.find((club) => club.id === clubId) ?? null;
  }

  async create(ownerId: string, input: ClubIdentity) {
    const now = new Date();
    const club: Club = {
      id: crypto.randomUUID(),
      ownerId,
      ...input,
      createdAt: now,
      updatedAt: now,
      members: []
    };
    this.clubs.push(club);
    return club;
  }

  async update(clubId: string, input: ClubIdentity) {
    const club = this.clubs.find((item) => item.id === clubId);
    if (!club) throw new Error("Clube não encontrado.");
    Object.assign(club, input, { updatedAt: new Date() });
    return club;
  }

  async delete(clubId: string) {
    const index = this.clubs.findIndex((club) => club.id === clubId);
    if (index < 0) return false;
    this.clubs.splice(index, 1);
    return true;
  }

  async addMember(
    clubId: string,
    input: {
      displayName: string;
      jerseyNumber: number | null;
      position: string | null;
    }
  ) {
    const member: ClubMember = {
      id: crypto.randomUUID(),
      clubId,
      ...input,
      isCaptain: false,
      createdAt: new Date()
    };
    this.clubs.find((club) => club.id === clubId)?.members.push(member);
    return member;
  }

  async deleteMember(clubId: string, memberId: string) {
    const club = this.clubs.find((item) => item.id === clubId);
    const index = club?.members.findIndex((member) => member.id === memberId) ?? -1;
    if (!club || index < 0) return false;
    club.members.splice(index, 1);
    return true;
  }

  async setCaptain(clubId: string, memberId: string) {
    const club = this.clubs.find((item) => item.id === clubId);
    if (!club) throw new Error("Clube não encontrado.");
    club.members.forEach((member) => {
      member.isCaptain = member.id === memberId;
    });
    return club;
  }

  async importIntoChampionship(club: Club, championshipId: string) {
    if (this.imports.some((item) =>
      item.club.id === club.id && item.championshipId === championshipId
    )) {
      throw Object.assign(new Error("duplicate"), { code: "23505" });
    }
    const teamId = crypto.randomUUID();
    this.imports.push({
      championshipId,
      teamId,
      club: structuredClone(club)
    });
    return teamId;
  }
}
