import { NavLink, Outlet } from "react-router-dom";

import { Brand } from "../Brand/Brand";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./PublicLayout.module.css";

export function PublicLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Brand />
          <span className={styles.productName}>ArenaX / competition OS</span>
          <nav className={styles.navigation} aria-label="Navegação principal">
            <NavLink to="/campeonatos/demo">Campeonatos</NavLink>
            <NavLink to="/entrar">Entrar</NavLink>
            <ThemeToggle />
            <NavLink className={styles.primaryLink} to="/cadastro">
              Começar
            </NavLink>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Brand />
          <p>ArenaX © 2026 — construído para a competição real.</p>
        </div>
      </footer>
    </div>
  );
}
