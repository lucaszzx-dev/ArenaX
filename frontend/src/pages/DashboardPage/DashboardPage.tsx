import { Link } from "react-router-dom";

import { useCurrentUser } from "../../features/auth/auth-query";
import { useChampionships } from "../../features/championships/championship-query";
import { type ChampionshipStatus } from "../../features/championships/championship-api";
import {
  computeDashboardStats,
  dashboardAlert,
  dashboardAlertHref
} from "../../features/championships/dashboard-stats";
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
  const stats = computeDashboardStats(championships);

  if (!user) return null;

  return (
    <section className={styles.page}>
      <div className={styles.welcome}>
        <div>
          <span>Painel do organizador</span>
          <h1>Olá, {user.displayName}.</h1>
          <p>Suas competições e indicadores.</p>
        </div>
        <Link className={styles.createButton} to="/painel/campeonatos/novo">
          <span aria-hidden="true">+</span>
          Nova competição
        </Link>
      </div>

      {championshipQuery.isPending && (
        <div className={styles.state} role="status">Carregando...</div>
      )}

      {championshipQuery.isError && (
        <div className={styles.state} role="alert">Não foi possível carregar suas competições.</div>
      )}

      {!championshipQuery.isPending && !championshipQuery.isError && championships.length === 0 && (
        <div className={styles.emptyState}>
          <span aria-hidden="true">AX</span>
          <h2>Sua primeira competição começa aqui.</h2>
          <p>Defina o esporte, o formato e as regras básicas.</p>
          <Link to="/painel/campeonatos/novo">Criar primeira competição</Link>
        </div>
      )}

      {championships.length > 0 && (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <b>{stats.total}</b>
              <span>Total</span>
            </div>
            <div className={styles.summaryCard}>
              <b>{stats.draft}</b>
              <span>Rascunho</span>
            </div>
            <div className={styles.summaryCard}>
              <b>{stats.published}</b>
              <span>Ativas</span>
            </div>
            <div className={styles.summaryCard}>
              <b>{stats.finished}</b>
              <span>Finalizadas</span>
            </div>
          </div>

          <div className={styles.grid}>
            {championships.map((championship) => {
              const alert = dashboardAlert(championship);
              const alertHref = dashboardAlertHref(championship);
              return (
                <div className={styles.card} key={championship.id}>
                  <Link
                    aria-label={`Abrir ${championship.name}`}
                    className={styles.cardLink}
                    to={`/painel/campeonatos/${championship.id}`}
                  />
                  <header>
                    <span>{championship.sport}</span>
                    <b data-status={championship.status}>{statusLabels[championship.status]}</b>
                  </header>
                  <h2>{championship.name}</h2>
                  <p>{championship.description || "Adicione uma descrição para sua competição."}</p>
                  <footer>
                    <span>{championship.entryType === "TEAM" ? "Equipes" : "Individual"}</span>
                    <div>
                      {alert && alertHref && (
                        <Link
                          className={styles.alert}
                          to={alertHref}
                        >
                          {alert.label} →
                        </Link>
                      )}
                      <strong>Abrir →</strong>
                    </div>
                  </footer>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
