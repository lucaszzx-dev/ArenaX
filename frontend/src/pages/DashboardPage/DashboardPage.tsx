import { Link } from "react-router-dom";

import { useCurrentUser } from "../../features/auth/auth-query";
import { useChampionships } from "../../features/championships/championship-query";
import { type ChampionshipStatus } from "../../features/championships/championship-api";
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
  const championships = championshipQuery.data?.championships ?? [];
  const draftCount = championships.filter((c) => c.status === "DRAFT").length;
  const activeCount = championships.filter((c) => c.status === "PUBLISHED").length;
  const finishedCount = championships.filter((c) => c.status === "FINISHED").length;

  if (!user) return null;

  return (
    <section className={styles.page}>
      <div className={styles.welcome}>
        <div>
          <span>Painel do organizador</span>
          <h1>Olá, {user.displayName}.</h1>
          <p>Suas arenas e indicadores.</p>
        </div>
        <Link className={styles.createButton} to="/painel/campeonatos/novo">
          <span aria-hidden="true">+</span>
          Nova arena
        </Link>
      </div>

      {championshipQuery.isPending && (
        <div className={styles.state} role="status">Carregando...</div>
      )}

      {championshipQuery.isError && (
        <div className={styles.state} role="alert">Não foi possível carregar suas arenas.</div>
      )}

      {!championshipQuery.isPending && !championshipQuery.isError && championships.length === 0 && (
        <div className={styles.emptyState}>
          <span aria-hidden="true">AX</span>
          <h2>Sua primeira arena começa aqui.</h2>
          <p>Defina o esporte, o formato e as regras básicas.</p>
          <Link to="/painel/campeonatos/novo">Criar primeira arena</Link>
        </div>
      )}

      {championships.length > 0 && (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <b>{championships.length}</b>
              <span>Total</span>
            </div>
            <div className={styles.summaryCard}>
              <b>{draftCount}</b>
              <span>Rascunho</span>
            </div>
            <div className={styles.summaryCard}>
              <b>{activeCount}</b>
              <span>Ativas</span>
            </div>
            <div className={styles.summaryCard}>
              <b>{finishedCount}</b>
              <span>Finalizadas</span>
            </div>
          </div>

          <div className={styles.grid}>
            {championships.map((championship) => {
              const hasMissingData = !championship.description || !championship.startsAt;
              return (
                <Link className={styles.card} key={championship.id} to={`/painel/campeonatos/${championship.id}`}>
                  <header>
                    <span>{championship.sport}</span>
                    <b data-status={championship.status}>{statusLabels[championship.status]}</b>
                  </header>
                  <h2>{championship.name}</h2>
                  <p>{championship.description || "Adicione uma descrição para sua arena."}</p>
                  <footer>
                    <span>{championship.entryType === "TEAM" ? "Equipes" : "Individual"}</span>
                    <div>
                      {championship.status === "DRAFT" && <span className={styles.alert}>Publicar pendente</span>}
                      {hasMissingData && championship.status === "PUBLISHED" && <span className={styles.alert}>Dados incompletos</span>}
                      <strong>Abrir →</strong>
                    </div>
                  </footer>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
