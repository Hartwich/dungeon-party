import { createBaseRoundState, roundPhaseDurations, transitionRoundState, type ScoreEntry, type ServerGame } from "@open-party-lab/game-core";
import { dungeonPartyManifest } from "../manifest.js";
import type { DungeonActionId, DungeonCard, DungeonEncounter, DungeonPartyControllerState, DungeonPartyInput, DungeonPartyPublicState, DungeonPartyState } from "../protocol.js";

const planningMs = 25_000;
const revealMs = 6_000;
const maxHealth = 8;
const classNames: Record<string, string> = { warrior: "Krieger", mage: "Magier", rogue: "Schurke", cleric: "Kleriker", bard: "Barde", tinkerer: "Tüftler" };
const intrigueCard: DungeonCard = { id: "petty-intrigue", name: "Intrige der Eitelkeit", description: "Wähle eine Person: Sie verliert 1 Ruhm, du erhältst ihn. Eure Gruppenstärke sinkt um 2.", attack: 0, kind: "effect", effect: "intrigue" };
const cardCatalog: DungeonCard[] = [
  { id: "tin-crown", name: "Blechkrone des Feldmarschalls", description: "+1 Kampfkraft. Sieht von hinten heldischer aus.", attack: 1, kind: "equipment" },
  { id: "soup-spoon", name: "Verdächtig großer Holzlöffel", description: "+2 gegen Suppenwesen. Sonst zählt er als +1.", attack: 1, kind: "equipment" },
  { id: "boots", name: "Stiefel des taktischen Rückzugs", description: "+1 Kampfkraft und erstaunlich leise beim Weglaufen.", attack: 1, kind: "equipment" },
  { id: "ring", name: "Ring der fast völligen Unsichtbarkeit", description: "+1 Kampfkraft. Die Gruppe übersieht dich trotzdem.", attack: 1, kind: "equipment" },
  intrigueCard,
  { id: "fake-bill", name: "Falsche Rechnung", description: "Stiehl einer Person 2 Gold.", attack: 0, kind: "effect", effect: "false_bill" },
  { id: "rallying-song", name: "Heldengesang mit falschen Tönen", description: "+4 Gruppenstärke bei dieser Probe.", attack: 0, kind: "effect", effect: "rally" }
];

function createEncounters(playerCount: number): DungeonEncounter[] {
  const scale = Math.max(0, playerCount - 3) * 2;
  const rows = [
    ["toll-troll", "Der Troll mit den Nebenkosten", "battle", "Er verlangt Wegzoll, rückwirkend und in bar.", 13],
    ["bridge", "Die Brücke mit Höhenangst", "challenge", "Die Planken knarren, die Brücke ebenfalls.", 15],
    ["merchant", "Der Händler mit den sieben Preisen", "event", "Jeder Preis ist verhandelbar. Keiner ist vernünftig.", 14],
    ["skeletons", "Das Skelett-Orchester", "battle", "Sie spielen nur Trauermärsche und nehmen Wünsche an.", 17],
    ["vault", "Das Gewölbe der schlechten Ideen", "challenge", "Eine Truhe, drei Schlösser und ein sehr verdächtiger Hebel.", 18],
    ["boss", "Der Drache mit dem Kleingedruckten", "boss", "Der Endgegner möchte kurz die Bedingungen besprechen.", 24]
  ] as const;
  return rows.map(([id, name, kind, flavor, difficulty], index) => ({
    id, name, kind, flavor, difficulty: difficulty + scale, health: difficulty + scale,
    maxHealth: difficulty + scale, cleared: false, ...(index === 0 ? { resolution: "" } : {})
  }));
}

function pickClass(selectedId: string | null | undefined): string {
  return selectedId && classNames[selectedId] ? selectedId : "warrior";
}

function startPlanning(state: DungeonPartyState, now: number, encounterIndex: number): DungeonPartyState {
  const moralePenalty = Math.max(0, 3 - state.partyMorale) * 2;
  const encounters = state.encounters.map((encounter, index) => index === encounterIndex
    ? { ...encounter, cleared: false, difficulty: encounter.maxHealth + moralePenalty, health: encounter.maxHealth, partyPower: undefined, resolution: undefined }
    : encounter);
  return { ...state, stage: "planning", encounterIndex, encounters, actionsByPlayer: {}, deadlineAt: now + planningMs, revealAt: null, lastRolls: undefined, updatedAt: now };
}

function playerPower(heroClass: string, action: DungeonActionId, roll: number, itemPower: number): number {
  if (action === "aid") return 2 + (heroClass === "cleric" ? 2 : 0) + Math.floor(roll / 4);
  if (action === "loot") return 1 + (heroClass === "rogue" ? 1 : 0) + itemPower;
  if (action === "play_card") return 1 + itemPower;
  return 2 + roll + itemPower + ({ warrior: 2, mage: 3, rogue: 1, cleric: 1, bard: 1, tinkerer: 2 }[heroClass] ?? 0);
}

function resolveEncounter(state: DungeonPartyState, now: number): DungeonPartyState {
  let seed = (state.seed >>> 0) || 17;
  const rollD6 = () => { seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0; return 1 + (seed % 6); };
  const heroes: DungeonPartyState["heroes"] = state.heroes.map((hero) => ({ ...hero, lastAction: state.actionsByPlayer[hero.playerId]?.action, lastFameDelta: 0, lastOutcome: undefined }));
  const handsByPlayerId = Object.fromEntries(Object.entries(state.handsByPlayerId).map(([playerId, hand]) => [playerId, [...hand]]));
  const current = state.encounters[state.encounterIndex];
  if (!current) return state;
  const targetIds = new Set(Object.values(state.actionsByPlayer).flatMap((action) => action.targetPlayerId ? [action.targetPlayerId] : []));
  let partyPower = 0;
  const rolls: NonNullable<DungeonPartyState["lastRolls"]> = [];

  for (const hero of heroes) {
    const choice = state.actionsByPlayer[hero.playerId] ?? { action: "fight" as const };
    const roll = rollD6();
    const hand = handsByPlayerId[hero.playerId] ?? [];
    const cardIndex = choice.action === "play_card" ? hand.findIndex((card) => card.id === choice.cardId) : -1;
    const playedCard = cardIndex >= 0 ? hand[cardIndex] : undefined;
    const contribution = playerPower(hero.classId, choice.action, roll, hero.items.reduce((sum, item) => sum + item.attack, 0) + (playedCard?.attack ?? 0));
    partyPower += contribution;
    rolls.push({ playerId: hero.playerId, roll, contribution });
    if (playedCard) {
      handsByPlayerId[hero.playerId] = hand.filter((_card, index) => index !== cardIndex);
      if (playedCard.effect === "intrigue") {
        const target = heroes.find((candidate) => candidate.playerId === choice.targetPlayerId);
        if (target && target.playerId !== hero.playerId) {
          target.fame = Math.max(0, target.fame - 1);
          hero.fame += 1;
          hero.lastOutcome = `Intrige: ${target.name} verliert 1 Ruhm; du nimmst ihn dir.`;
          hero.lastFameDelta = 1;
          partyPower -= 2;
        }
      } else if (playedCard.effect === "false_bill") {
        const target = heroes.find((candidate) => candidate.playerId === choice.targetPlayerId);
        if (target && target.playerId !== hero.playerId) {
          const stolen = Math.min(2, target.gold);
          target.gold -= stolen;
          hero.gold += stolen;
          hero.lastOutcome = `Falsche Rechnung: ${target.name} zahlt ${stolen} Gold.`;
        }
      } else if (playedCard.effect === "rally") {
        partyPower += 4;
        hero.lastOutcome = "Dein Heldengesang bringt +4 Gruppenstärke.";
      }
    }
    if (choice.action === "loot") hero.gold += 2 + (hero.classId === "rogue" ? 1 : 0);
    if (choice.action === "fight" || choice.action === "aid" || playedCard?.effect === "rally") {
      hero.fame += 1;
      hero.lastFameDelta = (hero.lastFameDelta ?? 0) + 1;
    }
    if (hero.classId === "mage" && choice.action === "fight" && roll === 1) {
      hero.health = Math.max(0, hero.health - 1);
      hero.lastOutcome = "Der Zauber-Rückschlag kostet dich 1 Leben.";
    }
    if (hero.classId === "bard" && choice.action === "aid") {
      hero.fame += 1;
      hero.lastFameDelta = (hero.lastFameDelta ?? 0) + 1;
    }
  }

  const winner = heroes.filter((hero) => hero.classId === "cleric" && state.actionsByPlayer[hero.playerId]?.action === "aid").sort((a, b) => a.health - b.health)[0];
  if (winner && heroes.some((hero) => hero.health < maxHealth)) {
    const hurt = heroes.filter((hero) => hero.health < maxHealth).sort((a, b) => a.health - b.health)[0];
    if (hurt) hurt.health = Math.min(maxHealth, hurt.health + 1);
  }
  const success = partyPower >= current.difficulty;
  const nextEncounters = state.encounters.map((encounter, index) => index === state.encounterIndex
    ? { ...encounter, cleared: success, health: Math.max(0, encounter.maxHealth - partyPower), partyPower, resolution: success ? "Geschafft!" : "Das Dungeon merkt sich das." }
    : encounter);

  for (const hero of heroes) {
    const action = state.actionsByPlayer[hero.playerId]?.action;
    if (success && action === "loot") {
      const cardTemplate = cardCatalog[(seed + heroes.indexOf(hero) + state.encounterIndex) % cardCatalog.length]!;
      const card = { ...cardTemplate, id: `${cardTemplate.id}-${hero.playerId}-${state.encounterIndex}-${seed}` };
      if (card.kind === "equipment") {
        if (!hero.items.some((item) => item.id === card.id)) hero.items.push({ id: card.id, name: card.name, description: card.description, attack: card.attack });
      } else {
        handsByPlayerId[hero.playerId] = [...(handsByPlayerId[hero.playerId] ?? []), card];
      }
      hero.fame += 2;
      hero.lastFameDelta = (hero.lastFameDelta ?? 0) + 2;
      hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}${card.kind === "equipment" ? `Ausrüstung: ${card.name}.` : `Karte gezogen: ${card.name}.`}`;
    }
    if (!success) {
      const damage = action === "aid" || action === "fight" ? 1 : 2;
      hero.health = Math.max(0, hero.health - damage);
      hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}Dungeon-Schaden: ${damage}.`;
    }
    if (targetIds.has(hero.playerId)) hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}Du warst Ziel einer Intrige.`;
  }

  if (success) {
    const top = [...heroes].sort((a, b) => (b.lastFameDelta ?? 0) - (a.lastFameDelta ?? 0))[0];
    if (top) { top.fame += 1; top.lastFameDelta = (top.lastFameDelta ?? 0) + 1; top.lastOutcome = `${top.lastOutcome ? `${top.lastOutcome} ` : ""}Du erhältst den Ruhm für den entscheidenden Beitrag.`; }
  }
  const encounter = nextEncounters[state.encounterIndex]!;
  const partyMorale = Math.max(0, Math.min(5, state.partyMorale + (success ? 1 : -1)));
  const finalEncounter = state.encounterIndex === state.encounters.length - 1;
  const campaignWon = finalEncounter && success;
  const rankedHeroes = [...heroes].sort((a, b) => b.fame - a.fame || b.gold - a.gold || b.health - a.health);
  const winnerHero = rankedHeroes[0];
  const winnerHeroes = winnerHero
    ? rankedHeroes.filter((hero) => hero.fame === winnerHero.fame && hero.gold === winnerHero.gold && hero.health === winnerHero.health)
    : [];
  const winnerIds = winnerHeroes.map((hero) => hero.playerId);
  const finalHeroes = campaignWon ? heroes.map((hero) => ({ ...hero, fame: hero.fame + (winnerIds.includes(hero.playerId) ? 3 : 1) })) : heroes;
  const next: DungeonPartyState = {
    ...state, stage: finalEncounter ? "complete" : "reveal", heroes: finalHeroes, handsByPlayerId, encounters: nextEncounters,
    actionsByPlayer: {}, deadlineAt: null, revealAt: finalEncounter ? null : now + revealMs, partyMorale, seed,
    lastRolls: rolls, campaignWon, winnerPlayerId: finalEncounter ? winnerHero?.playerId : undefined,
    winnerPlayerIds: finalEncounter ? winnerIds : undefined,
    updatedAt: now, message: success ? `${encounter.name}: bestanden!` : `${encounter.name}: gescheitert.`
  };
  return finalEncounter ? transitionRoundState(next, "locked", now, { durationMs: roundPhaseDurations.lockedMs, message: next.message }) : next;
}

export const serverGame: ServerGame<DungeonPartyState, DungeonPartyInput, DungeonPartyPublicState> = {
  manifest: dungeonPartyManifest,
  createInitialState(context) {
    return {
      ...createBaseRoundState("round_intro", context.now, { durationMs: roundPhaseDurations.roundIntroMs, message: "Der Dungeon wartet." }),
      stage: "planning", encounterIndex: 0, encounters: createEncounters(context.players.length),
      heroes: context.players.map((player) => ({ playerId: player.id, name: player.name, classId: pickClass(player.selectedCharacterId), health: maxHealth, fame: 0, gold: 0, items: [] })),
      handsByPlayerId: Object.fromEntries(context.players.map((player) => [player.id, [{ ...intrigueCard }]])),
      actionsByPlayer: {}, deadlineAt: null, revealAt: null, partyMorale: 3,
      seed: (context.now + context.players.length * 997) >>> 0
    };
  },
  startRound(state, context) {
    return transitionRoundState(startPlanning(state, context.now, 0), "playing", context.now, {
      startedAt: context.now,
      message: "Wählt eure Aktionen."
    });
  },
  handleInput(state, input, context) {
    if (state.phase !== "playing" || state.stage !== "planning" || input.type !== "dungeon_action" ||
      !context.players.some((player) => player.id === input.playerId) || state.actionsByPlayer[input.playerId] ||
      !["fight", "loot", "aid", "play_card"].includes(input.action)) return state;
    if (input.action === "play_card") {
      const card = (state.handsByPlayerId[input.playerId] ?? []).find((entry) => entry.id === input.cardId);
      if (!card || card.kind !== "effect") return state;
      if (["intrigue", "false_bill"].includes(card.effect ?? "") && (!input.targetPlayerId || input.targetPlayerId === input.playerId || !context.players.some((player) => player.id === input.targetPlayerId))) return state;
    }
    return { ...state, actionsByPlayer: { ...state.actionsByPlayer, [input.playerId]: { action: input.action, cardId: input.cardId, targetPlayerId: input.targetPlayerId } }, updatedAt: context.now };
  },
  tick(state, _deltaMs, context) {
    if (state.stage === "planning" && state.phase === "playing" && (Object.keys(state.actionsByPlayer).length >= state.heroes.length || (state.deadlineAt !== null && context.now >= state.deadlineAt))) {
      const completed = { ...state };
      for (const hero of state.heroes) if (!completed.actionsByPlayer[hero.playerId]) completed.actionsByPlayer[hero.playerId] = { action: "fight" };
      return resolveEncounter(completed, context.now);
    }
    if (state.stage === "reveal" && state.revealAt !== null && context.now >= state.revealAt) return startPlanning(state, context.now, state.encounterIndex + 1);
    return state;
  },
  isRoundFinished(state) { return state.stage === "complete"; },
  buildScore(state): ScoreEntry[] {
    if (state.stage !== "complete") return [];
    return state.heroes.map((hero) => ({ playerId: hero.playerId, delta: hero.fame, reason: "Dungeon-Ruhm" }));
  },
  toPublicState(state) {
    const { actionsByPlayer: _actions, handsByPlayerId: _hands, seed: _seed, ...publicState } = state;
    return { ...publicState, heroes: state.heroes.map((hero) => ({ ...hero, handCount: (state.handsByPlayerId[hero.playerId] ?? []).length })), submittedCount: Object.keys(state.actionsByPlayer).length };
  },
  toControllerStateForPlayer(state, _context, playerId) {
    const { actionsByPlayer: _actions, handsByPlayerId: _hands, seed: _seed, ...publicState } = state;
    return { ...publicState, heroes: state.heroes.map((hero) => ({ ...hero, handCount: (state.handsByPlayerId[hero.playerId] ?? []).length })), ownHand: state.handsByPlayerId[playerId] ?? [], submittedCount: Object.keys(state.actionsByPlayer).length, ownActionSubmitted: Boolean(state.actionsByPlayer[playerId]), availableTargets: state.heroes.filter((hero) => hero.playerId !== playerId).map(({ playerId: id, name }) => ({ playerId: id, name })) } satisfies DungeonPartyControllerState;
  }
};
