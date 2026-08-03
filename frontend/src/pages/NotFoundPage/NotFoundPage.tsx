import { Link } from "react-router-dom";

import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <section className={styles.page}>
      <span>404</span>
      <h1>Essa competição não existe.</h1>
      <p>O endereço pode estar incorreto ou ter sido removido.</p>
      <Link to="/">Voltar ao início</Link>
    </section>
  );
}
