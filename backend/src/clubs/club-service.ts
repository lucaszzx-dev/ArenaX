import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type {
  Club,
  ClubIdentity,
  ClubMemberInput,
  ClubRepository,
  ClubSeasonInput,
  ClubSquadInput,
  ClubStaffInput,
  ImportMemberRow,
  SquadMemberRef,
  TeamSyncDiff
} from "./club-repository.js";

export type RosterExportFormat = "json" | "csv";

export class ClubService {
  constructor(
    private readonly repository: ClubRepository,
    private readonly championships: ChampionshipService
  ) {}

  list(ownerId: string) {
    return this.repository.listByOwner(ownerId);
  }

  async create(ownerId: string, input: ClubIdentity) {
    await this.requireUniqueName(ownerId, input.name);
    return this.repository.create(ownerId, input);
  }

  async update(ownerId: string, clubId: string, input: ClubIdentity) {
    const club = await this.requireOwned(ownerId, clubId);
    await this.requireUniqueName(ownerId, input.name, club.id);
    const updated = await this.repository.update(clubId, input);
    await this.audit(ownerId, clubId, "CLUB_UPDATED", {
      fields: Object.keys(input)
    });
    return updated;
  }

  async delete(ownerId: string, clubId: string) {
    await this.requireOwned(ownerId, clubId);
    if (!await this.repository.delete(clubId)) {
      throw new AppError("Clube não encontrado.", 404, "CLUB_NOT_FOUND");
    }
  }

  async addMember(ownerId: string, clubId: string, input: ClubMemberInput) {
    const club = await this.requireOwned(ownerId, clubId);
    await this.requireUniqueMemberName(club, input.displayName);
    const member = await this.repository.addMember(clubId, input);
    await this.audit(ownerId, clubId, "CLUB_MEMBER_ADDED", {
      memberId: member.id,
      displayName: member.displayName
    });
    return member;
  }

  async updateMember(
    ownerId: string,
    clubId: string,
    memberId: string,
    input: ClubMemberInput
  ) {
    const club = await this.requireOwned(ownerId, clubId);
    const current = club.members.find((member) => member.id === memberId);
    if (!current) {
      throw new AppError("Jogador não encontrado.", 404, "CLUB_MEMBER_NOT_FOUND");
    }
    const renamed =
      this.normalize(input.displayName) !== this.normalize(current.displayName);
    if (renamed) {
      await this.requireUniqueMemberName(club, input.displayName, memberId);
    }
    const member = await this.repository.updateMember(clubId, memberId, input);
    await this.audit(ownerId, clubId, "CLUB_MEMBER_UPDATED", {
      memberId,
      before: {
        displayName: current.displayName,
        jerseyNumber: current.jerseyNumber,
        position: current.position
      },
      after: {
        displayName: member.displayName,
        jerseyNumber: member.jerseyNumber,
        position: member.position
      }
    });
    return member;
  }

  async deleteMember(ownerId: string, clubId: string, memberId: string) {
    await this.requireOwned(ownerId, clubId);
    if (!await this.repository.deleteMember(clubId, memberId)) {
      throw new AppError("Jogador não encontrado.", 404, "CLUB_MEMBER_NOT_FOUND");
    }
    await this.audit(ownerId, clubId, "CLUB_MEMBER_REMOVED", { memberId });
  }

  async setCaptain(ownerId: string, clubId: string, memberId: string) {
    const club = await this.requireOwned(ownerId, clubId);
    if (!club.members.some((member) => member.id === memberId)) {
      throw new AppError("Jogador não encontrado.", 404, "CLUB_MEMBER_NOT_FOUND");
    }
    const updated = await this.repository.setCaptain(clubId, memberId);
    await this.audit(ownerId, clubId, "CLUB_CAPTAIN_CHANGED", { memberId });
    return updated;
  }

  async addSeason(ownerId: string, clubId: string, input: ClubSeasonInput) {
    const club = await this.requireOwned(ownerId, clubId);
    this.validateSeasonDates(input);
    if (club.seasons.some((season) =>
      this.normalize(season.name) === this.normalize(input.name)
    )) {
      throw new AppError(
        "Já existe uma temporada com esse nome.",
        409,
        "CLUB_SEASON_NAME_IN_USE"
      );
    }
    const season = await this.repository.addSeason(clubId, input);
    await this.audit(ownerId, clubId, "CLUB_SEASON_ADDED", { seasonId: season.id });
    return season;
  }

  async updateSeason(
    ownerId: string,
    clubId: string,
    seasonId: string,
    input: ClubSeasonInput
  ) {
    const club = await this.requireOwned(ownerId, clubId);
    this.validateSeasonDates(input);
    if (club.seasons.some((season) =>
      season.id !== seasonId &&
      this.normalize(season.name) === this.normalize(input.name)
    )) {
      throw new AppError(
        "Já existe uma temporada com esse nome.",
        409,
        "CLUB_SEASON_NAME_IN_USE"
      );
    }
    const season = await this.repository.updateSeason(clubId, seasonId, input);
    await this.audit(ownerId, clubId, "CLUB_SEASON_UPDATED", { seasonId });
    return season;
  }

  async deleteSeason(ownerId: string, clubId: string, seasonId: string) {
    await this.requireOwned(ownerId, clubId);
    if (!await this.repository.deleteSeason(clubId, seasonId)) {
      throw new AppError("Temporada não encontrada.", 404, "CLUB_SEASON_NOT_FOUND");
    }
    await this.audit(ownerId, clubId, "CLUB_SEASON_REMOVED", { seasonId });
  }

  async addSquad(ownerId: string, clubId: string, input: ClubSquadInput) {
    const club = await this.requireOwned(ownerId, clubId);
    if (club.squads.some((squad) =>
      this.normalize(squad.name) === this.normalize(input.name)
    )) {
      throw new AppError(
        "Já existe um elenco com esse nome.",
        409,
        "CLUB_SQUAD_NAME_IN_USE"
      );
    }
    const squad = await this.repository.addSquad(clubId, input);
    await this.audit(ownerId, clubId, "CLUB_SQUAD_ADDED", { squadId: squad.id });
    return squad;
  }

  async updateSquad(
    ownerId: string,
    clubId: string,
    squadId: string,
    input: ClubSquadInput
  ) {
    const club = await this.requireOwned(ownerId, clubId);
    if (club.squads.some((squad) =>
      squad.id !== squadId &&
      this.normalize(squad.name) === this.normalize(input.name)
    )) {
      throw new AppError(
        "Já existe um elenco com esse nome.",
        409,
        "CLUB_SQUAD_NAME_IN_USE"
      );
    }
    const squad = await this.repository.updateSquad(clubId, squadId, input);
    await this.audit(ownerId, clubId, "CLUB_SQUAD_UPDATED", { squadId });
    return squad;
  }

  async deleteSquad(ownerId: string, clubId: string, squadId: string) {
    await this.requireOwned(ownerId, clubId);
    if (!await this.repository.deleteSquad(clubId, squadId)) {
      throw new AppError("Elenco não encontrado.", 404, "CLUB_SQUAD_NOT_FOUND");
    }
    await this.audit(ownerId, clubId, "CLUB_SQUAD_REMOVED", { squadId });
  }

  async setSquadMembers(
    ownerId: string,
    clubId: string,
    squadId: string,
    members: SquadMemberRef[]
  ) {
    await this.requireOwned(ownerId, clubId);
    const uniqueIds = new Set(members.map((member) => member.clubMemberId));
    if (uniqueIds.size !== members.length) {
      throw new AppError(
        "Um jogador não pode aparecer duas vezes no mesmo elenco.",
        400,
        "DUPLICATE_SQUAD_MEMBER"
      );
    }
    const squad = await this.repository.setSquadMembers(clubId, squadId, members);
    await this.audit(ownerId, clubId, "CLUB_SQUAD_MEMBERS_CHANGED", {
      squadId,
      count: members.length
    });
    return squad;
  }

  async addStaff(ownerId: string, clubId: string, input: ClubStaffInput) {
    const club = await this.requireOwned(ownerId, clubId);
    if (club.staff.some((staff) =>
      this.normalize(staff.displayName) === this.normalize(input.displayName)
    )) {
      throw new AppError(
        "Já existe um membro da comissão com esse nome.",
        409,
        "CLUB_STAFF_NAME_IN_USE"
      );
    }
    const staff = await this.repository.addStaff(clubId, input);
    await this.audit(ownerId, clubId, "CLUB_STAFF_ADDED", { staffId: staff.id });
    return staff;
  }

  async deleteStaff(ownerId: string, clubId: string, staffId: string) {
    await this.requireOwned(ownerId, clubId);
    if (!await this.repository.deleteStaff(clubId, staffId)) {
      throw new AppError(
        "Membro da comissão não encontrado.",
        404,
        "CLUB_STAFF_NOT_FOUND"
      );
    }
    await this.audit(ownerId, clubId, "CLUB_STAFF_REMOVED", { staffId });
  }

  async listImportedTeams(ownerId: string, clubId: string) {
    await this.requireOwned(ownerId, clubId);
    return this.repository.listImportedTeams(clubId);
  }

  async importIntoChampionship(
    ownerId: string,
    clubId: string,
    championshipId: string,
    memberIds?: string[]
  ) {
    const [club, championship] = await Promise.all([
      this.requireOwned(ownerId, clubId),
      this.championships.getMine(ownerId, championshipId)
    ]);
    if (championship.entryType !== "TEAM") {
      throw new AppError(
        "Esta competição aceita somente participantes individuais.",
        409,
        "INVALID_ENTRY_TYPE"
      );
    }
    this.validateMemberSelection(club, memberIds);

    const importedTeamId = await this.repository.importIntoChampionship(
      club,
      championshipId,
      memberIds
    ).catch((error: unknown) => {
      if (isUniqueViolation(error)) {
        throw new AppError(
          "Este clube já foi importado ou existe uma equipe com o mesmo nome.",
          409,
          "CLUB_ALREADY_IMPORTED"
        );
      }
      throw error;
    });
    await this.audit(ownerId, clubId, "CLUB_IMPORTED", {
      championshipId,
      teamId: importedTeamId,
      memberIds: memberIds ?? "all"
    });
    return { teamId: importedTeamId };
  }

  async previewTeamSync(
    ownerId: string,
    clubId: string,
    teamId: string
  ): Promise<{ diff: TeamSyncDiff; team: { id: string; name: string } }> {
    const club = await this.requireOwned(ownerId, clubId);
    const team = await this.repository.findTeamWithMembers(teamId);
    if (!team || team.sourceClubId !== clubId) {
      throw new AppError(
        "Equipe não encontrada ou não originada deste clube.",
        404,
        "TEAM_NOT_FOUND"
      );
    }
    const protectedIds = new Set(
      await this.repository.findProtectedTeamMemberIds(teamId)
    );
    const diff = this.buildSyncDiff(club.members, team.members, protectedIds);
    return { diff, team: { id: team.id, name: team.name } };
  }

  async applyTeamSync(ownerId: string, clubId: string, teamId: string) {
    const { diff, team } = await this.previewTeamSync(ownerId, clubId, teamId);
    await this.repository.applyTeamSync(teamId, diff);
    await this.audit(ownerId, clubId, "TEAM_SYNCED", {
      teamId,
      added: diff.toAdd.length,
      updated: diff.toUpdate.length,
      removed: diff.toRemove.length,
      protected: diff.protectedMembers.length
    });
    return {
      team: { id: team.id, name: team.name },
      diff
    };
  }

  async exportRoster(ownerId: string, clubId: string, format: RosterExportFormat) {
    const club = await this.requireOwned(ownerId, clubId);
    if (format === "csv") {
      return {
        contentType: "text/csv; charset=utf-8",
        filename: `${slugify(club.name)}-elenco.csv`,
        content: this.toCsv(club.members)
      };
    }
    return {
      contentType: "application/json",
      filename: `${slugify(club.name)}-elenco.json`,
      content: JSON.stringify({
        club: { id: club.id, name: club.name },
        members: club.members.map((member) => ({
          displayName: member.displayName,
          jerseyNumber: member.jerseyNumber,
          position: member.position,
          isCaptain: member.isCaptain
        }))
      }, null, 2)
    };
  }

  async importRoster(
    ownerId: string,
    clubId: string,
    format: RosterExportFormat,
    content: string,
    squadId?: string
  ) {
    await this.requireOwned(ownerId, clubId);
    const rows = this.parseRoster(content, format);
    this.validateRosterRows(rows);
    const result = await this.repository.importRoster(clubId, rows, squadId);
    await this.audit(ownerId, clubId, "CLUB_ROSTER_IMPORTED", {
      format,
      squadId: squadId ?? null,
      ...result
    });
    return result;
  }

  async listAuditLogs(ownerId: string, clubId: string) {
    await this.requireOwned(ownerId, clubId);
    return this.repository.listAuditLogs(clubId);
  }

  private buildSyncDiff(
    clubMembers: Club["members"],
    teamMembers: Array<{
      id: string;
      sourceClubMemberId: string | null;
      displayName: string;
      jerseyNumber: number | null;
      position: string | null;
      isCaptain: boolean;
    }>,
    protectedIds: Set<string>
  ): TeamSyncDiff {
    const toUpdate: TeamSyncDiff["toUpdate"] = [];
    const toRemove: TeamSyncDiff["toRemove"] = [];
    const protectedMembers: TeamSyncDiff["protectedMembers"] = [];
    let unchanged = 0;

    const matchedClubMemberIds = new Set<string>();
    for (const teamMember of teamMembers) {
      const clubMember = teamMember.sourceClubMemberId
        ? clubMembers.find((member) => member.id === teamMember.sourceClubMemberId)
        : undefined;
      const resolvedClubMember = clubMember
        ?? clubMembers.find((member) =>
          this.normalize(member.displayName) === this.normalize(teamMember.displayName)
        );
      if (!resolvedClubMember) {
        if (protectedIds.has(teamMember.id)) {
          protectedMembers.push({
            teamMemberId: teamMember.id,
            displayName: teamMember.displayName
          });
        } else {
          toRemove.push({
            teamMemberId: teamMember.id,
            displayName: teamMember.displayName
          });
        }
        continue;
      }
      matchedClubMemberIds.add(resolvedClubMember.id);
      if (
        this.normalize(teamMember.displayName) ===
          this.normalize(resolvedClubMember.displayName) &&
        teamMember.jerseyNumber === resolvedClubMember.jerseyNumber &&
        teamMember.position === resolvedClubMember.position &&
        teamMember.isCaptain === resolvedClubMember.isCaptain
      ) {
        unchanged += 1;
      } else {
        toUpdate.push({
          teamMemberId: teamMember.id,
          clubMemberId: resolvedClubMember.id,
          sourceClubMemberId: resolvedClubMember.id,
          displayName: resolvedClubMember.displayName,
          jerseyNumber: resolvedClubMember.jerseyNumber,
          position: resolvedClubMember.position,
          isCaptain: resolvedClubMember.isCaptain
        });
      }
    }

    const toAdd = clubMembers
      .filter((member) => !matchedClubMemberIds.has(member.id))
      .filter((member) =>
        !teamMembers.some((teamMember) =>
          this.normalize(teamMember.displayName) === this.normalize(member.displayName)
        )
      )
      .map((member) => ({
        clubMemberId: member.id,
        displayName: member.displayName,
        jerseyNumber: member.jerseyNumber,
        position: member.position,
        isCaptain: member.isCaptain
      }));

    return { toAdd, toUpdate, toRemove, protectedMembers, unchanged };
  }

  private validateMemberSelection(club: Club, memberIds?: string[]) {
    if (!memberIds) return;
    const valid = new Set(club.members.map((member) => member.id));
    if (memberIds.some((id) => !valid.has(id))) {
      throw new AppError(
        "Um dos jogadores selecionados não pertence ao clube.",
        400,
        "INVALID_MEMBER_SELECTION"
      );
    }
  }

  private validateSeasonDates(input: ClubSeasonInput) {
    if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
      throw new AppError(
        "A data final deve ser posterior à data inicial.",
        400,
        "INVALID_CLUB_SEASON_DATES"
      );
    }
  }

  private parseRoster(content: string, format: RosterExportFormat): ImportMemberRow[] {
    if (format === "json") {
      const parsed: unknown = JSON.parse(content);
      const rows = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { members?: unknown } | null)?.members)
          ? (parsed as { members: unknown[] }).members
          : null;
      if (!rows) {
        throw new AppError(
          "O JSON deve conter uma lista de jogadores (ou um objeto com members).",
          400,
          "INVALID_ROSTER_FORMAT"
        );
      }
      return rows.map((item) => this.normalizeRosterRow(item));
    }
    const rows = parseCsvRows(content);
    if (rows.length === 0) {
      throw new AppError("O CSV está vazio.", 400, "INVALID_ROSTER_FORMAT");
    }
    const header = rows[0]!.map((cell) => cell.trim().toLowerCase());
    const nameIndex = header.indexOf("nome");
    const numberIndex = header.indexOf("camisa");
    const positionIndex = header.indexOf("posicao");
    const captainIndex = header.indexOf("capitao");
    if (nameIndex < 0) {
      throw new AppError(
        "O CSV precisa de uma coluna 'nome'.",
        400,
        "INVALID_ROSTER_FORMAT"
      );
    }
    return rows.slice(1).map((cells) => {
      return this.normalizeRosterRow({
        displayName: cells[nameIndex] ?? "",
        jerseyNumber: numberIndex >= 0 ? this.parseNumber(cells[numberIndex]) : null,
        position: positionIndex >= 0 ? cells[positionIndex] || null : null,
        isCaptain: captainIndex >= 0 ? this.parseCaptain(cells[captainIndex]) : false
      });
    });
  }

  private normalizeRosterRow(item: unknown): ImportMemberRow {
    if (typeof item !== "object" || item === null) {
      throw new AppError(
        "Cada linha do elenco deve ser um objeto.",
        400,
        "INVALID_ROSTER_FORMAT"
      );
    }
    const record = item as Record<string, unknown>;
    const displayName = typeof record.displayName === "string"
      ? record.displayName.trim()
      : "";
    if (displayName.length < 2 || displayName.length > 80) {
      throw new AppError(
        "Todo jogador precisa de um nome entre 2 e 80 caracteres.",
        400,
        "INVALID_ROSTER_FORMAT"
      );
    }
    return {
      displayName,
      jerseyNumber: this.parseNumber(record.jerseyNumber),
      position: typeof record.position === "string" && record.position.trim()
        ? record.position.trim().slice(0, 40)
        : null,
      isCaptain: record.isCaptain === true || record.isCaptain === "true"
    };
  }

  private toCsv(members: Club["members"]) {
    const lines = ["nome,camisa,posicao,capitao"];
    for (const member of members) {
      lines.push([
        this.escapeCsv(member.displayName),
        member.jerseyNumber ?? "",
        this.escapeCsv(member.position ?? ""),
        member.isCaptain ? "sim" : "nao"
      ].join(","));
    }
    return lines.join("\n");
  }

  private escapeCsv(value: string) {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
      throw new AppError(
        "Número de camisa inválido.",
        400,
        "INVALID_ROSTER_FORMAT"
      );
    }
    return parsed;
  }

  private parseCaptain(value: string | undefined) {
    const normalized = value?.trim().toLowerCase() ?? "";
    return normalized === "sim" || normalized === "true" || normalized === "1";
  }

  private validateRosterRows(rows: ImportMemberRow[]) {
    const seen = new Set<string>();
    for (const row of rows) {
      const key = this.normalize(row.displayName);
      if (seen.has(key)) {
        throw new AppError(
          `Jogador duplicado na importação: ${row.displayName}.`,
          409,
          "DUPLICATE_ROSTER_ROW"
        );
      }
      seen.add(key);
    }
  }

  private async requireOwned(ownerId: string, clubId: string) {
    const club = await this.repository.findById(clubId);
    if (!club || club.ownerId !== ownerId) {
      throw new AppError("Clube não encontrado.", 404, "CLUB_NOT_FOUND");
    }
    return club;
  }

  private async requireUniqueName(ownerId: string, name: string, ignoredId?: string) {
    const clubs = await this.repository.listByOwner(ownerId);
    if (clubs.some((club) => club.id !== ignoredId && this.hasName([club.name], name))) {
      throw new AppError(
        "Você já possui um clube com esse nome.",
        409,
        "CLUB_NAME_IN_USE"
      );
    }
  }

  private async requireUniqueMemberName(
    club: Club,
    name: string,
    ignoredId?: string
  ) {
    const others = club.members.filter((member) => member.id !== ignoredId);
    if (this.hasName(others.map((member) => member.displayName), name)) {
      throw new AppError(
        "Esse jogador já está cadastrado no clube.",
        409,
        "CLUB_MEMBER_NAME_IN_USE"
      );
    }
  }

  private async audit(
    actorId: string,
    clubId: string,
    action: string,
    details: Record<string, unknown>
  ) {
    await this.repository.recordAudit(actorId, clubId, action, details);
  }

  private hasName(names: string[], candidate: string) {
    const normalized = this.normalize(candidate);
    return names.some((name) => this.normalize(name) === normalized);
  }

  private normalize(name: string) {
    return name.trim().toLocaleLowerCase("pt-BR");
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    error.code === "23505";
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]!;
    if (inQuotes) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\r") {
      if (content[index + 1] === "\n") continue;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }
    if (char === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .filter((cells) => cells.some((cell) => cell.trim().length > 0))
    .map((cells) => cells.map((cell) => cell.trim()));
}

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "clube";
}


