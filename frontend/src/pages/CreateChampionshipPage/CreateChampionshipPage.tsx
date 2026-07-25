import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { createChampionship } from "../../features/championships/championship-api";
import { championshipListQueryKey } from "../../features/championships/championship-query";
import { ApiError } from "../../lib/api";
import styles from "./CreateChampionshipPage.module.css";

const sports = ["Futebol", "Futsal", "Basquete", "Vôlei", "eSports", "Outro"];

function toIsoDate(value: FormDataEntryValue | null) {
  const date = String(value ?? "");
  return date ? new Date(`${date}T12:00:00`).toISOString() : null;
}

export function CreateChampionshipPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: createChampionship,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: championshipListQueryKey
      });
      await navigate(`/painel/campeonatos/${data.championship.id}`);
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível criar a arena."
      );
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(event.currentTarget);

    mutation.mutate({
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
    <section className={styles.page}>
      <header className={styles.heading}>
        <Link to="/painel">← Voltar ao painel</Link>
        <span>Nova arena / configuração inicial</span>
        <h1>Prepare o palco da competição.</h1>
        <p>
          Comece pelas regras essenciais. Participantes e partidas serão
          adicionados depois.
        </p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <fieldset>
          <legend>01 / Identidade</legend>
          <div className={styles.fields}>
            <label className={styles.full}>
              Nome da arena
              <input
                maxLength={100}
                minLength={3}
                name="name"
                placeholder="Ex.: Copa da Vila 2026"
                required
              />
            </label>

            <label>
              Esporte
              <select defaultValue="Futebol" name="sport">
                {sports.map((sport) => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </label>

            <label>
              Inscrição
              <select defaultValue="TEAM" name="entryType">
                <option value="TEAM">Por equipes</option>
                <option value="INDIVIDUAL">Individual</option>
              </select>
            </label>

            <label className={styles.full}>
              Descrição
              <textarea
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
              <input name="startsAt" type="date" />
            </label>
            <label>
              Data final
              <input name="endsAt" type="date" />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>03 / Pontuação</legend>
          <div className={styles.scoreFields}>
            <label>
              Vitória
              <input defaultValue="3" max="20" min="0" name="winPoints" type="number" />
            </label>
            <label>
              Empate
              <input defaultValue="1" max="20" min="0" name="drawPoints" type="number" />
            </label>
            <label>
              Derrota
              <input defaultValue="0" max="20" min="0" name="lossPoints" type="number" />
            </label>
          </div>
          <label className={styles.checkbox}>
            <input defaultChecked name="allowsDraw" type="checkbox" />
            Este campeonato permite partidas empatadas
          </label>
        </fieldset>

        {errorMessage && (
          <p className={styles.error} role="alert">{errorMessage}</p>
        )}

        <div className={styles.actions}>
          <Link to="/painel">Cancelar</Link>
          <button disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Criando arena..." : "Criar arena em rascunho"}
          </button>
        </div>
      </form>
    </section>
  );
}
