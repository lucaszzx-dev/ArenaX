import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import {
  getChampionship,
  updateChampionshipStatus,
  type ChampionshipStatus
} from "../../features/championships/championship-api";
import { championshipListQueryKey } from "../../features/championships/championship-query";
import { ApiError } from "../../lib/api";
import styles from "./OrganizerChampionshipPage.module.css";

export function OrganizerChampionshipPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const championshipQuery = useQuery({
    queryKey: ["championships", "detail", id],
    queryFn: () => getChampionship(id),
    enabled: Boolean(id)
  });
  const statusMutation = useMutation({
    mutationFn: (status: ChampionshipStatus) =>
      updateChampionshipStatus(id, status),
    onSuccess: async (data) => {
      queryClient.setQueryData(["championships", "detail", id], data);
      await queryClient.invalidateQueries({ queryKey: championshipListQueryKey });
      setMessage("Status da arena atualizado.");
    },
    onError: (error) => setMessage(
      error instanceof ApiError ? error.message : "Não foi possível alterar o status."
    )
  });

  if (championshipQuery.isPending) {
    return <div className={styles.state}>Carregando arena...</div>;
  }

  if (championshipQuery.isError) {
    return <div className={styles.state}>Não foi possível abrir esta arena.</div>;
  }

  const { championship } = championshipQuery.data;

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/painel">← Minhas arenas</Link>
      <header className={styles.heading}>
        <div>
          <span>{championship.sport} / {statusLabel(championship.status)}</span>
          <h1>{championship.name}</h1>
          <p>{championship.description || "Arena sem descrição."}</p>
        </div>
        <b>{statusLabel(championship.status)}</b>
      </header>
      <Link
        className={styles.editLink}
        to={`/painel/campeonatos/${championship.id}/editar`}
      >
        Editar configurações
      </Link>
      {championship.status !== "DRAFT" && (
        <Link
          className={styles.publicLink}
          target="_blank"
          to={`/campeonatos/${championship.slug}`}
        >
          Abrir página pública ↗
        </Link>
      )}
      <div className={styles.statusActions}>
        {championship.status === "DRAFT" && (
          <button
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate("PUBLISHED")}
            type="button"
          >
            Publicar arena
          </button>
        )}
        {championship.status === "PUBLISHED" && (
          <>
            <button
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("DRAFT")}
              type="button"
            >
              Voltar para rascunho
            </button>
            <button
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("FINISHED")}
              type="button"
            >
              Encerrar campeonato
            </button>
          </>
        )}
        {championship.status === "FINISHED" && (
          <button
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate("PUBLISHED")}
            type="button"
          >
            Reabrir campeonato
          </button>
        )}
      </div>
      {message && <p className={styles.feedback} role="status">{message}</p>}

      <div className={styles.steps}>
        <article>
          <span>01</span>
          <h2>Configuração criada</h2>
          <p>Identidade, calendário e regras básicas estão salvos.</p>
          <strong>Concluído</strong>
        </article>
        <article>
          <span>02</span>
          <h2>Participantes</h2>
          <p>Cadastre equipes ou competidores na próxima fase.</p>
          <Link
            className={styles.stepLink}
            to={`/painel/campeonatos/${championship.id}/participantes`}
          >
            Gerenciar participantes
          </Link>
        </article>
        <article>
          <span>03</span>
          <h2>Partidas</h2>
          <p>Monte os confrontos depois de adicionar participantes.</p>
          <Link
            className={styles.stepLink}
            to={`/painel/campeonatos/${championship.id}/partidas`}
          >
            Gerenciar partidas
          </Link>
        </article>
      </div>
    </section>
  );
}

function statusLabel(status: ChampionshipStatus) {
  if (status === "PUBLISHED") return "Publicado";
  if (status === "FINISHED") return "Finalizado";
  return "Rascunho";
}
