import { type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { listPublicChampionships } from "../../features/championships/public-championship-api";
import { useFavorites } from "../../lib/use-favorites";
import styles from "./ExploreChampionshipsPage.module.css";

const sports = ["Futebol", "Futsal", "Basquete", "Vôlei", "eSports", "Outro"];

export function ExploreChampionshipsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const favorites = useFavorites();
  const favoritesOnly = searchParams.get("favorites") === "1";
  const queryString = searchParams.toString();
  const query = useQuery({
    queryKey: ["public-championships", queryString],
    queryFn: () => listPublicChampionships(new URLSearchParams(queryString))
  });

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of ["search", "sport", "entryType", "status"]) {
      const value = String(data.get(key) ?? "").trim();
      if (value) next.set(key, value);
    }
    setSearchParams(next);
  }

  const page = Number(searchParams.get("page") ?? "1");
  const result = query.data;
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;
  const shownItems = favoritesOnly
    ? (result?.items ?? []).filter((item) => favorites.isFavorite(item.slug))
    : result?.items ?? [];
  const favoriteCount = (result?.items ?? []).filter((item) =>
    favorites.isFavorite(item.slug)
  ).length;

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
  }

  function toggleFavorites() {
    const next = new URLSearchParams(searchParams);
    if (favoritesOnly) next.delete("favorites");
    else {
      next.set("favorites", "1");
      next.delete("page");
    }
    setSearchParams(next);
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <span>ARENAS PÚBLICAS</span>
        <h1>Encontre o próximo campeonato.</h1>
        <p>
          Explore competições publicadas, acompanhe resultados e descubra
          arenas por esporte.
        </p>
      </header>

      <form className={styles.filters} onSubmit={applyFilters}>
        <label className={styles.search}>
          <span>Buscar pelo nome</span>
          <input
            defaultValue={searchParams.get("search") ?? ""}
            name="search"
            placeholder="Ex.: Copa do bairro"
          />
        </label>
        <label>
          <span>Esporte</span>
          <select defaultValue={searchParams.get("sport") ?? ""} name="sport">
            <option value="">Todos</option>
            {sports.map((sport) => <option key={sport}>{sport}</option>)}
          </select>
        </label>
        <label>
          <span>Participação</span>
          <select
            defaultValue={searchParams.get("entryType") ?? ""}
            name="entryType"
          >
            <option value="">Todas</option>
            <option value="TEAM">Equipes</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>
        </label>
        <label>
          <span>Situação</span>
          <select defaultValue={searchParams.get("status") ?? ""} name="status">
            <option value="">Todas</option>
            <option value="PUBLISHED">Em andamento</option>
            <option value="FINISHED">Finalizadas</option>
          </select>
        </label>
        <button type="submit">Buscar arenas</button>
      </form>

      <div className={styles.resultHeading}>
        <h2>Campeonatos</h2>
        <span>{result?.total ?? 0} encontrados</span>
        <button
          type="button"
          className={styles.favoritesToggle}
          aria-pressed={favoritesOnly}
          onClick={toggleFavorites}
        >
          ★ Favoritas
          {favoritesOnly && favoriteCount > 0 ? " (" + favoriteCount + ")" : ""}
        </button>
      </div>

      {query.isPending && <p className={styles.state}>Buscando arenas...</p>}
      {query.isError && (
        <p className={styles.state}>Não foi possível carregar as arenas.</p>
      )}
      {result && (
        <>
          <div className={styles.grid}>
            {shownItems.map((championship) => (
              <Link
                className={styles.card}
                key={championship.id}
                to={`/campeonatos/${championship.slug}`}
              >
                <div className={styles.cardMeta}>
                  <span>{championship.sport}</span>
                  <b>{championship.status === "FINISHED" ? "Finalizada" : "Publicada"}</b>
                </div>
                <h3>{championship.name}</h3>
                <p>{championship.description || "Campeonato organizado com ArenaX."}</p>
                <footer>
                  <span>{championship.entryType === "TEAM" ? "Equipes" : "Individual"}</span>
                  <strong>Ver arena →</strong>
                </footer>
              </Link>
            ))}
          </div>
          {!shownItems.length && (
            <p className={styles.state}>
              {favoritesOnly
                ? "Nenhuma arena favorita ainda. Use a estrela na página do campeonato."
                : "Nenhuma arena corresponde aos filtros."}
            </p>
          )}
          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Paginação">
              <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
