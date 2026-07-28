import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getChampionship } from "../../features/championships/championship-api";
import {
  createMatch,
  deleteMatch,
  listMatches,
  matchQueryKey
} from "../../features/matches/match-api";
import { ApiError } from "../../lib/api";
import styles from "./ManageMatchesPage.module.css";

export function ManageMatchesPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const championshipQuery = useQuery({
    queryKey: ["championships", "detail", id],
    queryFn: () => getChampionship(id),
    enabled: Boolean(id)
  });
  const matchesQuery = useQuery({
    queryKey: matchQueryKey(id),
    queryFn: () => listMatches(id),
    enabled: Boolean(id)
  });
  const refresh = async () => {
    setErrorMessage(null);
    await queryClient.invalidateQueries({ queryKey: matchQueryKey(id) });
  };
  const createMutation = useMutation({
    mutationFn: (input: {
      homeEntryId: string;
      awayEntryId: string;
      scheduledAt: string | null;
    }) => createMatch(id, input),
    onSuccess: refresh,
    onError: showError
  });
  const deleteMutation = useMutation({
    mutationFn: (matchId: string) => deleteMatch(id, matchId),
    onSuccess: refresh,
    onError: showError
  });

  function showError(error: Error) {
    setErrorMessage(
      error instanceof ApiError ? error.message : "Não foi possível concluir a ação."
    );
  }

  if (championshipQuery.isPending || matchesQuery.isPending) {
    return <div className={styles.state}>Carregando partidas...</div>;
  }
  if (championshipQuery.isError || matchesQuery.isError) {
    return <div className={styles.state}>Não foi possível abrir as partidas.</div>;
  }

  const championship = championshipQuery.data.championship;
  const { entries, matches } = matchesQuery.data;

  function submitMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const localDate = String(data.get("scheduledAt") ?? "");

    createMutation.mutate({
      homeEntryId: String(data.get("homeEntryId") ?? ""),
      awayEntryId: String(data.get("awayEntryId") ?? ""),
      scheduledAt: localDate ? new Date(localDate).toISOString() : null
    }, { onSuccess: () => form.reset() });
  }

  return (
    <section className={styles.page}>
      <Link className={styles.back} to={`/painel/campeonatos/${id}`}>
        ← Voltar à arena
      </Link>
      <header className={styles.heading}>
        <span>03 / partidas</span>
        <h1>{championship.name}</h1>
        <p>Escolha os adversários e monte o calendário manualmente.</p>
      </header>

      {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}

      <div className={styles.workspace}>
        <form className={styles.createForm} onSubmit={submitMatch}>
          <label>
            Adversário 1
            <select name="homeEntryId" required defaultValue="">
              <option disabled value="">Selecione</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.displayName}</option>
              ))}
            </select>
          </label>
          <span className={styles.versus}>×</span>
          <label>
            Adversário 2
            <select name="awayEntryId" required defaultValue="">
              <option disabled value="">Selecione</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.displayName}</option>
              ))}
            </select>
          </label>
          <label>
            Data e horário opcionais
            <input name="scheduledAt" type="datetime-local" />
          </label>
          <button disabled={createMutation.isPending || entries.length < 2}>
            Criar partida
          </button>
          {entries.length < 2 && (
            <p>Cadastre pelo menos dois adversários antes de criar partidas.</p>
          )}
        </form>

        <div className={styles.matches}>
          <div className={styles.listHeading}>
            <h2>Calendário</h2>
            <span>{matches.length} partidas</span>
          </div>
          {matches.map((match) => (
            <article className={styles.match} key={match.id}>
              <div className={styles.date}>
                <span>{match.scheduledAt
                  ? new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short"
                  }).format(new Date(match.scheduledAt))
                  : "Data a definir"}</span>
                <b>{match.status === "FINISHED" ? "Finalizada" : "Agendada"}</b>
              </div>
              <div className={styles.scoreline}>
                <strong>{match.homeEntry.displayName}</strong>
                <span>{match.homeScore ?? "–"} : {match.awayScore ?? "–"}</span>
                <strong>{match.awayEntry.displayName}</strong>
              </div>
              {match.status !== "FINISHED" && (
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(match.id)}
                  type="button"
                >
                  Excluir
                </button>
              )}
            </article>
          ))}
          {!matches.length && (
            <p className={styles.empty}>O calendário ainda está vazio.</p>
          )}
        </div>
      </div>
    </section>
  );
}
