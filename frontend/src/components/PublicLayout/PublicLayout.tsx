import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { logout } from "../../features/auth/auth-api";
import { currentUserQueryKey, useCurrentUser } from "../../features/auth/auth-query";
import { useUnreadCount } from "../../features/notifications/notification-query";
import { Brand } from "../Brand/Brand";
import { RemoteImage } from "../RemoteImage/RemoteImage";
import { ServerStatusNotice } from "../ServerStatusNotice/ServerStatusNotice";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./PublicLayout.module.css";

export function PublicLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userQuery = useCurrentUser();
  const user = userQuery.data?.user;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
      await navigate("/");
    }
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#conteudo">Pular para o conteúdo</a>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Brand />
          <span className={styles.productName}>competition operating system</span>
          <div className={styles.headerActions}>
            {user && <NotificationsBell />}
            <button aria-controls="main-navigation" aria-expanded={isMenuOpen} aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"} className={styles.menuButton} onClick={() => setIsMenuOpen((isOpen) => !isOpen)} type="button">
              <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Navegação principal" className={styles.navigation} data-open={isMenuOpen} id="main-navigation" onClick={() => setIsMenuOpen(false)}>
            <NavLink to="/campeonatos">Campeonatos</NavLink>
            <ThemeToggle />
            {user ? (
              <div className={styles.account}>
                <NavLink className={styles.accountLink} to="/perfil">
                  <span className={styles.accountAvatar} aria-hidden="true"><RemoteImage alt="" src={user.avatarUrl} fallback={user.displayName.slice(0, 2).toUpperCase()} /></span>
                  <span>{user.displayName}</span>
                </NavLink>
                <NavLink to="/painel">Painel</NavLink>
                <NavLink to="/painel/clubes">Clubes</NavLink>
                <button disabled={logoutMutation.isPending} onClick={() => logoutMutation.mutate()} type="button">Sair</button>
              </div>
            ) : <><NavLink to="/entrar">Entrar</NavLink><NavLink className={styles.primaryLink} to="/cadastro">Começar</NavLink></>}
          </nav>
        </div>
      </header>
      <ServerStatusNotice />
      <main id="conteudo"><Outlet /></main>
      <footer className={styles.footer}>
        <div className={styles.footerContent}><Brand /><p>ArenaX © 2026 — desenvolvido por <a href="https://github.com/lucaszzx-dev">lucaszzx-dev</a></p></div>
      </footer>
    </div>
  );
}

function NotificationsBell() {
  const unreadQuery = useUnreadCount();
  const unread = unreadQuery.data?.unread ?? 0;
  const label = unread > 0 ? `Notificações (${unread}${unread === 1 ? " não lida)" : " não lidas)"}` : "Notificações";
  return <NavLink aria-label={label} className={styles.notificationsLink} to="/painel/notificacoes"><span aria-hidden="true" className={styles.bellIcon}><svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" /><path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg></span>{unread > 0 && <b className={styles.notificationsBadge} aria-hidden="true">{unread > 99 ? "99+" : unread}</b>}</NavLink>;
}
