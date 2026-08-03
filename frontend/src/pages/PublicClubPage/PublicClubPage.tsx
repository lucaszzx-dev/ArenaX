import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getPublicClub } from "../../features/public-profiles/public-profile-api";
import { useSeo } from "../../lib/use-seo";
import styles from "./PublicClubPage.module.css";

export function PublicClubPage() {
  const { clubId = "" } = useParams();
  const query = useQuery({
    queryKey: ["public-club", clubId],
    queryFn: () => getPublicClub(clubId),
    enabled: Boolean(clubId)
  });

  useSeo({
    title: query.data
      ? `${query.data.club.name} — clube no ArenaX`
      : "Clube — ArenaX",
    description: query.data
      ? `Clube ${query.data.club.name} e suas participações em campeonatos no ArenaX.`
      : "Perfil público de um clube no ArenaX."
  });

  if (query.isPending) return <div className={styles.state}>Carregando clube...</div>;
  if (query.isError) return <div className={styles.state}>Clube não encontrado.</div>;

  const { club, sports, championships } = query.data;

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        {club.logoUrl ? (
          <img className={styles.logo} alt={`Escudo de ${club.name}`} src={club.logoUrl} />
        ) : (
          <div className={styles.logoPlaceholder}>{club.shortName || "AX"}</div>
        )}
        <span>Clube</span>
        <h1>{club.name}</h1>
        {sports.length > 0 && (
          <div className={styles.sports}>
            {sports.map((sport) => <span key={sport}>{sport}</span>)}
          </div>
        )}
      </header>

      <section className={styles.section}>
        <h2>Elenco do clube</h2>
        {club.members.length > 0 ? (
          <ul className={styles.roster}>
            {club.members.map((member) => (
              <li key={member.id}>
                <b>{member.jerseyNumber !== null ? `#${member.jerseyNumber}` : "—"}</b>
                <div>
                  <strong>{member.displayName}</strong>
                  <span>{member.position || "Posição não informada"}</span>
                </div>
                {member.isCaptain && <em>Capitão</em>}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nenhum atleta cadastrado no clube.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2>Participações em campeonatos</h2>
        {championships.length > 0 ? (
          <ul className={styles.list}>
            {championships.map((item) => (
              <li key={item.championshipId}>
                <Link to={`/campeonatos/${item.championshipSlug}`}>
                  <strong>{item.championshipName}</strong>
                  <span>{item.championshipSport} · {statusLabel(item.championshipStatus)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Este clube ainda não participa de campeonatos públicos.</p>
        )}
      </section>
    </main>
  );
}

function statusLabel(status: "PUBLISHED" | "FINISHED") {
  return status === "PUBLISHED" ? "Ativo" : "Concluído";
}
