export type StandingLabels = {
  scoreFor: string;
  scoreAgainst: string;
  scoreDifference: string;
  scoreForTitle: string;
  scoreAgainstTitle: string;
  scoreDifferenceTitle: string;
};

const labelsBySport: Record<string, StandingLabels> = {
  Futebol: {
    scoreFor: "GP",
    scoreAgainst: "GC",
    scoreDifference: "SG",
    scoreForTitle: "Gols pró",
    scoreAgainstTitle: "Gols contra",
    scoreDifferenceTitle: "Saldo de gols"
  },
  Futsal: {
    scoreFor: "GP",
    scoreAgainst: "GC",
    scoreDifference: "SG",
    scoreForTitle: "Gols pró",
    scoreAgainstTitle: "Gols contra",
    scoreDifferenceTitle: "Saldo de gols"
  },
  Basquete: {
    scoreFor: "PF",
    scoreAgainst: "PC",
    scoreDifference: "SP",
    scoreForTitle: "Pontos feitos",
    scoreAgainstTitle: "Pontos contra",
    scoreDifferenceTitle: "Saldo de pontos"
  },
  "Vôlei": {
    scoreFor: "SP",
    scoreAgainst: "SC",
    scoreDifference: "SS",
    scoreForTitle: "Sets pró",
    scoreAgainstTitle: "Sets contra",
    scoreDifferenceTitle: "Saldo de sets"
  }
};

const genericLabels: StandingLabels = {
  scoreFor: "PF",
  scoreAgainst: "PC",
  scoreDifference: "S",
  scoreForTitle: "Pontos feitos",
  scoreAgainstTitle: "Pontos contra",
  scoreDifferenceTitle: "Saldo"
};

export function getStandingLabels(sport: string): StandingLabels {
  return labelsBySport[sport] ?? genericLabels;
}
