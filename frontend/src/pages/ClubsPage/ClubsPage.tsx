import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  addClubMember,
  clubsQueryKey,
  createClub,
  deleteClub,
  deleteClubMember,
  listClubs,
  setClubCaptain
  ,updateClub
} from "../../features/clubs/club-api";
import { ApiError } from "../../lib/api";
import styles from "./ClubsPage.module.css";

export function ClubsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clubsQuery = useQuery({ queryKey: clubsQueryKey, queryFn: listClubs });
  const refresh = () => queryClient.invalidateQueries({ queryKey: clubsQueryKey });
  const mutation = useMutation({
    mutationFn: (input: { action: () => Promise<unknown>; message: string }) => input.action(),
    onSuccess: async (_result, input) => {
      await refresh();
      setError(null);
      setMessage(input.message);
    },
    onError: (cause: Error) => {
      setMessage(null);
      setError(cause instanceof ApiError ? cause.message : "Não foi possível concluir a ação.");
    }
  });

  function submitClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    mutation.mutate({
      action: () => createClub({
        name: String(data.get("name") ?? ""),
        shortName: String(data.get("shortName") ?? "") || null,
        logoUrl: String(data.get("logoUrl") ?? "") || null
      }),
      message: "Clube criado."
    }, { onSuccess: () => form.reset() });
  }

  if (clubsQuery.isPending) return <div className={styles.state}>Carregando clubes...</div>;
  if (clubsQuery.isError) return <div className={styles.state}>Não foi possível abrir os clubes.</div>;

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/painel">← Voltar ao painel</Link>
      <header className={styles.heading}>
        <span>Biblioteca do organizador</span>
        <h1>Meus clubes</h1>
        <p>
          Cadastre uma vez e importe o clube com seu elenco para diferentes arenas.
          Cada importação cria uma cópia segura para preservar o histórico.
        </p>
      </header>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}
      <div className={styles.workspace}>
        <form className={styles.createForm} onSubmit={submitClub}>
          <h2>Novo clube</h2>
          <label>Nome<input minLength={2} name="name" required /></label>
          <label>Sigla<input maxLength={12} name="shortName" placeholder="Ex.: AX" /></label>
          <label>URL do escudo<input name="logoUrl" placeholder="https://..." type="url" /></label>
          <button disabled={mutation.isPending}>Criar clube</button>
        </form>
        <div className={styles.clubs}>
          {clubsQuery.data.clubs.map((club) => (
            <article className={styles.club} key={club.id}>
              <header>
                <div>
                  {club.logoUrl && <img alt="" src={club.logoUrl} />}
                  <span>{club.shortName || "CLUBE"}</span>
                  <h2>{club.name}</h2>
                </div>
                <button type="button" onClick={() => {
                  if (window.confirm(`Excluir ${club.name} da biblioteca? As equipes já importadas serão mantidas.`)) {
                    mutation.mutate({
                      action: () => deleteClub(club.id),
                      message: "Clube excluído da biblioteca."
                    });
                  }
                }}>Excluir</button>
              </header>
              <form className={styles.identityForm} onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                mutation.mutate({
                  action: () => updateClub(club.id, {
                    name: String(data.get("name") ?? ""),
                    shortName: String(data.get("shortName") ?? "") || null,
                    logoUrl: String(data.get("logoUrl") ?? "") || null
                  }),
                  message: "Identidade do clube atualizada."
                });
              }}>
                <input defaultValue={club.name} name="name" required />
                <input defaultValue={club.shortName ?? ""} name="shortName" placeholder="Sigla" />
                <input defaultValue={club.logoUrl ?? ""} name="logoUrl" placeholder="URL do escudo" type="url" />
                <button disabled={mutation.isPending}>Salvar identidade</button>
              </form>
              <ul>
                {club.members.map((member) => (
                  <li key={member.id}>
                    <span>
                      {member.jerseyNumber !== null && <b>#{member.jerseyNumber}</b>}
                      {member.displayName}
                      {member.isCaptain && <em>Capitão</em>}
                      {member.position && <small>{member.position}</small>}
                    </span>
                    <div>
                      <button type="button" onClick={() => mutation.mutate({
                        action: () => setClubCaptain(club.id, member.id),
                        message: `${member.displayName} agora é capitão do clube.`
                      })}>Capitão</button>
                      <button type="button" aria-label={`Remover ${member.displayName}`} onClick={() =>
                        mutation.mutate({
                          action: () => deleteClubMember(club.id, member.id),
                          message: "Jogador removido do clube."
                        })
                      }>×</button>
                    </div>
                  </li>
                ))}
                {!club.members.length && <li className={styles.empty}>Nenhum jogador no elenco.</li>}
              </ul>
              <form className={styles.memberForm} onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                const jersey = String(data.get("jerseyNumber") ?? "");
                mutation.mutate({
                  action: () => addClubMember(club.id, {
                    displayName: String(data.get("displayName") ?? ""),
                    jerseyNumber: jersey ? Number(jersey) : null,
                    position: String(data.get("position") ?? "") || null
                  }),
                  message: "Jogador adicionado ao clube."
                }, { onSuccess: () => form.reset() });
              }}>
                <input name="displayName" minLength={2} placeholder="Nome do jogador" required />
                <input name="jerseyNumber" min={0} max={999} placeholder="Camisa" type="number" />
                <input name="position" maxLength={40} placeholder="Posição" />
                <button disabled={mutation.isPending}>Adicionar</button>
              </form>
            </article>
          ))}
          {!clubsQuery.data.clubs.length && (
            <p className={styles.emptyCard}>Sua biblioteca ainda está vazia.</p>
          )}
        </div>
      </div>
    </section>
  );
}
