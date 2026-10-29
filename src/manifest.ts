import { catalogText } from "./catalogText.js";
import type { GameManifest } from "@open-party-lab/game-core";
import type { DungeonActionId } from "./protocol.js";

export const classActions: Record<string, { id: DungeonActionId; name: { de: string; en: string }; description: { de: string; en: string } }> = {
  warrior: { id: "warrior_guard", name: { de: "Abfangen", en: "Guard the line" }, description: { de: "Volle Kampfkraft. Bei einem Fehlschlag erleidest du 1 Schaden weniger.", en: "Full attack power. Reduce your damage by 1 if the party fails." } },
  mage: { id: "mage_burst", name: { de: "Arkaner Blitz", en: "Arcane burst" }, description: { de: "+4 Kraft gegenüber Kämpfen. Eine gewürfelte 1 kostet dich 2 Leben.", en: "+4 power compared to Fight. Rolling 1 costs you 2 health." } },
  rogue: { id: "rogue_lift", name: { de: "Taschenspiel", en: "Sleight of hand" }, description: { de: "Wenig Kampfkraft; bei Erfolg stiehlst du bis zu 3 Gold von der reichsten Person und erhältst beim Diebstahl 1 Ruhm.", en: "Low power; on success, steal up to 3 gold from the richest hero and gain 1 fame when you steal." } },
  cleric: { id: "cleric_heal", name: { de: "Heilgebet", en: "Healing prayer" }, description: { de: "Solider Beitrag. Heilt vor dem Dungeon-Schaden die verletzteste Person um 2.", en: "Steady contribution. Heal the most wounded hero by 2 before dungeon damage." } },
  bard: { id: "bard_inspire", name: { de: "Kampflied", en: "Battle song" }, description: { de: "Dein Lied gibt der Gruppe zusätzlich +2 Kampfkraft.", en: "Your song gives the party +2 extra power." } },
  tinkerer: { id: "tinkerer_improvise", name: { de: "Feldumbau", en: "Field contraption" }, description: { de: "Mit einer 4–6 wird deine improvisierte Apparatur besonders stark (+3).", en: "Roll 4–6 to make your contraption extra powerful (+3)." } }
};

export const dungeonPartyManifest = {
  id: "dungeon-party",
  translations: catalogText,
  displayName: "Dungeon Party",
  description: "Besiegt den Dungeon gemeinsam. Sammelt Ruhm, Beute und spielt um den Sieg.",
  minPlayers: 3,
  maxPlayers: 8,
  hostView: "DungeonPartyHost",
  controllerView: "dungeon-party",
  controllerLayout: "dungeon_party",
  supportsTeams: false,
  estimatedRoundDurationMs: 1_800_000,
  scoreScope: "game",
  ownsScreens: ["round_intro", "result"],
  visual: { accent: "#b7773e", icon: "tower", eyebrow: "Fantasy" },
  audio: {
    track: { profile: "strategy", bpm: 92, rootMidi: 43, masterGain: 0.12 },
    trackByStage: {
      camp: { profile: "strategy", bpm: 76, rootMidi: 48, masterGain: 0.08, crossfadeSeconds: 2 },
      camp_reveal: { profile: "strategy", bpm: 76, rootMidi: 48, masterGain: 0.08, crossfadeSeconds: 2 },
      response: { profile: "mystery", bpm: 96, rootMidi: 43, masterGain: 0.09, crossfadeSeconds: 1.8 },
      reveal: { profile: "battle", bpm: 112, rootMidi: 43, masterGain: 0.14, crossfadeSeconds: 0.7 },
      complete: { profile: "battle", bpm: 92, rootMidi: 43, masterGain: 0.1, crossfadeSeconds: 2.5 }
    }
  },
  playerSetup: {
    kind: "choice",
    required: true,
    selectionKey: "dungeonClass",
    options: [
      { id: "warrior", name: "Krieger", title: "Abfangen", description: "Volle Kampfkraft und 1 Schaden weniger bei einem Fehlschlag.", visual: { primaryColor: "#c45a46", secondaryColor: "#422b2b", accentColor: "#f2a87d" } },
      { id: "mage", name: "Magier", title: "Arkaner Blitz", description: "+4 Kraft gegenüber Kämpfen; eine gewürfelte 1 kostet dich 2 Leben.", visual: { primaryColor: "#7b72d8", secondaryColor: "#302c60", accentColor: "#c3baff" } },
      { id: "rogue", name: "Schurke", title: "Taschenspiel", description: "Bei Erfolg stiehlst du bis zu 3 Gold von der reichsten Person und erhältst beim Diebstahl 1 Ruhm.", visual: { primaryColor: "#4d9a72", secondaryColor: "#234539", accentColor: "#a8e2b9" } },
      { id: "cleric", name: "Kleriker", title: "Heilgebet", description: "Heilt vor dem Dungeon-Schaden die verletzteste Person um 2 Leben.", visual: { primaryColor: "#d3ad54", secondaryColor: "#574522", accentColor: "#f8df91" } },
      { id: "bard", name: "Barde", title: "Kampflied", description: "Gibt der Gruppe zusätzlich +2 Kampfkraft.", visual: { primaryColor: "#d16b9d", secondaryColor: "#572c48", accentColor: "#ffc0dc" } },
      { id: "tinkerer", name: "Tüftler", title: "Feldumbau", description: "Bei einer 4–6 gibt deine Apparatur zusätzlich +3 Kampfkraft.", visual: { primaryColor: "#618eae", secondaryColor: "#2c4051", accentColor: "#b0d7ee" } }
    ]
  }
} as const satisfies GameManifest;

export const manifest = dungeonPartyManifest;
