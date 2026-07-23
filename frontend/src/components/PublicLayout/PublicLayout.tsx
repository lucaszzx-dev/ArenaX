import { NavLink, Outlet } from "react-router-dom";

import { Brand } from "../Brand/Brand";
import styles from "./PublicLayout.module.css";

export function PublicLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Brand />
          <nav className={styles.navigation} aria-label="Navegação principal">
            <NavLink to="/campeonatos/demo">Campeonatos</NavLink>
            <NavLink to="/entrar">Entrar</NavLink>
            <NavLink className={styles.primaryLink} to="/cadastro">
              Criar conta
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
          <p>Campeonatos amadores com organização de profissional.</p>
        </div>
      </footer>
    </div>
  );
}
