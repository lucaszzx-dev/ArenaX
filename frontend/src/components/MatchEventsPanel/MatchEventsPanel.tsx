import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createMatchEvent,
  deleteMatchEvent,
  listMatchEvents,
  matchEventQueryKey,
  type FootballMatchEventType
} from "../../features/matches/match-event-api";
import type { ArenaMatch } from "../../features/matches/match-api";
import type { Team } from "../../features/participants/participant-api";
import { ApiError } from "../../lib/api";
import styles from "./MatchEventsPanel.module.css";

const eventLabels: Record<FootballMatchEventType, string> = {
  GOAL: "Gol",
  OWN_GOAL: "Gol contra",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho"
};

type MatchEventsPanelProps = {
  championshipId: string;
  match: ArenaMatch;
  teams: Team[];
};

export function MatchEventsPanel({
  championshipId,
  match,
  teams
}: MatchEventsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedEntryId, setSelectedEntryId] = useState(match.homeEntryId);
  const [message, setMessage] = useState<string | null>(null);
  const queryKey = matchEventQueryKey(championshipId, match.id);
  const eventQuery = useQuery({
    queryKey,
    queryFn: () => listMatchEvents(championshipId, match.id)
  });
  const selectedEntry = selectedEntryId === match.homeEntryId
    ? match.homeEntry
    : match.awayEntry;
  const members = useMemo(
    () => teams.find((team) => team.id === selectedEntry.teamId)?.members ?? [],
    [selectedEntry.teamId, teams]
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createMatchEvent>[2]) =>
      createMatchEvent(championshipId, match.id, input),
    onSuccess: async () => {
      setMessage(null);
      await refresh();
    },
    onError: (error) => setMessage(error instanceof ApiError
      ? error.message
      : "Não foi possível registrar o evento.")
  });
  const deleteMutation = useMutation({
    mutationFn: (eventId: string) =>
      deleteMatchEvent(championshipId, match.id, eventId),
    onSuccess: refresh,
    onError: (error) => setMessage(error instanceof ApiError
      ? error.message
      : "Não foi possível remover o evento.")
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const minute = String(data.get("minute") ?? "");
    const period = String(data.get("periodNumber") ?? "");
    const memberId = String(data.get("teamMemberId") ?? "");

    createMutation.mutate({
      entryId: selectedEntryId,
      teamMemberId: memberId || null,
      type: String(data.get("type")) as FootballMatchEventType,
      periodNumber: period ? Number(period) : null,
      clockSeconds: minute ? Number(minute) * 60 : null,
      notes: String(data.get("notes") ?? "") || null
    }, { onSuccess: () => form.reset() });
  }

  return (
    <section className={styles.panel}>
      <header>
        <div>
          <span>Súmula</span>
          <h3>Eventos da partida</h3>
        </div>
        <b>{eventQuery.data?.events.length ?? 0} eventos</b>
      </header>

      {message && <p className={styles.error} role="alert">{message}</p>}

      {match.status === "SCHEDULED" && (
        <form className={styles.form} onSubmit={submit}>
          <label>
            Equipe
            <select
              name="entryId"
              onChange={(event) => setSelectedEntryId(event.target.value)}
              value={selectedEntryId}
            >
              <option value={match.homeEntryId}>
                {match.homeEntry.displayName}
              </option>
              <option value={match.awayEntryId}>
                {match.awayEntry.displayName}
              </option>
            </select>
          </label>
          <label>
            Evento
            <select defaultValue="GOAL" name="type">
              {Object.entries(eventLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Jogador
            <select defaultValue="" key={selectedEntryId} name="teamMemberId">
              <option value="">Autor não informado</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tempo
            <select defaultValue="" name="periodNumber">
              <option value="">Não informado</option>
              <option value="1">1º tempo</option>
              <option value="2">2º tempo</option>
            </select>
          </label>
          <label>
            Minuto
            <input min="0" max="300" name="minute" type="number" />
          </label>
          <label className={styles.notes}>
            Observação
            <input maxLength={200} name="notes" placeholder="Opcional" />
          </label>
          <button disabled={createMutation.isPending}>
            {createMutation.isPending ? "Registrando..." : "Adicionar evento"}
          </button>
        </form>
      )}

      {eventQuery.isPending && <p className={styles.empty}>Carregando súmula...</p>}
      {eventQuery.isError && (
        <p className={styles.error}>Não foi possível carregar a súmula.</p>
      )}
      {eventQuery.data?.events.map((event) => (
        <article className={styles.event} key={event.id}>
          <span>
            {event.periodNumber ? `${event.periodNumber}ºT` : "—"}
            {event.clockSeconds !== null
              ? ` · ${Math.floor(event.clockSeconds / 60)}'`
              : ""}
          </span>
          <div>
            <strong>{eventLabels[event.type]}</strong>
            <p>{event.actorName ?? "Autor não informado"}</p>
          </div>
          <b>{entryName(match, event.entryId)}</b>
          {match.status === "SCHEDULED" && (
            <button
              aria-label={`Remover ${eventLabels[event.type]}`}
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm("Remover este evento da súmula?")) {
                  deleteMutation.mutate(event.id);
                }
              }}
              type="button"
            >
              Remover
            </button>
          )}
        </article>
      ))}
      {eventQuery.data?.events.length === 0 && (
        <p className={styles.empty}>Nenhum evento registrado.</p>
      )}
    </section>
  );
}

function entryName(match: ArenaMatch, entryId: string) {
  return entryId === match.homeEntryId
    ? match.homeEntry.displayName
    : match.awayEntry.displayName;
}
