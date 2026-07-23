import type { ReactNode } from "react";

import styles from "./AuthCard.module.css";

type AuthCardProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export function AuthCard({ children, description, title }: AuthCardProps) {
  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <span className={styles.label}>Área do competidor</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    </section>
  );
}
