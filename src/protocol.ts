import type { BaseRoundState, PlayerInput } from "@open-party-lab/game-core";

export type DungeonActionId = "fight" | "loot" | "aid" | "play_card";
export type DungeonCardEffect = "intrigue" | "false_bill" | "rally";

export interface DungeonPartyInput extends PlayerInput {
  type: "dungeon_action";
  action: DungeonActionId;
  cardId?: string;
  targetPlayerId?: string;
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
  partyPower?: number;
  resolution?: string;
}

export interface DungeonPartyState extends BaseRoundState {
  stage: "planning" | "reveal" | "complete";
  encounterIndex: number;
  encounters: DungeonEncounter[];
  heroes: DungeonHero[];
  actionsByPlayer: Record<string, { action: DungeonActionId; cardId?: string; targetPlayerId?: string }>;
  handsByPlayerId: Record<string, DungeonCard[]>;
  deadlineAt: number | null;
  revealAt: number | null;
  partyMorale: number;
  seed: number;
  winnerPlayerId?: string;
  winnerPlayerIds?: string[];
  campaignWon?: boolean;
  lastRolls?: Array<{ playerId: string; roll: number; contribution: number }>;
}

export type DungeonPartyPublicState = Omit<DungeonPartyState, "actionsByPlayer" | "handsByPlayerId" | "seed"> & { submittedCount: number };

export interface DungeonPartyControllerState extends DungeonPartyPublicState {
  ownActionSubmitted: boolean;
  availableTargets: Array<{ playerId: string; name: string }>;
  ownHand: DungeonCard[];
}
