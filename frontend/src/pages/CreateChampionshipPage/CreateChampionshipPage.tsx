import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import {
  createChampionship,
  type ChampionshipInput
} from "../../features/championships/championship-api";
import { ChampionshipForm } from "../../features/championships/ChampionshipForm";
import { championshipListQueryKey } from "../../features/championships/championship-query";
import { ApiError } from "../../lib/api";
import styles from "./CreateChampionshipPage.module.css";

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

  function handleSubmit(input: ChampionshipInput) {
    setErrorMessage(null);
    mutation.mutate(input);
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

      <ChampionshipForm
        errorMessage={errorMessage}
        isPending={mutation.isPending}
        onSubmit={handleSubmit}
        submitLabel="Criar arena em rascunho"
      />
    </section>
  );
}
