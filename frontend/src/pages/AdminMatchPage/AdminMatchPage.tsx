import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getChampionship } from "../../features/championships/championship-api";
import {
  changeMatchStatus,
  deleteMatch,
  listMatches,
  listMatchAudit,
  matchQueryKey,
  recordScore
} from "../../features/matches/match-api";
import {
  createMatchEvent,
  deleteMatchEvent,
  listMatchEvents,
  matchEventQueryKey,
  updateMatchEvent,
  type MatchEvent,
  type MatchEventType
} from "../../features/matches/match-event-api";
import {
  getMatchOperations,
  matchOperationsQueryKey,
  replaceMatchLineup,
  updateMatchMetadata,
  type LineupRole,
  type MatchLineupItem,
  type MatchMetadata
} from "../../features/matches/match-operation-api";
import {
  listMatchPeriods,
  matchPeriodQueryKey,
  saveMatchPeriod,
  deleteMatchPeriod
} from "../../features/matches/match-period-api";
import {
  listRegistrations,
  registrationQueryKey
} from "../../features/participants/participant-api";
import { ApiError } from "../../lib/api";
import styles from "./AdminMatchPage.module.css";

const eventLabels: Record<MatchEventType, string> = {
  GOAL: "Gol",
  OWN_GOAL: "Gol contra",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  FREE_THROW: "Lance livre",
  TWO_POINT_SHOT: "Cesta de 2 pontos",
  THREE_POINT_SHOT: "Cesta de 3 pontos",
  VOLLEYBALL_POINT: "Ponto",
  ACE: "Ace",
  BLOCK: "Ponto de bloqueio"
};

const sportEventTypes: Record<string, MatchEventType[]> = {
  Futebol: ["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD"],
  Futsal: ["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD"],
  Basquete: ["FREE_THROW", "TWO_POINT_SHOT", "THREE_POINT_SHOT"],
  "Vôlei": ["VOLLEYBALL_POINT", "ACE", "BLOCK"]
};

const periodConfig: Record<string, { count: number; label: (p: number) => string }> = {
  Basquete: { count: 4, label: (p) => (p <= 4 ? `${p}º quarto` : `${p - 4}ª pror.`) },
  "Vôlei": { count: 5, label: (p) => `${p}º set` }
};

export function AdminMatchPage() {
  const { id = "", matchId = "" } = useParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [overtimePeriods, setOvertimePeriods] = useState(0);

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
  const match = matchesQuery.data?.matches.find((m) => m.id === matchId) ?? null;

  const registrationsQuery = useQuery({
    queryKey: registrationQueryKey(id),
    queryFn: () => listRegistrations(id),
    enabled: Boolean(id)
  });

  const opsQuery = useQuery({
    queryKey: matchOperationsQueryKey(id, matchId),
    queryFn: () => getMatchOperations(id, matchId),
    enabled: Boolean(id) && Boolean(matchId)
  });

  const eventsQuery = useQuery({
    queryKey: matchEventQueryKey(id, matchId),
    queryFn: () => listMatchEvents(id, matchId),
    enabled: Boolean(id) && Boolean(matchId)
  });

  const periodsQuery = useQuery({
    queryKey: matchPeriodQueryKey(id, matchId),
    queryFn: () => listMatchPeriods(id, matchId),
    enabled: Boolean(id) && Boolean(matchId) && Boolean(periodConfig[championshipQuery.data?.championship.sport ?? ""])
  });

  const auditQuery = useQuery({
    queryKey: ["match-audit", id, matchId],
    queryFn: () => listMatchAudit(id, matchId),
    enabled: Boolean(id) && Boolean(matchId)
  });

  const supportsEvents = championshipQuery.data?.championship && sportEventTypes[championshipQuery.data.championship.sport];
  const supportsPeriods = championshipQuery.data?.championship && periodConfig[championshipQuery.data.championship.sport];

  const teams = registrationsQuery.data?.teams ?? [];
  const metadata = opsQuery.data?.metadata ?? null;
  const lineups = opsQuery.data?.lineup ?? [];

  function showError(error: Error) {
    setMessage({ type: "error", text: error instanceof ApiError ? error.message : "Não foi possível concluir a ação." });
  }

  function showSuccess(text: string) {
    setMessage({ type: "success", text });
  }

  const refreshOps = () => queryClient.invalidateQueries({ queryKey: matchOperationsQueryKey(id, matchId) });
  const refreshEvents = () => queryClient.invalidateQueries({ queryKey: matchEventQueryKey(id, matchId) });
  const refreshPeriods = () => queryClient.invalidateQueries({ queryKey: matchPeriodQueryKey(id, matchId) });
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: matchQueryKey(id) });
    await queryClient.invalidateQueries({ queryKey: matchOperationsQueryKey(id, matchId) });
    await queryClient.invalidateQueries({ queryKey: matchEventQueryKey(id, matchId) });
    await queryClient.invalidateQueries({ queryKey: matchPeriodQueryKey(id, matchId) });
    await queryClient.invalidateQueries({ queryKey: ["match-audit", id, matchId] });
  };

  const metadataMutation = useMutation({
    mutationFn: (input: MatchMetadata) => updateMatchMetadata(id, matchId, input),
    onSuccess: async () => { await refreshOps(); showSuccess("Dados da partida atualizados."); },
    onError: showError
  });

  const lineupMutation = useMutation({
    mutationFn: (input: { entryId: string; players: Array<{ teamMemberId: string; role: LineupRole }> }) => replaceMatchLineup(id, matchId, input),
    onSuccess: async () => { await refreshOps(); showSuccess("Escalação salva."); },
    onError: showError
  });

  const scoreMutation = useMutation({
    mutationFn: (input: { homeScore: number; awayScore: number }) => recordScore(id, matchId, input.homeScore, input.awayScore),
    onSuccess: async () => { await refreshAll(); showSuccess("Placar registrado."); },
    onError: showError
  });

  const actionMutation = useMutation({
    mutationFn: (input: { action: "CANCEL" | "REOPEN"; successMsg: string }) =>
      changeMatchStatus(id, matchId, input.action),
    onSuccess: async (_data, input) => { await refreshAll(); showSuccess(input.successMsg); },
    onError: showError
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMatch(id, matchId),
    onSuccess: () => { showSuccess("Partida excluída."); },
    onError: showError
  });

  const createEventMutation = useMutation({
    mutationFn: (input: Parameters<typeof createMatchEvent>[2]) => createMatchEvent(id, matchId, input),
    onSuccess: async () => { await refreshEvents(); showSuccess("Evento registrado."); },
    onError: showError
  });

  const editEventMutation = useMutation({
    mutationFn: (input: { eventId: string; data: Parameters<typeof updateMatchEvent>[3] }) =>
      updateMatchEvent(id, matchId, input.eventId, input.data),
    onSuccess: async () => { await refreshEvents(); showSuccess("Evento atualizado."); },
    onError: showError
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => deleteMatchEvent(id, matchId, eventId),
    onSuccess: async () => { await refreshEvents(); showSuccess("Evento removido."); },
    onError: showError
  });

  const periodMutation = useMutation({
    mutationFn: (input: { periodNumber: number; homeScore: number; awayScore: number }) =>
      saveMatchPeriod(id, matchId, input),
    onSuccess: async () => { await refreshPeriods(); showSuccess("Parcial salva."); },
    onError: showError
  });

  const deletePeriodMutation = useMutation({
    mutationFn: (periodNumber: number) => deleteMatchPeriod(id, matchId, periodNumber),
    onSuccess: async () => { await refreshPeriods(); showSuccess("Parcial removida."); },
    onError: showError
  });

  if (championshipQuery.isPending || matchesQuery.isPending) {
    return <div className={styles.state}>Carregando partida...</div>;
  }
  if (championshipQuery.isError || !match) {
    return <div className={styles.state}>Partida não encontrada.</div>;
  }

  const championship = championshipQuery.data.championship;
  const canEdit = match.status === "SCHEDULED";

  return (
    <div className={styles.page}>
      <Link className={styles.back} to={`/painel/campeonatos/${id}/partidas`}>
        ← Voltar às partidas
      </Link>

      <header className={styles.heading}>
        <span>{championship.sport} · {championship.name}</span>
        <h1>{match.homeEntry.displayName} × {match.awayEntry.displayName}</h1>
        <div className={styles.scoreBadge}>
          <b>{match.homeScore ?? "—"}</b>
          <span>×</span>
          <b>{match.awayScore ?? "—"}</b>
          <span className={styles.status}>{statusLabel(match.status)}</span>
        </div>
        {match.roundNumber && <p className={styles.round}>Rodada {match.roundNumber}</p>}
      </header>

      {message && (
        <p className={message.type === "error" ? styles.errorMsg : styles.successMsg} role="alert">
          {message.text}
        </p>
      )}

      <div className={styles.grid}>

        {/* METADATA */}
        <section className={styles.panel}>
          <header><span>ORGANIZAÇÃO</span><h2>Local e arbitragem</h2></header>
          <form className={styles.metaForm} onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            metadataMutation.mutate({
              venue: String(data.get("venue") ?? "") || null,
              referee: String(data.get("referee") ?? "") || null,
              operationalNotes: String(data.get("operationalNotes") ?? "") || null
            });
          }}>
            <label>Local<input defaultValue={metadata?.venue ?? ""} disabled={!canEdit} name="venue" placeholder="Ex: Ginásio Municipal" /></label>
            <label>Árbitro<input defaultValue={metadata?.referee ?? ""} disabled={!canEdit} name="referee" placeholder="Nome do árbitro" /></label>
            <label className={styles.fullWidth}>Observações<textarea defaultValue={metadata?.operationalNotes ?? ""} disabled={!canEdit} name="operationalNotes" rows={3} placeholder="Informações adicionais sobre a partida" /></label>
            {canEdit && <button disabled={metadataMutation.isPending} type="submit">Salvar dados</button>}
          </form>
        </section>

        {/* SCORE */}
        <section className={styles.panel}>
          <header><span>PLACAR</span><h2>Registrar resultado</h2></header>
          <form className={styles.scoreForm} onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            scoreMutation.mutate({
              homeScore: Number(data.get("homeScore")),
              awayScore: Number(data.get("awayScore"))
            });
          }}>
            <label>{match.homeEntry.displayName}<input defaultValue={match.homeScore ?? ""} disabled={!canEdit && match.status !== "FINISHED"} min={0} name="homeScore" required type="number" /></label>
            <span>×</span>
            <label>{match.awayEntry.displayName}<input defaultValue={match.awayScore ?? ""} disabled={!canEdit && match.status !== "FINISHED"} min={0} name="awayScore" required type="number" /></label>
            {(canEdit || match.status === "FINISHED") && <button disabled={scoreMutation.isPending} type="submit">{match.status === "FINISHED" ? "Corrigir" : "Finalizar"}</button>}
          </form>
        </section>

        {/* LINEUPS */}
        <section className={styles.panel}>
          <header><span>ESCALAÇÃO</span><h2>Titulares e reservas</h2></header>
          {[match.homeEntry, match.awayEntry].map((entry) => {
            const entryLineup = lineups.filter((item) => item.entryId === entry.id);
            const team = teams.find((t) => t.id === entry.teamId);
            return (
              <LineupSection
                key={entry.id}
                canEdit={canEdit}
                entry={entry}
                lineup={entryLineup}
                teamMembers={team?.members ?? []}
                onSave={(players) => lineupMutation.mutate({ entryId: entry.id, players })}
              />
            );
          })}
          {!teams.length && <p className={styles.empty}>Escalações disponíveis apenas para arenas por equipes.</p>}
        </section>

        {/* PERIODS */}
        {supportsPeriods && (
          <section className={styles.panel}>
            <header><span>PARCIAIS</span><h2>Placar detalhado</h2></header>
            <div className={styles.periodsGrid}>
              {periodsQuery.data?.periods && Array.from(
                { length: periodConfig[championship.sport].count },
                (_, i) => i + 1
              ).map((num) => {
                const period = periodsQuery.data!.periods.find((p) => p.periodNumber === num);
                return (
                  <form key={num} className={styles.periodForm} onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    periodMutation.mutate({
                      periodNumber: num,
                      homeScore: Number(data.get("homeScore")),
                      awayScore: Number(data.get("awayScore"))
                    });
                  }}>
                    <strong>{periodConfig[championship.sport].label(num)}</strong>
                    <input aria-label={`${match.homeEntry.displayName} ${periodConfig[championship.sport].label(num)}`} defaultValue={period?.homeScore ?? ""} disabled={!canEdit} min={0} name="homeScore" required type="number" />
                    <span>×</span>
                    <input aria-label={`${match.awayEntry.displayName} ${periodConfig[championship.sport].label(num)}`} defaultValue={period?.awayScore ?? ""} disabled={!canEdit} min={0} name="awayScore" required type="number" />
                    {canEdit && (
                      <>
                        <button disabled={periodMutation.isPending} type="submit">{period ? "Atualizar" : "Salvar"}</button>
                        {period && <button className={styles.dangerBtn} disabled={deletePeriodMutation.isPending} onClick={() => deletePeriodMutation.mutate(num)} type="button">Remover</button>}
                      </>
                    )}
                  </form>
                );
              })}
            </div>
          {canEdit && championship.sport === "Basquete" && (
              <button
                className={styles.overtimeBtn}
                disabled={overtimePeriods >= 4}
                onClick={() => setOvertimePeriods((p) => Math.min(p + 1, 4))}
                type="button"
              >
                + Prorrogação
              </button>
            )}
          </section>
        )}

        {/* EVENTS */}
        {supportsEvents && (
          <section className={styles.panel}>
            <header><span>SÚMULA</span><h2>Eventos da partida</h2></header>
            {canEdit && (
              <EventForm
                championshipId={id}
                matchId={matchId}
                sport={championship.sport}
                homeEntry={match.homeEntry}
                awayEntry={match.awayEntry}
                teams={teams}
                onSubmit={(input) => createEventMutation.mutate(input)}
                isPending={createEventMutation.isPending}
              />
            )}
            <div className={styles.eventList}>
              {eventsQuery.data?.events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  canEdit={canEdit}
                  match={match}
                  sport={championship.sport}
                  teams={teams}
                  onUpdate={(eventId, data) => editEventMutation.mutate({ eventId, data })}
                  onDelete={(eventId) => {
                    if (window.confirm("Remover este evento da súmula?")) {
                      deleteEventMutation.mutate(eventId);
                    }
                  }}
                />
              ))}
              {!eventsQuery.data?.events.length && <p className={styles.empty}>Nenhum evento registrado.</p>}
            </div>
          </section>
        )}

        {/* AUDIT */}
        <section className={styles.panel}>
          <header><span>AUDITORIA</span><h2>Histórico de alterações</h2></header>
          {auditQuery.data?.logs.length ? (
            <ol className={styles.auditList}>
              {auditQuery.data.logs.map((log) => (
                <li key={log.id}>
                  <div><strong>{auditActionLabel(log.action)}</strong></div>
                  <time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(log.createdAt))}</time>
                </li>
              ))}
            </ol>
          ) : <p className={styles.empty}>Nenhuma alteração registrada.</p>}
        </section>

        {/* ACTIONS */}
        <section className={styles.panel}>
          <header><span>AÇÕES</span><h2>Gerenciar partida</h2></header>
          <div className={styles.actions}>
            {match.status !== "CANCELED" && (
              <button className={styles.warningBtn} disabled={actionMutation.isPending} onClick={() => {
                if (window.confirm("Cancelar esta partida?")) {
                  actionMutation.mutate({ action: "CANCEL", successMsg: "Partida cancelada." });
                }
              }} type="button">Cancelar partida</button>
            )}
            {match.status !== "SCHEDULED" && (
              <button disabled={actionMutation.isPending} onClick={() => {
                if (window.confirm("Reabrir a partida e limpar o placar?")) {
                  actionMutation.mutate({ action: "REOPEN", successMsg: "Partida reaberta." });
                }
              }} type="button">Reabrir partida</button>
            )}
            {match.status === "SCHEDULED" && championship.format === "LEAGUE" && (
              <button className={styles.dangerBtn} disabled={deleteMutation.isPending} onClick={() => {
                if (window.confirm("Excluir esta partida definitivamente?")) {
                  deleteMutation.mutate();
                }
              }} type="button">Excluir partida</button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
function LineupSection({
  canEdit,
  entry,
  lineup,
  teamMembers,
  onSave
}: {
  canEdit: boolean;
  entry: { id: string; displayName: string };
  lineup: MatchLineupItem[];
  teamMembers: Array<{ id: string; displayName: string; jerseyNumber: number | null }>;
  onSave: (players: Array<{ teamMemberId: string; role: LineupRole }>) => void;
}) {
  const [starters, setStarters] = useState<string[]>(
    lineup.filter((l) => l.role === "STARTER").map((l) => l.teamMemberId)
  );
  const [subs, setSubs] = useState<string[]>(
    lineup.filter((l) => l.role === "SUBSTITUTE").map((l) => l.teamMemberId)
  );

  function toggleStarter(memberId: string) {
    setStarters((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
    setSubs((prev) => prev.filter((id) => id !== memberId));
  }

  function toggleSub(memberId: string) {
    setSubs((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
    setStarters((prev) => prev.filter((id) => id !== memberId));
  }

  if (!teamMembers.length) return null;

  return (
    <div className={styles.lineupSection}>
      <h3>{entry.displayName}</h3>
      <div className={styles.lineupGrid}>
        <div>
          <span className={styles.lineupLabel}>Titulares</span>
          {teamMembers.map((member) => (
            <label key={member.id} className={styles.lineupItem}>
              <input
                checked={starters.includes(member.id)}
                disabled={!canEdit}
                onChange={() => canEdit && toggleStarter(member.id)}
                type="checkbox"
              />
              <span>{member.jerseyNumber ? `#${member.jerseyNumber} ` : ""}{member.displayName}</span>
            </label>
          ))}
        </div>
        <div>
          <span className={styles.lineupLabel}>Reservas</span>
          {teamMembers.map((member) => (
            <label key={member.id} className={styles.lineupItem}>
              <input
                checked={subs.includes(member.id)}
                disabled={!canEdit}
                onChange={() => canEdit && toggleSub(member.id)}
                type="checkbox"
              />
              <span>{member.displayName}</span>
            </label>
          ))}
        </div>
      </div>
      {canEdit && (
        <button className={styles.lineupSave} disabled={!starters.length} onClick={() => {
          const players: Array<{ teamMemberId: string; role: LineupRole }> = [
            ...starters.map((id) => ({ teamMemberId: id, role: "STARTER" as const })),
            ...subs.map((id) => ({ teamMemberId: id, role: "SUBSTITUTE" as const }))
          ];
          onSave(players);
        }} type="button">Salvar escalação</button>
      )}
    </div>
  );
}

function EventForm({
  sport,
  homeEntry,
  awayEntry,
  teams,
  onSubmit,
  isPending
}: {
  championshipId: string;
  matchId: string;
  sport: string;
  homeEntry: { id: string; displayName: string; teamId?: string | null };
  awayEntry: { id: string; displayName: string; teamId?: string | null };
  teams: Array<{ id: string; members: Array<{ id: string; displayName: string }> }>;
  onSubmit: (input: {
    entryId: string;
    teamMemberId: string | null;
    type: MatchEventType;
    periodNumber: number | null;
    clockSeconds: number | null;
    notes: string | null;
  }) => void;
  isPending: boolean;
}) {
  const [selectedEntryId, setSelectedEntryId] = useState(homeEntry.id);
  const types = sportEventTypes[sport] ?? [];
  const team = teams.find((t) => t.id === (selectedEntryId === homeEntry.id ? homeEntry.teamId : awayEntry.teamId));
  return (
    <form className={styles.eventForm} onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const minute = String(data.get("minute") ?? "");
      const period = String(data.get("periodNumber") ?? "");
      const memberId = String(data.get("teamMemberId") ?? "");
      onSubmit({
        entryId: selectedEntryId,
        teamMemberId: memberId || null,
        type: String(data.get("type")) as MatchEventType,
        periodNumber: period ? Number(period) : null,
        clockSeconds: minute ? Number(minute) * 60 : null,
        notes: String(data.get("notes") ?? "") || null
      });
      e.currentTarget.reset();
    }}>
      <label>Equipe
        <select name="entryId" onChange={(e) => setSelectedEntryId(e.target.value)} value={selectedEntryId}>
          <option value={homeEntry.id}>{homeEntry.displayName}</option>
          <option value={awayEntry.id}>{awayEntry.displayName}</option>
        </select>
      </label>
      <label>Evento
        <select defaultValue={types[0]} name="type">
          {types.map((type) => <option key={type} value={type}>{eventLabels[type]}</option>)}
        </select>
      </label>
      <label>Jogador
        <select defaultValue="" key={selectedEntryId} name="teamMemberId">
          <option value="">Não informado</option>
          {(team?.members ?? []).map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
        </select>
      </label>
      <label>Período
        <select defaultValue="" name="periodNumber">
          <option value="">Não informado</option>
          {(sport === "Futebol" || sport === "Futsal") ? (
            [1, 2].map((p) => <option key={p} value={p}>{p}º tempo</option>)
          ) : sport === "Basquete" ? (
            [1, 2, 3, 4].map((p) => <option key={p} value={p}>{p}º quarto</option>)
          ) : (
            [1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p}º set</option>)
          )}
        </select>
      </label>
      {(sport === "Futebol" || sport === "Futsal" || sport === "Basquete") && (
        <label>Minuto<input min={0} max={300} name="minute" type="number" /></label>
      )}
      <label>Obs.<input maxLength={200} name="notes" placeholder="Opcional" /></label>
      <button disabled={isPending} type="submit">{isPending ? "Registrando..." : "Adicionar"}</button>
    </form>
  );
}

function EventRow({
  event,
  canEdit,
  match,
  sport,
  teams,
  onUpdate,
  onDelete
}: {
  event: MatchEvent;
  canEdit: boolean;
  match: { homeEntry: { id: string; displayName: string; teamId?: string | null }; awayEntry: { id: string; displayName: string; teamId?: string | null } };
  sport: string;
  teams: Array<{ id: string; members: Array<{ id: string; displayName: string }> }>;
  onUpdate: (eventId: string, input: Parameters<typeof updateMatchEvent>[3]) => void;
  onDelete: (eventId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const entry = event.entryId === match.homeEntry.id ? match.homeEntry : match.awayEntry;
  const team = teams.find((t) => t.id === entry.teamId);
  const types = sportEventTypes[sport] ?? [];

  if (editing) {
    return (
      <form className={styles.eventRow} onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const minute = String(data.get("minute") ?? "");
        const period = String(data.get("periodNumber") ?? "");
        const memberId = String(data.get("teamMemberId") ?? "");
        onUpdate(event.id, {
          entryId: event.entryId,
          teamMemberId: memberId || null,
          type: String(data.get("type")) as MatchEventType,
          periodNumber: period ? Number(period) : null,
          clockSeconds: minute ? Number(minute) * 60 : null,
          notes: String(data.get("notes") ?? "") || null
        });
        setEditing(false);
      }}>
        <select defaultValue={event.type} name="type">
          {types.map((t) => <option key={t} value={t}>{eventLabels[t]}</option>)}
        </select>
        <select defaultValue={event.teamMemberId ?? ""} name="teamMemberId">
          <option value="">Não informado</option>
          {(team?.members ?? []).map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
        </select>
        <input defaultValue={event.periodNumber ?? ""} name="periodNumber" placeholder="Período" type="number" />
        <input defaultValue={event.clockSeconds ? Math.floor(event.clockSeconds / 60) : ""} name="minute" placeholder="Minuto" type="number" />
        <input defaultValue={event.notes ?? ""} name="notes" placeholder="Obs" />
        <button type="submit">Salvar</button>
        <button onClick={() => setEditing(false)} type="button">Cancelar</button>
      </form>
    );
  }

  return (
    <div className={styles.eventRow}>
      <div className={styles.eventInfo}>
        <strong>{eventLabels[event.type]}</strong>
        <span>{event.actorName ?? "—"}</span>
        <span className={styles.eventMeta}>
          {event.periodNumber ? `${event.periodNumber}º` : "—"}
          {event.clockSeconds !== null ? ` ${Math.floor(event.clockSeconds / 60)}'` : ""}
        </span>
        <span>{entry.displayName}</span>
      </div>
      {canEdit && (
        <div className={styles.eventActions}>
          <button onClick={() => setEditing(true)} type="button">Editar</button>
          <button className={styles.dangerBtn} onClick={() => onDelete(event.id)} type="button">Remover</button>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "FINISHED") return "Finalizada";
  if (status === "CANCELED") return "Cancelada";
  return "Agendada";
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    SCORE_CHANGED: "Placar alterado",
    MATCH_CANCELED: "Partida cancelada",
    MATCH_REOPENED: "Partida reaberta",
    MATCH_METADATA_CHANGED: "Dados da partida alterados",
    MATCH_LINEUP_CHANGED: "Escalação alterada",
    MATCH_EVENT_CREATED: "Evento adicionado",
    MATCH_EVENT_CHANGED: "Evento modificado",
    MATCH_EVENT_DELETED: "Evento removido"
  };
  return labels[action] ?? action;
}