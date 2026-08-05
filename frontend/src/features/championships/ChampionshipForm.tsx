import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import type {
  Championship,
  ChampionshipInput
} from "./championship-api";
import styles from "./ChampionshipForm.module.css";

const sports = ["Futebol", "Futsal", "Basquete", "Vôlei", "eSports", "Outro"];
const footballLike = new Set(["Futebol", "Futsal"]);
const selectableSports = sports.filter((sport) => sport !== "eSports" && sport !== "Outro");

type ChampionshipFormProps = {
  initial?: Championship;
  isPending: boolean;
  errorMessage: string | null;
  submitLabel: string;
  onSubmit: (input: ChampionshipInput) => void;
};

function toIsoDate(value: FormDataEntryValue | null) {
  const date = String(value ?? "");
  return date ? new Date(`${date}T12:00:00`).toISOString() : null;
}

function toDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

export function ChampionshipForm({
  initial,
  isPending,
  errorMessage,
  submitLabel,
  onSubmit
}: ChampionshipFormProps) {
  const [sport, setSport] = useState(initial?.sport ?? "Futebol");
  const [format, setFormat] = useState<TournamentFormatValue>(
    initial?.format ?? "LEAGUE"
  );
  const isLegacySport = !selectableSports.includes(sport);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const isKnockout = format === "KNOCKOUT";
    const isVolleyball = sport === "Vôlei";
    const isFootball = footballLike.has(sport);
    const maxYellowCardsEnabled = formData.get("maxYellowCardsEnabled") === "on";
    const maxYellowCards = isFootball && maxYellowCardsEnabled
      ? Number(formData.get("maxYellowCardsValue") ?? 3)
      : 0;

    onSubmit({
      name: String(formData.get("name") ?? ""),
      sport,
      description: String(formData.get("description") ?? "") || null,
      entryType:
        formData.get("entryType") === "INDIVIDUAL" ? "INDIVIDUAL" : "TEAM",
      format: isKnockout ? "KNOCKOUT" : "LEAGUE",
      winPoints: Number(formData.get("winPoints")),
      drawPoints: Number(formData.get("drawPoints")),
      lossPoints: Number(formData.get("lossPoints")),
      allowsDraw: isKnockout ? false : formData.get("allowsDraw") === "on",
      bestOfSets: isVolleyball ? Number(formData.get("bestOfSets") ?? 5) : 5,
      thirdPlace: isKnockout ? formData.get("thirdPlace") === "on" : false,
      maxYellowCards,
      startsAt: toIsoDate(formData.get("startsAt")),
      endsAt: toIsoDate(formData.get("endsAt"))
    });
  }

  const isKnockout = format === "KNOCKOUT";
  const isVolleyball = sport === "Vôlei";
  const isFootball = footballLike.has(sport);

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <span>01</span>
          <h2>Identidade</h2>
        </header>
        <div className={styles.fields}>
          <label className={styles.full}>
            Nome da competição
            <input
              defaultValue={initial?.name}
              maxLength={100}
              minLength={3}
              name="name"
              placeholder="Ex.: Copa da Vila 2026"
              required
            />
          </label>

          <label>
            Esporte
            {isLegacySport && <input name="sport" type="hidden" value={sport} />}
            <select
              disabled={isLegacySport}
              name={isLegacySport ? undefined : "sport"}
              onChange={(event) => setSport(event.target.value)}
              value={sport}
            >
              {selectableSports.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Inscrição
            <select defaultValue={initial?.entryType ?? "TEAM"} name="entryType">
              <option value="TEAM">Por equipes</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
          </label>

          <label>
            Formato
            <select
              disabled={Boolean(initial)}
              name={initial ? undefined : "format"}
              onChange={(event) =>
                setFormat(event.target.value as TournamentFormatValue)
              }
              value={format}
            >
              <option value="LEAGUE">Pontos corridos</option>
              <option value="KNOCKOUT">Mata-mata</option>
            </select>
            {initial && (
              <input name="format" type="hidden" value={initial.format} />
            )}
          </label>

          <label className={styles.full}>
            Descrição
            <textarea
              defaultValue={initial?.description ?? ""}
              maxLength={500}
              name="description"
              placeholder="Explique brevemente como será a competição."
              rows={4}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <span>02</span>
          <h2>Calendário</h2>
        </header>
        <div className={styles.fields}>
          <label>
            Data inicial
            <input
              defaultValue={toDateInput(initial?.startsAt)}
              name="startsAt"
              type="date"
            />
          </label>
          <label>
            Data final
            <input
              defaultValue={toDateInput(initial?.endsAt)}
              name="endsAt"
              type="date"
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <span>03</span>
          <h2>Pontuação</h2>
        </header>
        <div className={styles.scoreFields}>
          <label>
            Vitória
            <input
              defaultValue={initial?.winPoints ?? 3}
              max="20"
              min="0"
              name="winPoints"
              type="number"
            />
          </label>
          <label>
            Empate
            <input
              defaultValue={initial?.drawPoints ?? 1}
              max="20"
              min="0"
              name="drawPoints"
              type="number"
            />
          </label>
          <label>
            Derrota
            <input
              defaultValue={initial?.lossPoints ?? 0}
              max="20"
              min="0"
              name="lossPoints"
              type="number"
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <span>04</span>
          <h2>Regras da competição</h2>
        </header>
        <div className={styles.rules}>
          <label className={styles.checkbox}>
            <input
              defaultChecked={
                initial ? initial.allowsDraw : !isKnockout
              }
              disabled={isKnockout}
              name="allowsDraw"
              type="checkbox"
            />
            Este campeonato permite partidas empatadas
          </label>
          {isKnockout && (
            <p className={styles.hint}>
              No mata-mata as partidas precisam de um vencedor.
            </p>
          )}

          {isKnockout && (
            <label className={styles.checkbox}>
              <input
                defaultChecked={initial?.thirdPlace ?? true}
                name="thirdPlace"
                type="checkbox"
              />
              Disputa de terceiro lugar
            </label>
          )}

          {isVolleyball && (
            <label>
              Sets para vencer (vôlei)
              <select
                defaultValue={initial?.bestOfSets ?? 5}
                name="bestOfSets"
              >
                <option value={3}>Melhor de 3</option>
                <option value={5}>Melhor de 5</option>
              </select>
            </label>
          )}

          {isFootball && (
            <>
              <label className={styles.checkbox}>
                <input
                  defaultChecked={
                    initial ? initial.maxYellowCards > 0 : false
                  }
                  name="maxYellowCardsEnabled"
                  type="checkbox"
                />
                Suspensão automática por cartões
              </label>
              <label>
                Amarelos para suspensão
                <input
                  defaultValue={initial?.maxYellowCards ?? 3}
                  min={1}
                  max={10}
                  name="maxYellowCardsValue"
                  type="number"
                />
              </label>
            </>
          )}
        </div>
      </section>

      {errorMessage && (
        <p className={styles.error} role="alert">{errorMessage}</p>
      )}

      <div className={styles.actions}>
        <Link to={initial ? `/painel/campeonatos/${initial.id}` : "/painel"}>
          Cancelar
        </Link>
        <button disabled={isPending} type="submit">
          {isPending ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

type TournamentFormatValue = "LEAGUE" | "KNOCKOUT";
