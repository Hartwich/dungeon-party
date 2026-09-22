import type { GameManifest } from "@open-party-lab/game-core";

export const dungeonPartyManifest = {
  id: "dungeon-party",
  displayName: "Dungeon Party",
  description: "Besiegt den Dungeon gemeinsam. Sammelt Ruhm, Beute und spielt um den Sieg.",
  minPlayers: 3,
  maxPlayers: 8,
  hostView: "DungeonPartyHost",
  controllerView: "dungeon-party",
  controllerLayout: "choice",
  supportsTeams: false,
  estimatedRoundDurationMs: 240_000,
  scoreScope: "game",
  ownsScreens: ["round_intro", "result"],
  visual: { accent: "#b7773e", icon: "tower", eyebrow: "Fantasy" },
  audio: { track: { profile: "strategy", bpm: 92, rootMidi: 43, masterGain: 0.12 } },
  playerSetup: {
    kind: "choice",
    required: true,
    selectionKey: "dungeonClass",
    options: [
      { id: "warrior", name: "Krieger", title: "Frontlinie", description: "Schlägt im offenen Kampf besonders hart zu.", visual: { primaryColor: "#c45a46", secondaryColor: "#422b2b", accentColor: "#f2a87d" } },
      { id: "mage", name: "Magier", title: "Riskante Macht", description: "Mächtige Magie mit einer kleinen Rückschlagchance.", visual: { primaryColor: "#7b72d8", secondaryColor: "#302c60", accentColor: "#c3baff" } },
      { id: "rogue", name: "Schurke", title: "Fingerfertig", description: "Findet mehr Beute und kennt schmutzige Tricks.", visual: { primaryColor: "#4d9a72", secondaryColor: "#234539", accentColor: "#a8e2b9" } },
      { id: "cleric", name: "Kleriker", title: "Hält alle am Leben", description: "Kann angeschlagene Mitspieler heilen.", visual: { primaryColor: "#d3ad54", secondaryColor: "#574522", accentColor: "#f8df91" } },
      { id: "bard", name: "Barde", title: "Reden ist Silber", description: "Unterstützt die Gruppe und holt Ruhm aus guten Auftritten.", visual: { primaryColor: "#d16b9d", secondaryColor: "#572c48", accentColor: "#ffc0dc" } },
      { id: "tinkerer", name: "Tüftler", title: "Improvisiert immer", description: "Verwandelt Kleinkram in verlässliche Kampfkraft.", visual: { primaryColor: "#618eae", secondaryColor: "#2c4051", accentColor: "#b0d7ee" } }
    ]
  }
} as const satisfies GameManifest;

export const manifest = dungeonPartyManifest;
