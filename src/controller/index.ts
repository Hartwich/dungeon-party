import type { ControllerLayoutKey } from "@open-party-lab/game-core";
import { dungeonPartyManifest } from "../manifest.js";
import type { DungeonPartyControllerState } from "../protocol.js";

interface RenderContext {
  state: {
    preferredLanguage?: "de" | "en";
    room?: { language?: "de" | "en"; players?: Array<{ id: string; name: string }> } | null;
    player?: { id: string } | null;
    game?: { phase?: string; state?: unknown } | null;
  };
  onInput(input: unknown): void;
}

export const controllerGame = {
  id: dungeonPartyManifest.id,
  layoutKey: "choice" as ControllerLayoutKey,
  buildLayout({ state, onInput }: RenderContext) {
    const language = state.room?.language ?? state.preferredLanguage;
    const en = language === "en";
    const game = (state.game?.state ?? {}) as Partial<DungeonPartyControllerState>;
    const hero = game.heroes?.find((entry) => entry.playerId === state.player?.id);
    const encounter = game.encounters?.[game.encounterIndex ?? -1];
    const bossPhaseLabel = encounter?.id === "boss"
      ? (en ? ["The Contract", "Dragonfire", "The Final Clause"] : ["Der Vertrag", "Das Drachenfeuer", "Die letzte Klausel"])[(encounter.phaseIndex ?? 1) - 1]
      : undefined;
    const locked = state.game?.phase !== "playing" || game.stage !== "planning" || game.ownActionSubmitted;
    const voting = state.game?.phase === "playing" && game.stage === "voting" && !game.ownVoteSubmitted;
    const responding = state.game?.phase === "playing" && game.stage === "response" && !game.ownResponseSubmitted;
    const send = (action: "fight" | "loot" | "aid") => {
      if (!locked && state.player?.id) onInput({ type: "dungeon_action", action, playerId: state.player.id, sentAt: Date.now() });
    };
    const choices = [
      { id: "fight", label: en ? "Fight" : "Kämpfen", description: hero?.classId === "warrior" ? (en ? "Your class adds +2 power." : "Deine Klasse gibt +2 Kampfkraft.") : (en ? "A roll of 1–6 adds to party power." : "Dein Wurf von 1–6 erhöht die Gruppenstärke."), onSelect: () => send("fight") },
      { id: "aid", label: en ? "Help" : "Helfen", description: en ? "Reliable power; Clerics also heal." : "Verlässliche Hilfe; Kleriker heilen zusätzlich.", onSelect: () => send("aid") },
      { id: "loot", label: en ? "Snatch loot" : "Beute sichern", description: en ? "Gain 2 gold and draw an item if the party succeeds." : "Erhalte 2 Gold und bei Erfolg einen Gegenstand.", onSelect: () => send("loot") }
    ].map((choice) => ({ ...choice, disabled: locked }));
    const routeChoices = voting ? (game.routeOptions ?? []).map((route) => ({
      id: `route-${route.id}`,
      label: route.name,
      description: `${route.description} · ${en ? "Target" : "Zielwert"} ${route.difficulty}`,
      onSelect: () => {
        if (state.player?.id) onInput({ type: "dungeon_route_vote", routeId: route.id, playerId: state.player.id, sentAt: Date.now() });
      },
      disabled: false
    })) : [];
    const cardTargetEffects = ["intrigue", "false_bill", "ward", "jam"];
    const responseChoices = responding ? [
      ...(game.ownHand ?? []).filter((card) => card.kind === "effect").flatMap((card) => cardTargetEffects.includes(card.effect ?? "")
        ? (game.availableTargets ?? []).map((target) => ({
          id: "response-" + card.id + "-" + target.playerId,
          label: (en ? "Play: " : "Karte spielen: ") + card.name + " → " + target.name,
          description: card.description,
          onSelect: () => {
            if (state.player?.id) onInput({ type: "dungeon_card_response", cardId: card.id, targetPlayerId: target.playerId, playerId: state.player.id, sentAt: Date.now() });
          },
          disabled: false
        }))
        : [{
          id: "response-" + card.id,
          label: (en ? "Play: " : "Karte spielen: ") + card.name,
          description: card.description,
          onSelect: () => {
            if (state.player?.id) onInput({ type: "dungeon_card_response", cardId: card.id, playerId: state.player.id, sentAt: Date.now() });
          },
          disabled: false
        }]),
      {
        id: "response-pass",
        label: en ? "Keep cards" : "Keine Karte spielen",
        description: en ? "Pass your response and lock your choice." : "Setze diese Reaktion aus und sperre deine Wahl.",
        onSelect: () => {
          if (state.player?.id) onInput({ type: "dungeon_card_response", playerId: state.player.id, sentAt: Date.now() });
        },
        disabled: false
      }
    ] : [];
    const visibleChoices = voting ? routeChoices : responding ? responseChoices : game.stage === "response" ? [] : choices;
    const actionLabels: Record<string, string> = en ? { fight: "Fight", loot: "Loot", aid: "Help" } : { fight: "Kampf", loot: "Beute", aid: "Hilfe" };
    const feed = game.stage === "response"
      ? game.heroes?.map((entry) => entry.name + ": " + actionLabels[game.revealedActionsByPlayer?.[entry.playerId] ?? "fight"])
      : game.heroes?.map((entry) => entry.name + ": " + entry.fame + " " + (en ? "fame" : "Ruhm"));

    return {
      kind: "choice",
      title: voting
        ? (en ? "Choose the next path" : "Wählt den nächsten Weg")
        : game.ownVoteSubmitted
          ? (en ? "Your vote is secret" : "Deine Stimme ist geheim")
          : responding
            ? (en ? "Play a response card" : "Spiele eine Reaktionskarte")
            : game.stage === "response"
              ? (en ? "Waiting for responses" : "Warte auf Reaktionen")
          : locked ? (game.ownActionSubmitted ? (en ? "Choice locked" : "Entscheidung abgegeben") : (en ? "The room is resolving" : "Der Raum wird aufgelöst")) : (en ? "Choose your move" : "Was tust du?"),
      subtitle: voting
        ? (en ? `PATH VOTE · ${(game.encounterIndex ?? 0) + 1}/${game.encounters?.length ?? 8}` : `WEGWAHL · ${(game.encounterIndex ?? 0) + 1}/${game.encounters?.length ?? 8}`)
        : game.stage === "response"
          ? (en ? `REACTION WINDOW · ${game.responseCount ?? 0}/${game.heroes?.length ?? 0}` : `REAKTIONSFENSTER · ${game.responseCount ?? 0}/${game.heroes?.length ?? 0}`)
        : encounter?.id === "boss" && encounter.phaseIndex
          ? `${en ? "BOSS PHASE" : "BOSS-PHASE"} ${encounter.phaseIndex}/${encounter.phaseCount} · ${en ? "ATTEMPT" : "VERSUCH"} ${encounter.attempt}/${encounter.attemptLimit} · ${bossPhaseLabel}`
          : (encounter?.name ?? dungeonPartyManifest.displayName),
      helperText: game.ownVoteSubmitted
        ? (en ? "Your vote stays secret until the group has chosen." : "Deine Stimme bleibt geheim, bis die Gruppe gewählt hat.")
        : voting
          ? (en ? "The route with the most votes wins. Ties choose the easier route." : "Der Weg mit den meisten Stimmen gewinnt. Bei Gleichstand gewinnt der leichtere Weg.")
          : responding
            ? (en ? "Everyone's actions are revealed. Play at most one effect card or pass; your response stays secret." : "Alle Grundaktionen sind aufgedeckt. Spiele höchstens eine Effektkarte oder passe; deine Reaktion bleibt geheim.")
            : game.stage === "response"
              ? (en ? "Your response is locked. Waiting for the others or the timer." : "Deine Reaktion ist abgegeben. Warte auf die anderen oder den Timer.")
          : game.ownActionSubmitted
        ? (en ? "Your move is secret until everyone has chosen." : "Deine Aktion bleibt geheim, bis alle gewählt haben.")
        : `${encounter?.flavor ?? (en ? "The party is preparing." : "Die Gruppe bereitet sich vor.")} ${en ? "Choices lock after everyone submits or the timer ends." : "Alle Aktionen werden gleichzeitig aufgedeckt."}`,
      accentColor: "#b7773e",
      identityLabel: hero ? `${hero.name} · ${hero.classId}${en ? " · cards" : " · Karten"}: ${game.ownHand?.length ?? 0}` : undefined,
      disabled: locked && !voting && !responding,
      choices: visibleChoices,
      stats: [
        { label: en ? "Health" : "Leben", value: `${hero?.health ?? 0}/8` },
        { label: en ? "Fame" : "Ruhm", value: String(hero?.fame ?? 0), highlighted: true },
        { label: en ? "Gold" : "Gold", value: String(hero?.gold ?? 0) },
        { label: encounter?.id === "boss" ? (en ? "Boss phase" : "Bossphase") : (en ? "Room" : "Raum"), value: encounter?.id === "boss" ? `${encounter.phaseIndex ?? 1}/${encounter.phaseCount ?? 3} · ${encounter.attempt ?? 1}/${encounter.attemptLimit ?? 2}` : `${(game.encounterIndex ?? 0) + 1}/${game.encounters?.length ?? 8}` }
      ],
      feed
    };
  }
} as const;
