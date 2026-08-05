import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { ImageUrlField } from "../../components/ImageUrlField/ImageUrlField";
import { RemoteImage } from "../../components/RemoteImage/RemoteImage";
import {
  addClubMember,
  addClubSeason,
  addClubSquad,
  addClubStaff,
  applyTeamSync,
  clubsQueryKey,
  createClub,
  deleteClub,
  deleteClubMember,
  deleteClubSeason,
  deleteClubSquad,
  deleteClubStaff,
  exportRoster,
  importClubIntoChampionship,
  importRoster,
  listClubs,
  listImportedTeams,
  previewTeamSync,
  setClubCaptain,
  setClubSquadMembers,
  updateClub,
  updateClubMember,
  updateClubSeason,
  updateClubSquad,
  type Club,
  type ClubMember,
  type ClubSeason,
  type ClubSquad,
  type ClubStaff,
  type SyncPreview
} from "../../features/clubs/club-api";
import { useChampionships } from "../../features/championships/championship-query";
import { ApiError } from "../../lib/api";
import styles from "./ClubsPage.module.css";

type Feedback = {
  kind: "success" | "error";
  text: string;
};

export function ClubsPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [createLogoUrl, setCreateLogoUrl] = useState("");
  const clubsQuery = useQuery({ queryKey: clubsQueryKey, queryFn: listClubs });
  const refresh = () => queryClient.invalidateQueries({ queryKey: clubsQueryKey });

  const mutation = useMutation({
    mutationFn: (input: { action: () => Promise<unknown>; message: string }) =>
      input.action(),
    onSuccess: async (_result, input) => {
      await refresh();
      setFeedback({ kind: "success", text: input.message });
    },
    onError: (cause: Error) => {
      setFeedback({
        kind: "error",
        text:
          cause instanceof ApiError
            ? cause.message
            : "Não foi possível concluir a ação."
      });
    }
  });

  function submitClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    mutation.mutate(
      {
        action: () =>
          createClub({
            name: String(data.get("name") ?? ""),
            shortName: String(data.get("shortName") ?? "") || null,
            logoUrl: String(data.get("logoUrl") ?? "") || null
          }),
        message: "Clube criado."
      },
      {
        onSuccess: () => {
          form.reset();
          setCreateLogoUrl("");
        }
      }
    );
  }

  if (clubsQuery.isPending) {
    return <div className={styles.state}>Carregando clubes...</div>;
  }
  if (clubsQuery.isError) {
    return (
      <div className={styles.state} role="alert">
        Não foi possível abrir os clubes. Verifique se o servidor está no ar.
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/painel">← Voltar ao painel</Link>
      <header className={styles.heading}>
        <span>Biblioteca do organizador</span>
        <h1>Meus clubes</h1>
        <p>
          Cadastre uma vez e importe o clube com seu elenco para diferentes competições.
          Cada importação cria uma cópia segura para preservar o histórico.
        </p>
      </header>
      {feedback && (
        <p className={feedback.kind === "error" ? styles.error : styles.success} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.text}
        </p>
      )}
      <div className={styles.workspace}>
        <form className={styles.createForm} onSubmit={submitClub}>
          <h2>Novo clube</h2>
          <label>Nome<input minLength={2} name="name" required /></label>
          <label>Sigla<input maxLength={12} name="shortName" placeholder="Ex.: AX" /></label>
          <ImageUrlField
            label="URL do escudo"
            name="logoUrl"
            onChange={setCreateLogoUrl}
            value={createLogoUrl}
          />
          <button disabled={mutation.isPending}>Criar clube</button>
        </form>
        <div className={styles.clubs}>
          {clubsQuery.data.clubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              disabled={mutation.isPending}
              onFeedback={setFeedback}
              runAction={mutation.mutate}
            />
          ))}
          {!clubsQuery.data.clubs.length && (
            <p className={styles.emptyCard}>Sua biblioteca ainda está vazia.</p>
          )}
        </div>
      </div>
    </section>
  );
}

type ClubCardProps = {
  club: Club;
  disabled: boolean;
  onFeedback: (feedback: Feedback) => void;
  runAction: (input: { action: () => Promise<unknown>; message: string }) => void;
};

function ClubCard({ club, disabled, onFeedback, runAction }: ClubCardProps) {
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [editingSeason, setEditingSeason] = useState<ClubSeason | null>(null);
  const [editingSquad, setEditingSquad] = useState<ClubSquad | null>(null);
  const [expandedSquad, setExpandedSquad] = useState<string | null>(null);
  const [identityLogoUrl, setIdentityLogoUrl] = useState(club.logoUrl ?? "");

  const action = (fn: () => Promise<unknown>, message: string) =>
    runAction({ action: fn, message });
  function handleIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    action(
      () =>
        updateClub(club.id, {
          name: String(data.get("name") ?? ""),
          shortName: String(data.get("shortName") ?? "") || null,
          logoUrl: String(data.get("logoUrl") ?? "") || null,
          primaryColor: String(data.get("primaryColor") ?? "") || null,
          secondaryColor: String(data.get("secondaryColor") ?? "") || null,
          homeKit: String(data.get("homeKit") ?? "") || null,
          awayKit: String(data.get("awayKit") ?? "") || null
        }),
      "Identidade do clube atualizada."
    );
  }

  function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const jersey = String(data.get("jerseyNumber") ?? "");
    action(
      () =>
        addClubMember(club.id, {
          displayName: String(data.get("displayName") ?? ""),
          jerseyNumber: jersey ? Number(jersey) : null,
          position: String(data.get("position") ?? "") || null
        }),
      "Jogador adicionado ao clube."
    );
    form.reset();
  }

  function handleEditMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMember) return;
    const data = new FormData(event.currentTarget);
    const jersey = String(data.get("jerseyNumber") ?? "");
    action(
      () =>
        updateClubMember(club.id, editingMember.id, {
          displayName: String(data.get("displayName") ?? ""),
          jerseyNumber: jersey ? Number(jersey) : null,
          position: String(data.get("position") ?? "") || null
        }),
      "Jogador atualizado."
    );
    setEditingMember(null);
  }

  function handleSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      name: String(data.get("name") ?? ""),
      startsAt: String(data.get("startsAt") ?? "") || null,
      endsAt: String(data.get("endsAt") ?? "") || null
    };
    if (editingSeason) {
      action(
        () => updateClubSeason(club.id, editingSeason.id, input),
        "Temporada atualizada."
      );
      setEditingSeason(null);
    } else {
      action(() => addClubSeason(club.id, input), "Temporada criada.");
    }
    form.reset();
  }

  function handleSquad(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      name: String(data.get("name") ?? ""),
      category: String(data.get("category") ?? "") || null,
      sport: String(data.get("sport") ?? "") || null,
      seasonId: String(data.get("seasonId") ?? "") || null,
      isPrimary: form.querySelector<HTMLInputElement>('input[name="isPrimary"]')?.checked ?? false
    };
    if (editingSquad) {
      action(
        () => updateClubSquad(club.id, editingSquad.id, input),
        "Elenco atualizado."
      );
      setEditingSquad(null);
    } else {
      action(() => addClubSquad(club.id, input), "Elenco criado.");
    }
    form.reset();
  }

  function toggleSquadMember(squad: ClubSquad, memberId: string) {
    const members = squad.members.some((item) => item.clubMemberId === memberId)
      ? squad.members.filter((item) => item.clubMemberId !== memberId)
      : [...squad.members, { clubMemberId: memberId, role: "PLAYER" }];
    action(
      () => setClubSquadMembers(club.id, squad.id, members),
      "Elenco atualizado."
    );
  }

  function handleStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    action(
      () =>
        addClubStaff(club.id, {
          displayName: String(data.get("displayName") ?? ""),
          role: String(data.get("role") ?? "")
        }),
      "Membro da comissão adicionado."
    );
    form.reset();
  }

  return (
    <article className={styles.club}>
      <header>
        <div>
          <RemoteImage alt="" className={styles.clubLogo} src={club.logoUrl} />
          <span>{club.shortName || "CLUBE"}</span>
          <h2>{club.name}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Excluir " + club.name + " da biblioteca? As equipes já importadas serão mantidas.")) {
              action(() => deleteClub(club.id), "Clube excluído da biblioteca.");
            }
          }}
        >
          Excluir
        </button>
      </header>

      <form className={styles.identityForm} onSubmit={handleIdentity}>
        <input aria-label="Nome do clube" defaultValue={club.name} name="name" required />
        <input aria-label="Sigla do clube" defaultValue={club.shortName ?? ""} name="shortName" placeholder="Sigla" />
        <ImageUrlField
          className={styles.identityLogo}
          label="Escudo do clube (URL)"
          name="logoUrl"
          onChange={setIdentityLogoUrl}
          value={identityLogoUrl}
        />
        <button className={styles.identitySubmit} disabled={disabled}>Salvar identidade</button>
        <input aria-label="Cor principal" defaultValue={club.primaryColor ?? ""} name="primaryColor" placeholder="#123456" pattern="^#([0-9a-fA-F]{6})?$" title="Hex de 6 dígitos, ex.: #123456" />
        <input aria-label="Cor secundária" defaultValue={club.secondaryColor ?? ""} name="secondaryColor" placeholder="#abcdef" pattern="^#([0-9a-fA-F]{6})?$" title="Hex de 6 dígitos" />
        <input aria-label="Uniforme 1" defaultValue={club.homeKit ?? ""} name="homeKit" placeholder="Uniforme 1" maxLength={120} />
        <input aria-label="Uniforme 2" defaultValue={club.awayKit ?? ""} name="awayKit" placeholder="Uniforme 2" maxLength={120} />
      </form>

      <section className={styles.section}>
        <h3>Elenco</h3>
        {editingMember && (
          <form className={styles.inlineForm} onSubmit={handleEditMember}>
            <strong>Editando {editingMember.displayName}</strong>
            <input aria-label="Nome do jogador" defaultValue={editingMember.displayName} name="displayName" minLength={2} required />
            <input aria-label="Número da camisa" defaultValue={editingMember.jerseyNumber ?? ""} name="jerseyNumber" min={0} max={999} placeholder="Camisa" type="number" />
            <input aria-label="Posição" defaultValue={editingMember.position ?? ""} name="position" maxLength={40} placeholder="Posição" />
            <button type="submit" disabled={disabled}>Salvar jogador</button>
            <button type="button" onClick={() => setEditingMember(null)}>Cancelar</button>
          </form>
        )}
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
                <button type="button" onClick={() => action(() => setClubCaptain(club.id, member.id), member.displayName + " agora é capitão.")}>Capitão</button>
                <button type="button" onClick={() => setEditingMember(member)}>Editar</button>
                <button
                  type="button"
                  aria-label={"Remover " + member.displayName}
                  onClick={() => action(() => deleteClubMember(club.id, member.id), "Jogador removido do clube.")}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
          {!club.members.length && <li className={styles.empty}>Nenhum jogador no elenco.</li>}
        </ul>
        <form className={styles.memberForm} onSubmit={handleAddMember}>
          <input aria-label="Nome do jogador" name="displayName" minLength={2} placeholder="Nome do jogador" required />
          <input aria-label="Número da camisa" name="jerseyNumber" min={0} max={999} placeholder="Camisa" type="number" />
          <input aria-label="Posição" name="position" maxLength={40} placeholder="Posição" />
          <button disabled={disabled}>Adicionar</button>
        </form>
      </section>
      <section className={styles.section}>
        <h3>Temporadas</h3>
        <ul>
          {club.seasons.map((season) => (
            <li key={season.id}>
              <span>
                <b>{season.name}</b>
                <small>{season.startsAt ?? "—"} → {season.endsAt ?? "—"}</small>
              </span>
              <div>
                <button type="button" onClick={() => setEditingSeason(season)}>Editar</button>
                <button type="button" aria-label={"Remover temporada " + season.name} onClick={() => action(() => deleteClubSeason(club.id, season.id), "Temporada removida.")}>×</button>
              </div>
            </li>
          ))}
          {!club.seasons.length && <li className={styles.empty}>Nenhuma temporada.</li>}
        </ul>
        {editingSeason && (
          <p className={styles.hint}>Editando temporada {editingSeason.name}</p>
        )}
        <form className={styles.seasonForm} onSubmit={handleSeason}>
          <input aria-label="Nome da temporada" defaultValue={editingSeason?.name ?? ""} key={"s" + (editingSeason?.id ?? "new")} name="name" minLength={2} placeholder="Temporada 2026" required />
          <input aria-label="Início" defaultValue={editingSeason?.startsAt ?? ""} key={"si" + (editingSeason?.id ?? "new")} name="startsAt" type="date" />
          <input aria-label="Fim" defaultValue={editingSeason?.endsAt ?? ""} key={"se" + (editingSeason?.id ?? "new")} name="endsAt" type="date" />
          <button disabled={disabled}>{editingSeason ? "Salvar temporada" : "Criar temporada"}</button>
          {editingSeason && <button type="button" onClick={() => setEditingSeason(null)}>Cancelar</button>}
        </form>
      </section>

      <section className={styles.section}>
        <h3>Elencos por categoria</h3>
        <p className={styles.sectionHint}>
          Organize diferentes grupos de jogadores do mesmo clube por temporada, categoria ou modalidade.
          Se o clube possui apenas um elenco, você pode ignorar esta seção.
        </p>
        {club.squads.map((squad) => (
          <div className={styles.squad} key={squad.id}>
            <div className={styles.squadHead}>
              <strong>{squad.name}</strong>
              {squad.isPrimary && <em>Principal</em>}
              <span className={styles.squadMeta}>
                {squad.category || "—"} · {squad.sport || "—"} · {squad.members.length} jogadores
              </span>
              <div>
                <button type="button" onClick={() => setExpandedSquad(expandedSquad === squad.id ? null : squad.id)}>
                  {expandedSquad === squad.id ? "Recolher" : "Gerenciar"}
                </button>
                <button type="button" onClick={() => setEditingSquad(squad)}>Editar</button>
                <button type="button" aria-label={"Remover elenco " + squad.name} onClick={() => action(() => deleteClubSquad(club.id, squad.id), "Elenco removido.")}>×</button>
              </div>
            </div>
            {expandedSquad === squad.id && (
              <div className={styles.squadManage}>
                <p className={styles.hint}>Marque os jogadores que pertencem a este elenco.</p>
                <ul>
                  {club.members.map((member) => (
                    <li key={member.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={squad.members.some((item) => item.clubMemberId === member.id)}
                          onChange={() => toggleSquadMember(squad, member.id)}
                        />
                        <span>
                          {member.jerseyNumber !== null && <b>#{member.jerseyNumber}</b>}
                          {member.displayName}
                        </span>
                      </label>
                    </li>
                  ))}
                  {!club.members.length && <li className={styles.empty}>Cadastre jogadores primeiro.</li>}
                </ul>
              </div>
            )}
          </div>
        ))}
        {!club.squads.length && <p className={styles.empty}>Nenhum elenco criado.</p>}
        {editingSquad && <p className={styles.hint}>Editando elenco {editingSquad.name}</p>}
        <form className={styles.squadForm} onSubmit={handleSquad}>
          <div className={styles.squadField}>
            <input aria-label="Nome do elenco" defaultValue={editingSquad?.name ?? ""} key={"q" + (editingSquad?.id ?? "new")} name="name" minLength={2} placeholder="Nome (ex.: Principal)" required />
          </div>
          <div className={styles.squadField}>
            <input aria-label="Categoria" defaultValue={editingSquad?.category ?? ""} key={"c" + (editingSquad?.id ?? "new")} name="category" placeholder="Categoria (ex.: Masculino)" maxLength={40} />
          </div>
          <div className={styles.squadField}>
            <input aria-label="Esporte" defaultValue={editingSquad?.sport ?? ""} key={"p" + (editingSquad?.id ?? "new")} name="sport" placeholder="Esporte (ex.: Futsal)" maxLength={40} />
          </div>
          <div className={styles.squadField}>
            <select aria-label="Temporada" defaultValue={editingSquad?.seasonId ?? ""} key={"t" + (editingSquad?.id ?? "new")} name="seasonId">
              <option value="">Sem temporada</option>
              {club.seasons.map((season) => (
                <option key={season.id} value={season.id}>{season.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.squadActions}>
            <label className={styles.checkLabel}>
              <input defaultChecked={editingSquad?.isPrimary ?? false} key={"i" + (editingSquad?.id ?? "new")} name="isPrimary" type="checkbox" />
              Principal
            </label>
            <button disabled={disabled}>{editingSquad ? "Salvar elenco" : "Criar elenco"}</button>
            {editingSquad && <button className={styles.secondaryButton} type="button" onClick={() => setEditingSquad(null)}>Cancelar</button>}
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <h3>Comissão técnica</h3>
        <ul>
          {club.staff.map((staff: ClubStaff) => (
            <li key={staff.id}>
              <span>
                <b>{staff.displayName}</b>
                <small>{staff.role}</small>
              </span>
              <div>
                <button type="button" aria-label={"Remover " + staff.displayName} onClick={() => action(() => deleteClubStaff(club.id, staff.id), "Membro da comissão removido.")}>×</button>
              </div>
            </li>
          ))}
          {!club.staff.length && <li className={styles.empty}>Nenhum membro da comissão.</li>}
        </ul>
        <form className={styles.staffForm} onSubmit={handleStaff}>
          <input aria-label="Nome do membro" name="displayName" minLength={2} placeholder="Nome" required />
          <input aria-label="Função" name="role" minLength={2} placeholder="Função (ex.: Técnico)" required />
          <button disabled={disabled}>Adicionar</button>
        </form>
      </section>

      <section className={styles.section}>
        <h3>Importar e exportar elenco</h3>
        <div className={styles.rosterToolBlock}>
          <h4>Exportar elenco</h4>
          <div className={styles.actionRow}>
            <button type="button" onClick={() => action(() => downloadRoster(club, "csv"), "Elenco exportado em CSV.")}>CSV</button>
            <button type="button" onClick={() => action(() => downloadRoster(club, "json"), "Elenco exportado em JSON.")}>JSON</button>
          </div>
        </div>
        <RosterImportForm club={club} disabled={disabled} runAction={runAction} />
      </section>

      <section className={styles.section}>
        <h3>Importar clube para uma competição</h3>
        <ImportToChampionshipForm club={club} disabled={disabled} onFeedback={onFeedback} />
      </section>

      <section className={styles.section}>
        <h3>Equipes importadas</h3>
        <ImportedTeamsPanel club={club} disabled={disabled} onFeedback={onFeedback} />
      </section>
    </article>
  );
}
async function downloadRoster(club: Club, format: "json" | "csv") {
  const result = await exportRoster(club.id, format);
  const url = URL.createObjectURL(new Blob([result.content], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function RosterImportForm({
  club,
  disabled,
  runAction
}: {
  club: Club;
  disabled: boolean;
  runAction: (input: { action: () => Promise<unknown>; message: string }) => void;
}) {
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file") as File | null;
    if (!file) {
      setError("Escolha um arquivo CSV ou JSON.");
      return;
    }
    const format = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";
    const squadId = String(data.get("squadId") ?? "") || undefined;
    runAction({
      action: async () => {
        const response = await importRoster(club.id, format, await file.text(), squadId);
        setResult(response.result);
        return response;
      },
      message: "Elenco importado."
    });
    setFileName("");
    form.reset();
  }

  return (
    <div className={styles.rosterToolBlock}>
      <h4>Importar elenco</h4>
      <form className={styles.importForm} onSubmit={handleImport}>
        <div className={styles.filePicker}>
          <input
            accept=".csv,.json,text/csv,application/json"
            aria-label="Arquivo do elenco"
            className={styles.fileInput}
            id={"roster-file-" + club.id}
            name="file"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            required
            type="file"
          />
          <label className={styles.fileButton} htmlFor={"roster-file-" + club.id}>
            Selecionar arquivo
          </label>
          <span className={fileName ? styles.fileName : styles.fileNameEmpty}>
            {fileName || "nenhum arquivo escolhido"}
          </span>
        </div>
        <label className={styles.destination}>
          <span>Destino</span>
          <select aria-label="Elenco destino" name="squadId">
            <option value="">Somente clube</option>
            {club.squads.map((squad) => (
              <option key={squad.id} value={squad.id}>{squad.name}</option>
            ))}
          </select>
        </label>
        <button className={styles.importSubmit} disabled={disabled}>Importar</button>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {result && (
          <p className={styles.success} role="status">
            Criados: {result.created} · Atualizados: {result.updated} · Ignorados: {result.skipped}
          </p>
        )}
      </form>
    </div>
  );
}

function ImportToChampionshipForm({
  club,
  disabled,
  onFeedback
}: {
  club: Club;
  disabled: boolean;
  onFeedback: (feedback: Feedback) => void;
}) {
  const championshipsQuery = useChampionships();
  const [championshipId, setChampionshipId] = useState("");
  const [selection, setSelection] = useState<"all" | "squad" | "players">("all");
  const [squadId, setSquadId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const teamArenas = championshipsQuery.data?.championships.filter(
    (championship) => championship.entryType === "TEAM"
  ) ?? [];

  function chosenMembers(): string[] {
    if (selection === "all") return [];
    if (selection === "squad") {
      const squad = club.squads.find((item) => item.id === squadId);
      return squad ? squad.members.map((item) => item.clubMemberId) : [];
    }
    return [...selected];
  }

  function handleConfirm() {
    const members = chosenMembers();
    void importClubIntoChampionship(club.id, championshipId, members.length ? members : undefined)
      .then(() => {
        onFeedback({ kind: "success", text: "Equipe criada na competição." });
        setConfirming(false);
      })
      .catch((cause: unknown) => {
        onFeedback({
          kind: "error",
          text: cause instanceof ApiError ? cause.message : "Não foi possível importar o clube."
        });
        setConfirming(false);
      });
  }

  return (
    <div className={styles.importChampionship}>
      <label>
        Competição
        <select value={championshipId} onChange={(event) => setChampionshipId(event.target.value)}>
          <option value="">Escolha uma competição de equipes</option>
          {teamArenas.map((championship) => (
            <option key={championship.id} value={championship.id}>{championship.name}</option>
          ))}
        </select>
      </label>
      <label>
        O que importar
        <select value={selection} onChange={(event) => setSelection(event.target.value as "all" | "squad" | "players")}>
          <option value="all">Todos os jogadores</option>
          <option value="squad">Um elenco por categoria</option>
          <option value="players">Selecionar jogadores</option>
        </select>
      </label>
      {selection === "squad" && (
        <label>
          Elenco
          <select value={squadId} onChange={(event) => setSquadId(event.target.value)}>
            <option value="">Escolha um elenco</option>
            {club.squads.map((squad) => (
              <option key={squad.id} value={squad.id}>{squad.name}</option>
            ))}
          </select>
        </label>
      )}
      {selection === "players" && (
        <fieldset className={styles.playerPicker}>
          <legend>Jogadores</legend>
          {club.members.map((member) => (
            <label key={member.id}>
              <input
                type="checkbox"
                checked={selected.has(member.id)}
                onChange={(event) => {
                  const next = new Set(selected);
                  if (event.target.checked) next.add(member.id);
                  else next.delete(member.id);
                  setSelected(next);
                }}
              />
              {member.displayName}
            </label>
          ))}
        </fieldset>
      )}
      <button
        type="button"
        disabled={disabled || !championshipId || (selection === "squad" && !squadId) || (selection === "players" && selected.size === 0)}
        onClick={() => setConfirming(true)}
      >
        Importar para a competição
      </button>
      {confirming && (
        <p className={styles.confirm}>
          Criar equipe "{club.name}" na competição com {chosenMembers().length || "todos os"} jogador(es)?
          <button type="button" onClick={handleConfirm} disabled={disabled}>Confirmar</button>
          <button type="button" onClick={() => setConfirming(false)}>Cancelar</button>
        </p>
      )}
    </div>
  );
}
function ImportedTeamsPanel({
  club,
  disabled,
  onFeedback
}: {
  club: Club;
  disabled: boolean;
  onFeedback: (feedback: Feedback) => void;
}) {
  const teamsQuery = useQuery({
    queryKey: ["clubs", club.id, "teams"],
    queryFn: () => listImportedTeams(club.id)
  });
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [previewTeamId, setPreviewTeamId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  async function checkUpdate(teamId: string) {
    setPreviewError(null);
    setPreview(null);
    setPreviewTeamId(teamId);
    try {
      const result = await previewTeamSync(club.id, teamId);
      setPreview(result);
    } catch (cause) {
      setPreviewError(cause instanceof ApiError ? cause.message : "Não foi possível buscar o diff.");
      setPreviewTeamId(null);
    }
  }

  async function applyUpdate(teamId: string) {
    setApplying(true);
    try {
      await applyTeamSync(club.id, teamId);
      setPreview(null);
      setPreviewTeamId(null);
      onFeedback({ kind: "success", text: "Equipe sincronizada com o clube." });
    } catch (cause) {
      onFeedback({
        kind: "error",
        text: cause instanceof ApiError ? cause.message : "Não foi possível sincronizar."
      });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      {teamsQuery.isPending && <p className={styles.empty}>Carregando equipes...</p>}
      {teamsQuery.isError && <p className={styles.empty}>Não foi possível carregar as equipes importadas.</p>}
      {teamsQuery.data && !teamsQuery.data.teams.length && (
        <p className={styles.empty}>Nenhuma equipe importada deste clube ainda.</p>
      )}
      {teamsQuery.data?.teams.map((team) => (
        <div className={styles.squad} key={team.id}>
          <div className={styles.squadHead}>
            <strong>{team.name}</strong>
            <div>
              <button type="button" disabled={disabled} onClick={() => void checkUpdate(team.id)}>
                Verificar atualização do clube
              </button>
            </div>
          </div>
          {previewTeamId === team.id && previewError && (
            <p className={styles.error} role="alert">{previewError}</p>
          )}
          {preview && previewTeamId === team.id && (
            <SyncDiff
              preview={preview}
              applying={applying}
              onApply={() => void applyUpdate(team.id)}
              onClose={() => { setPreview(null); setPreviewTeamId(null); }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SyncDiff({
  preview,
  applying,
  onApply,
  onClose
}: {
  preview: SyncPreview;
  applying: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  const diff = preview.diff;
  const hasChanges =
    diff.toAdd.length + diff.toUpdate.length + diff.toRemove.length > 0;

  return (
    <div className={styles.diff}>
      <p className={styles.hint}>
        Alterações para "{preview.team.name}": {diff.toAdd.length} adicionados,{" "}
        {diff.toUpdate.length} atualizados, {diff.toRemove.length} removidos,{" "}
        {diff.protectedMembers.length} protegidos, {diff.unchanged} inalterados.
      </p>
      {diff.toAdd.length > 0 && (
        <ul>
          {diff.toAdd.map((item) => (
            <li key={item.clubMemberId} className={styles.added}>+ {item.displayName}</li>
          ))}
        </ul>
      )}
      {diff.toUpdate.length > 0 && (
        <ul>
          {diff.toUpdate.map((item) => (
            <li key={item.teamMemberId} className={styles.updated}>
              ~ {item.displayName}
            </li>
          ))}
        </ul>
      )}
      {diff.toRemove.length > 0 && (
        <ul>
          {diff.toRemove.map((item) => (
            <li key={item.teamMemberId} className={styles.removed}>− {item.displayName}</li>
          ))}
        </ul>
      )}
      {diff.protectedMembers.length > 0 && (
        <ul>
          {diff.protectedMembers.map((item) => (
            <li key={item.teamMemberId} className={styles.protected}>
              ★ {item.displayName} (protegido por histórico — mantido)
            </li>
          ))}
        </ul>
      )}
      {!hasChanges && <p className={styles.empty}>Nenhuma diferença com o clube.</p>}
      {hasChanges && (
        <div className={styles.actionRow}>
          <button type="button" disabled={applying} onClick={onApply}>
            {applying ? "Aplicando..." : "Aplicar atualização"}
          </button>
          <button type="button" disabled={applying} onClick={onClose}>Cancelar</button>
        </div>
      )}
    </div>
  );
}
