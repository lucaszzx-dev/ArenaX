import type { MatchEventType } from "./match-event-repository.js";

export const eventRules: Record<
  string,
  Partial<Record<MatchEventType, number>>
> = {
  Futebol: {
    GOAL: 1,
    OWN_GOAL: 1,
    YELLOW_CARD: 1,
    RED_CARD: 1,
    ASSIST: 0,
    SUBSTITUTION: 0,
    PENALTY_CONVERTED: 1,
    PENALTY_MISSED: 0
  },
  Futsal: {
    GOAL: 1,
    OWN_GOAL: 1,
    YELLOW_CARD: 1,
    RED_CARD: 1,
    ASSIST: 0,
    SUBSTITUTION: 0,
    PENALTY_CONVERTED: 1,
    PENALTY_MISSED: 0
  },
  Basquete: {
    FREE_THROW: 1,
    TWO_POINT_SHOT: 2,
    THREE_POINT_SHOT: 3,
    PERSONAL_FOUL: 0
  },
  "V\u00f4lei": {
    VOLLEYBALL_POINT: 1,
    ACE: 1,
    BLOCK: 1,
    ERROR: 0,
    SPIKE: 1,
    SERVE_ERROR: 0,
    ATTACK_ERROR: 0,
    RECEPTION_ERROR: 0
  }
};
