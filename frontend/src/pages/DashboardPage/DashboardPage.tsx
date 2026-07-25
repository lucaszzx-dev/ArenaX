import { useCurrentUser } from "../../features/auth/auth-query";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const userQuery = useCurrentUser();
  const user = userQuery.data?.user;

  if (!user) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.welcome}>
        <span>Painel do organizador</span>
        <h1>Olá, {user.displayName}.</h1>
        <p>Seu próximo campeonato começa por aqui.</p>
      </div>

      <div className={styles.emptyState}>
        <span aria-hidden="true">＋</span>
        <h2>Você ainda não criou campeonatos.</h2>
        <p>
          Em nossa próxima etapa, este botão abrirá o formulário de criação.
        </p>
        <button disabled type="button">
          Criar campeonato
        </button>
      </div>
    </section>
  );
}
