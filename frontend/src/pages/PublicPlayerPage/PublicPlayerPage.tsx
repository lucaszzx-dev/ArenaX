import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getPublicChampionship, getPublicPlayer } from "../../features/championships/public-championship-api";
import { useSeo } from "../../lib/use-seo";
import styles from "./PublicPlayerPage.module.css";

const statColumns: Record<string, Array<{ key: string; label: string }>> = {
  Futebol: [{ key: "goals", label: "Gols" }, { key: "yellowCards", label: "CA" }, { key: "redCards", label: "CV" }],
  Futsal: [{ key: "goals", label: "Gols" }, { key: "yellowCards", label: "CA" }, { key: "redCards", label: "CV" }],
  Basquete: [{ key: "points", label: "Pontos" }],
  "V\xc3\xb4lei": [{ key: "points", label: "Pontos" }, { key: "aces", label: "Aces" }, { key: "blocks", label: "Bloqueios" }]
};

export function PublicPlayerPage() {
  const { slug = "", memberId = "" } = useParams();
  const playerQuery = useQuery({
    queryKey: ["public-player", slug, memberId],
    queryFn: () => getPublicPlayer(slug, memberId),
    enabled: Boolean(slug && memberId)
  });
  const championshipQuery = useQuery({
    queryKey: ["public-championship", slug],
    queryFn: () => getPublicChampionship(slug),
    enabled: Boolean(slug)
  });
  useSeo({
    title: playerQuery.data ? `${playerQuery.data.statistics.actorName} — ArenaX` : "Jogador — ArenaX",
    description: playerQuery.data
      ? `Estatísticas de ${playerQuery.data.statistics.actorName} em ${playerQuery.data.championship.name}.`
      : "Estatísticas de um jogador no ArenaX."
  });
  if (playerQuery.isPending || championshipQuery.isPending) {
    return <div className={styles.state}>Carregando jogador...</div>;
  }
  if (playerQuery.isError || championshipQuery.isError) {
    return <div className={styles.state}>Jogador n\xc3\xa3o encontrado.</div>;
  }
  const { championship, statistics } = playerQuery.data;
  const columns = statColumns[championship.sport] ?? [];
  const entries = championshipQuery.data?.entries ?? [];
  const entryName = entries.find((e) => e.id === statistics.entryId)?.displayName ?? "Participante";
  return (
    <div className={styles.page}>
      <Link className={styles.back} to={"/campeonatos/" + championship.slug}>
        Voltar para {championship.name}
      </Link>
      <header className={styles.heading}>
        <span>{championship.sport} - {championship.name}</span>
        <h1>{statistics.actorName}</h1>
        <p>{entryName}</p>
        <Link className={styles.history} to={`/jogadores/${memberId}/historico`}>
          Ver histórico de partidas
        </Link>
      </header>
      <section className={styles.panel}>
        <header><span>ESTATISTICAS</span><h2>Desempenho na competição</h2></header>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><b>{statistics.events}</b><span>Eventos</span></div>
          {columns.map((col) => (
            <div key={col.key} className={styles.statCard}>
              <b>{String(statistics[col.key as keyof typeof statistics] ?? 0)}</b>
              <span>{col.label}</span>
            </div>
          ))}
        </div>
      </section>
      {columns.length > 0 && (
        <section className={styles.panel}>
          <header><span>DETALHAMENTO</span><h2>Resumo por tipo</h2></header>
          <table className={styles.table}>
            <thead><tr><th>Tipo</th><th>Quantidade</th></tr></thead>
            <tbody>
              {columns.map((col) => {
                const value = statistics[col.key as keyof typeof statistics] ?? 0;
                if (value === 0) return null;
                return <tr key={col.key}><td>{col.label}</td><td><strong>{String(value)}</strong></td></tr>;
              })}
              {statistics.events > 0 && <tr><td>Total de eventos</td><td><strong>{statistics.events}</strong></td></tr>}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

