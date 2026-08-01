import { type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteMatchPeriod,
  listMatchPeriods,
  matchPeriodQueryKey,
  saveMatchPeriod
} from "../../features/matches/match-period-api";
import styles from "./MatchPeriodsPanel.module.css";

type Props = {
  championshipId: string;
  matchId: string;
  sport: string;
  homeName: string;
  awayName: string;
  disabled: boolean;
  bestOfSets?: number;
};

export function MatchPeriodsPanel(props: Props) {
  const config = periodConfig[props.sport];
  const queryClient = useQueryClient();
  const queryKey = matchPeriodQueryKey(props.championshipId, props.matchId);
  const query = useQuery({
    queryKey,
    queryFn: () => listMatchPeriods(props.championshipId, props.matchId),
    enabled: Boolean(config)
  });
  const saveMutation = useMutation({
    mutationFn: (input: {
      periodNumber: number;
      homeScore: number;
      awayScore: number;
    }) => saveMatchPeriod(props.championshipId, props.matchId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });
  const deleteMutation = useMutation({
    mutationFn: (periodNumber: number) =>
      deleteMatchPeriod(props.championshipId, props.matchId, periodNumber),
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  if (!config) return null;
  const periods = query.data?.periods ?? [];

  return (
    <section className={styles.panel}>
      <header>
        <div><span>PLACAR DETALHADO</span><h3>{config.title}</h3></div>
        <b>{periods.length} registrados</b>
      </header>
      <div className={styles.names}>
        <span>{props.homeName}</span><span>{props.awayName}</span>
      </div>
      <div className={styles.periods}>
        {Array.from({ length: config.count }, (_, index) => index + 1).map(
          (periodNumber) => {
            const period = periods.find(
              (item) => item.periodNumber === periodNumber
            );
            return (
              <form
                className={styles.period}
                key={periodNumber}
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  saveMutation.mutate({
                    periodNumber,
                    homeScore: Number(data.get("homeScore")),
                    awayScore: Number(data.get("awayScore"))
                  });
                }}
              >
                <strong>{config.label(periodNumber, props.bestOfSets)}</strong>
                <input aria-label={`${props.homeName}, ${config.label(periodNumber)}`} defaultValue={period?.homeScore ?? ""} disabled={props.disabled} min="0" name="homeScore" required type="number" />
                <span>×</span>
                <input aria-label={`${props.awayName}, ${config.label(periodNumber)}`} defaultValue={period?.awayScore ?? ""} disabled={props.disabled} min="0" name="awayScore" required type="number" />
                <button disabled={props.disabled || saveMutation.isPending}>
                  {period ? "Atualizar" : "Salvar"}
                </button>
                {period && (
                  <button className={styles.remove} disabled={props.disabled || deleteMutation.isPending} onClick={() => deleteMutation.mutate(periodNumber)} type="button">
                    Remover
                  </button>
                )}
              </form>
            );
          }
        )}
      </div>
      {(saveMutation.isError || deleteMutation.isError) && (
        <p className={styles.error}>Não foi possível salvar a parcial.</p>
      )}
    </section>
  );
}

const periodConfig: Record<
  string,
  { count: number; title: string; label: (period: number, total?: number) => string }
> = {
  Basquete: {
    count: 8,
    title: "Quartos e prorrogações",
    label: (period) => period <= 4 ? `${period}º quarto` : `${period - 4}ª pror.`
  },
  "Vôlei": {
    count: 5,
    title: "Placar por sets",
    label: (period, total) => period >= (total ?? 5) ? `${period}º set (Tie-break)` : `${period}º set`
  }
};
