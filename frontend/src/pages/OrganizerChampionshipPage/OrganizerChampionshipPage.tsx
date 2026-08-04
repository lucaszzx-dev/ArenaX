import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  deleteChampionship,
  getChampionship,
  updateChampionshipStatus,
  type ChampionshipStatus
} from "../../features/championships/championship-api";
import {
  championshipDetailQueryKey,
  championshipListQueryKey
} from "../../features/championships/championship-query";
import { ApiError } from "../../lib/api";
import styles from "./OrganizerChampionshipPage.module.css";

export function OrganizerChampionshipPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const championshipQuery = useQuery({
    queryKey: championshipDetailQueryKey(id),
    queryFn: () => getChampionship(id),
    enabled: Boolean(id)
  });
  const statusMutation = useMutation({
    mutationFn: (status: ChampionshipStatus) =>
      updateChampionshipStatus(id, status),
    onSuccess: async (data) => {
      queryClient.setQueryData(championshipDetailQueryKey(id), data);
      await queryClient.invalidateQueries({ queryKey: championshipListQueryKey });
      setMessage("Status da competição atualizado.");
    },
    onError: (error) => setMessage(
      error instanceof ApiError ? error.message : "Não foi possível alterar o status."
    )
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteChampionship(id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: championshipDetailQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: championshipListQueryKey });
      setDeleteOpen(false);
      setDeleteConfirmation("");
      await navigate("/painel", { replace: true });
    },
    onError: (error) => {
      setDeleteOpen(false);
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível excluir a competição."
      );
    }
  });

  function confirmStatus(
    confirmation: string,
    status: ChampionshipStatus
  ) {
    if (window.confirm(confirmation)) {
      setMessage(null);
      statusMutation.mutate(status);
    }
  }

  if (championshipQuery.isPending) {
    return <div className={styles.state}>Carregando competição...</div>;
  }

  if (championshipQuery.isError) {
    return <div className={styles.state}>Não foi possível abrir esta competição.</div>;
  }

  const { championship } = championshipQuery.data;

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/painel">← Minhas competições</Link>
      <header className={styles.heading}>
        <div>
          <span>{championship.sport} / {statusLabel(championship.status)}</span>
          <h1>{championship.name}</h1>
          <p>{championship.description || "Competição sem descrição."}</p>
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
            onClick={() => confirmStatus(
              "Publicar esta competição e liberar a página pública?",
              "PUBLISHED"
            )}
            type="button"
          >
            Publicar competição
          </button>
        )}
        {championship.status === "PUBLISHED" && (
          <>
            <button
              disabled={statusMutation.isPending}
              onClick={() => confirmStatus(
                "Voltar para rascunho e ocultar a página pública?",
                "DRAFT"
              )}
              type="button"
            >
              Voltar para rascunho
            </button>
            <button
              disabled={statusMutation.isPending}
              onClick={() => confirmStatus(
                "Encerrar este campeonato?",
                "FINISHED"
              )}
              type="button"
            >
              Encerrar campeonato
            </button>
          </>
        )}
        {championship.status === "FINISHED" && (
          <button
            disabled={statusMutation.isPending}
            onClick={() => confirmStatus(
              "Reabrir este campeonato?",
              "PUBLISHED"
            )}
            type="button"
          >
            Reabrir campeonato
          </button>
        )}
      </div>
      {message && <p className={styles.feedback} role="alert">{message}</p>}

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

      <section className={styles.dangerZone}>
        <header>
          <span>Zona de perigo</span>
          <h2>Excluir competição</h2>
        </header>
        <p>
          A exclusão remove permanentemente a competição, participantes,
          partidas e resultados. Essa ação não pode ser desfeita.
        </p>
        <button
          className={styles.dangerButton}
          onClick={() => setDeleteOpen(true)}
          type="button"
        >
          Excluir competição
        </button>
      </section>

      {deleteOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) setDeleteOpen(false);
          }}
          role="presentation"
        >
          <div
            aria-labelledby="delete-competition-title"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
          >
            <header className={styles.modalHeader}>
              <span>Exclusão definitiva</span>
              <h2 id="delete-competition-title">Excluir {championship.name}?</h2>
            </header>
            <p className={styles.modalText}>
              Todos os dados relacionados serão removidos: participantes,
              equipes, partidas, resultados e histórico. Esta ação é
              irreversível.
            </p>
            <label className={styles.modalLabel}>
              Digite <strong>{championship.name}</strong> para confirmar
              <input
                autoFocus
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={championship.name}
                value={deleteConfirmation}
              />
            </label>
            <div className={styles.modalActions}>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirmation("");
                }}
                type="button"
              >
                Cancelar
              </button>
              <button
                className={styles.confirmDelete}
                disabled={
                  deleteConfirmation.trim() !== championship.name ||
                  deleteMutation.isPending
                }
                onClick={() => deleteMutation.mutate()}
                type="button"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir competição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function statusLabel(status: ChampionshipStatus) {
  if (status === "PUBLISHED") return "Publicado";
  if (status === "FINISHED") return "Finalizado";
  return "Rascunho";
}
