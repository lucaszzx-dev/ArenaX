import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getApiHealth } from "../../lib/api";
import styles from "./ServerStatusNotice.module.css";

export function ServerStatusNotice() {
  const [showWarmup, setShowWarmup] = useState(false);
  const healthQuery = useQuery({
    queryKey: ["api-health"],
    queryFn: getApiHealth,
    retry: 1,
    retryDelay: 1_500,
    staleTime: 60_000
  });

  useEffect(() => {
    if (!healthQuery.isPending) {
      setShowWarmup(false);
      return;
    }

    const timeout = window.setTimeout(() => setShowWarmup(true), 3_000);

    return () => window.clearTimeout(timeout);
  }, [healthQuery.isPending]);

  const degraded = healthQuery.data?.status === "degraded";

  if (!healthQuery.isError && !degraded && !showWarmup) {
    return null;
  }

  if (degraded) {
    return (
      <aside className={styles.notice} role="alert">
        <div>
          <strong>O banco de dados está indisponível.</strong>
          <span>As informações podem estar desatualizadas. Tente novamente em instantes.</span>
        </div>
        <button
          disabled={healthQuery.isFetching}
          onClick={() => void healthQuery.refetch()}
          type="button"
        >
          {healthQuery.isFetching ? "Tentando..." : "Tentar novamente"}
        </button>
      </aside>
    );
  }

  if (healthQuery.isError) {
    return (
      <aside className={styles.notice} role="alert">
        <div>
          <strong>O servidor ainda não respondeu.</strong>
          <span>Aguarde alguns segundos e tente novamente.</span>
        </div>
        <button
          disabled={healthQuery.isFetching}
          onClick={() => void healthQuery.refetch()}
          type="button"
        >
          {healthQuery.isFetching ? "Tentando..." : "Tentar novamente"}
        </button>
      </aside>
    );
  }

  return (
    <aside className={styles.notice} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <div>
        <strong>Preparando o servidor do ArenaX...</strong>
        <span>No plano gratuito, a primeira abertura pode levar até um minuto.</span>
      </div>
    </aside>
  );
}
