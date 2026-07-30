import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import type {
  Championship,
  ChampionshipInput
} from "./championship-api";
import styles from "./ChampionshipForm.module.css";

const sports = ["Futebol", "Futsal", "Basquete", "V�lei", "eSports", "Outro"];

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
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const maxYellowCardsEnabled = formData.get("maxYellowCardsEnabled") === "on";
    const maxYellowCards = maxYellowCardsEnabled
      ? Number(formData.get("maxYellowCardsValue") ?? 3)
      : 0;

    onSubmit({
      name: String(formData.get("name") ?? ""),
      sport: String(formData.get("sport") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      entryType:
        formData.get("entryType") === "INDIVIDUAL" ? "INDIVIDUAL" : "TEAM",
      format: formData.get("format") === "KNOCKOUT" ? "KNOCKOUT" : "LEAGUE",
      winPoints: Number(formData.get("winPoints")),
      drawPoints: Number(formData.get("drawPoints")),
      lossPoints: Number(formData.get("lossPoints")),
      allowsDraw: formData.get("allowsDraw") === "on",
      thirdPlace: formData.get("thirdPlace") === "on",
      maxYellowCards,
      startsAt: toIsoDate(formData.get("startsAt")),
      endsAt: toIsoDate(formData.get("endsAt"))
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <fieldset>
        <legend>01 / Identidade</legend>
        <div className={styles.fields}>
          <label className={styles.full}>
            Nome da arena
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
            <select defaultValue={initial?.sport ?? "Futebol"} name="sport">
              {sports.map((sport) => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
          </label>

          <label>
            Inscri��o
            <select defaultValue={initial?.entryType ?? "TEAM"} name="entryType">
              <option value="TEAM">Por equipes</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
          </label>

          <label>
            Formato
            <select
              defaultValue={initial?.format ?? "LEAGUE"}
              disabled={Boolean(initial)}
              name={initial ? undefined : "format"}
            >
              <option value="LEAGUE">Pontos corridos</option>
              <option value="KNOCKOUT">Mata-mata</option>
            </select>
            {initial && <input name="format" type="hidden" value={initial.format} />}
          </label>

          <label className={styles.checkbox}>
            <input
              defaultChecked={initial?.thirdPlace ?? true}
              name="thirdPlace"
              type="checkbox"
            />
            Disputa de terceiro lugar (mata-mata)
          </label>

          <label className={styles.full}>
            Descri��o
            <textarea
              defaultValue={initial?.description ?? ""}
              maxLength={500}
              name="description"
              placeholder="Explique brevemente como ser� a competi��o."
              rows={4}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>02 / Calend�rio</legend>
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
      </fieldset>

      <fieldset>
        <legend>03 / Pontua��o</legend>
        <div className={styles.scoreFields}>
          <label>
            Vit�ria
            <input defaultValue={initial?.winPoints ?? 3} max="20" min="0" name="winPoints" type="number" />
          </label>
          <label>
            Empate
            <input defaultValue={initial?.drawPoints ?? 1} max="20" min="0" name="drawPoints" type="number" />
          </label>
          <label>
            Derrota
            <input defaultValue={initial?.lossPoints ?? 0} max="20" min="0" name="lossPoints" type="number" />
          </label>
        </div>
        <label className={styles.checkbox}>
          <input
            defaultChecked={initial?.allowsDraw ?? true}
            name="allowsDraw"
            type="checkbox"
          />
          Este campeonato permite partidas empatadas
        </label>
        <label className={styles.checkbox}>
          <input
            defaultChecked={initial ? (initial.maxYellowCards > 0) : false}
            name="maxYellowCardsEnabled"
            type="checkbox"
          />
          Suspens�o autom�tica por cart�es
        </label>
        <label>
          Amarelos para suspens�o
          <input
            defaultValue={initial?.maxYellowCards ?? 3}
            min={1}
            max={10}
            name="maxYellowCardsValue"
            type="number"
          />
        </label>
      </fieldset>

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