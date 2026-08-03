import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { logout } from "../../features/auth/auth-api";
import {
  currentUserQueryKey,
  useCurrentUser
} from "../../features/auth/auth-query";
import { useUnreadCount } from "../../features/notifications/notification-query";
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
      <a className={styles.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Brand />
          <span className={styles.productName}>competition operating system</span>
          <nav className={styles.navigation} aria-label="Navegação principal">
            <NavLink to="/campeonatos">Campeonatos</NavLink>
            <ThemeToggle />
            {user ? (
              <div className={styles.account}>
                <NotificationsBell />
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
                <NavLink to="/painel/clubes">Clubes</NavLink>
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

      <main id="conteudo">
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

function NotificationsBell() {
  const unreadQuery = useUnreadCount();
  const unread = unreadQuery.data?.unread ?? 0;
  const label = unread > 0
    ? "Notificações (" + unread + (unread === 1 ? " não lida)" : " não lidas)")
    : "Notificações";

  return (
    <NavLink
      aria-label={label}
      className={styles.notificationsLink}
      to="/painel/notificacoes"
    >
      <span aria-hidden="true">Sino</span>
      {unread > 0 && (
        <b className={styles.notificationsBadge} aria-hidden="true">
          {unread > 99 ? "99+" : unread}
        </b>
      )}
    </NavLink>
  );
}
