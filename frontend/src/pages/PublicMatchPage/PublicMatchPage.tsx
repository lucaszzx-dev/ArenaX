import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getPublicMatch } from "../../features/championships/public-championship-api";
import styles from "./PublicMatchPage.module.css";

export function PublicMatchPage() {
  const { slug = "", matchId = "" } = useParams();
  const query = useQuery({
    queryKey: ["public-match", slug, matchId],
    queryFn: () => getPublicMatch(slug, matchId),
    enabled: Boolean(slug && matchId)
  });

  if (query.isPending) {
    return <div className={styles.state}>Carregando partida...</div>;
  }
  if (query.isError) {
    return <div className={styles.state}>Esta partida não foi encontrada.</div>;
  }

  const { championship, match } = query.data;

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
      <footer>
        <span>Competição</span>
        <strong>{championship.name}</strong>
      </footer>
    </main>
  );
}

function statusLabel(status: "SCHEDULED" | "FINISHED" | "CANCELED") {
  if (status === "FINISHED") return "resultado final";
  if (status === "CANCELED") return "partida cancelada";
  return "partida agendada";
}
