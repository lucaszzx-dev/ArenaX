import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getPublicChampionship } from "../../features/championships/public-championship-api";
import { getStandingLabels } from "../../features/matches/standing-labels";
import styles from "./ChampionshipPage.module.css";

export function ChampionshipPage() {
  const { slug = "" } = useParams();
  const query = useQuery({
    queryKey: ["public-championship", slug],
    queryFn: () => getPublicChampionship(slug),
    enabled: Boolean(slug)
  });

  if (query.isPending) return <div className={styles.state}>Carregando arena...</div>;
  if (query.isError) return <div className={styles.state}>Esta arena não foi encontrada.</div>;

  const { championship, entries, matches, standings, statistics } = query.data;
  const finishedCount = matches.filter((match) => match.status === "FINISHED").length;
  const standingLabels = getStandingLabels(championship.sport);

  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <span>{championship.sport} • {championship.entryType === "TEAM" ? "Equipes" : "Individual"}</span>
        <h1>{championship.name}</h1>
        <p>{championship.description || "Campeonato organizado com ArenaX."}</p>
        <div className={styles.metrics}>
          <span><b>{entries.length}</b> inscritos</span>
          <span><b>{matches.length}</b> partidas</span>
          <span><b>{finishedCount}</b> resultados</span>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><span>Classificação</span><h2>Tabela geral</h2></div>
            <span>{championship.winPoints} pts por vitória</span>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr>
                <th>Pos.</th><th>Participante</th><th>J</th>
                <th>V</th>
                <th title={standingLabels.scoreDifferenceTitle}>
                  {standingLabels.scoreDifference}
                </th>
                <th>Pts.</th>
              </tr></thead>
              <tbody>{standings.map((row) => (
                <tr key={row.entryId}>
                  <td><strong>{row.position}</strong></td>
                  <td>{row.displayName}</td><td>{row.played}</td>
                  <td>{row.wins}</td><td>{row.scoreDifference}</td>
                  <td><strong>{row.points}</strong></td>
                </tr>
              ))}</tbody>
            </table>
            {!standings.length && <p className={styles.empty}>Sem inscritos.</p>}
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><span>Participantes</span><h2>Inscritos na arena</h2></div>
          </div>
          <ol className={styles.entries}>{entries.map((entry, index) => (
            <li key={entry.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {entry.teamId ? (
                <Link to={`/campeonatos/${championship.slug}/equipes/${entry.teamId}`}>
                  <strong>{entry.displayName}</strong>
                </Link>
              ) : <strong>{entry.displayName}</strong>}
            </li>
          ))}</ol>
          {!entries.length && <p className={styles.empty}>Nenhum inscrito.</p>}
        </aside>
      </div>

      <section className={`${styles.panel} ${styles.schedule}`}>
        <div className={styles.panelHeading}>
          <div><span>Calendário</span><h2>Partidas e resultados</h2></div>
        </div>
        {matches.map((match) => (
          <Link
            className={styles.fixture}
            key={match.id}
            to={`/campeonatos/${championship.slug}/partidas/${match.id}`}
          >
            <span>{match.scheduledAt
              ? new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
              }).format(new Date(match.scheduledAt))
              : "A definir"}</span>
            <strong>{match.homeEntry.displayName}</strong>
            <b>{match.homeScore ?? "–"} × {match.awayScore ?? "–"}</b>
            <strong>{match.awayEntry.displayName}</strong>
          </Link>
        ))}
        {!matches.length && <p className={styles.empty}>Nenhuma partida criada.</p>}
      </section>

      {statistics.length > 0 && (
        <section className={`${styles.panel} ${styles.statistics}`}>
          <div className={styles.panelHeading}>
            <div><span>Destaques</span><h2>Estatísticas individuais</h2></div>
            <span>Calculadas pela súmula</span>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Equipe</th>
                  {statColumns(championship.sport).map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statistics.map((statistic) => (
                  <tr key={statistic.teamMemberId ?? `${statistic.entryId}:${statistic.actorName}`}>
                    <td><strong>{statistic.actorName}</strong></td>
                    <td>{entries.find((entry) => entry.id === statistic.entryId)?.displayName ?? "Participante"}</td>
                    {statColumns(championship.sport).map((column) => (
                      <td key={column.key}>{statistic[column.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

type StatisticKey =
  | "goals"
  | "points"
  | "aces"
  | "blocks"
  | "yellowCards"
  | "redCards";

function statColumns(sport: string): Array<{
  key: StatisticKey;
  label: string;
}> {
  if (sport === "Futebol" || sport === "Futsal") {
    return [
      { key: "goals", label: "Gols" },
      { key: "yellowCards", label: "CA" },
      { key: "redCards", label: "CV" }
    ];
  }
  if (sport === "Vôlei") {
    return [
      { key: "points", label: "Pontos" },
      { key: "aces", label: "Aces" },
      { key: "blocks", label: "Bloqueios" }
    ];
  }
  return [{ key: "points", label: "Pontos" }];
}
