import { Link } from "react-router-dom";

import { useCurrentUser } from "../../features/auth/auth-query";
import styles from "./HomePage.module.css";

const ranking = [
  { position: "01", name: "Raio Azul", played: 7, points: 18, trend: "+2" },
  { position: "02", name: "Falcões", played: 7, points: 16, trend: "—" },
  { position: "03", name: "Vila Norte", played: 7, points: 12, trend: "+1" }
];

export function HomePage() {
  const userQuery = useCurrentUser();
  const isAuthenticated = Boolean(userQuery.data?.user);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.index} aria-hidden="true">
          AX / 001
        </div>

        <div className={styles.copy}>
          <span className={styles.kicker}>Competition operating system</span>
          <h1>
            O campeonato acontece <span>dentro e fora de campo.</span>
          </h1>
          <p>
            ArenaX concentra participantes, confrontos, placares e classificação
            em uma experiência feita para quem organiza e para quem acompanha.
          </p>
          <div className={styles.actions}>
            <Link
              className={styles.primaryAction}
              to={isAuthenticated ? "/painel" : "/cadastro"}
            >
              {isAuthenticated ? "Ir para meu painel" : "Abrir uma arena"}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className={styles.textAction} to="/campeonatos/demo">
              Explorar campeonato demo
            </Link>
          </div>
        </div>

        <div className={styles.liveBoard}>
          <div className={styles.boardMeta}>
            <span className={styles.liveDot}>Ao vivo</span>
            <span>Futsal / rodada 07</span>
            <time>21:48</time>
          </div>

          <div className={styles.scoreRow}>
            <div>
              <span>RAV</span>
              <strong>Raio Azul</strong>
            </div>
            <p><b>04</b><span>—</span><b>02</b></p>
            <div>
              <span>VNT</span>
              <strong>Vila Norte</strong>
            </div>
          </div>

          <div className={styles.eventFeed}>
            <span>39'</span>
            <p><strong>Gol — Caio N.</strong> ampliou a vantagem do Raio Azul</p>
          </div>
        </div>
      </section>

      <section className={styles.dataSection}>
        <div className={styles.sectionIntro}>
          <span>02 / leitura instantânea</span>
          <h2>Informação esportiva sem ruído.</h2>
          <p>
            O placar lidera. A tabela explica. O calendário mantém todo mundo no
            mesmo ritmo.
          </p>
        </div>

        <div className={styles.rankingCard}>
          <header>
            <div>
              <span>Liga Metropolitana</span>
              <strong>Classificação</strong>
            </div>
            <small>Atualizado agora</small>
          </header>
          <div className={styles.tableHeader}>
            <span>Pos / equipe</span>
            <span>J</span>
            <span>Pts</span>
            <span>Mov.</span>
          </div>
          {ranking.map((team) => (
            <div className={styles.rankingRow} key={team.position}>
              <div>
                <b>{team.position}</b>
                <strong>{team.name}</strong>
              </div>
              <span>{team.played}</span>
              <b>{team.points}</b>
              <em>{team.trend}</em>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.manifesto}>
        <span>Organize / publique / acompanhe</span>
        <p>
          Da quadra do bairro ao servidor da comunidade, cada disputa ganha um
          endereço próprio.
        </p>
        <Link to={isAuthenticated ? "/painel" : "/cadastro"}>
          {isAuthenticated ? "Acessar minhas arenas →" : "Criar conta gratuita →"}
        </Link>
      </section>
    </div>
  );
}
