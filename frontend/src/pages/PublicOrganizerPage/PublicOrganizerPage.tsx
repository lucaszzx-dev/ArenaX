import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getPublicOrganizer } from "../../features/public-profiles/public-profile-api";
import { useSeo } from "../../lib/use-seo";
import styles from "./PublicOrganizerPage.module.css";

export function PublicOrganizerPage() {
  const { organizerId = "" } = useParams();
  const query = useQuery({
    queryKey: ["public-organizer", organizerId],
    queryFn: () => getPublicOrganizer(organizerId),
    enabled: Boolean(organizerId)
  });

  useSeo({
    title: query.data
      ? `${query.data.organizer.displayName} — organizador no ArenaX`
      : "Organizador — ArenaX",
    description: query.data
      ? `Campeonatos organizados por ${query.data.organizer.displayName} no ArenaX.`
      : "Perfil público de um organizador no ArenaX."
  });

  if (query.isPending) return <div className={styles.state}>Carregando organizador...</div>;
  if (query.isError) return <div className={styles.state}>Organizador não encontrado.</div>;

  const { organizer, sports, championships } = query.data;

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        {organizer.avatarUrl ? (
          <img className={styles.avatar} alt={`Foto de ${organizer.displayName}`} src={organizer.avatarUrl} />
        ) : (
          <div className={styles.avatarPlaceholder}>{organizer.displayName.slice(0, 1).toUpperCase()}</div>
        )}
        <span>Organizador</span>
        <h1>{organizer.displayName}</h1>
        {organizer.bio && <p>{organizer.bio}</p>}
        {sports.length > 0 && (
          <div className={styles.sports}>
            {sports.map((sport) => <span key={sport}>{sport}</span>)}
          </div>
        )}
      </header>

      <section className={styles.section}>
        <h2>Campeonatos ativos</h2>
        {championships.active.length > 0 ? (
          <ul className={styles.list}>
            {championships.active.map((item) => (
              <li key={item.id}>
                <Link to={`/campeonatos/${item.slug}`}>
                  <strong>{item.name}</strong>
                  <span>{item.sport}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nenhum campeonato ativo no momento.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2>Campeonatos concluídos</h2>
        {championships.finished.length > 0 ? (
          <ul className={styles.list}>
            {championships.finished.map((item) => (
              <li key={item.id}>
                <Link to={`/campeonatos/${item.slug}`}>
                  <strong>{item.name}</strong>
                  <span>{item.sport}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nenhum campeonato concluído.</p>
        )}
      </section>
    </main>
  );
}
