import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { getPublicChampionship } from "../../features/championships/public-championship-api";
import { getStandingLabels } from "../../features/matches/standing-labels";
import { Bracket } from "../../components/Bracket/Bracket";
import { getPublicBracket } from "../../features/knockout/knockout-api";
import { useSeo } from "../../lib/use-seo";
import { useFavorites } from "../../lib/use-favorites";
import { useShare } from "../../lib/use-share";
import {
  buildCalendar,
  formatMatchDateTime,
  matchesToday,
  upcomingMatches,
  recentResults,
  type CalendarRound
} from "../../features/matches/schedule-utils";
import type { ArenaMatch } from "../../features/matches/match-api";
import styles from "./ChampionshipPage.module.css";

const STATUS_FILTERS = [
  { value: "", label: "Todos os estados" },
  { value: "SCHEDULED", label: "Agendadas" },
  { value: "FINISHED", label: "Finalizadas" },
  { value: "CANCELED", label: "Canceladas" }
];

export function ChampionshipPage() {
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const roundFilter = searchParams.get("round") ?? "";

  const query = useQuery({
    queryKey: ["public-championship", slug],
    queryFn: () => getPublicChampionship(slug),
    enabled: Boolean(slug)
  });
  const bracketQuery = useQuery({
    queryKey: ["public-bracket", slug],
    queryFn: () => getPublicBracket(slug),
    enabled: Boolean(slug) && query.data?.championship.format === "KNOCKOUT"
  });
  const favorites = useFavorites();
  const share = useShare();

  useSeo({
    title: query.data ? `${query.data.championship.name} — ArenaX` : "Campeonato — ArenaX",
    description: query.data?.championship.description || "Campeonato amador no ArenaX.",
    url: typeof window !== "undefined" ? window.location.href : undefined,
    type: "website"
  });

  const data = query.data;
  const championship = data?.championship;
  const matches = data?.matches ?? [];
  const entries = data?.entries ?? [];
  const standings = data?.standings ?? [];
  const statistics = data?.statistics ?? [];
  const finishedCount = matches.filter((match) => match.status === "FINISHED").length;
  const standingLabels = getStandingLabels(championship?.sport ?? "");

  const filteredMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          (!statusFilter || match.status === statusFilter) &&
          (!roundFilter || String(match.roundNumber ?? "sem-rodada") === roundFilter)
      ),
    [matches, statusFilter, roundFilter]
  );

  const today = matchesToday(matches);
  const upcoming = upcomingMatches(matches);
  const recent = recentResults(matches);
  const calendar = useMemo(() => buildCalendar(filteredMatches), [filteredMatches]);
  const roundOptions = useMemo(
    () =>
      [...new Set(matches.map((match) => String(match.roundNumber ?? "sem-rodada")))]
        .sort((a, b) => {
          const na = a === "sem-rodada" ? Number.MAX_SAFE_INTEGER : Number(a);
          const nb = b === "sem-rodada" ? Number.MAX_SAFE_INTEGER : Number(b);
          return na - nb;
        }),
    [matches]
  );

  function setFilter(key: "status" | "round", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  const favorite = championship ? favorites.isFavorite(championship.slug) : false;

  if (query.isPending) return <div className={styles.state}>Carregando arena...</div>;
  if (query.isError) return <div className={styles.state}>Esta arena não foi encontrada.</div>;
  if (!championship) return null;

  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <div className={styles.headingTop}>
          <div>
            <span>{championship.sport} • {championship.entryType === "TEAM" ? "Equipes" : "Individual"}</span>
            <h1>{championship.name}</h1>
          </div>
          <div className={styles.headingActions}>
            <button
              type="button"
              className={styles.favoriteButton}
              aria-pressed={favorite}
              onClick={() => favorites.toggle(championship.slug)}
            >
              {favorite ? "★ Favorita" : "☆ Favoritar"}
            </button>
            <button
              type="button"
              className={styles.shareButton}
              onClick={() =>
                share.share({
                  title: championship.name,
                  text: championship.description || championship.name,
                  url: window.location.href
                })
              }
            >
              {share.status === "copied" ? "Link copiado!" : share.status === "shared" ? "Compartilhado!" : "Compartilhar"}
            </button>
          </div>
        </div>
        <p>{championship.description || "Campeonato organizado com ArenaX."}</p>
        <div className={styles.metrics}>
          <span><b>{entries.length}</b> inscritos</span>
          <span><b>{matches.length}</b> partidas</span>
          <span><b>{finishedCount}</b> resultados</span>
        </div>
      </section>

      {championship.format === "KNOCKOUT" && bracketQuery.data && (
        <section className={`${styles.panel} ${styles.bracketPanel}`}>
          <div className={styles.panelHeading}>
            <div><span>Mata-mata</span><h2>Chaveamento</h2></div>
          </div>
          <Bracket bracket={bracketQuery.data} />
        </section>
      )}

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

      {today.length > 0 && (
        <MatchSection
          title="Partidas de hoje"
          caption="Jogos programados para hoje"
          matches={today}
          slug={championship.slug}
        />
      )}

      {upcoming.length > 0 && (
        <MatchSection
          title="Próximos jogos"
          caption="Acompanhe as próximas rodadas"
          matches={upcoming.slice(0, 6)}
          slug={championship.slug}
        />
      )}

      {recent.length > 0 && (
        <MatchSection
          title="Resultados recentes"
          caption="Últimos resultados encerrados"
          matches={recent}
          slug={championship.slug}
        />
      )}

      <section className={`${styles.panel} ${styles.schedule}`}>
        <div className={styles.panelHeading}>
          <div><span>Calendário</span><h2>Partidas e resultados</h2></div>
          <div className={styles.filters}>
            <select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(event) => setFilter("status", event.target.value)}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar por rodada"
              value={roundFilter}
              onChange={(event) => setFilter("round", event.target.value)}
            >
              <option value="">Todas as rodadas</option>
              {roundOptions.map((round) => (
                <option key={round} value={round}>
                  {round === "sem-rodada" ? "Sem rodada" : `Rodada ${round}`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <CalendarView calendar={calendar} slug={championship.slug} />
        {!filteredMatches.length && (
          <p className={styles.empty}>Nenhuma partida para os filtros selecionados.</p>
        )}
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
                    <td><Link to={`/campeonatos/${championship.slug}/jogadores/${statistic.teamMemberId}`}><strong>{statistic.actorName}</strong></Link></td>
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

function MatchSection({
  title,
  caption,
  matches,
  slug
}: {
  title: string;
  caption: string;
  matches: ArenaMatch[];
  slug: string;
}) {
  return (
    <section className={`${styles.panel} ${styles.schedule}`}>
      <div className={styles.panelHeading}>
        <div><span>{caption}</span><h2>{title}</h2></div>
      </div>
      <div className={styles.sectionList}>
        {matches.map((match) => (
          <FixtureRow key={match.id} match={match} slug={slug} />
        ))}
      </div>
    </section>
  );
}

function CalendarView({ calendar, slug }: { calendar: CalendarRound[]; slug: string }) {
  if (!calendar.length) return null;
  return (
    <div className={styles.calendar}>
      {calendar.map((round) => (
        <div className={styles.round} key={round.roundNumber ?? "sem-rodada"}>
          <h3 className={styles.roundTitle}>
            {round.roundNumber ? `Rodada ${round.roundNumber}` : "Sem rodada"}
          </h3>
          {round.dates.map((date) => (
            <div className={styles.dateGroup} key={date.dateKey ?? "sem-data"}>
              <span className={styles.dateLabel}>{date.label}</span>
              <div className={styles.dateMatches}>
                {date.matches.map((match) => (
                  <FixtureRow key={match.id} match={match} slug={slug} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FixtureRow({ match, slug }: { match: ArenaMatch; slug: string }) {
  return (
    <Link
      className={`${styles.fixture} ${styles[`status-${match.status}`]}`}
      key={match.id}
      to={`/campeonatos/${slug}/partidas/${match.id}`}
    >
      <span>{formatMatchDateTime(match.scheduledAt)}</span>
      <span className={styles.statusBadge}>{statusLabel(match.status)}</span>
      <strong>{match.homeEntry.displayName}</strong>
      <b>{match.homeScore ?? "–"} × {match.awayScore ?? "–"}</b>
      <strong>{match.awayEntry.displayName}</strong>
    </Link>
  );
}

function statusLabel(status: ArenaMatch["status"]) {
  if (status === "FINISHED") return "Finalizada";
  if (status === "CANCELED") return "Cancelada";
  return "Agendada";
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

