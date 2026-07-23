import { Link } from "react-router-dom";

import styles from "./HomePage.module.css";

const benefits = [
  {
    number: "01",
    title: "Organize sem planilhas",
    description: "Participantes, partidas e placares no mesmo lugar."
  },
  {
    number: "02",
    title: "Classificação clara",
    description: "Resultados transformados em uma tabela fácil de acompanhar."
  },
  {
    number: "03",
    title: "Compartilhe a arena",
    description: "Uma página pública responsiva para cada campeonato."
  }
];

export function HomePage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>Sua competição começa aqui</span>
            <h1>
              Toda disputa merece uma <em>grande arena.</em>
            </h1>
            <p>
              Crie campeonatos, organize confrontos e deixe todos acompanharem
              cada ponto da competição.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} to="/cadastro">
                Criar meu campeonato
              </Link>
              <Link className={styles.secondaryAction} to="/campeonatos/demo">
                Ver demonstração
              </Link>
            </div>
          </div>

          <div className={styles.scoreboard} aria-label="Exemplo de placar">
            <div className={styles.scoreboardHeader}>
              <span>Final</span>
              <strong>Liga de Bairro</strong>
              <span>Rodada 5</span>
            </div>
            <div className={styles.match}>
              <div className={styles.team}>
                <span className={styles.badge}>RV</span>
                <strong>Raio Verde</strong>
              </div>
              <div className={styles.score}>
                <strong>3</strong>
                <span>:</span>
                <strong>1</strong>
              </div>
              <div className={styles.team}>
                <span className={`${styles.badge} ${styles.badgeDark}`}>AU</span>
                <strong>Atlético União</strong>
              </div>
            </div>
            <div className={styles.highlight}>
              <span>Próxima partida</span>
              <strong>Sáb, 18:30</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.benefits} aria-labelledby="benefits-title">
        <div className={styles.sectionHeading}>
          <span>Feito para competir</span>
          <h2 id="benefits-title">O essencial para colocar o jogo em campo.</h2>
        </div>
        <div className={styles.benefitGrid}>
          {benefits.map((benefit) => (
            <article key={benefit.number}>
              <span>{benefit.number}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
