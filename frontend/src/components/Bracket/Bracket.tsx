import type { Bracket as BracketData } from "../../features/knockout/knockout-api";
import styles from "./Bracket.module.css";

export function Bracket({ bracket }: { bracket: BracketData }) {
  const rounds = [...new Set(bracket.nodes.map((node) => node.roundNumber))];
  const entryName = (id: string | null) =>
    bracket.entries.find((entry) => entry.id === id)?.displayName ?? "A definir";

  if (!bracket.nodes.length) {
    return <p className={styles.empty}>O chaveamento ainda não foi gerado.</p>;
  }
  const finalNode = bracket.nodes.find((node) =>
    node.roundNumber === Math.max(...rounds)
  );
  const finalMatch = bracket.matches.find((match) => match.id === finalNode?.matchId);
  const championId = finalMatch?.status === "FINISHED" &&
    finalMatch.homeScore !== null &&
    finalMatch.awayScore !== null
    ? finalMatch.homeScore > finalMatch.awayScore
      ? finalMatch.homeEntryId
      : finalMatch.awayEntryId
    : null;

  return (
    <>
      {championId && (
        <div className={styles.champion}>
          <span>Campeão</span>
          <strong>{entryName(championId)}</strong>
        </div>
      )}
      <div className={styles.scroll}>
        <div className={styles.bracket}>
        {rounds.map((round, roundIndex) => {
          const nodes = bracket.nodes.filter((node) => node.roundNumber === round);
          return (
            <section className={styles.round} key={round}>
              <h3>{roundLabel(roundIndex, rounds.length)}</h3>
              <div className={styles.games}>
                {nodes.map((node) => {
                  const match = bracket.matches.find((item) => item.id === node.matchId);
                  return (
                    <article className={styles.game} key={node.id}>
                      <div>
                        <span>{entryName(node.homeEntryId)}</span>
                        <b>{match?.homeScore ?? "–"}</b>
                      </div>
                      <div>
                        <span>{entryName(node.awayEntryId)}</span>
                        <b>{match?.awayScore ?? "–"}</b>
                      </div>
                      {!node.matchId && node.homeEntryId && !node.awayEntryId && (
                        <small>Avança por folga</small>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        </div>
      </div>
    </>
  );
}

function roundLabel(index: number, total: number) {
  const remaining = total - index;
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Semifinal";
  if (remaining === 3) return "Quartas de final";
  if (remaining === 4) return "Oitavas de final";
  return `Fase ${index + 1}`;
}
