import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getChampionship } from "../../features/championships/championship-api";
import styles from "./OrganizerChampionshipPage.module.css";

export function OrganizerChampionshipPage() {
  const { id = "" } = useParams();
  const championshipQuery = useQuery({
    queryKey: ["championships", "detail", id],
    queryFn: () => getChampionship(id),
    enabled: Boolean(id)
  });

  if (championshipQuery.isPending) {
    return <div className={styles.state}>Carregando arena...</div>;
  }

  if (championshipQuery.isError) {
    return <div className={styles.state}>Não foi possível abrir esta arena.</div>;
  }

  const { championship } = championshipQuery.data;

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/painel">← Minhas arenas</Link>
      <header className={styles.heading}>
        <div>
          <span>{championship.sport} / rascunho</span>
          <h1>{championship.name}</h1>
          <p>{championship.description || "Arena sem descrição."}</p>
        </div>
        <b>Rascunho</b>
      </header>
      <Link
        className={styles.editLink}
        to={`/painel/campeonatos/${championship.id}/editar`}
      >
        Editar configurações
      </Link>
      <Link
        className={styles.publicLink}
        target="_blank"
        to={`/campeonatos/${championship.slug}`}
      >
        Abrir página pública ↗
      </Link>

      <div className={styles.steps}>
        <article>
          <span>01</span>
          <h2>Configuração criada</h2>
          <p>Identidade, calendário e regras básicas estão salvos.</p>
          <strong>Concluído</strong>
        </article>
        <article>
          <span>02</span>
          <h2>Participantes</h2>
          <p>Cadastre equipes ou competidores na próxima fase.</p>
          <Link
            className={styles.stepLink}
            to={`/painel/campeonatos/${championship.id}/participantes`}
          >
            Gerenciar participantes
          </Link>
        </article>
        <article>
          <span>03</span>
          <h2>Partidas</h2>
          <p>Monte os confrontos depois de adicionar participantes.</p>
          <Link
            className={styles.stepLink}
            to={`/painel/campeonatos/${championship.id}/partidas`}
          >
            Gerenciar partidas
          </Link>
        </article>
      </div>
    </section>
  );
}
