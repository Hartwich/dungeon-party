import type { BaseRoundState, PlayerInput } from "@open-party-lab/game-core";

export type DungeonActionId = "fight" | "loot" | "aid";
export type DungeonCardEffect = "intrigue" | "false_bill" | "rally" | "ward" | "jam" | "reinforce";

export type DungeonPartyInput = (PlayerInput & {
  type: "dungeon_action";
  action: DungeonActionId;
  cardId?: string;
  targetPlayerId?: string;
}) | (PlayerInput & {
  type: "dungeon_route_vote";
  routeId: string;
}) | (PlayerInput & {
  type: "dungeon_card_response";
  cardId?: string;
  targetPlayerId?: string;
});

export interface DungeonRouteOption {
  id: string;
  name: string;
  description: string;
  kind: DungeonEncounter["kind"];
  difficulty: number;
  health: number;
  maxHealth: number;
  cleared: false;
}

export interface DungeonHero {
  playerId: string;
  name: string;
  classId: string;
  health: number;
  fame: number;
  gold: number;
  items: DungeonItem[];
  handCount?: number;
  lastAction?: DungeonActionId;
  lastOutcome?: string;
  lastFameDelta?: number;
}

export interface DungeonItem {
  id: string;
  name: string;
  description: string;
  attack: number;
}

export interface DungeonCard extends DungeonItem {
  kind: "equipment" | "effect";
  effect?: DungeonCardEffect;
  sabotagePenalty?: number;
  sabotageReward?: number;
}

export interface DungeonEncounter {
  id: string;
  name: string;
  kind: "battle" | "challenge" | "event" | "boss";
  flavor: string;
  difficulty: number;
  health: number;
  maxHealth: number;
  cleared: boolean;
  phaseIndex?: number;
  phaseName?: string;
  phaseCount?: number;
  attempt?: number;
  attemptLimit?: number;
  partyPower?: number;
  resolution?: string;
}

export interface DungeonPartyState extends BaseRoundState {
  stage: "voting" | "planning" | "response" | "reveal" | "complete";
  encounterIndex: number;
  encounters: DungeonEncounter[];
  heroes: DungeonHero[];
  actionsByPlayer: Record<string, { action: DungeonActionId; cardId?: string; targetPlayerId?: string }>;
  responsesByPlayerId: Record<string, { cardId?: string; targetPlayerId?: string }>;
  routeVotesByPlayer: Record<string, string>;
  routeOptions?: DungeonRouteOption[];
  handsByPlayerId: Record<string, DungeonCard[]>;
  deadlineAt: number | null;
  responseDeadlineAt: number | null;
  voteDeadlineAt: number | null;
  revealAt: number | null;
  partyMorale: number;
  bossPhaseIndex: number;
  bossPhaseAttempts: number;
  seed: number;
  winnerPlayerId?: string;
  winnerPlayerIds?: string[];
  campaignWon?: boolean;
  lastRolls?: Array<{ playerId: string; roll: number; contribution: number }>;
}

export type DungeonPartyPublicState = Omit<DungeonPartyState, "actionsByPlayer" | "responsesByPlayerId" | "handsByPlayerId" | "routeVotesByPlayer" | "seed"> & {
  submittedCount: number;
  responseCount: number;
  routeVoteCount: number;
  revealedActionsByPlayer: Record<string, DungeonActionId>;
};

export interface DungeonPartyControllerState extends DungeonPartyPublicState {
  ownActionSubmitted: boolean;
  ownResponseSubmitted: boolean;
  ownVoteSubmitted: boolean;
  availableTargets: Array<{ playerId: string; name: string }>;
  ownHand: DungeonCard[];
}
