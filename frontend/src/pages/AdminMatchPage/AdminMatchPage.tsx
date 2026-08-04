import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getChampionship } from "../../features/championships/championship-api";
import { championshipDetailQueryKey } from "../../features/championships/championship-query";
import {
  changeMatchStatus,
  deleteMatch,
  listMatches,
  listMatchAudit,
  matchQueryKey,
  recordScore,
  updateMatchMvp
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

const eventLabels: Record<string, string> = {
  GOAL: "Gol",
  OWN_GOAL: "Gol contra",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  FREE_THROW: "Lance livre",
  TWO_POINT_SHOT: "Cesta de 2 pontos",
  THREE_POINT_SHOT: "Cesta de 3 pontos",
  VOLLEYBALL_POINT: "Ponto",
  ACE: "Ace",
  BLOCK: "Ponto de bloqueio",
  ERROR: "Erro do adversário",
  SPIKE: "Ataque convertido",
  SERVE_ERROR: "Erro de saque",
  ATTACK_ERROR: "Erro de ataque",
  RECEPTION_ERROR: "Erro de recepção",
  PERSONAL_FOUL: "Falta pessoal",
  ASSIST: "Assist\u00eancia",
  SUBSTITUTION: "Substitui\u00e7\u00e3o",
  PENALTY_CONVERTED: "P\u00eanalti convertido",
  PENALTY_MISSED: "P\u00eanalti perdido"
};

const sportEventTypes: Record<string, MatchEventType[]> = {
  Futebol: ["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD", "ASSIST", "SUBSTITUTION", "PENALTY_CONVERTED", "PENALTY_MISSED"],
  Futsal: ["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD", "ASSIST", "SUBSTITUTION", "PENALTY_CONVERTED", "PENALTY_MISSED"],
  Basquete: ["FREE_THROW", "TWO_POINT_SHOT", "THREE_POINT_SHOT", "PERSONAL_FOUL"],
  "Vôlei": ["VOLLEYBALL_POINT", "ACE", "BLOCK", "ERROR", "SPIKE", "SERVE_ERROR", "ATTACK_ERROR", "RECEPTION_ERROR"]
};

const periodConfig: Record<string, { count: number; label: (p: number, total?: number) => string }> = {
  Basquete: { count: 4, label: (p) => (p <= 4 ? `${p}º quarto` : `${p - 4}ª pror.`) },
  "V\u00f4lei": { count: 5, label: (p, total) => p >= (total ?? 5) ? `${p}º set (Tie-break)` : `${p}º set` }
};

type AdminTab = "partida" | "elencos" | "eventos" | "regras" | "detalhes";

const ADMIN_TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "partida", label: "Partida" },
  { id: "elencos", label: "Elencos" },
  { id: "eventos", label: "Eventos" },
  { id: "regras", label: "Regras" },
  { id: "detalhes", label: "Detalhes" }
];
export function AdminMatchPage() {
  const { id = "", matchId = "" } = useParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [overtimePeriods, setOvertimePeriods] = useState(0);
  const [tab, setTab] = useState<AdminTab>("partida");

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
  const homeTeam = teams.find((t) => t.id === match?.homeEntry.teamId);
  const awayTeam = teams.find((t) => t.id === match?.awayEntry.teamId);
  const mvpCandidates = [
    ...(homeTeam?.members ?? []).map((m) => ({ ...m, teamName: match?.homeEntry.displayName ?? "" })),
    ...(awayTeam?.members ?? []).map((m) => ({ ...m, teamName: match?.awayEntry.displayName ?? "" }))
  ];

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

  const mvpMutation = useMutation({
    mutationFn: (mvpId: string | null) => updateMatchMvp(id, matchId, mvpId),
    onSuccess: async () => { await refreshAll(); showSuccess("MVP definido."); },
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
  const visibleAdminTabs = ADMIN_TABS.filter((item) => {
    if (item.id === "eventos") return Boolean(supportsEvents);
    if (item.id === "regras") return Boolean(supportsPeriods);
    return true;
  });

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

      <nav className={styles.tabs} aria-label="Seções da partida">
        {visibleAdminTabs.map((item) => (
          <button
            aria-selected={tab === item.id}
            className={tab === item.id ? styles.activeTab : undefined}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.grid}>

        {tab === "partida" && (
          <>
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

        {/* MVP */}
        <section className={styles.panel}>
          <header><span>DESTAQUES</span><h2>MVP da partida</h2></header>
          {mvpCandidates.length ? (
            <form className={styles.metaForm} onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const value = String(data.get("mvpId") ?? "");
              mvpMutation.mutate(value ? value : null);
            }}>
              <label>
                Jogador destaque
                <select defaultValue={match.mvpId ?? ""} name="mvpId">
                  <option value="">Sem MVP</option>
                  {mvpCandidates.map((member) => (
                    <option key={member.id} value={member.id}>{member.teamName} — {member.displayName}</option>
                  ))}
                </select>
              </label>
              <button disabled={mvpMutation.isPending} type="submit">{mvpMutation.isPending ? "Salvando..." : "Definir MVP"}</button>
            </form>
          ) : (
            <p className={styles.empty}>Cadastre as equipes para escolher o MVP.</p>
          )}
        </section>
          </>
        )}

        {tab === "elencos" && (
          <>
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
                sport={championship.sport}
                events={eventsQuery.data?.events ?? []}
                onSave={(players) => lineupMutation.mutate({ entryId: entry.id, players })}
              />
            );
          })}
          {!teams.length && <p className={styles.empty}>Escalações disponíveis apenas para competições por equipes.</p>}
        </section>
          </>
        )}

        {tab === "regras" && supportsPeriods && (
          <>
            {/* PERIODS */}
        {supportsPeriods && (
          <section className={styles.panel}>
            <header><span>PARCIAIS</span><h2>Placar detalhado</h2></header>
            <div className={styles.periodsGrid}>
              {Array.from(
                { length: championship.sport === "Basquete" ? 4 + overtimePeriods : periodConfig[championship.sport].count },
                (_, i) => i + 1
              ).map((num) => {
                const period = periodsQuery.data?.periods?.find((p) => p.periodNumber === num);
                const periodLabel = championship.sport === "Basquete"
                  ? (num <= 4 ? `${num}º quarto` : `${num - 4}ª prorrogação`)
                  : periodConfig[championship.sport].label(num, championship.bestOfSets ?? 5);
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
                    <strong>{periodLabel}</strong>
                    <input aria-label={`${match.homeEntry.displayName} ${periodLabel}`} defaultValue={period?.homeScore ?? ""} disabled={!canEdit} min={0} name="homeScore" required type="number" />
                    <span>×</span>
                    <input aria-label={`${match.awayEntry.displayName} ${periodLabel}`} defaultValue={period?.awayScore ?? ""} disabled={!canEdit} min={0} name="awayScore" required type="number" />
                    {canEdit && (
                      <>
                        <button disabled={periodMutation.isPending} type="submit">{period ? "Atualizar" : "Salvar"}</button>
                        {period && num > 4 && (
                          <button className={styles.dangerBtn} disabled={deletePeriodMutation.isPending} onClick={() => {
                            if (period.homeScore > 0 || period.awayScore > 0) {
                              if (!window.confirm("Esta prorrogação contém placar. Remover mesmo assim?")) return;
                            }
                            deletePeriodMutation.mutate(num);
                          }} type="button">Remover</button>
                        )}
                        {!period && num > 4 && (
                          <button className={styles.dangerBtn} onClick={() => setOvertimePeriods((p) => Math.min(p, num - 5))} type="button">Remover</button>
                        )}
                      </>
                    )}
                  </form>
                );
              })}
            </div>
          {canEdit && championship.sport === "Basquete" && (
            <details className={styles.advancedRules}>
              <summary>Regras avançadas</summary>
              <p className={styles.advancedHint}>Prorrogações do basquete: adicione períodos extras quando a partida terminar empatada.</p>
              <button
                className={styles.overtimeBtn}
                onClick={() => {
                  if (overtimePeriods === 0 && periodsQuery.data?.periods?.find((p) => p.periodNumber === 5)) return;
                  setOvertimePeriods((p) => p + 1);
                }}
                type="button"
              >
                + Adicionar prorrogação
              </button>
            </details>
          )}
          </section>
        )}
          </>
        )}

        {tab === "eventos" && supportsEvents && (
          <>
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
          </>
        )}

        {tab === "detalhes" && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
function LineupSection({
  canEdit,
  entry,
  lineup,
  teamMembers,
  onSave,
  sport,
  events = []
}: {
  canEdit: boolean;
  entry: { id: string; displayName: string };
  lineup: MatchLineupItem[];
  teamMembers: Array<{ id: string; displayName: string; jerseyNumber: number | null }>;
  onSave: (players: Array<{ teamMemberId: string; role: LineupRole }>) => void;
  sport?: string;
  events?: MatchEvent[];
}) {
  const [starters, setStarters] = useState<string[]>(
    lineup.filter((l) => l.role === "STARTER").map((l) => l.teamMemberId)
  );
  const [subs, setSubs] = useState<string[]>(
    lineup.filter((l) => l.role === "SUBSTITUTE").map((l) => l.teamMemberId)
  );

  const showFouls = sport === "Basquete";
  const foulCounts: Record<string, number> = {};
  if (showFouls) {
    for (const e of events) {
      if (e.type !== "PERSONAL_FOUL" || !e.teamMemberId) continue;
      foulCounts[e.teamMemberId] = (foulCounts[e.teamMemberId] ?? 0) + 1;
    }
  }

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
              {showFouls && foulCounts[member.id] != null && (
                <span className={foulCounts[member.id] >= 5 ? styles.foulLimit : foulCounts[member.id] >= 4 ? styles.foulWarning : styles.foulBadge}>
                  {foulCounts[member.id]}F
                </span>
              )}
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
              {showFouls && foulCounts[member.id] != null && (
                <span className={foulCounts[member.id] >= 5 ? styles.foulLimit : foulCounts[member.id] >= 4 ? styles.foulWarning : styles.foulBadge}>
                  {foulCounts[member.id]}F
                </span>
              )}
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
