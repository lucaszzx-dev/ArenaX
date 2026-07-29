import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getChampionship } from "../../features/championships/championship-api";
import { MatchEventsPanel } from "../../components/MatchEventsPanel/MatchEventsPanel";
import { MatchPeriodsPanel } from "../../components/MatchPeriodsPanel/MatchPeriodsPanel";
import {
  createMatch,
  changeMatchStatus,
  deleteMatch,
  listStandings,
  listMatches,
  matchQueryKey,
  recordScore,
  updateMatchSchedule
} from "../../features/matches/match-api";
import { getStandingLabels } from "../../features/matches/standing-labels";
import {
  listRegistrations,
  registrationQueryKey
} from "../../features/participants/participant-api";
import { ApiError } from "../../lib/api";
import styles from "./ManageMatchesPage.module.css";

export function ManageMatchesPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
  const standingsQuery = useQuery({
    queryKey: ["championships", id, "standings"],
    queryFn: () => listStandings(id),
    enabled: Boolean(id)
  });
  const registrationsQuery = useQuery({
    queryKey: registrationQueryKey(id),
    queryFn: () => listRegistrations(id),
    enabled: Boolean(id)
  });
  const refresh = async () => {
    setErrorMessage(null);
    await queryClient.invalidateQueries({ queryKey: matchQueryKey(id) });
    await queryClient.invalidateQueries({
      queryKey: ["championships", id, "standings"]
    });
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
  const scoreMutation = useMutation({
    mutationFn: (input: {
      matchId: string;
      homeScore: number;
      awayScore: number;
    }) => recordScore(id, input.matchId, input.homeScore, input.awayScore),
    onSuccess: refresh,
    onError: showError
  });
  const actionMutation = useMutation({
    mutationFn: (input: {
      request: () => Promise<unknown>;
      successMessage: string;
    }) => input.request(),
    onSuccess: async (_data, input) => {
      await refresh();
      setSuccessMessage(input.successMessage);
    },
    onError: showError
  });

  function showError(error: Error) {
    setSuccessMessage(null);
    setErrorMessage(
      error instanceof ApiError ? error.message : "Não foi possível concluir a ação."
    );
  }

  if (
    championshipQuery.isPending ||
    matchesQuery.isPending ||
    standingsQuery.isPending ||
    registrationsQuery.isPending
  ) {
    return <div className={styles.state}>Carregando partidas...</div>;
  }
  if (
    championshipQuery.isError ||
    matchesQuery.isError ||
    standingsQuery.isError ||
    registrationsQuery.isError
  ) {
    return <div className={styles.state}>Não foi possível abrir as partidas.</div>;
  }

  const championship = championshipQuery.data.championship;
  const { entries, matches } = matchesQuery.data;
  const { standings } = standingsQuery.data;
  const { teams } = registrationsQuery.data;
  const supportsEvents =
    championship.sport === "Futebol" ||
    championship.sport === "Futsal" ||
    championship.sport === "Basquete" ||
    championship.sport === "Vôlei";
  const standingLabels = getStandingLabels(championship.sport);

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
      {successMessage && (
        <p className={styles.success} role="status">{successMessage}</p>
      )}

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
                <b>{matchStatusLabel(match.status)}</b>
              </div>
              <div className={styles.scoreline}>
                <strong>{match.homeEntry.displayName}</strong>
                <span>{match.homeScore ?? "–"} : {match.awayScore ?? "–"}</span>
                <strong>{match.awayEntry.displayName}</strong>
              </div>
              {supportsEvents && (
                <MatchEventsPanel
                  championshipId={id}
                  match={match}
                  sport={championship.sport}
                  teams={teams}
                />
              )}
              <MatchPeriodsPanel
                awayName={match.awayEntry.displayName}
                championshipId={id}
                disabled={match.status !== "SCHEDULED"}
                homeName={match.homeEntry.displayName}
                matchId={match.id}
                sport={championship.sport}
              />
              {match.status !== "CANCELED" && (
                <ScoreForm
                  awayName={match.awayEntry.displayName}
                  defaultAway={match.awayScore}
                  defaultHome={match.homeScore}
                  disabled={scoreMutation.isPending}
                  homeName={match.homeEntry.displayName}
                  onSave={(homeScore, awayScore) => scoreMutation.mutate({
                    matchId: match.id,
                    homeScore,
                    awayScore
                  })}
                />
              )}
              <div className={styles.matchActions}>
                {match.status === "SCHEDULED" && (
                  <ScheduleForm
                    defaultValue={toLocalDateTime(match.scheduledAt)}
                    disabled={actionMutation.isPending}
                    onSave={(scheduledAt) => actionMutation.mutate({
                      request: () => updateMatchSchedule(id, match.id, scheduledAt),
                      successMessage: "Agendamento atualizado."
                    })}
                  />
                )}
                {match.status !== "CANCELED" && (
                  <button
                    disabled={actionMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Cancelar esta partida?")) {
                        actionMutation.mutate({
                          request: () => changeMatchStatus(id, match.id, "CANCEL"),
                          successMessage: "Partida cancelada."
                        });
                      }
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                )}
                {match.status !== "SCHEDULED" && (
                  <button
                    disabled={actionMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Reabrir a partida e limpar o placar?")) {
                        actionMutation.mutate({
                          request: () => changeMatchStatus(id, match.id, "REOPEN"),
                          successMessage: "Partida reaberta."
                        });
                      }
                    }}
                    type="button"
                  >
                    Reabrir
                  </button>
                )}
                {match.status === "SCHEDULED" && (
                  <button
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Excluir esta partida definitivamente?")) {
                        deleteMutation.mutate(match.id);
                      }
                    }}
                    type="button"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </article>
          ))}
          {!matches.length && (
            <p className={styles.empty}>O calendário ainda está vazio.</p>
          )}
        </div>
      </div>

      <section className={styles.standings}>
        <div className={styles.listHeading}>
          <h2>Classificação</h2>
          <span>Atualizada pelos placares finalizados</span>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Participante</th><th>J</th><th>V</th>
                {championship.allowsDraw && <th title="Empates">E</th>}
                <th>D</th>
                <th title={standingLabels.scoreForTitle}>{standingLabels.scoreFor}</th>
                <th title={standingLabels.scoreAgainstTitle}>{standingLabels.scoreAgainst}</th>
                <th title={standingLabels.scoreDifferenceTitle}>
                  {standingLabels.scoreDifference}
                </th>
                <th>PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.entryId}>
                  <td>{row.position}</td>
                  <th>{row.displayName}</th>
                  <td>{row.played}</td><td>{row.wins}</td>
                  {championship.allowsDraw && <td>{row.draws}</td>}
                  <td>{row.losses}</td>
                  <td>{row.scoreFor}</td><td>{row.scoreAgainst}</td>
                  <td>{row.scoreDifference}</td><td><b>{row.points}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function ScheduleForm({
  defaultValue,
  disabled,
  onSave
}: {
  defaultValue: string;
  disabled: boolean;
  onSave: (scheduledAt: string | null) => void;
}) {
  return (
    <form className={styles.scheduleForm} onSubmit={(event) => {
      event.preventDefault();
      const value = String(new FormData(event.currentTarget).get("schedule") ?? "");
      onSave(value ? new Date(value).toISOString() : null);
    }}>
      <input defaultValue={defaultValue} name="schedule" type="datetime-local" />
      <button disabled={disabled}>Alterar data</button>
    </form>
  );
}

function matchStatusLabel(status: "SCHEDULED" | "FINISHED" | "CANCELED") {
  if (status === "FINISHED") return "Finalizada";
  if (status === "CANCELED") return "Cancelada";
  return "Agendada";
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ScoreForm({
  awayName,
  defaultAway,
  defaultHome,
  disabled,
  homeName,
  onSave
}: {
  awayName: string;
  defaultAway: number | null;
  defaultHome: number | null;
  disabled: boolean;
  homeName: string;
  onSave: (homeScore: number, awayScore: number) => void;
}) {
  return (
    <form className={styles.scoreForm} onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      onSave(Number(data.get("homeScore")), Number(data.get("awayScore")));
    }}>
      <input
        aria-label={`Placar de ${homeName}`}
        defaultValue={defaultHome ?? ""}
        min={0}
        name="homeScore"
        required
        type="number"
      />
      <span>×</span>
      <input
        aria-label={`Placar de ${awayName}`}
        defaultValue={defaultAway ?? ""}
        min={0}
        name="awayScore"
        required
        type="number"
      />
      <button disabled={disabled}>
        {defaultHome === null ? "Finalizar" : "Corrigir"}
      </button>
    </form>
  );
}
