import { useQuery } from "@tanstack/react-query";

import { listMatchAudit } from "../../features/matches/match-api";
import styles from "./MatchAuditPanel.module.css";

export function MatchAuditPanel({
  championshipId,
  matchId
}: {
  championshipId: string;
  matchId: string;
}) {
  const query = useQuery({
    queryKey: ["match-audit", championshipId, matchId],
    queryFn: () => listMatchAudit(championshipId, matchId)
  });
  const logs = query.data?.logs ?? [];
  if (!logs.length) return null;
  return (
    <details className={styles.panel}>
      <summary>Histórico de alterações ({logs.length})</summary>
      <ol>
        {logs.map((log) => (
          <li key={log.id}>
            <div><strong>{actionLabel(log.action)}</strong><span>{formatDetails(log)}</span></div>
            <time>{new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short"
            }).format(new Date(log.createdAt))}</time>
          </li>
        ))}
      </ol>
    </details>
  );
}

function actionLabel(action: string) {
  if (action === "SCORE_CHANGED") return "Placar alterado";
  if (action === "MATCH_CANCELED") return "Partida cancelada";
  return "Partida reaberta";
}

function formatDetails(log: { action: string; details: Record<string, unknown> }) {
  if (log.action !== "SCORE_CHANGED") return "";
  const before = log.details.before as { homeScore?: number; awayScore?: number };
  const after = log.details.after as { homeScore?: number; awayScore?: number };
  return `${before.homeScore ?? "–"} × ${before.awayScore ?? "–"} → ${after.homeScore} × ${after.awayScore}`;
}
