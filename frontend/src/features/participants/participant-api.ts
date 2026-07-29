import { apiRequest } from "../../lib/api";

export type IndividualParticipant = {
  id: string;
  championshipId: string;
  displayName: string;
};

export type TeamMember = {
  id: string;
  teamId: string;
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
};

export type Team = {
  id: string;
  championshipId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  members: TeamMember[];
};

export type RegistrationList = {
  entryType: "INDIVIDUAL" | "TEAM";
  participants: IndividualParticipant[];
  teams: Team[];
};

export const registrationQueryKey = (championshipId: string) => [
  "championships",
  championshipId,
  "participants"
];

export const listRegistrations = (id: string) =>
  apiRequest<RegistrationList>(`/championships/${id}/participants`);

export const createParticipant = (id: string, displayName: string) =>
  apiRequest<{ participant: IndividualParticipant }>(
    `/championships/${id}/participants`,
    { method: "POST", body: JSON.stringify({ displayName }) }
  );

export const deleteParticipant = (id: string, participantId: string) =>
  apiRequest<void>(`/championships/${id}/participants/${participantId}`, {
    method: "DELETE"
  });

export const createTeam = (
  id: string,
  input: { name: string; shortName: string | null; logoUrl: string | null }
) =>
  apiRequest<{ team: Team }>(`/championships/${id}/teams`, {
    method: "POST",
    body: JSON.stringify(input)
  });

export const updateTeam = (
  id: string,
  teamId: string,
  input: { name: string; shortName: string | null; logoUrl: string | null }
) =>
  apiRequest<{ team: Team }>(`/championships/${id}/teams/${teamId}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });

export const setTeamCaptain = (id: string, teamId: string, memberId: string) =>
  apiRequest<{ team: Team }>(`/championships/${id}/teams/${teamId}/captain`, {
    method: "PUT",
    body: JSON.stringify({ memberId })
  });

export const deleteTeam = (id: string, teamId: string) =>
  apiRequest<void>(`/championships/${id}/teams/${teamId}`, {
    method: "DELETE"
  });

export const addTeamMember = (
  id: string,
  teamId: string,
  input: {
    displayName: string;
    jerseyNumber: number | null;
    position: string | null;
  }
) =>
  apiRequest<{ member: TeamMember }>(
    `/championships/${id}/teams/${teamId}/members`,
    { method: "POST", body: JSON.stringify(input) }
  );

export const deleteTeamMember = (
  id: string,
  teamId: string,
  memberId: string
) =>
  apiRequest<void>(
    `/championships/${id}/teams/${teamId}/members/${memberId}`,
    { method: "DELETE" }
  );
