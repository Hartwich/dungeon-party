import { createBaseRoundState, roundPhaseDurations, transitionRoundState, type ScoreEntry, type ServerGame } from "@open-party-lab/game-core";
import { dungeonPartyManifest } from "../manifest.js";
import type { DungeonActionId, DungeonCard, DungeonEncounter, DungeonPartyControllerState, DungeonPartyInput, DungeonPartyPublicState, DungeonPartyState } from "../protocol.js";

const planningMs = 25_000;
const routeVoteMs = 15_000;
const responseMs = 10_000;
const revealMs = 6_000;
const maxHealth = 8;
const bossPhaseNames = ["Der Vertrag", "Das Drachenfeuer", "Die letzte Klausel"];
const bossPhaseCount = bossPhaseNames.length;
const bossPhaseAttemptLimit = 2;
const classNames: Record<string, string> = { warrior: "Krieger", mage: "Magier", rogue: "Schurke", cleric: "Kleriker", bard: "Barde", tinkerer: "Tüftler" };
const intrigueCard: DungeonCard = { id: "petty-intrigue", name: "Intrige der Eitelkeit", description: "Eine Person verliert 1 Ruhm, du erhältst ihn. Eure Stärke sinkt um 2. Scheitert die Probe, verlierst du zusätzlich 2 Ruhm.", attack: 0, kind: "effect", effect: "intrigue", sabotagePenalty: 2 };
const cardCatalog: DungeonCard[] = [
  { id: "tin-crown", name: "Blechkrone des Feldmarschalls", description: "+1 Kampfkraft. Sieht von hinten heldischer aus.", attack: 1, kind: "equipment" },
  { id: "soup-spoon", name: "Verdächtig großer Holzlöffel", description: "+2 gegen Suppenwesen. Sonst zählt er als +1.", attack: 1, kind: "equipment" },
  { id: "boots", name: "Stiefel des taktischen Rückzugs", description: "+1 Kampfkraft und erstaunlich leise beim Weglaufen.", attack: 1, kind: "equipment" },
  { id: "ring", name: "Ring der fast völligen Unsichtbarkeit", description: "+1 Kampfkraft. Die Gruppe übersieht dich trotzdem.", attack: 1, kind: "equipment" },
  intrigueCard,
  { id: "fake-bill", name: "Falsche Rechnung", description: "Stiehl einer Person bis zu 2 Gold.", attack: 0, kind: "effect", effect: "false_bill" },
  { id: "rallying-song", name: "Heldengesang mit falschen Tönen", description: "+4 Gruppenstärke bei dieser Probe.", attack: 0, kind: "effect", effect: "rally" },
  { id: "padded-coat", name: "Mantel aus geliehenen Vorhängen", description: "Schütze eine Person: Bei einem Fehlschlag erleidet sie 1 Schaden weniger.", attack: 0, kind: "effect", effect: "ward" },
  { id: "loose-floorboard", name: "Lose Diele", description: "Eine Person verliert 3 Kampfstärke. Schafft ihr es trotzdem, erhältst du 1 Ruhm; scheitert ihr, verlierst du 2 Ruhm.", attack: 0, kind: "effect", effect: "jam", sabotagePenalty: 2, sabotageReward: 1 },
  { id: "extra-paperwork", name: "Zusätzlicher Papierkram für den Drachen", description: "Der Zielwert steigt um 5. Schafft ihr es trotzdem, erhältst du 2 Ruhm; scheitert ihr, verlierst du 2 Ruhm.", attack: 0, kind: "effect", effect: "reinforce", sabotagePenalty: 2, sabotageReward: 2 }
];

function createEncounters(playerCount: number): DungeonEncounter[] {
  const scale = Math.max(0, playerCount - 3) * 2;
  const rows = [
    ["toll-troll", "Der Troll mit den Nebenkosten", "battle", "Er verlangt Wegzoll, rückwirkend und in bar.", 13],
    ["bridge", "Die Brücke mit Höhenangst", "challenge", "Die Planken knarren, die Brücke ebenfalls.", 15],
    ["first-route", "Die erste Weggabelung", "event", "Zwei Wege führen tiefer in den Dungeon.", 0],
    ["vault", "Das Gewölbe der schlechten Ideen", "challenge", "Eine Truhe, drei Schlösser und ein sehr verdächtiger Hebel.", 18],
    ["second-route", "Die zweite Weggabelung", "event", "Die Gruppe entscheidet, was sie dem Dungeon zumutet.", 0],
    ["skeletons", "Das Skelett-Orchester", "battle", "Sie spielen nur Trauermärsche und nehmen Wünsche an.", 17],
    ["lost-treasury", "Die Schatzkammer ohne Ausgangsschild", "challenge", "Der Schatz ist echt. Die Beschilderung ist es nicht.", 20],
    ["boss", "Der Drache mit dem Kleingedruckten", "boss", "Der Endgegner möchte kurz die Bedingungen besprechen.", 24]
  ] as const;
  return rows.map(([id, name, kind, flavor, difficulty], index) => ({
    id, name, kind, flavor, difficulty: difficulty + scale, health: difficulty + scale,
    maxHealth: difficulty + scale, cleared: false, ...(index === 0 ? { resolution: "" } : {})
  }));
}

function routeOptions(playerCount: number, encounterIndex: number): NonNullable<DungeonPartyState["routeOptions"]> {
  const scale = Math.max(0, playerCount - 3) * 2;
  const alternatives = encounterIndex === 2
    ? [
      ["merchant", "Händler mit den sieben Preisen", "Bei Erfolg erhält jede Person 1 Gold. Der Händler nennt es Mengenrabatt.", "event", 14],
      ["crypt", "Gruft der klappernden Ahnen", "Bei Erfolg erhält der stärkste Beitrag 2 zusätzlichen Ruhm.", "battle", 16]
    ] as const
    : [
      ["shrine", "Schrein der zweiten Chancen", "Bei Erfolg heilt der Schrein alle um 1 Leben.", "challenge", 16],
      ["cursed-armory", "Waffenkammer mit Eigenleben", "Bei Erfolg ziehen alle, die Beute sichern, eine zusätzliche Karte.", "battle", 19]
    ] as const;
  return alternatives.map(([id, name, description, kind, difficulty]) => ({
    id, name, description, kind, difficulty: difficulty + scale,
    health: difficulty + scale, maxHealth: difficulty + scale, cleared: false as const
  }));
}

function pickClass(selectedId: string | null | undefined): string {
  return selectedId && classNames[selectedId] ? selectedId : "warrior";
}

function startPlanning(state: DungeonPartyState, now: number, encounterIndex: number, routeResolved = false): DungeonPartyState {
  if (!routeResolved && [2, 4].includes(encounterIndex)) {
    const playerCount = state.heroes.length;
    return {
      ...state, stage: "voting", encounterIndex, actionsByPlayer: {}, routeVotesByPlayer: {},
      responsesByPlayerId: {}, routeOptions: routeOptions(playerCount, encounterIndex), deadlineAt: null, responseDeadlineAt: null,
      voteDeadlineAt: now + routeVoteMs, revealAt: null, lastRolls: undefined, updatedAt: now,
      message: "Wählt gemeinsam den nächsten Weg."
    };
  }
  const moralePenalty = Math.max(0, 3 - state.partyMorale) * 2;
  const playerScale = Math.max(0, state.heroes.length - 3) * 7;
  const bossPhaseIndex = Math.min(state.bossPhaseIndex, bossPhaseCount - 1);
  const encounters = state.encounters.map((encounter, index) => index === encounterIndex
    ? {
      ...encounter, cleared: false,
      difficulty: encounter.id === "boss" ? 18 + bossPhaseIndex * 3 + playerScale + moralePenalty : encounter.maxHealth + moralePenalty,
      health: encounter.id === "boss" ? bossPhaseCount - bossPhaseIndex : encounter.maxHealth,
      maxHealth: encounter.id === "boss" ? bossPhaseCount : encounter.maxHealth,
      phaseIndex: encounter.id === "boss" ? bossPhaseIndex + 1 : undefined,
      phaseName: encounter.id === "boss" ? bossPhaseNames[bossPhaseIndex] : undefined,
      phaseCount: encounter.id === "boss" ? bossPhaseCount : undefined,
      attempt: encounter.id === "boss" ? state.bossPhaseAttempts + 1 : undefined,
      attemptLimit: encounter.id === "boss" ? bossPhaseAttemptLimit : undefined,
      partyPower: undefined, resolution: undefined
    }
    : encounter);
  return { ...state, stage: "planning", encounterIndex, encounters, actionsByPlayer: {}, responsesByPlayerId: {}, routeVotesByPlayer: {}, routeOptions: undefined, voteDeadlineAt: null, responseDeadlineAt: null, deadlineAt: now + planningMs, revealAt: null, lastRolls: undefined, updatedAt: now };
}

function resolveRouteVote(state: DungeonPartyState, now: number): DungeonPartyState {
  const options = state.routeOptions ?? [];
  if (options.length === 0) return state;
  const counts = options.map((option) => ({ option, votes: Object.values(state.routeVotesByPlayer).filter((routeId) => routeId === option.id).length }));
  const selected = [...counts].sort((a, b) => b.votes - a.votes || a.option.difficulty - b.option.difficulty || a.option.id.localeCompare(b.option.id))[0]!.option;
  const encounters = state.encounters.map((encounter, index) => index === state.encounterIndex
    ? { ...selected, flavor: selected.description }
    : encounter);
  const next = startPlanning({ ...state, encounters, message: `Der Weg ist gewählt: ${selected.name}.` }, now, state.encounterIndex, true);
  return { ...next, message: `Der Weg ist gewählt: ${selected.name}.${counts[0]!.votes === counts[1]!.votes ? " Gleichstand: Die leichtere Route gewinnt." : ""}` };
}

function openResponseWindow(state: DungeonPartyState, now: number): DungeonPartyState {
  const actionsByPlayer = { ...state.actionsByPlayer };
  for (const hero of state.heroes) if (!actionsByPlayer[hero.playerId]) actionsByPlayer[hero.playerId] = { action: "fight" };
  return {
    ...state, stage: "response", actionsByPlayer, responsesByPlayerId: {}, deadlineAt: null,
    responseDeadlineAt: now + responseMs, revealAt: null, updatedAt: now,
    message: "Grundaktionen aufgedeckt. Reaktionskarten können gespielt werden."
  };
}

function grantLootCard(hero: DungeonPartyState["heroes"][number], hands: Record<string, DungeonCard[]>, seed: number, encounterIndex: number, drawIndex: number): DungeonCard {
  const cardTemplate = cardCatalog[(seed + encounterIndex + drawIndex) % cardCatalog.length]!;
  const card = { ...cardTemplate, id: `${cardTemplate.id}-${hero.playerId}-${encounterIndex}-${seed}-${drawIndex}` };
  if (card.kind === "equipment") {
    if (!hero.items.some((item) => item.id === card.id)) hero.items.push({ id: card.id, name: card.name, description: card.description, attack: card.attack });
  } else {
    hands[hero.playerId] = [...(hands[hero.playerId] ?? []), card];
  }
  return card;
}

function playerPower(heroClass: string, action: DungeonActionId, roll: number, itemPower: number): number {
  if (action === "aid") return 2 + (heroClass === "cleric" ? 2 : 0) + Math.floor(roll / 4);
  if (action === "loot") return 1 + (heroClass === "rogue" ? 1 : 0) + itemPower;
  return 2 + roll + itemPower + ({ warrior: 2, mage: 3, rogue: 1, cleric: 1, bard: 1, tinkerer: 2 }[heroClass] ?? 0);
}

function resolveEncounter(state: DungeonPartyState, now: number): DungeonPartyState {
  let seed = (state.seed >>> 0) || 17;
  const rollD6 = () => { seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0; return 1 + (seed % 6); };
  const heroes: DungeonPartyState["heroes"] = state.heroes.map((hero) => ({ ...hero, lastAction: state.actionsByPlayer[hero.playerId]?.action, lastFameDelta: 0, lastOutcome: undefined }));
  const handsByPlayerId = Object.fromEntries(Object.entries(state.handsByPlayerId).map(([playerId, hand]) => [playerId, [...hand]]));
  const current = state.encounters[state.encounterIndex];
  if (!current) return state;
  let partyPower = 0;
  let difficultyModifier = 0;
  const rolls: NonNullable<DungeonPartyState["lastRolls"]> = [];
  const playedCards: Array<{ hero: DungeonPartyState["heroes"][number]; card: DungeonCard; targetPlayerId?: string }> = [];
  const protectedPlayerIds = new Set<string>();
  const sabotagePlayers: Array<{ hero: DungeonPartyState["heroes"][number]; card: DungeonCard }> = [];

  for (const hero of heroes) {
    const choice = state.actionsByPlayer[hero.playerId] ?? { action: "fight" as const };
    const roll = rollD6();
    const contribution = playerPower(hero.classId, choice.action, roll, hero.items.reduce((sum, item) => sum + item.attack, 0));
    partyPower += contribution;
    rolls.push({ playerId: hero.playerId, roll, contribution });
    const response = state.responsesByPlayerId[hero.playerId];
    const hand = handsByPlayerId[hero.playerId] ?? [];
    const cardIndex = response?.cardId ? hand.findIndex((card) => card.id === response.cardId) : -1;
    const card = cardIndex >= 0 ? hand[cardIndex] : undefined;
    if (card) {
      handsByPlayerId[hero.playerId] = hand.filter((_entry, index) => index !== cardIndex);
      playedCards.push({ hero, card, targetPlayerId: response?.targetPlayerId });
    }
    if (choice.action === "loot") hero.gold += 2 + (hero.classId === "rogue" ? 1 : 0);
    if (choice.action === "fight" || choice.action === "aid") {
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

  for (const { hero, card, targetPlayerId } of playedCards) {
    const target = heroes.find((candidate) => candidate.playerId === targetPlayerId);
    switch (card.effect) {
      case "intrigue":
        if (target && target.playerId !== hero.playerId) {
          const stolenFame = Math.min(1, Math.max(0, target.fame));
          target.fame -= stolenFame;
          target.lastFameDelta = (target.lastFameDelta ?? 0) - stolenFame;
          hero.fame += 1;
          hero.lastFameDelta = (hero.lastFameDelta ?? 0) + 1;
          hero.lastOutcome = `Intrige: ${target.name} verliert ${stolenFame} Ruhm; du erhältst 1 Ruhm.`;
          partyPower -= 2;
          sabotagePlayers.push({ hero, card });
        }
        break;
      case "false_bill":
        if (target && target.playerId !== hero.playerId) {
          const stolen = Math.min(2, target.gold);
          target.gold -= stolen;
          hero.gold += stolen;
          hero.lastOutcome = `Falsche Rechnung: ${target.name} zahlt ${stolen} Gold.`;
        }
        break;
      case "rally":
        partyPower += 4;
        hero.fame += 1;
        hero.lastFameDelta = (hero.lastFameDelta ?? 0) + 1;
        hero.lastOutcome = "Dein Heldengesang bringt +4 Gruppenstärke.";
        break;
      case "ward":
        if (target) {
          protectedPlayerIds.add(target.playerId);
          hero.lastOutcome = `${target.name} ist durch deinen Mantel geschützt.`;
        }
        break;
      case "jam":
        if (target && target.playerId !== hero.playerId) {
          const targetRoll = rolls.find((entry) => entry.playerId === target.playerId);
          if (targetRoll) {
            const reduction = Math.min(3, targetRoll.contribution);
            targetRoll.contribution -= reduction;
            partyPower -= reduction;
          }
          hero.lastOutcome = `${target.name}s Beitrag wird durch eine lose Diele geschwächt.`;
          sabotagePlayers.push({ hero, card });
        }
        break;
      case "reinforce":
        difficultyModifier += 5;
        hero.lastOutcome = "Du hast dem Gegner Verstärkung verschafft.";
        sabotagePlayers.push({ hero, card });
        break;
    }
  }

  const winner = heroes.filter((hero) => hero.classId === "cleric" && state.actionsByPlayer[hero.playerId]?.action === "aid").sort((a, b) => a.health - b.health)[0];
  if (winner && heroes.some((hero) => hero.health < maxHealth)) {
    const hurt = heroes.filter((hero) => hero.health < maxHealth).sort((a, b) => a.health - b.health)[0];
    if (hurt) hurt.health = Math.min(maxHealth, hurt.health + 1);
  }
  const targetDifficulty = current.difficulty + difficultyModifier;
  const success = partyPower >= targetDifficulty;
  const isBoss = current.id === "boss";
  const bossPhaseIndex = state.bossPhaseIndex;
  const nextBossPhaseIndex = isBoss && success ? bossPhaseIndex + 1 : bossPhaseIndex;
  const nextBossPhaseAttempts = isBoss ? (success ? 0 : state.bossPhaseAttempts + 1) : state.bossPhaseAttempts;
  const bossPhaseComplete = isBoss && success && nextBossPhaseIndex >= bossPhaseCount;
  const bossRunFailed = isBoss && !success && nextBossPhaseAttempts >= bossPhaseAttemptLimit;
  const campaignEnded = bossPhaseComplete || bossRunFailed;
  const nextEncounters = state.encounters.map((encounter, index) => index === state.encounterIndex
    ? {
      ...encounter, cleared: isBoss ? bossPhaseComplete : success,
      health: isBoss ? (success ? Math.max(0, bossPhaseCount - nextBossPhaseIndex) : encounter.health) : Math.max(0, encounter.maxHealth - partyPower),
      phaseIndex: isBoss ? bossPhaseIndex + 1 : undefined,
      phaseName: isBoss ? bossPhaseNames[bossPhaseIndex] : undefined,
      phaseCount: isBoss ? bossPhaseCount : undefined,
      attempt: isBoss ? state.bossPhaseAttempts + 1 : undefined,
      attemptLimit: isBoss ? bossPhaseAttemptLimit : undefined,
      difficulty: targetDifficulty, partyPower,
      resolution: isBoss
        ? (success ? `${bossPhaseNames[bossPhaseIndex]} geschafft!` : bossRunFailed ? "Der Drache hält die Gruppe auf." : "Die Phase beginnt von vorn.")
        : success ? "Geschafft!" : "Das Dungeon merkt sich das."
    }
    : encounter);

  for (const hero of heroes) {
    const action = state.actionsByPlayer[hero.playerId]?.action;
    if (success && action === "loot") {
      const firstCard = grantLootCard(hero, handsByPlayerId, seed + heroes.indexOf(hero), state.encounterIndex, 0);
      hero.fame += 2;
      hero.lastFameDelta = (hero.lastFameDelta ?? 0) + 2;
      const extraCard = current.id === "cursed-armory" ? grantLootCard(hero, handsByPlayerId, seed + heroes.indexOf(hero), state.encounterIndex, 1) : undefined;
      const rewards = [firstCard, extraCard].filter((card): card is DungeonCard => Boolean(card)).map((card) => card.kind === "equipment" ? `Ausrüstung: ${card.name}.` : `Karte gezogen: ${card.name}.`).join(" ");
      hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}${rewards}`;
    }
    if (!success) {
      const baseDamage = action === "aid" || action === "fight" ? 1 : 2;
      const damage = Math.max(0, baseDamage - (protectedPlayerIds.has(hero.playerId) ? 1 : 0));
      hero.health = Math.max(0, hero.health - damage);
      hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}${damage < baseDamage ? "Dein Schutz fängt 1 Schaden ab. " : ""}Dungeon-Schaden: ${damage}.`;
    }
    if (playedCards.some((entry) => entry.targetPlayerId === hero.playerId)) hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}Du warst Ziel einer Aktionskarte.`;
  }

  for (const { hero, card } of sabotagePlayers) {
    const fameDelta = success ? (card.sabotageReward ?? 0) : -(card.sabotagePenalty ?? 2);
    hero.fame += fameDelta;
    hero.lastFameDelta = (hero.lastFameDelta ?? 0) + fameDelta;
    const result = success ? `Die Sabotage gelingt: ${fameDelta > 0 ? `+${fameDelta}` : "kein"} Ruhm.` : `Die Gruppe scheitert: ${fameDelta} Ruhm für deine Sabotage.`;
    hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}${result}`;
  }

  if (success && current.id === "merchant") {
    for (const hero of heroes) { hero.gold += 1; hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}Händlerbonus: +1 Gold.`; }
  } else if (success && current.id === "crypt") {
    const topContribution = [...rolls].sort((a, b) => b.contribution - a.contribution)[0];
    const hero = heroes.find((candidate) => candidate.playerId === topContribution?.playerId);
    if (hero) { hero.fame += 2; hero.lastFameDelta = (hero.lastFameDelta ?? 0) + 2; hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}Gruftbonus: +2 Ruhm für den stärksten Beitrag.`; }
  } else if (success && current.id === "shrine") {
    for (const hero of heroes) {
      if (hero.health < maxHealth) { hero.health += 1; hero.lastOutcome = `${hero.lastOutcome ? `${hero.lastOutcome} ` : ""}Der Schrein heilt 1 Leben.`; }
    }
  }

  if (success) {
    const top = [...heroes].sort((a, b) => (b.lastFameDelta ?? 0) - (a.lastFameDelta ?? 0))[0];
    if (top) { top.fame += 1; top.lastFameDelta = (top.lastFameDelta ?? 0) + 1; top.lastOutcome = `${top.lastOutcome ? `${top.lastOutcome} ` : ""}Du erhältst den Ruhm für den entscheidenden Beitrag.`; }
  }
  const encounter = nextEncounters[state.encounterIndex]!;
  const partyMorale = Math.max(0, Math.min(5, state.partyMorale + (success ? 1 : -1)));
  const rankedHeroes = [...heroes].sort((a, b) => b.fame - a.fame || b.gold - a.gold || b.health - a.health);
  const winnerHero = rankedHeroes[0];
  const winnerHeroes = winnerHero
    ? rankedHeroes.filter((hero) => hero.fame === winnerHero.fame && hero.gold === winnerHero.gold && hero.health === winnerHero.health)
    : [];
  const winnerIds = winnerHeroes.map((hero) => hero.playerId);
  const finalHeroes = bossPhaseComplete
    ? heroes.map((hero) => ({ ...hero, fame: hero.fame + (winnerIds.includes(hero.playerId) ? 3 : 1) }))
    : bossRunFailed ? heroes.map((hero) => ({ ...hero, fame: hero.fame + 1 })) : heroes;
  const finalWinner = [...finalHeroes].sort((a, b) => b.fame - a.fame || b.gold - a.gold || b.health - a.health)[0];
  const next: DungeonPartyState = {
    ...state, stage: campaignEnded ? "complete" : "reveal", heroes: finalHeroes, handsByPlayerId, encounters: nextEncounters,
    actionsByPlayer: {}, deadlineAt: null, responseDeadlineAt: null, revealAt: campaignEnded ? null : now + revealMs, partyMorale, seed,
    bossPhaseIndex: nextBossPhaseIndex, bossPhaseAttempts: nextBossPhaseAttempts,
    lastRolls: rolls, campaignWon: bossPhaseComplete,
    winnerPlayerId: campaignEnded ? finalWinner?.playerId : undefined,
    winnerPlayerIds: campaignEnded && finalWinner ? finalHeroes.filter((hero) => hero.fame === finalWinner.fame && hero.gold === finalWinner.gold && hero.health === finalWinner.health).map((hero) => hero.playerId) : undefined,
    updatedAt: now,
    message: bossPhaseComplete ? "Der Drache ist besiegt!" : bossRunFailed ? "Der Drache hält stand. Die Gruppe muss sich zurückziehen." : success ? `${encounter.name}: bestanden!` : `${encounter.name}: gescheitert.`
  };
  return campaignEnded ? transitionRoundState(next, "locked", now, { durationMs: roundPhaseDurations.lockedMs, message: next.message }) : next;
}

export const serverGame: ServerGame<DungeonPartyState, DungeonPartyInput, DungeonPartyPublicState> = {
  manifest: dungeonPartyManifest,
  createInitialState(context) {
    return {
      ...createBaseRoundState("round_intro", context.now, { durationMs: roundPhaseDurations.roundIntroMs, message: "Der Dungeon wartet." }),
      stage: "planning", encounterIndex: 0, encounters: createEncounters(context.players.length),
      heroes: context.players.map((player) => ({ playerId: player.id, name: player.name, classId: pickClass(player.selectedCharacterId), health: maxHealth, fame: 0, gold: 0, items: [] })),
      handsByPlayerId: Object.fromEntries(context.players.map((player) => [player.id, [{ ...intrigueCard }]])),
      actionsByPlayer: {}, responsesByPlayerId: {}, routeVotesByPlayer: {}, deadlineAt: null, responseDeadlineAt: null, voteDeadlineAt: null, revealAt: null, partyMorale: 3,
      bossPhaseIndex: 0, bossPhaseAttempts: 0,
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
    if (state.phase !== "playing" || !context.players.some((player) => player.id === input.playerId)) return state;
    if (input.type === "dungeon_route_vote") {
      if (state.stage !== "voting" || state.routeVotesByPlayer[input.playerId] || !state.routeOptions?.some((option) => option.id === input.routeId)) return state;
      return { ...state, routeVotesByPlayer: { ...state.routeVotesByPlayer, [input.playerId]: input.routeId }, updatedAt: context.now };
    }
    if (input.type === "dungeon_card_response") {
      if (state.stage !== "response" || state.responsesByPlayerId[input.playerId]) return state;
      if (input.cardId) {
        const card = (state.handsByPlayerId[input.playerId] ?? []).find((entry) => entry.id === input.cardId);
        if (!card || card.kind !== "effect") return state;
        const needsTarget = ["intrigue", "false_bill", "ward", "jam"].includes(card.effect ?? "");
        if (needsTarget && (!input.targetPlayerId || !state.heroes.some((hero) => hero.playerId === input.targetPlayerId))) return state;
        if (["intrigue", "false_bill", "jam"].includes(card.effect ?? "") && input.targetPlayerId === input.playerId) return state;
        return { ...state, responsesByPlayerId: { ...state.responsesByPlayerId, [input.playerId]: { cardId: card.id, targetPlayerId: input.targetPlayerId } }, updatedAt: context.now };
      }
      return { ...state, responsesByPlayerId: { ...state.responsesByPlayerId, [input.playerId]: {} }, updatedAt: context.now };
    }
    if (state.stage !== "planning" || input.type !== "dungeon_action" || state.actionsByPlayer[input.playerId] ||
      !["fight", "loot", "aid"].includes(input.action)) return state;
    return { ...state, actionsByPlayer: { ...state.actionsByPlayer, [input.playerId]: { action: input.action } }, updatedAt: context.now };
  },
  tick(state, _deltaMs, context) {
    if (state.stage === "voting" && (Object.keys(state.routeVotesByPlayer).length >= state.heroes.length || (state.voteDeadlineAt !== null && context.now >= state.voteDeadlineAt))) {
      return resolveRouteVote(state, context.now);
    }
    if (state.stage === "planning" && state.phase === "playing" && (Object.keys(state.actionsByPlayer).length >= state.heroes.length || (state.deadlineAt !== null && context.now >= state.deadlineAt))) {
      return openResponseWindow(state, context.now);
    }
    if (state.stage === "response" && (Object.keys(state.responsesByPlayerId).length >= state.heroes.length || (state.responseDeadlineAt !== null && context.now >= state.responseDeadlineAt))) return resolveEncounter(state, context.now);
    if (state.stage === "reveal" && state.revealAt !== null && context.now >= state.revealAt) {
      const current = state.encounters[state.encounterIndex];
      const nextIndex = current?.id === "boss" && !current.cleared ? state.encounterIndex : state.encounterIndex + 1;
      return startPlanning(state, context.now, nextIndex);
    }
    return state;
  },
  isRoundFinished(state) { return state.stage === "complete"; },
  buildScore(state): ScoreEntry[] {
    if (state.stage !== "complete") return [];
    return state.heroes.map((hero) => ({ playerId: hero.playerId, delta: hero.fame, reason: "Dungeon-Ruhm" }));
  },
  toPublicState(state) {
    const { actionsByPlayer: _actions, responsesByPlayerId: _responses, handsByPlayerId: _hands, routeVotesByPlayer: _votes, seed: _seed, ...publicState } = state;
    const revealed = state.stage === "response" || state.stage === "reveal" || state.stage === "complete"
      ? Object.fromEntries(Object.entries(state.actionsByPlayer).map(([playerId, action]) => [playerId, action.action]))
      : {};
    return { ...publicState, heroes: state.heroes.map((hero) => ({ ...hero, handCount: (state.handsByPlayerId[hero.playerId] ?? []).length })), submittedCount: Object.keys(state.actionsByPlayer).length, responseCount: Object.keys(state.responsesByPlayerId).length, routeVoteCount: Object.keys(state.routeVotesByPlayer).length, revealedActionsByPlayer: revealed };
  },
  toControllerStateForPlayer(state, _context, playerId) {
    const { actionsByPlayer: _actions, responsesByPlayerId: _responses, handsByPlayerId: _hands, routeVotesByPlayer: _votes, seed: _seed, ...publicState } = state;
    const revealed = state.stage === "response" || state.stage === "reveal" || state.stage === "complete"
      ? Object.fromEntries(Object.entries(state.actionsByPlayer).map(([id, action]) => [id, action.action]))
      : {};
    return { ...publicState, heroes: state.heroes.map((hero) => ({ ...hero, handCount: (state.handsByPlayerId[hero.playerId] ?? []).length })), ownHand: state.handsByPlayerId[playerId] ?? [], submittedCount: Object.keys(state.actionsByPlayer).length, responseCount: Object.keys(state.responsesByPlayerId).length, routeVoteCount: Object.keys(state.routeVotesByPlayer).length, revealedActionsByPlayer: revealed, ownActionSubmitted: Boolean(state.actionsByPlayer[playerId]), ownResponseSubmitted: Boolean(state.responsesByPlayerId[playerId]), ownVoteSubmitted: Boolean(state.routeVotesByPlayer[playerId]), availableTargets: state.heroes.filter((hero) => hero.playerId !== playerId).map(({ playerId: id, name }) => ({ playerId: id, name })) } satisfies DungeonPartyControllerState;
  }
};
