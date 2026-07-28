import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getChampionship } from "../../features/championships/championship-api";
import {
  addTeamMember,
  createParticipant,
  createTeam,
  deleteParticipant,
  deleteTeam,
  deleteTeamMember,
  listRegistrations,
  registrationQueryKey
} from "../../features/participants/participant-api";
import { ApiError } from "../../lib/api";
import styles from "./ManageParticipantsPage.module.css";

export function ManageParticipantsPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const championshipQuery = useQuery({
    queryKey: ["championships", "detail", id],
    queryFn: () => getChampionship(id),
    enabled: Boolean(id)
  });
  const registrationsQuery = useQuery({
    queryKey: registrationQueryKey(id),
    queryFn: () => listRegistrations(id),
    enabled: Boolean(id)
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
    mutationFn: (input: { name: string; shortName: string | null }) =>
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
      shortName: String(data.get("shortName") ?? "") || null
    }, { onSuccess: () => form.reset() });
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
      <Link className={styles.back} to={`/painel/campeonatos/${id}`}>← Voltar à arena</Link>
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
            <label>Nome da equipe<input minLength={2} name="name" required /></label>
            <label>Sigla<input maxLength={12} name="shortName" placeholder="Ex.: RAI" /></label>
            <button disabled={teamMutation.isPending}>Criar equipe</button>
          </form>
          <div className={styles.teams}>
            {registrations.teams.map((team) => (
              <article className={styles.team} key={team.id}>
                <header>
                  <div><span>{team.shortName || "TIME"}</span><h2>{team.name}</h2></div>
                  <button
                    disabled={actionMutation.isPending}
                    onClick={() => confirmAction(
                      `Remover a equipe ${team.name} e seus jogadores?`,
                      "Equipe removida.",
                      () => deleteTeam(id, team.id)
                    )}
                    type="button"
                  >
                    Remover equipe
                  </button>
                </header>
                <ul>{team.members.map((member) => (
                  <li key={member.id}>
                    <span>{member.displayName}</span>
                    <button aria-label={`Remover ${member.displayName}`} onClick={() =>
                      confirmAction(
                        `Remover ${member.displayName} da equipe?`,
                        "Jogador removido.",
                        () => deleteTeamMember(id, team.id, member.id)
                      )
                    } type="button">×</button>
                  </li>
                ))}</ul>
                <MemberForm disabled={actionMutation.isPending} onAdd={(name) =>
                  actionMutation.mutate({
                    action: () => addTeamMember(id, team.id, name),
                    successMessage: "Jogador adicionado."
                  })
                } />
              </article>
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
  onAdd: (name: string) => void;
}) {
  return (
    <form className={styles.memberForm} onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      onAdd(String(new FormData(form).get("memberName") ?? ""));
      form.reset();
    }}>
      <input aria-label="Nome do jogador" minLength={2} name="memberName" placeholder="Nome do jogador" required />
      <button disabled={disabled}>Adicionar jogador</button>
    </form>
  );
}
