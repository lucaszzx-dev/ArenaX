import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getPublicPlayerHistory } from "../../features/public-profiles/public-profile-api";
import { useSeo } from "../../lib/use-seo";
import styles from "./PublicPlayerHistoryPage.module.css";

const SPORTS = ["Futsal", "Futebol", "Basquete", "V\u00f4lei"];
const PAGE_SIZE = 10;

export function PublicPlayerHistoryPage() {
  const { memberId = "" } = useParams();
  const [page, setPage] = useState(1);
  const [sport, setSport] = useState("");

  const query = useQuery({
    queryKey: ["public-player-history", memberId, page, sport],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (sport) params.set("sport", sport);
      return getPublicPlayerHistory(memberId, params);
    },
    enabled: Boolean(memberId)
  });

  useSeo({
    title: query.data
      ? `${query.data.player.displayName} — histórico no ArenaX`
      : "Histórico de jogador — ArenaX",
    description: query.data
      ? `Partidas de ${query.data.player.displayName} pelo ${query.data.player.teamName} no ArenaX.`
      : "Histórico partida a partida de um jogador no ArenaX."
  });

  if (query.isPending) return <div className={styles.state}>Carregando histórico...</div>;
  if (query.isError) return <div className={styles.state}>Jogador não encontrado.</div>;

  const data = query.data;
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <span>Histórico do jogador</span>
        <h1>{data.player.displayName}</h1>
        <p>{data.player.teamName}</p>
      </header>

      <section className={styles.filters}>
        <label htmlFor="sport-filter">Esporte</label>
        <select
          id="sport-filter"
          value={sport}
          onChange={(event) => {
            setSport(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          {SPORTS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </section>

      <section className={styles.list}>
        {data.items.map((match) => (
          <article className={styles.match} key={match.matchId}>
            <div className={styles.matchTop}>
              <span className={styles.status}>
                {statusLabel(match.status)}
              </span>
              <span>{match.championship.sport}</span>
            </div>
            <div className={styles.scoreboard}>
              <strong>{match.teamName}</strong>
              <div>
                <span>{match.homeScore ?? "–"}</span>
                <b>×</b>
                <span>{match.awayScore ?? "–"}</span>
              </div>
              <strong>{match.opponentDisplayName}</strong>
            </div>
            {match.result && (
              <p className={styles.result}>
                Resultado: <b>{resultLabel(match.result)}</b>
              </p>
            )}
            {match.scheduledAt && (
              <p className={styles.date}>
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(match.scheduledAt))}
              </p>
            )}
            {match.events.length > 0 && (
              <div className={styles.events}>
                <h3>Eventos do jogador</h3>
                <ul>
                  {match.events.map((event) => (
                    <li key={event.id}>
                      <b>{eventLabel(event.type)}</b>
                      <span>{eventMoment(event.periodNumber, event.clockSeconds)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link
              className={styles.detail}
              to={`/campeonatos/${match.championship.slug}/partidas/${match.matchId}`}
            >
              Ver partida →
            </Link>
          </article>
        ))}
        {!data.items.length && (
          <p className={styles.empty}>Nenhuma partida encontrada para este jogador.</p>
        )}
      </section>

      {data.total > PAGE_SIZE && (
        <nav className={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Próxima
          </button>
        </nav>
      )}
    </main>
  );
}

function statusLabel(status: "SCHEDULED" | "FINISHED" | "CANCELED") {
  if (status === "FINISHED") return "Resultado final";
  if (status === "CANCELED") return "Cancelada";
  return "Agendada";
}

function resultLabel(result: "WIN" | "DRAW" | "LOSS") {
  if (result === "WIN") return "Vitória";
  if (result === "LOSS") return "Derrota";
  return "Empate";
}

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
  BLOCK: "Bloqueio"
};

function eventLabel(type: string) {
  return eventLabels[type] ?? type;
}

function eventMoment(period: number | null, clockSeconds: number | null) {
  const parts = [];
  if (period) parts.push(`${period}º período`);
  if (clockSeconds !== null) parts.push(`${Math.floor(clockSeconds / 60)}'`);
  return parts.join(" · ") || "Tempo não informado";
}
