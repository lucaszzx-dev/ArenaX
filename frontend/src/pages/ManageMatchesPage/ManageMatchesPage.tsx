import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getChampionship } from "../../features/championships/championship-api";
import { championshipDetailQueryKey } from "../../features/championships/championship-query";

import {
  createMatch,
  generateLeagueMatches,
  changeMatchStatus,
  deleteMatch,
  listStandings,
  listMatches,
  matchQueryKey,
  recordScore,
  updateMatchSchedule
} from "../../features/matches/match-api";
import { getStandingLabels } from "../../features/matches/standing-labels";
import { buildCalendar } from "../../features/matches/schedule-utils";
import type { ArenaMatch } from "../../features/matches/match-api";

import { ApiError } from "../../lib/api";
import { Bracket } from "../../components/Bracket/Bracket";
import { generateGroupBracket, generateGroups, getGroups } from "../../features/group-stage/group-stage-api";
import {
  bracketQueryKey,
  generateBracket,
  getBracket,
  setupFirstRound
} from "../../features/knockout/knockout-api";
import styles from "./ManageMatchesPage.module.css";

const CALENDAR_FILTERS = [
  { value: "ALL", label: "Todas" },
  { value: "TODAY", label: "Hoje" },
  { value: "UPCOMING", label: "Próximas" },
  { value: "FINISHED", label: "Finalizadas" }
];

export function ManageMatchesPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [calendarFilter, setCalendarFilter] = useState("ALL");
  const [roundFilter, setRoundFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const championshipQuery = useQuery({
    queryKey: championshipDetailQueryKey(id),
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

  const bracketQuery = useQuery({
    queryKey: bracketQueryKey(id),
    queryFn: () => getBracket(id),
    enabled: Boolean(id) && ["KNOCKOUT", "GROUP_KNOCKOUT"].includes(championshipQuery.data?.championship.format ?? "")
  });
  const groupsQuery = useQuery({ queryKey: ["groups", id], queryFn: () => getGroups(id), enabled: Boolean(id) && championshipQuery.data?.championship.format === "GROUP_KNOCKOUT" });
  const refresh = async () => {
    setErrorMessage(null);
    await queryClient.invalidateQueries({ queryKey: matchQueryKey(id) });
    await queryClient.invalidateQueries({
      queryKey: ["championships", id, "standings"]
    });
    await queryClient.invalidateQueries({ queryKey: ["match-audit", id] });
    await queryClient.invalidateQueries({ queryKey: bracketQueryKey(id) });
    await queryClient.invalidateQueries({ queryKey: ["groups", id] });
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
  const generateMutation = useMutation({
    mutationFn: (input: {
      legs: 1 | 2;
      startsAt: string | null;
      intervalDays: number;
    }) => generateLeagueMatches(id, input),
    onSuccess: async (result) => {
      await refresh();
      setSuccessMessage(
        `${result.total} partidas distribuídas em ${result.rounds} rodadas.`
      );
    },
    onError: showError
  });
  const bracketMutation = useMutation({
    mutationFn: () => generateBracket(id),
    onSuccess: async (result) => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: bracketQueryKey(id) });
      setSuccessMessage(
        `Chaveamento criado com ${result.totalRounds} fases e ${result.byes} folgas.`
      );
    },
    onError: showError
  });
  const groupGenerationMutation = useMutation({ mutationFn: () => generateGroups(id), onSuccess: refresh, onError: showError });
  const groupBracketMutation = useMutation({ mutationFn: () => generateGroupBracket(id), onSuccess: refresh, onError: showError });
  const manualBracketMutation = useMutation({
    mutationFn: (pairings: Array<{ homeEntryId: string | null; awayEntryId: string | null }>) =>
      setupFirstRound(id, pairings),
    onSuccess: async (result) => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: bracketQueryKey(id) });
      setSuccessMessage(
        `Primeira rodada montada com ${result.totalRounds} fases e ${result.byes} folgas.`
      );
    },
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

  const roundOptions = useMemo(
    () =>
      [...new Set((matchesQuery.data?.matches ?? []).map((match) => String(match.roundNumber ?? "sem-rodada")))]
        .sort((a, b) => {
          const na = a === "sem-rodada" ? Number.MAX_SAFE_INTEGER : Number(a);
          const nb = b === "sem-rodada" ? Number.MAX_SAFE_INTEGER : Number(b);
          return na - nb;
        }),
    [matchesQuery.data]
  );
  const filteredMatches = useMemo(() => {
    const todayKey = new Date().toLocaleDateString("en-CA");
    return (matchesQuery.data?.matches ?? []).filter((match) => {
      if (roundFilter && String(match.roundNumber ?? "sem-rodada") !== roundFilter) return false;
      if (teamFilter && match.homeEntryId !== teamFilter && match.awayEntryId !== teamFilter) return false;
      if (calendarFilter === "FINISHED") return match.status === "FINISHED";
      if (calendarFilter === "TODAY") {
        return match.scheduledAt !== null &&
          new Date(match.scheduledAt).toLocaleDateString("en-CA") === todayKey;
      }
      if (calendarFilter === "UPCOMING") {
        return match.status === "SCHEDULED" &&
          (match.scheduledAt === null || new Date(match.scheduledAt).getTime() >= Date.now());
      }
      return true;
    });
  }, [matchesQuery.data, calendarFilter, roundFilter, teamFilter]);

  if (
    championshipQuery.isPending ||
    matchesQuery.isPending ||
    standingsQuery.isPending
  ) {
    return <div className={styles.state}>Carregando partidas...</div>;
  }
  if (
    championshipQuery.isError ||
    matchesQuery.isError ||
    standingsQuery.isError
  ) {
    return <div className={styles.state}>Não foi possível abrir as partidas.</div>;
  }

  const championship = championshipQuery.data.championship;
  const { entries, matches } = matchesQuery.data;
  const { standings } = standingsQuery.data;
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
        ← Voltar à competição
      </Link>
      <header className={styles.heading}>
        <span>03 / partidas</span>
        <h1>{championship.name}</h1>
        <p>
          {championship.format === "LEAGUE"
            ? "Gere as rodadas de pontos corridos ou crie confrontos manualmente."
            : "Monte a primeira rodada do mata-mata manualmente ou use a geração automática."}
        </p>
      </header>

      {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
      {successMessage && (
        <p className={styles.success} role="status">{successMessage}</p>
      )}

      <div className={styles.workspace}>
        <form className={styles.createForm} onSubmit={submitMatch}>
          <section className={styles.generator}>
            <strong>Gerar calendário</strong>
            {championship.format === "LEAGUE" ? (
              <>
                <label>
                  Turnos
                  <select defaultValue="1" name="legs">
                    <option value="1">Turno único</option>
                    <option value="2">Ida e volta</option>
                  </select>
                </label>
                <label>
                  Início opcional
                  <input name="generationStartsAt" type="datetime-local" />
                </label>
                <label>
                  Dias entre rodadas
                  <input defaultValue={7} max={30} min={1} name="intervalDays" type="number" />
                </label>
                <button
                  disabled={
                    generateMutation.isPending ||
                    entries.length < 2 ||
                    matches.length > 0 ||
                    championship.status !== "DRAFT"
                  }
                  onClick={(event) => {
                    const data = new FormData(event.currentTarget.form ?? undefined);
                    const startsAt = String(data.get("generationStartsAt") ?? "");
                    generateMutation.mutate({
                      legs: data.get("legs") === "2" ? 2 : 1,
                      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
                      intervalDays: Number(data.get("intervalDays") ?? 7)
                    });
                  }}
                  type="button"
                >
                  Gerar todas as rodadas
                </button>
                {matches.length > 0 && (
                  <p>O calendário precisa estar vazio para gerar automaticamente.</p>
                )}
              </>
            ) : championship.format === "GROUP_KNOCKOUT" ? (
              <>
                <p>Fase de grupos → classificação → mata-mata.</p>
                <button disabled={groupGenerationMutation.isPending || entries.length < 4 || matches.length > 0 || championship.status !== "DRAFT"} onClick={() => groupGenerationMutation.mutate()} type="button">Gerar grupos e partidas</button>
                {groupsQuery.data && <p>{groupsQuery.data.matches.every((match) => match.status === "FINISHED") ? "Fase concluída: chaveamento disponível." : "Conclua todas as partidas dos grupos para liberar o chaveamento."}</p>}
                <button disabled={groupBracketMutation.isPending || !groupsQuery.data?.matches.length || !groupsQuery.data.matches.every((match) => match.status === "FINISHED")} onClick={() => groupBracketMutation.mutate()} type="button">Gerar mata-mata</button>
              </>
            ) : (
              <>
                <p>Distribui os inscritos, aplica folgas e cria a primeira fase.</p>
                <button
                  disabled={
                    bracketMutation.isPending ||
                    entries.length < 2 ||
                    matches.length > 0 ||
                    championship.status !== "DRAFT"
                  }
                  onClick={() => bracketMutation.mutate()}
                  type="button"
                >
                  Gerar chaveamento
                </button>
                <ManualFirstRoundForm
                  disabled={manualBracketMutation.isPending}
                  entries={entries}
                  onSave={(pairings) => manualBracketMutation.mutate(pairings)}
                />
              </>
            )}
          </section>
          {championship.format === "LEAGUE" && (
            <>
              <span className={styles.divider}>criação manual</span>
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
            </>
          )}
        </form>

        <div className={styles.matches}>
          {(championship.format === "KNOCKOUT" || championship.format === "GROUP_KNOCKOUT") && bracketQuery.data && (
            <Bracket bracket={bracketQuery.data} />
          )}
          {championship.format === "GROUP_KNOCKOUT" && groupsQuery.data?.groups.map((group) => (
            <section className={styles.standings} key={group.number}><h2>{group.name}</h2><p>{group.entries.map((entry) => entry.displayName).join(" · ")}</p><table><thead><tr><th>Pos.</th><th>Participante</th><th>J</th><th>V</th><th>Pts.</th></tr></thead><tbody>{group.standings.map((row) => <tr className={row.position <= (championship.qualifiersPerGroup ?? 0) ? styles.qualified : undefined} key={row.entryId}><td>{row.position}</td><td>{row.displayName}</td><td>{row.played}</td><td>{row.wins}</td><td>{row.points}</td></tr>)}</tbody></table></section>
          ))}
          <div className={styles.listHeading}>
            <h2>Calendário</h2>
            <span>{matches.length} partidas</span>
          </div>
          <div className={styles.calendarFilters} role="group" aria-label="Filtros do calendário">
            {CALENDAR_FILTERS.map((filter) => (
              <button
                aria-pressed={calendarFilter === filter.value}
                className={calendarFilter === filter.value ? styles.activeFilter : undefined}
                key={filter.value}
                onClick={() => setCalendarFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <select
            aria-label="Filtrar por rodada"
            className={styles.roundFilter}
            value={roundFilter}
            onChange={(event) => setRoundFilter(event.target.value)}
          >
            <option value="">Todas as rodadas</option>
            {roundOptions.map((round) => (
              <option key={round} value={round}>Rodada {round}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por equipe"
            className={styles.roundFilter}
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
          >
            <option value="">Todas as equipes</option>
            {entries.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.displayName}</option>
            ))}
          </select>
          {filteredMatches.length === 0 ? (
            <p className={styles.empty}>
              {matches.length === 0
                ? "O calendário ainda está vazio. Gere as rodadas ou crie confrontos manualmente."
                : "Nenhuma partida para os filtros selecionados."}
            </p>
          ) : (
            <div className={styles.calendarList}>
              {buildCalendar(filteredMatches).map((round) => (
                <section className={styles.calendarRound} key={round.roundNumber ?? "sem-rodada"}>
                  <details className={styles.roundGroup} open={round.roundNumber === null || round.roundNumber <= 2}>
                    <summary>
                      <strong>{round.roundNumber ? `Rodada ${round.roundNumber}` : "Sem rodada"}</strong>
                      <span>{round.dates.reduce((total, date) => total + date.matches.length, 0)} partidas</span>
                    </summary>
                    <div className={styles.roundBody}>
                      {round.dates.map((date) => (
                        <div className={styles.dateGroup} key={date.dateKey ?? "sem-data"}>
                          <span className={styles.dateLabel}>{date.label}</span>
                          <div className={styles.dateMatches}>
                            {date.matches.map((match) => (
                              <MatchCard
                                actionMutation={actionMutation}
                                canDelete={championship.format === "LEAGUE"}
                                championshipId={id}
                                deleteMutation={deleteMutation}
                                key={match.id}
                                match={match}
                                scoreMutation={scoreMutation}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </section>
              ))}
            </div>
          )}
        </div>      </div>

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

function MatchCard({
  actionMutation,
  canDelete,
  championshipId,
  deleteMutation,
  match,
  scoreMutation
}: {
  actionMutation: {
    isPending: boolean;
    mutate: (input: { request: () => Promise<unknown>; successMessage: string }) => void;
  };
  canDelete: boolean;
  championshipId: string;
  deleteMutation: {
    isPending: boolean;
    mutate: (matchId: string) => void;
  };
  match: ArenaMatch;
  scoreMutation: {
    isPending: boolean;
    mutate: (input: { matchId: string; homeScore: number; awayScore: number }) => void;
  };
}) {
  const schedule = (scheduledAt: string | null) =>
    actionMutation.mutate({
      request: () => updateMatchSchedule(championshipId, match.id, scheduledAt),
      successMessage: "Agendamento atualizado."
    });
  const cancel = () =>
    actionMutation.mutate({
      request: () => changeMatchStatus(championshipId, match.id, "CANCEL"),
      successMessage: "Partida cancelada."
    });
  const reopen = () =>
    actionMutation.mutate({
      request: () => changeMatchStatus(championshipId, match.id, "REOPEN"),
      successMessage: "Partida reaberta."
    });

  return (
    <article className={`${styles.match} ${styles[`status-${match.status}`]}`}>
      <div className={styles.matchWhen}>
        <span className={styles.matchTime}>
          {match.scheduledAt
            ? new Intl.DateTimeFormat("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
              }).format(new Date(match.scheduledAt))
            : "Horário"}
        </span>
        <b>{matchStatusLabel(match.status)}</b>
        {match.venue && <small title={match.venue}>{match.venue}</small>}
      </div>
      <div className={styles.scoreline}>
        <strong>{match.homeEntry.displayName}</strong>
        <span>{match.homeScore ?? "–"} : {match.awayScore ?? "–"}</span>
        <strong>{match.awayEntry.displayName}</strong>
      </div>
      <div className={styles.matchQuickActions}>
        {match.status !== "CANCELED" && (
          <ScoreForm
            awayName={match.awayEntry.displayName}
            defaultAway={match.awayScore}
            defaultHome={match.homeScore}
            disabled={scoreMutation.isPending}
            homeName={match.homeEntry.displayName}
            onSave={(homeScore, awayScore) =>
              scoreMutation.mutate({ matchId: match.id, homeScore, awayScore })
            }
          />
        )}
        <Link
          className={styles.manageLink}
          to={`/painel/campeonatos/${championshipId}/partidas/${match.id}`}
        >
          Administrar
        </Link>
        {match.status === "SCHEDULED" && (
          <ScheduleForm
            defaultValue={toLocalDateTime(match.scheduledAt)}
            disabled={actionMutation.isPending}
            onSave={schedule}
          />
        )}
        {match.status !== "CANCELED" && (
          <button
            disabled={actionMutation.isPending}
            onClick={() => {
              if (window.confirm("Cancelar esta partida?")) cancel();
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
              if (window.confirm("Reabrir a partida e limpar o placar?")) reopen();
            }}
            type="button"
          >
            Reabrir
          </button>
        )}
        {match.status === "SCHEDULED" && canDelete && (
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
  );
}

function ManualFirstRoundForm({
  disabled,
  entries,
  onSave
}: {
  disabled: boolean;
  entries: Array<{ id: string; displayName: string }>;
  onSave: (pairings: Array<{ homeEntryId: string | null; awayEntryId: string | null }>) => void;
}) {
  const slots = Math.max(1, Math.ceil(entries.length / 2));
  const [pairings, setPairings] = useState(
    () => Array.from({ length: slots }, () => ({ homeEntryId: "", awayEntryId: "" }))
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const used = new Set(
    pairings.flatMap((pairing) => [pairing.homeEntryId, pairing.awayEntryId]).filter(Boolean)
  );
  const complete =
    pairings.every((pairing) => pairing.homeEntryId && pairing.awayEntryId) &&
    used.size === entries.length;

  function update(index: number, key: "homeEntryId" | "awayEntryId", value: string) {
    setPairings((prev) =>
      prev.map((pairing, itemIndex) =>
        itemIndex === index ? { ...pairing, [key]: value } : pairing
      )
    );
    setConfirmOpen(false);
  }

  return (
    <details className={styles.manualBracket}>
      <summary>Montar primeira rodada manualmente</summary>
      <p className={styles.manualHint}>
        Escolha os confrontos iniciais. Se o número de inscritos for ímpar, deixe um lado vazio para aplicar a folga.
      </p>
      <div className={styles.pairingList}>
        {pairings.map((pairing, index) => (
          <div className={styles.pairing} key={index}>
            <select
              aria-label={`Mandante do confronto ${index + 1}`}
              value={pairing.homeEntryId}
              onChange={(event) => update(index, "homeEntryId", event.target.value)}
            >
              <option value="">Folga / selecionar</option>
              {entries.map((entry) => (
                <option
                  disabled={used.has(entry.id) && entry.id !== pairing.homeEntryId}
                  key={entry.id}
                  value={entry.id}
                >
                  {entry.displayName}
                </option>
              ))}
            </select>
            <span>×</span>
            <select
              aria-label={`Visitante do confronto ${index + 1}`}
              value={pairing.awayEntryId}
              onChange={(event) => update(index, "awayEntryId", event.target.value)}
            >
              <option value="">Folga / selecionar</option>
              {entries.map((entry) => (
                <option
                  disabled={used.has(entry.id) && entry.id !== pairing.awayEntryId}
                  key={entry.id}
                  value={entry.id}
                >
                  {entry.displayName}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className={styles.pairingPreview}>
        {pairings.map((pairing, index) => {
          const home = entries.find((entry) => entry.id === pairing.homeEntryId)?.displayName;
          const away = entries.find((entry) => entry.id === pairing.awayEntryId)?.displayName;
          return (
            <p key={index}>
              <strong>{home ?? "Folga"}</strong>
              <span>×</span>
              <strong>{away ?? "Folga"}</strong>
            </p>
          );
        })}
      </div>
      {complete ? (
        confirmOpen ? (
          <div className={styles.pairingConfirm}>
            <p>
              Confirmar este emparelhamento? A progressão automática dos vencedores continua valendo depois.
            </p>
            <button
              disabled={disabled}
              onClick={() =>
                onSave(
                  pairings.map((pairing) => ({
                    homeEntryId: pairing.homeEntryId || null,
                    awayEntryId: pairing.awayEntryId || null
                  }))
                )
              }
              type="button"
            >
              Confirmar primeira rodada
            </button>
            <button onClick={() => setConfirmOpen(false)} type="button">
              Revisar
            </button>
          </div>
        ) : (
          <button
            className={styles.pairingConfirmButton}
            disabled={disabled}
            onClick={() => setConfirmOpen(true)}
            type="button"
          >
            Revisar e confirmar
          </button>
        )
      ) : (
        <p className={styles.manualHint}>
          {used.size}/{entries.length} participantes distribuídos. Todos os inscritos precisam ser usados.
        </p>
      )}
    </details>
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
      <input aria-label="Data e hora da partida" defaultValue={defaultValue} name="schedule" type="datetime-local" />
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
