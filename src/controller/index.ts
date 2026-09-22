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
    const locked = state.game?.phase !== "playing" || game.stage !== "planning" || game.ownActionSubmitted;
    const send = (action: "fight" | "loot" | "aid" | "play_card", cardId?: string, targetPlayerId?: string) => {
      if (!locked && state.player?.id) onInput({ type: "dungeon_action", action, cardId, targetPlayerId, playerId: state.player.id, sentAt: Date.now() });
    };
    const choices = [
      { id: "fight", label: en ? "Fight" : "Kämpfen", description: hero?.classId === "warrior" ? (en ? "Your class adds +2 power." : "Deine Klasse gibt +2 Kampfkraft.") : (en ? "A roll of 1–6 adds to party power." : "Dein Wurf von 1–6 erhöht die Gruppenstärke."), onSelect: () => send("fight") },
      { id: "aid", label: en ? "Help" : "Helfen", description: en ? "Reliable power; Clerics also heal." : "Verlässliche Hilfe; Kleriker heilen zusätzlich.", onSelect: () => send("aid") },
      { id: "loot", label: en ? "Snatch loot" : "Beute sichern", description: en ? "Gain 2 gold and draw an item if the party succeeds." : "Erhalte 2 Gold und bei Erfolg einen Gegenstand.", onSelect: () => send("loot") },
      ...(game.ownHand ?? []).flatMap((card) => {
        if (card.effect === "intrigue" || card.effect === "false_bill") {
          return (game.availableTargets ?? []).map((target) => ({
            id: `card-${card.id}-${target.playerId}`,
            label: `${en ? "Play" : "Karte spielen"}: ${card.name} → ${target.name}`,
            description: card.description,
            onSelect: () => send("play_card", card.id, target.playerId)
          }));
        }
        return [{ id: `card-${card.id}`, label: `${en ? "Play" : "Karte spielen"}: ${card.name}`, description: card.description, onSelect: () => send("play_card", card.id) }];
      })
    ].map((choice) => ({ ...choice, disabled: locked }));

    return {
      kind: "choice",
      title: locked ? (game.ownActionSubmitted ? (en ? "Choice locked" : "Entscheidung abgegeben") : (en ? "The room is resolving" : "Der Raum wird aufgelöst")) : (en ? "Choose your move" : "Was tust du?"),
      subtitle: encounter?.name ?? dungeonPartyManifest.displayName,
      helperText: game.ownActionSubmitted
        ? (en ? "Your move is secret until everyone has chosen." : "Deine Aktion bleibt geheim, bis alle gewählt haben.")
        : `${encounter?.flavor ?? (en ? "The party is preparing." : "Die Gruppe bereitet sich vor.")} ${en ? "Choices lock after everyone submits or the timer ends." : "Alle Aktionen werden gleichzeitig aufgedeckt."}`,
      accentColor: "#b7773e",
      identityLabel: hero ? `${hero.name} · ${hero.classId}${en ? " · cards" : " · Karten"}: ${game.ownHand?.length ?? 0}` : undefined,
      disabled: locked,
      choices,
      stats: [
        { label: en ? "Health" : "Leben", value: `${hero?.health ?? 0}/8` },
        { label: en ? "Fame" : "Ruhm", value: String(hero?.fame ?? 0), highlighted: true },
        { label: en ? "Gold" : "Gold", value: String(hero?.gold ?? 0) },
        { label: en ? "Room" : "Raum", value: `${(game.encounterIndex ?? 0) + 1}/${game.encounters?.length ?? 6}` }
      ],
      feed: game.heroes?.map((entry) => `${entry.name}: ${entry.fame} ${en ? "fame" : "Ruhm"}`)
    };
  }
} as const;
