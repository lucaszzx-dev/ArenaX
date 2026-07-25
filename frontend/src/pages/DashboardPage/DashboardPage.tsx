import { Link } from "react-router-dom";

import { useCurrentUser } from "../../features/auth/auth-query";
import {
  type ChampionshipStatus
} from "../../features/championships/championship-api";
import { useChampionships } from "../../features/championships/championship-query";
import styles from "./DashboardPage.module.css";

const statusLabels: Record<ChampionshipStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  FINISHED: "Finalizado"
};

export function DashboardPage() {
  const userQuery = useCurrentUser();
  const championshipQuery = useChampionships();
  const user = userQuery.data?.user;

  if (!user) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.welcome}>
        <div>
          <span>Painel do organizador</span>
          <h1>Olá, {user.displayName}.</h1>
          <p>Crie, configure e acompanhe suas arenas.</p>
        </div>
        <Link className={styles.createButton} to="/painel/campeonatos/novo">
          <span aria-hidden="true">＋</span>
          Nova arena
        </Link>
      </div>

      {championshipQuery.isPending && (
        <div className={styles.state} role="status">
          Carregando suas arenas...
        </div>
      )}

      {championshipQuery.isError && (
        <div className={styles.state} role="alert">
          Não foi possível carregar suas arenas.
        </div>
      )}

      {championshipQuery.data?.championships.length === 0 && (
        <div className={styles.emptyState}>
          <span aria-hidden="true">AX</span>
          <h2>Sua primeira arena começa aqui.</h2>
          <p>
            Defina o esporte, o formato de inscrição e as regras básicas.
          </p>
          <Link to="/painel/campeonatos/novo">Criar primeira arena</Link>
        </div>
      )}

      {championshipQuery.data &&
        championshipQuery.data.championships.length > 0 && (
          <div className={styles.grid}>
            {championshipQuery.data.championships.map((championship) => (
              <Link
                className={styles.card}
                key={championship.id}
                to={`/painel/campeonatos/${championship.id}`}
              >
                <header>
                  <span>{championship.sport}</span>
                  <b data-status={championship.status}>
                    {statusLabels[championship.status]}
                  </b>
                </header>
                <h2>{championship.name}</h2>
                <p>
                  {championship.description ||
                    "Adicione uma descrição para sua arena."}
                </p>
                <footer>
                  <span>
                    {championship.entryType === "TEAM"
                      ? "Equipes"
                      : "Individual"}
                  </span>
                  <strong>Abrir painel →</strong>
                </footer>
              </Link>
            ))}
          </div>
        )}
    </section>
  );
}
