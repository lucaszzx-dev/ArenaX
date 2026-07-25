import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getChampionship,
  updateChampionship,
  type ChampionshipInput
} from "../../features/championships/championship-api";
import { ChampionshipForm } from "../../features/championships/ChampionshipForm";
import { championshipListQueryKey } from "../../features/championships/championship-query";
import { ApiError } from "../../lib/api";
import styles from "../CreateChampionshipPage/CreateChampionshipPage.module.css";

export function EditChampionshipPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const championshipQuery = useQuery({
    queryKey: ["championships", "detail", id],
    queryFn: () => getChampionship(id),
    enabled: Boolean(id)
  });
  const mutation = useMutation({
    mutationFn: (input: ChampionshipInput) => updateChampionship(id, input),
    onSuccess: async (data) => {
      queryClient.setQueryData(
        ["championships", "detail", id],
        data
      );
      await queryClient.invalidateQueries({
        queryKey: championshipListQueryKey
      });
      await navigate(`/painel/campeonatos/${id}`);
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível atualizar a arena."
      );
    }
  });

  if (championshipQuery.isPending) {
    return <section className={styles.page}>Carregando configuração...</section>;
  }

  if (championshipQuery.isError) {
    return <section className={styles.page}>Arena não encontrada.</section>;
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <Link to={`/painel/campeonatos/${id}`}>← Voltar à arena</Link>
        <span>Configuração / edição</span>
        <h1>Ajuste as regras da arena.</h1>
        <p>As alterações serão refletidas no painel do organizador.</p>
      </header>

      <ChampionshipForm
        errorMessage={errorMessage}
        initial={championshipQuery.data.championship}
        isPending={mutation.isPending}
        onSubmit={(input) => {
          setErrorMessage(null);
          mutation.mutate(input);
        }}
        submitLabel="Salvar configurações"
      />
    </section>
  );
}
