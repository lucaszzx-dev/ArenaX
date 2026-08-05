import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { ImageUrlField } from "../../components/ImageUrlField/ImageUrlField";
import { RemoteImage } from "../../components/RemoteImage/RemoteImage";
import { getChampionship } from "../../features/championships/championship-api";
import { championshipDetailQueryKey } from "../../features/championships/championship-query";
import {
  addTeamMember,
  createParticipant,
  createTeam,
  deleteParticipant,
  deleteTeam,
  deleteTeamMember,
  listRegistrations,
  registrationQueryKey,
  setTeamCaptain,
  updateTeam
} from "../../features/participants/participant-api";
import { ApiError } from "../../lib/api";
import {
  clubsQueryKey,
  importClubIntoChampionship,
  listClubs
} from "../../features/clubs/club-api";
import styles from "./ManageParticipantsPage.module.css";

export function ManageParticipantsPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createLogoUrl, setCreateLogoUrl] = useState("");
  const championshipQuery = useQuery({
    queryKey: championshipDetailQueryKey(id),
    queryFn: () => getChampionship(id),
    enabled: Boolean(id)
  });
  const registrationsQuery = useQuery({
    queryKey: registrationQueryKey(id),
    queryFn: () => listRegistrations(id),
    enabled: Boolean(id)
  });
  const clubsQuery = useQuery({
    queryKey: clubsQueryKey,
    queryFn: listClubs
  });
  const refresh = async () => {
    setErrorMessage(null);
    await queryClient.invalidateQueries({ queryKey: registrationQueryKey(id) });
  };
  const showError = (error: Error) => setErrorMessage(
    error instanceof ApiError ? error.message : "Não foi possível concluir a ação."
  );
  const individualMutation = useMutation({
    mutationFn: (name: string) => createParticipant(id, name),
    onSuccess: async () => {
      await refresh();
      setSuccessMessage("Participante adicionado.");
    },
    onError: showError
  });
  const teamMutation = useMutation({
    mutationFn: (input: { name: string; shortName: string | null; logoUrl: string | null }) =>
      createTeam(id, input),
    onSuccess: async () => {
      await refresh();
      setSuccessMessage("Equipe criada.");
    },
    onError: showError
  });
  const actionMutation = useMutation({
    mutationFn: (input: {
      action: () => Promise<unknown>;
      successMessage: string;
    }) => input.action(),
    onSuccess: async (_data, input) => {
      await refresh();
      setSuccessMessage(input.successMessage);
    },
    onError: showError
  });

  if (championshipQuery.isPending || registrationsQuery.isPending) {
    return <div className={styles.state}>Carregando participantes...</div>;
  }
  if (championshipQuery.isError || registrationsQuery.isError) {
    return <div className={styles.state}>Não foi possível abrir os participantes.</div>;
  }

  const championship = championshipQuery.data.championship;
  const registrations = registrationsQuery.data;

  function submitIndividual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    individualMutation.mutate(
      String(new FormData(form).get("displayName") ?? ""),
      { onSuccess: () => form.reset() }
    );
  }

  function submitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    teamMutation.mutate({
      name: String(data.get("name") ?? ""),
      shortName: String(data.get("shortName") ?? "") || null,
      logoUrl: String(data.get("logoUrl") ?? "") || null
    }, {
      onSuccess: () => {
        form.reset();
        setCreateLogoUrl("");
      }
    });
  }

  function confirmAction(
    confirmation: string,
    successMessage: string,
    action: () => Promise<unknown>
  ) {
    if (window.confirm(confirmation)) {
      actionMutation.mutate({ action, successMessage });
    }
  }

  return (
    <section className={styles.page}>
      <Link className={styles.back} to={`/painel/campeonatos/${id}`}>← Voltar à competição</Link>
      <header className={styles.heading}>
        <span>02 / participantes</span>
        <h1>{championship.name}</h1>
        <p>{registrations.entryType === "INDIVIDUAL"
          ? "Cadastre os competidores pelo nome."
          : "Monte as equipes e organize seus jogadores."}</p>
      </header>
      {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
      {successMessage && <p className={styles.success} role="status">{successMessage}</p>}

      {registrations.entryType === "INDIVIDUAL" ? (
        <div className={styles.workspace}>
          <form className={styles.createForm} onSubmit={submitIndividual}>
            <label>Nome do participante<input minLength={2} name="displayName" required /></label>
            <button disabled={individualMutation.isPending}>Adicionar</button>
          </form>
          <div className={styles.list}>
            <h2>{registrations.participants.length} participantes</h2>
            {registrations.participants.map((participant, index) => (
              <article key={participant.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{participant.displayName}</strong>
                <button
                  disabled={actionMutation.isPending}
                  onClick={() => confirmAction(
                    `Remover ${participant.displayName}?`,
                    "Participante removido.",
                    () => deleteParticipant(id, participant.id)
                  )}
                  type="button"
                >
                  Remover
                </button>
              </article>
            ))}
            {!registrations.participants.length && <p className={styles.empty}>Nenhum participante cadastrado.</p>}
          </div>
        </div>
      ) : (
        <div className={styles.workspace}>
          <form className={styles.createForm} onSubmit={submitTeam}>
            <div className={styles.importBlock}>
              <strong>Importar da biblioteca</strong>
              <p>Cria uma cópia do clube e do elenco nesta competição.</p>
              <select defaultValue="" name="clubId">
                <option disabled value="">Selecione um clube</option>
                {(clubsQuery.data?.clubs ?? []).map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
              <button
                disabled={actionMutation.isPending || !clubsQuery.data?.clubs.length}
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  const clubId = String(new FormData(form ?? undefined).get("clubId") ?? "");
                  if (!clubId) {
                    setErrorMessage("Selecione um clube para importar.");
                    return;
                  }
                  actionMutation.mutate({
                    action: () => importClubIntoChampionship(clubId, id),
                    successMessage: "Clube e elenco importados para a competição."
                  });
                }}
                type="button"
              >
                Importar clube
              </button>
              <Link to="/painel/clubes">Gerenciar biblioteca de clubes</Link>
            </div>
            <span className={styles.divider}>Ou cadastre uma equipe exclusiva para esta competição</span>
            <label>Nome da equipe<input minLength={2} name="name" required /></label>
            <label>Sigla<input maxLength={12} name="shortName" placeholder="Ex.: RAI" /></label>
            <ImageUrlField
              label="URL do escudo"
              name="logoUrl"
              onChange={setCreateLogoUrl}
              value={createLogoUrl}
            />
            <button disabled={teamMutation.isPending}>Criar equipe</button>
          </form>
          <div className={styles.teams}>
            {registrations.teams.map((team) => (
              <TeamCard
                championshipId={id}
                disabled={actionMutation.isPending}
                key={team.id}
                onAction={actionMutation.mutate}
                onConfirm={confirmAction}
                team={team}
              />
            ))}
            {!registrations.teams.length && <p className={styles.empty}>Nenhuma equipe cadastrada.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function MemberForm({ disabled, onAdd }: {
  disabled: boolean;
  onAdd: (input: {
    displayName: string;
    jerseyNumber: number | null;
    position: string | null;
  }) => void;
}) {
  return (
    <form className={styles.memberForm} onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const jerseyNumber = String(data.get("jerseyNumber") ?? "");
      onAdd({
        displayName: String(data.get("memberName") ?? ""),
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
        position: String(data.get("position") ?? "") || null
      });
      form.reset();
    }}>
      <input aria-label="Nome do jogador" minLength={2} name="memberName" placeholder="Nome do jogador" required />
      <input aria-label="Número da camisa" max={999} min={0} name="jerseyNumber" placeholder="Camisa" type="number" />
      <input aria-label="Posição do jogador" maxLength={40} name="position" placeholder="Posição" />
      <button disabled={disabled}>Adicionar jogador</button>
    </form>
  );
}

type TeamCardProps = {
  championshipId: string;
  team: {
    id: string;
    name: string;
    shortName: string | null;
    logoUrl: string | null;
    members: Array<{
      id: string;
      displayName: string;
      jerseyNumber: number | null;
      position: string | null;
      isCaptain: boolean;
    }>;
  };
  disabled: boolean;
  onAction: (input: {
    action: () => Promise<unknown>;
    successMessage: string;
  }) => void;
  onConfirm: (
    confirmation: string,
    successMessage: string,
    action: () => Promise<unknown>
  ) => void;
};

function TeamCard({
  championshipId,
  team,
  disabled,
  onAction,
  onConfirm
}: TeamCardProps) {
  const [identityLogoUrl, setIdentityLogoUrl] = useState(team.logoUrl ?? "");

  return (
    <article className={styles.team}>
      <header>
        <div>
          <RemoteImage alt="" className={styles.logo} src={team.logoUrl} />
          <span>{team.shortName || "TIME"}</span><h2>{team.name}</h2>
        </div>
        <button
          disabled={disabled}
          onClick={() => onConfirm(
            `Remover a equipe ${team.name} e seus jogadores?`,
            "Equipe removida.",
            () => deleteTeam(championshipId, team.id)
          )}
          type="button"
        >
          Remover equipe
        </button>
      </header>
      <ul>{team.members.map((member) => (
        <li key={member.id}>
          <span>
            {member.jerseyNumber !== null && (
              <b>#{member.jerseyNumber}</b>
            )}{" "}
            {member.displayName}
            {member.isCaptain && <em>Capitão</em>}
            {member.position && <small>{member.position}</small>}
          </span>
          <button onClick={() => onAction({
            action: () => setTeamCaptain(championshipId, team.id, member.id),
            successMessage: `${member.displayName} agora é capitão.`
          })} type="button">Capitão</button>
          <button aria-label={`Remover ${member.displayName}`} onClick={() =>
            onConfirm(
              `Remover ${member.displayName} da equipe?`,
              "Jogador removido.",
              () => deleteTeamMember(championshipId, team.id, member.id)
            )
          } type="button">×</button>
        </li>
      ))}</ul>
      <form className={styles.identityForm} onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onAction({
          action: () => updateTeam(championshipId, team.id, {
            name: String(data.get("name")),
            shortName: String(data.get("shortName")) || null,
            logoUrl: String(data.get("logoUrl")) || null
          }),
          successMessage: "Identidade da equipe atualizada."
        });
      }}>
        <input aria-label="Nome do time" defaultValue={team.name} name="name" required />
        <input aria-label="Sigla do time" defaultValue={team.shortName ?? ""} name="shortName" placeholder="Sigla" />
        <ImageUrlField
          className={styles.teamLogoField}
          label="Escudo do time (URL)"
          name="logoUrl"
          onChange={setIdentityLogoUrl}
          value={identityLogoUrl}
        />
        <button>Salvar identidade</button>
      </form>
      <MemberForm disabled={disabled} onAdd={(input) =>
        onAction({
          action: () => addTeamMember(championshipId, team.id, input),
          successMessage: "Jogador adicionado."
        })
      } />
    </article>
  );
}
