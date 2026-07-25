import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import type {
  Championship,
  ChampionshipInput
} from "./championship-api";
import styles from "./ChampionshipForm.module.css";

const sports = ["Futebol", "Futsal", "Basquete", "Vôlei", "eSports", "Outro"];

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

    onSubmit({
      name: String(formData.get("name") ?? ""),
      sport: String(formData.get("sport") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      entryType:
        formData.get("entryType") === "INDIVIDUAL" ? "INDIVIDUAL" : "TEAM",
      winPoints: Number(formData.get("winPoints")),
      drawPoints: Number(formData.get("drawPoints")),
      lossPoints: Number(formData.get("lossPoints")),
      allowsDraw: formData.get("allowsDraw") === "on",
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
            Inscrição
            <select defaultValue={initial?.entryType ?? "TEAM"} name="entryType">
              <option value="TEAM">Por equipes</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
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
      </fieldset>

      <fieldset>
        <legend>02 / Calendário</legend>
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
        <legend>03 / Pontuação</legend>
        <div className={styles.scoreFields}>
          <label>
            Vitória
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
