import type { Bracket as BracketData } from "../../features/knockout/knockout-api";
import styles from "./Bracket.module.css";

export function Bracket({ bracket }: { bracket: BracketData }) {
  const rounds = [...new Set(bracket.nodes.map((node) => node.roundNumber))];
  const entryName = (id: string | null) =>
    bracket.entries.find((entry) => entry.id === id)?.displayName ?? "A definir";

  if (!bracket.nodes.length) {
    return <p className={styles.empty}>O chaveamento ainda não foi gerado.</p>;
  }
  const maxRound = Math.max(...rounds);
  const isThirdPlace = bracket.nodes.some((node) =>
    node.roundNumber === maxRound && node.position === 2
  );
  const finalRound = isThirdPlace ? maxRound - 1 : maxRound;

  const finalNode = bracket.nodes.find((node) =>
    node.roundNumber === finalRound && node.position === 1
  );
  const finalMatch = bracket.matches.find((match) => match.id === finalNode?.matchId);
  const championId = finalMatch?.status === "FINISHED" &&
    finalMatch.homeScore !== null &&
    finalMatch.awayScore !== null
    ? finalMatch.homeScore > finalMatch.awayScore
      ? finalMatch.homeEntryId
      : finalMatch.awayEntryId
    : null;

  const thirdPlaceNode = isThirdPlace
    ? bracket.nodes.find((node) => node.roundNumber === maxRound && node.position === 2)
    : null;
  const thirdPlaceMatch = thirdPlaceNode
    ? bracket.matches.find((m) => m.id === thirdPlaceNode.matchId)
    : null;

  return (
    <>
      {championId && (
        <div className={styles.champion}>
          <span className={styles.championTrophy}>&#x1F3C6;</span>
          <span>Campeão</span>
          <strong>{entryName(championId)}</strong>
        </div>
      )}
      {thirdPlaceNode && (
        <div className={styles.thirdPlace}>
          <span>3º lugar</span>
          {thirdPlaceMatch?.status === "FINISHED" ? (
            <>
              <strong>{entryName(
                (thirdPlaceMatch.homeScore ?? 0) > (thirdPlaceMatch.awayScore ?? 0)
                  ? thirdPlaceMatch.homeEntryId
                  : thirdPlaceMatch.awayEntryId
              )}</strong>
              <span>
                {entryName(thirdPlaceNode.homeEntryId)} {thirdPlaceMatch.homeScore ?? "–"}
                × {thirdPlaceMatch.awayScore ?? "–"} {entryName(thirdPlaceNode.awayEntryId)}
              </span>
            </>
          ) : (
            <span>{entryName(thirdPlaceNode.homeEntryId)} × {entryName(thirdPlaceNode.awayEntryId)}</span>
          )}
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
                  const winnerId = match?.status === "FINISHED" &&
                    match.homeScore !== null &&
                    match.awayScore !== null
                    ? match.homeScore > match.awayScore
                      ? match.homeEntryId
                      : match.awayEntryId
                    : null;
                  const isBye = !node.matchId && node.homeEntryId && !node.awayEntryId;
                  return (
                    <article className={styles.game} key={node.id}>
                      <div className={winnerId === node.homeEntryId ? styles.winner : undefined}>
                        <span>{entryName(node.homeEntryId)}</span>
                        <b>{match?.homeScore ?? "–"}</b>
                      </div>
                      <div className={winnerId === node.awayEntryId ? styles.winner : undefined}>
                        <span>{entryName(node.awayEntryId)}</span>
                        <b>{match?.awayScore ?? "–"}</b>
                      </div>
                      {isBye && <small>Classifica por folga</small>}
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
