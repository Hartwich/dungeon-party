import type { LocalizedGameTextMap } from "@open-party-lab/game-core";

export const catalogText = {
  "de": {
    "displayName": "Dungeon Party",
    "description": "Besiegt den Dungeon gemeinsam. Sammelt Ruhm, Beute und spielt um den Sieg.",
    "visual": {
      "eyebrow": "Fantasy"
    }
  },
  "en": {
    "displayName": "Dungeon Party",
    "description": "Conquer the dungeon together. Earn fame, gather loot and compete for victory.",
    "visual": {
      "eyebrow": "Fantasy"
    },
    "playerSetup": {
      "title": "Choose your class",
      "description": "Choose a hero and their special ability.",
      "options": {
        "warrior": {
          "name": "Warrior",
          "title": "Guard the line",
          "description": "Full combat power and 1 less damage if the party fails."
        },
        "mage": {
          "name": "Mage",
          "title": "Arcane burst",
          "description": "+4 power compared to Fight; rolling a 1 costs you 2 health."
        },
        "rogue": {
          "name": "Rogue",
          "title": "Sleight of hand",
          "description": "On success, steal up to 3 gold from the richest hero and gain 1 fame when you steal."
        },
        "cleric": {
          "name": "Cleric",
          "title": "Healing prayer",
          "description": "Heal the most wounded hero by 2 health before dungeon damage."
        },
        "bard": {
          "name": "Bard",
          "title": "Battle song",
          "description": "Give the party +2 additional combat power."
        },
        "tinkerer": {
          "name": "Tinkerer",
          "title": "Field contraption",
          "description": "Rolling 4–6 gives your contraption +3 additional combat power."
        }
      }
    }
  }
} satisfies LocalizedGameTextMap;
