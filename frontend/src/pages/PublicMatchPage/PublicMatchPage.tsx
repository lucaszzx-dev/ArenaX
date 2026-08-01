import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getPublicMatch } from "../../features/championships/public-championship-api";
import { useSeo } from "../../lib/use-seo";
import styles from "./PublicMatchPage.module.css";

export function PublicMatchPage() {
  const { slug = "", matchId = "" } = useParams();
  const query = useQuery({
    queryKey: ["public-match", slug, matchId],
    queryFn: () => getPublicMatch(slug, matchId),
    enabled: Boolean(slug && matchId)
  });

  useSeo({
    title: query.data ? `Partida — ${query.data.championship.name}` : "Partida — ArenaX",
    description: query.data
      ? `Partida de ${query.data.championship.sport} em ${query.data.championship.name} no ArenaX.`
      : "Partida de um campeonato no ArenaX."
  });

  if (query.isPending) {
    return <div className={styles.state}>Carregando partida...</div>;
  }
  if (query.isError) {
    return <div className={styles.state}>Esta partida não foi encontrada.</div>;
  }

  const { championship, match, events, periods } = query.data;

  return (
    <main className={styles.page}>
      <Link className={styles.back} to={`/campeonatos/${championship.slug}`}>
        ← Voltar para {championship.name}
      </Link>
      <header>
        <span>{championship.sport} / {statusLabel(match.status)}</span>
        <p>{match.scheduledAt
          ? new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "long",
            timeStyle: "short"
          }).format(new Date(match.scheduledAt))
          : "Data e horário a definir"}</p>
      </header>
      <section className={styles.scoreboard}>
        <strong>{match.homeEntry.displayName}</strong>
        <div>
          <span>{match.homeScore ?? "–"}</span>
          <b>×</b>
          <span>{match.awayScore ?? "–"}</span>
        </div>
        <strong>{match.awayEntry.displayName}</strong>
      </section>
      {periods.length > 0 && (
        <section className={styles.partials}>
          <div className={styles.timelineHeading}>
            <div>
              <span>PARCIAIS</span>
              <h2>{championship.sport === "Vôlei" ? "Sets" : "Períodos"}</h2>
            </div>
          </div>
          {periods.map((period) => (
            <div className={styles.partial} key={period.id}>
              <span>{periodLabel(championship.sport, period.periodNumber)}</span>
              <strong>{period.homeScore}</strong>
              <b>×</b>
              <strong>{period.awayScore}</strong>
            </div>
          ))}
        </section>
      )}
      <section className={styles.timeline}>
        <div className={styles.timelineHeading}>
          <div>
            <span>SÚMULA</span>
            <h2>Eventos da partida</h2>
          </div>
          <b>{events.length} eventos</b>
        </div>
        {events.map((event) => {
          const entry = event.entryId === match.homeEntryId
            ? match.homeEntry
            : match.awayEntry;
          return (
            <article className={styles.event} key={event.id}>
              <span>{formatEventMoment(event.periodNumber, event.clockSeconds)}</span>
              <div>
                <strong>{eventLabel(event.type)}</strong>
                <p>{event.actorName || "Autor não informado"}</p>
              </div>
              <b>{entry.displayName}</b>
            </article>
          );
        })}
        {!events.length && (
          <p className={styles.empty}>Nenhum evento registrado nesta partida.</p>
        )}
      </section>
      <footer>
        <span>Competição</span>
        <strong>{championship.name}</strong>
      </footer>
    </main>
  );
}

function periodLabel(sport: string, period: number) {
  if (sport === "Vôlei") return `${period}º set`;
  return period <= 4 ? `${period}º quarto` : `${period - 4}ª prorrogação`;
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

function formatEventMoment(period: number | null, clockSeconds: number | null) {
  const parts = [];
  if (period) parts.push(`${period}º período`);
  if (clockSeconds !== null) parts.push(`${Math.floor(clockSeconds / 60)}'`);
  return parts.join(" · ") || "Tempo não informado";
}

function statusLabel(status: "SCHEDULED" | "FINISHED" | "CANCELED") {
  if (status === "FINISHED") return "resultado final";
  if (status === "CANCELED") return "partida cancelada";
  return "partida agendada";
}
