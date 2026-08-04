import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getPublicMatch } from "../../features/championships/public-championship-api";
import { useSeo } from "../../lib/use-seo";
import type { Standing } from "../../features/matches/match-api";
import styles from "./PublicMatchPage.module.css";

const EVENT_LABELS: Record<string, string> = {
  GOAL: "Gol",
  OWN_GOAL: "Gol contra",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  FREE_THROW: "Lance livre",
  TWO_POINT_SHOT: "Cesta de 2 pontos",
  THREE_POINT_SHOT: "Cesta de 3 pontos",
  VOLLEYBALL_POINT: "Ponto",
  ACE: "Ace",
  BLOCK: "Bloqueio",
  ERROR: "Erro do adversário",
  SPIKE: "Ataque convertido",
  SERVE_ERROR: "Erro de saque",
  ATTACK_ERROR: "Erro de ataque",
  RECEPTION_ERROR: "Erro de recepção",
  PERSONAL_FOUL: "Falta pessoal",
  ASSIST: "Assistência",
  SUBSTITUTION: "Substituição",
  PENALTY_CONVERTED: "Pênalti convertido",
  PENALTY_MISSED: "Pênalti perdido"
};

type TabId = "resumo" | "eventos" | "escalacoes" | "classificacao";

export function PublicMatchPage() {
  const { slug = "", matchId = "" } = useParams();
  const [tab, setTab] = useState<TabId>("resumo");
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

  const { championship, match, events, periods, operations, standings } = query.data;
  const tabs: Array<{ id: TabId; label: string; available: boolean }> = [
    { id: "resumo", label: "Resumo", available: true },
    { id: "eventos", label: "Eventos", available: events.length > 0 },
    { id: "escalacoes", label: "Escalações", available: operations.lineup.length > 0 },
    { id: "classificacao", label: "Classificação", available: standings.length > 0 }
  ];
  const visibleTabs = tabs.filter((item) => item.available);
  const activeTab = visibleTabs.some((item) => item.id === tab)
    ? tab
    : "resumo";
  const hasPeriods = periods.length > 0;

  return (
    <main className={styles.page}>
      <Link className={styles.back} to={`/campeonatos/${championship.slug}`}>
        ← Voltar para {championship.name}
      </Link>

      <section className={styles.hero}>
        <div className={styles.heroMeta}>
          <span className={styles.competition}>
            {championship.name} · {championship.sport}
          </span>
          {match.roundNumber && <span className={styles.phase}>Rodada {match.roundNumber}</span>}
        </div>
        <div className={styles.teams}>
          <div className={styles.team}>
            <span className={styles.teamBadge} aria-hidden="true">{initials(match.homeEntry.displayName)}</span>
            <strong>{match.homeEntry.displayName}</strong>
          </div>
          <div className={styles.scoreBox}>
            <div className={styles.score} key={`${match.homeScore}-${match.awayScore}`}>
              <span>{match.homeScore ?? "–"}</span>
              <b>×</b>
              <span>{match.awayScore ?? "–"}</span>
            </div>
            <span className={`${styles.status} ${styles[`status-${match.status}`]}`}>
              {statusLabel(match.status)}
            </span>
          </div>
          <div className={styles.team}>
            <span className={styles.teamBadge} aria-hidden="true">{initials(match.awayEntry.displayName)}</span>
            <strong>{match.awayEntry.displayName}</strong>
          </div>
        </div>
        <div className={styles.heroFacts}>
          <span>
            <b>Data</b>
            {match.scheduledAt
              ? new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "long",
                  timeStyle: "short"
                }).format(new Date(match.scheduledAt))
              : "A definir"}
          </span>
          <span>
            <b>Local</b>
            {operations.metadata?.venue || "Não informado"}
          </span>
        </div>
      </section>

      <nav className={styles.tabs} role="tablist" aria-label="Seções da partida">
        {visibleTabs.map((item) => (
          <button
            aria-selected={activeTab === item.id}
            className={activeTab === item.id ? styles.activeTab : undefined}
            key={item.id}
            onClick={() => setTab(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {activeTab === "resumo" && (
        <section className={styles.section} role="tabpanel">
          {hasPeriods && (
            <div className={styles.panel}>
              <div className={styles.panelHeading}>
                <span>Parciais</span>
                <h2>{championship.sport === "Vôlei" ? "Sets" : "Períodos"}</h2>
              </div>
              <div className={styles.partials}>
                {periods.map((period) => (
                  <div className={styles.partial} key={period.id}>
                    <span>{periodLabel(championship.sport, period.periodNumber)}</span>
                    <strong>{period.homeScore}</strong>
                    <b>×</b>
                    <strong>{period.awayScore}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(operations.metadata?.referee || operations.metadata?.operationalNotes) && (
            <div className={styles.panel}>
              <div className={styles.panelHeading}>
                <span>Informações</span>
                <h2>Dados da partida</h2>
              </div>
              <div className={styles.factsList}>
                {operations.metadata.referee && (
                  <p><b>Árbitro</b><span>{operations.metadata.referee}</span></p>
                )}
                {operations.metadata.operationalNotes && (
                  <p><b>Observações</b><span>{operations.metadata.operationalNotes}</span></p>
                )}
              </div>
            </div>
          )}
          {!hasPeriods && !operations.metadata?.referee && !operations.metadata?.operationalNotes && (
            <p className={styles.empty}>
              {match.status === "SCHEDULED"
                ? "Partida ainda não iniciada. Acompanhe os detalhes aqui após o resultado."
                : "Nenhuma informação adicional para esta partida."}
            </p>
          )}
        </section>
      )}

      {activeTab === "eventos" && (
        <section className={styles.section} role="tabpanel">
          <div className={styles.panelHeading}>
            <span>Súmula</span>
            <h2>Eventos da partida</h2>
            <b>{events.length} eventos</b>
          </div>
          <div className={styles.timeline}>
            {events.map((event) => {
              const entry = event.entryId === match.homeEntryId
                ? match.homeEntry
                : match.awayEntry;
              return (
                <article className={styles.event} key={event.id}>
                  <span>{formatEventMoment(event.periodNumber, event.clockSeconds)}</span>
                  <div>
                    <strong>{EVENT_LABELS[event.type] ?? event.type}</strong>
                    <p>{event.actorName || "Autor não informado"}</p>
                  </div>
                  <b>{entry.displayName}</b>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "escalacoes" && (
        <section className={styles.section} role="tabpanel">
          <div className={styles.panelHeading}>
            <span>Escalações</span>
            <h2>Formações definidas</h2>
            <b>{operations.lineup.length} jogadores</b>
          </div>
          <div className={styles.lineupGroups}>
            {groupLineup(operations.lineup, match).map((group) => (
              <div className={styles.lineupGroup} key={group.entryId}>
                <h3>{group.teamName}</h3>
                <p>
                  {group.starters} titulares · {group.substitutes} reservas
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "classificacao" && (
        <section className={styles.section} role="tabpanel">
          <div className={styles.panelHeading}>
            <span>Classificação</span>
            <h2>Posição na competição</h2>
          </div>
          <div className={styles.tableScroll}>
            <StandingsTable standings={standings} />
          </div>
        </section>
      )}
    </main>
  );
}

function StandingsTable({ standings }: { standings: Standing[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Pos.</th>
          <th>Participante</th>
          <th>J</th>
          <th>V</th>
          <th>SG</th>
          <th>Pts.</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((row) => (
          <tr key={row.entryId}>
            <td><strong>{row.position}</strong></td>
            <td>{row.displayName}</td>
            <td>{row.played}</td>
            <td>{row.wins}</td>
            <td>{row.scoreDifference}</td>
            <td><strong>{row.points}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type PublicLineupItem = {
  entryId: string;
  teamMemberId: string;
  role: "STARTER" | "SUBSTITUTE";
};

type LineupMatch = {
  homeEntryId: string;
  awayEntryId: string;
  homeEntry: { displayName: string };
  awayEntry: { displayName: string };
};

function groupLineup(lineup: PublicLineupItem[], match: LineupMatch) {
  const groups = new Map<string, { entryId: string; teamName: string; starters: number; substitutes: number }>();
  for (const item of lineup) {
    const entry = item.entryId === match.homeEntryId ? match.homeEntry : match.awayEntry;
    const existing = groups.get(item.entryId) ?? {
      entryId: item.entryId,
      teamName: entry?.displayName ?? "Participante",
      starters: 0,
      substitutes: 0
    };
    if (item.role === "STARTER") existing.starters += 1;
    else existing.substitutes += 1;
    groups.set(item.entryId, existing);
  }
  return [...groups.values()];
}

function periodLabel(sport: string, period: number) {
  if (sport === "Vôlei") return `${period}º set`;
  if (sport === "Futebol" || sport === "Futsal") return `${period}º tempo`;
  return period <= 4 ? `${period}º quarto` : `${period - 4}ª prorrogação`;
}

function formatEventMoment(period: number | null, clockSeconds: number | null) {
  const parts = [];
  if (period) parts.push(`${period}º período`);
  if (clockSeconds !== null) parts.push(`${Math.floor(clockSeconds / 60)}'`);
  return parts.join(" · ") || "Tempo não informado";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusLabel(status: "SCHEDULED" | "FINISHED" | "CANCELED") {
  if (status === "FINISHED") return "Resultado final";
  if (status === "CANCELED") return "Partida cancelada";
  return "Partida agendada";
}