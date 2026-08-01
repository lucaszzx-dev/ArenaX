import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getPublicTeam } from "../../features/championships/public-championship-api";
import { useSeo } from "../../lib/use-seo";
import styles from "./PublicTeamPage.module.css";

export function PublicTeamPage() {
  const { slug = "", teamId = "" } = useParams();
  const query = useQuery({
    queryKey: ["public-team", slug, teamId],
    queryFn: () => getPublicTeam(slug, teamId),
    enabled: Boolean(slug && teamId)
  });
  useSeo({
    title: query.data ? `${query.data.team.name} — ArenaX` : "Equipe — ArenaX",
    description: query.data
      ? `Equipe ${query.data.team.name} em ${query.data.championship.name}.`
      : "Equipe em um campeonato no ArenaX."
  });
  if (query.isPending) return <div className={styles.state}>Carregando equipe...</div>;
  if (query.isError) return <div className={styles.state}>Equipe não encontrada.</div>;
  const { championship, team } = query.data;
  return (
    <section className={styles.page}>
      <Link className={styles.back} to={`/campeonatos/${championship.slug}`}>
        ← Voltar para {championship.name}
      </Link>
      <header>
        {team.logoUrl ? <img alt={`Escudo de ${team.name}`} src={team.logoUrl} /> : <div>{team.shortName || "AX"}</div>}
        <span>{championship.sport} / equipe</span>
        <h1>{team.name}</h1>
        <p>{team.members.length} jogadores no elenco</p>
        {team.sourceClubId && (
          <Link className={styles.clubLink} to={`/clubes/${team.sourceClubId}`}>
            Ver perfil do clube
          </Link>
        )}
      </header>
      <section className={styles.roster}>
        <h2>Elenco</h2>
        {team.members.map((member) => (
          <article key={member.id}>
            <b>{member.jerseyNumber !== null ? `#${member.jerseyNumber}` : "—"}</b>
            <div>
              <Link to={`/campeonatos/${championship.slug}/jogadores/${member.id}`}>
                <strong>{member.displayName}</strong>
              </Link>
              <span>{member.position || "Posição não informada"}</span>
            </div>
            {member.isCaptain && <em>Capitão</em>}
          </article>
        ))}
        {!team.members.length && <p>Nenhum jogador cadastrado.</p>}
      </section>
    </section>
  );
}


