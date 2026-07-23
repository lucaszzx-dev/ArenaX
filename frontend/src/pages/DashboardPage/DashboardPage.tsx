import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { getCurrentUser, logout } from "../../features/auth/auth-api";
import { ApiError } from "../../lib/api";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    retry: false
  });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["current-user"] });
      await navigate("/entrar");
    }
  });

  if (userQuery.isPending) {
    return <div className={styles.state}>Carregando sua arena...</div>;
  }

  if (userQuery.error instanceof ApiError && userQuery.error.status === 401) {
    return (
      <div className={styles.state}>
        <h1>Sua sessão não está ativa.</h1>
        <button onClick={() => void navigate("/entrar")} type="button">
          Entrar
        </button>
      </div>
    );
  }

  if (userQuery.isError) {
    return (
      <div className={styles.state} role="alert">
        Não foi possível carregar seu perfil.
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.welcome}>
        <span>Painel do organizador</span>
        <h1>Olá, {userQuery.data.user.displayName}.</h1>
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

      <button
        className={styles.logout}
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
        type="button"
      >
        Sair da conta
      </button>
    </section>
  );
}
