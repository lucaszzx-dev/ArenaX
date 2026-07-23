import styles from "./ChampionshipPage.module.css";

const standings = [
  ["1", "Raio Verde", "5", "13"],
  ["2", "Atlético União", "5", "10"],
  ["3", "Falcões FC", "5", "8"],
  ["4", "Vila Norte", "5", "4"]
];

export function ChampionshipPage() {
  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <span>Futebol • Pontos corridos</span>
        <h1>Liga de Bairro 2026</h1>
        <p>Temporada regular • 8 equipes • Em andamento</p>
      </section>

      <div className={styles.content}>
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span>Classificação</span>
              <h2>Temporada regular</h2>
            </div>
            <span>Atualizada agora</span>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Equipe</th>
                  <th>J</th>
                  <th>Pts.</th>
                </tr>
              </thead>
              <tbody>
                {standings.map(([position, team, matches, points]) => (
                  <tr key={position}>
                    <td><strong>{position}</strong></td>
                    <td>{team}</td>
                    <td>{matches}</td>
                    <td><strong>{points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span>Próxima rodada</span>
              <h2>Sábado, 25 jul.</h2>
            </div>
          </div>
          <div className={styles.fixture}>
            <span>18:30</span>
            <strong>Raio Verde</strong>
            <b>×</b>
            <strong>Falcões FC</strong>
          </div>
          <div className={styles.fixture}>
            <span>20:00</span>
            <strong>Vila Norte</strong>
            <b>×</b>
            <strong>Atlético União</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
