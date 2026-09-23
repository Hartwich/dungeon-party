import type { ControllerLayoutKey } from "@open-party-lab/game-core";
import { dungeonPartyManifest } from "../manifest.js";
import type { DungeonActionId, DungeonPartyControllerState } from "../protocol.js";

interface RenderContext {
  state: {
    preferredLanguage?: "de" | "en";
    room?: { language?: "de" | "en"; players?: Array<{ id: string; name: string }> } | null;
    player?: { id: string } | null;
    game?: { phase?: string; state?: unknown } | null;
  };
  onInput(input: unknown): void;
}

const actionLabels = {
  de: { fight: "Kämpfen", aid: "Helfen", loot: "Beute sichern" },
  en: { fight: "Fight", aid: "Help", loot: "Grab loot" }
} as const;

export const controllerGame = {
  id: dungeonPartyManifest.id,
  layoutKey: "dungeon_party" as ControllerLayoutKey,
  buildLayout({ state, onInput }: RenderContext) {
    const language = state.room?.language ?? state.preferredLanguage;
    const en = language === "en";
    const copy = en ? "en" : "de";
    const game = (state.game?.state ?? {}) as Partial<DungeonPartyControllerState>;
    const playerId = state.player?.id ?? "";
    const hero = game.heroes?.find((entry) => entry.playerId === playerId);
    const encounter = game.encounters?.[game.encounterIndex ?? -1];
    const resolution = game.lastResolution;
    const stage = game.stage;
    const ownActionSubmitted = Boolean(game.ownActionSubmitted);
    const ownResponseSubmitted = Boolean(game.ownResponseSubmitted);
    const ownVoteSubmitted = Boolean(game.ownVoteSubmitted);
    const ownContinueSubmitted = Boolean(game.ownContinueSubmitted);
    const playing = state.game?.phase === "playing";
    const mode = !playing || stage === "complete" ? "complete"
      : stage === "voting" ? (ownVoteSubmitted ? "waiting" : "voting")
        : stage === "planning" ? (ownActionSubmitted ? "waiting" : "planning")
          : stage === "response" ? (ownResponseSubmitted ? "waiting" : "response")
            : stage === "reveal" ? "reveal" : "waiting";
    const encounterLabel = encounter?.id === "boss" && encounter.phaseIndex
      ? `${en ? "Boss phase" : "Bossphase"} ${encounter.phaseIndex}/${encounter.phaseCount ?? 3}`
      : `${en ? "Room" : "Raum"} ${(game.encounterIndex ?? 0) + 1}/${game.encounters?.length ?? 8}`;

    const send = (type: string, fields: Record<string, unknown> = {}) => {
      if (playerId) onInput({ type, playerId, sentAt: Date.now(), ...fields });
    };
    const choices = mode === "voting"
      ? (game.routeOptions ?? []).map((route) => ({
        id: route.id,
        label: route.name,
        description: `${route.description} · ${en ? "Target" : "Zielwert"} ${route.difficulty}`,
        onSelect: () => send("dungeon_route_vote", { routeId: route.id })
      }))
      : mode === "planning"
        ? (["fight", "aid", "loot"] as DungeonActionId[]).map((action) => ({
          id: action,
          label: actionLabels[copy][action],
          description: action === "fight"
            ? (en ? "Roll a d6, add your class bonus and equipment. Gain 1 fame." : "Wirf einen W6 und addiere Klassenbonus und Ausrüstung. Du erhältst 1 Ruhm.")
            : action === "aid"
              ? (en ? "Add steady power; Clerics can heal a wounded hero. Gain 1 fame." : "Bring verlässliche Kraft ein; Kleriker heilen. Du erhältst 1 Ruhm.")
              : (en ? "Take 2 gold now. On success, gain 2 fame and draw a card; on failure, take extra damage." : "Nimm sofort 2 Gold. Bei Erfolg gibt es 2 Ruhm und eine Karte; bei Misserfolg erleidest du mehr Schaden."),
          onSelect: () => send("dungeon_action", { action })
        }))
        : [];

    const actionName = (action: string | undefined) => actionLabels[copy][(action as DungeonActionId) ?? "fight"];
    const revealedActions = mode === "response"
      ? (game.heroes ?? []).map((entry) => `${entry.name}: ${actionName(game.revealedActionsByPlayer?.[entry.playerId])}`)
      : [];
    const selectedEncounter = game.encounters?.[game.encounterIndex ?? -1];
    const hand = (game.ownHand ?? []).map((card) => ({
      id: card.id, name: card.name, description: card.description, kind: card.kind, effect: card.effect,
      artKey: card.effect ?? card.kind
    }));
    const pendingCard = game.ownResponseCard ? {
      id: game.ownResponseCard.id,
      name: game.ownResponseCard.name,
      description: game.ownResponseCard.description,
      kind: game.ownResponseCard.kind,
      effect: game.ownResponseCard.effect,
      artKey: game.ownResponseCard.effect ?? game.ownResponseCard.kind,
      targetName: game.ownResponseTargetName
    } : undefined;
    const cardsInResolution = (resolution?.cards ?? []).map((card) =>
      `${card.playerName} ${en ? "played" : "spielt"} „${card.name}“${card.targetName ? ` → ${card.targetName}` : ""}`
    );
    const resultCopy = resolution ? {
      success: resolution.success,
      partyPower: resolution.partyPower,
      targetDifficulty: resolution.targetDifficulty,
      cards: cardsInResolution,
      heroes: resolution.heroes.map((entry) => ({
        name: entry.name,
        action: actionName(entry.action),
        roll: entry.roll,
        contribution: entry.contribution,
        healthDelta: entry.healthDelta,
        fameDelta: entry.fameDelta,
        goldDelta: entry.goldDelta,
        outcome: en ? undefined : entry.outcome
      }))
    } : undefined;

    const waitingCopy = mode === "waiting"
      ? stage === "voting"
        ? (en ? "Your secret route vote is in. Waiting for everyone to choose." : "Deine geheime Wegwahl ist abgegeben. Warte, bis alle gewählt haben.")
        : stage === "planning"
          ? (en ? "Your action is sealed. The group advances when everyone has chosen." : "Deine Aktion ist geheim abgegeben. Es geht weiter, wenn alle gewählt haben.")
          : stage === "response"
            ? (en ? "Your card response is locked. Waiting for the others." : "Deine Kartenentscheidung ist abgegeben. Warte auf die anderen.")
            : (en ? `You are ready. ${Object.keys(game.continueByPlayerId ?? {}).length}/${game.heroes?.length ?? 0} players are ready to continue.` : `Bereit. ${Object.keys(game.continueByPlayerId ?? {}).length}/${game.heroes?.length ?? 0} sind bereit weiterzugehen.`)
      : "";
    const title = mode === "voting" ? (en ? "Choose a route" : "Wählt euren Weg")
      : mode === "planning" ? (en ? "Choose your move" : "Wähle deine Aktion")
        : mode === "response" ? (en ? "Play a card" : "Spiele eine Karte")
          : mode === "reveal" || mode === "complete" ? (en ? "The result" : "Das Ergebnis")
            : (en ? "Choice locked" : "Entscheidung abgegeben");
    const helperText = mode === "voting"
      ? (en ? "Your route vote is secret. Most votes win; a tie picks the easier path." : "Deine Wegwahl bleibt geheim. Die Mehrheit entscheidet, bei Gleichstand der leichtere Weg.")
      : mode === "planning"
        ? (en ? "No timer. Pick one action; everyone reveals together." : "Kein Zeitlimit. Wähle in Ruhe eine Aktion; alle sehen die Züge gleichzeitig.")
        : mode === "response"
          ? (en ? "Actions are revealed. Choose one action card and target, or pass. No timer." : "Die Grundaktionen sind aufgedeckt. Spiele eine Aktionskarte samt Ziel oder passe. Ohne Zeitlimit.")
          : mode === "reveal"
            ? (en ? "The party advances together; the player with most fame wins. Continue when everyone has read the result." : "Die Gruppe kommt gemeinsam weiter; am Ende gewinnt der meiste Ruhm. Weiter geht es, sobald alle das Ergebnis gelesen haben.")
            : mode === "complete"
              ? (en ? "The campaign result is on the shared screen." : "Das Kampagnenergebnis steht auf dem gemeinsamen Bildschirm.")
              : waitingCopy;
    const subtitle = mode === "reveal" || mode === "complete"
      ? (resolution?.success ? (en ? "The party passed this room." : "Die Gruppe hat den Raum geschafft.") : (en ? "The party failed this room." : "Die Gruppe ist im Raum gescheitert."))
      : mode === "response" || stage === "response"
        ? `${encounterLabel} · ${en ? "responses" : "Reaktionen"} ${game.responseCount ?? 0}/${game.heroes?.length ?? 0}`
        : mode === "voting" || stage === "voting"
          ? `${encounterLabel} · ${en ? "route votes" : "Wegwahlen"} ${game.routeVoteCount ?? 0}/${game.heroes?.length ?? 0}`
          : `${encounterLabel} · ${selectedEncounter?.name ?? dungeonPartyManifest.displayName}`;

    return {
      kind: "dungeon_party",
      language,
      mode,
      resetKey: `${game.encounterIndex ?? 0}-${stage}-${resolution?.id ?? ""}`,
      ownPlayerId: playerId,
      title,
      subtitle,
      helperText,
      accentColor: "#b7773e",
      disabled: !playing,
      statusLabel: mode === "waiting" ? (en ? "Waiting" : "Warte") : undefined,
      stats: [
        { label: en ? "Health" : "Leben", value: `${hero?.health ?? 0}/8` },
        { label: en ? "Fame" : "Ruhm", value: String(hero?.fame ?? 0), highlighted: true },
        { label: en ? "Gold" : "Gold", value: String(hero?.gold ?? 0) }
      ],
      choices,
      hand,
      pendingCard,
      handTitle: en ? "Your hand" : "Deine Hand",
      handHint: mode === "waiting" ? waitingCopy
        : mode === "response" ? (en ? "Tap a card, choose a target, then play it." : "Tippe eine Karte an, wähle ein Ziel und spiele sie aus.")
          : (en ? "Action cards can be played in the reaction phase." : "Aktionskarten spielst du in der Reaktionsphase."),
      handPlayable: mode === "response",
      targets: (game.heroes ?? []).map((entry) => ({ id: entry.playerId, name: entry.name })),
      targetRequiredEffects: ["intrigue", "false_bill", "ward", "jam"],
      targetForbiddenSelfEffects: ["intrigue", "false_bill", "jam"],
      teamFeed: revealedActions,
      resolution: resultCopy,
      continueLabel: en ? "Continue when ready" : "Weiter, wenn alle bereit sind",
      passLabel: en ? "Pass" : "Passen",
      playLabel: en ? "Play card" : "Karte spielen",
      onPlayCard: (cardId: string, targetPlayerId?: string) => send("dungeon_card_response", { cardId, ...(targetPlayerId ? { targetPlayerId } : {}) }),
      onPass: () => send("dungeon_card_response"),
      onContinue: () => send("dungeon_continue")
    };
  }
} as const;
