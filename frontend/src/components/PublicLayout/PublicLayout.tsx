import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { logout } from "../../features/auth/auth-api";
import {
  currentUserQueryKey,
  useCurrentUser
} from "../../features/auth/auth-query";
import { Brand } from "../Brand/Brand";
import { ServerStatusNotice } from "../ServerStatusNotice/ServerStatusNotice";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./PublicLayout.module.css";

export function PublicLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userQuery = useCurrentUser();
  const user = userQuery.data?.user;
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
      await navigate("/");
    }
  });

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Brand />
          <span className={styles.productName}>competition operating system</span>
          <nav className={styles.navigation} aria-label="Navegação principal">
            <NavLink to="/campeonatos">Campeonatos</NavLink>
            <ThemeToggle />
            {user ? (
              <div className={styles.account}>
                <NavLink className={styles.accountLink} to="/perfil">
                  <span className={styles.accountAvatar} aria-hidden="true">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" />
                    ) : (
                      user.displayName.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span>{user.displayName}</span>
                </NavLink>
                <NavLink to="/painel">Painel</NavLink>
                <button
                  disabled={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                  type="button"
                >
                  Sair
                </button>
              </div>
            ) : (
              <>
                <NavLink to="/entrar">Entrar</NavLink>
                <NavLink className={styles.primaryLink} to="/cadastro">
                  Começar
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <ServerStatusNotice />

      <main>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Brand />
          <p>
            ArenaX © 2026 — desenvolvido por{" "}
            <a href="https://github.com/lucaszzx-dev">lucaszzx-dev</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
