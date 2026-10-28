import type { DungeonCampAction, DungeonCard, DungeonEncounter, DungeonRoomRule } from "./protocol.js";

type Text = { de: string; en: string };
const text = (de: string, en: string): Text => ({ de, en });
type CardTemplate = Omit<DungeonCard, "name" | "description"> & { name: Text; description: Text };
const gear = (id: string, name: Text, description: Text, attack = 1): CardTemplate => ({ id, name, description, attack, kind: "equipment" });
const spell = (id: string, name: Text, description: Text, effect: DungeonCard["effect"], extra: Partial<CardTemplate> = {}): CardTemplate => ({ id, name, description, attack: 0, kind: "effect", effect, ...extra });

const cards: CardTemplate[] = [
  gear("tin-crown", text("Blechkrone des Feldmarschalls", "Tin field marshal's crown"), text("+1 Kampfkraft. Sieht von hinten heldischer aus.", "+1 power. Looks more heroic from behind.")),
  gear("soup-spoon", text("Verdächtig großer Holzlöffel", "Suspiciously large wooden spoon"), text("+1 Kampfkraft. Jeder Gegner sieht ein bisschen wie Suppe aus.", "+1 power. Every enemy looks a little like soup.")),
  gear("boots", text("Stiefel des taktischen Rückzugs", "Boots of tactical retreat"), text("+1 Kampfkraft. Erstaunlich leise beim Weglaufen.", "+1 power. Surprisingly quiet when running away.")),
  gear("ring", text("Ring der fast völligen Unsichtbarkeit", "Ring of almost total invisibility"), text("+1 Kampfkraft. Die Gruppe übersieht dich trotzdem.", "+1 power. The party still overlooks you.")),
  spell("petty-intrigue", text("Intrige der Eitelkeit", "Intrigue of vanity"), text("Stiehl bis zu 1 Ruhm. Gruppenkraft −2. Bei Niederlage verlierst du 2 Ruhm.", "Steal up to 1 fame. Party power −2. Lose 2 fame if the party fails."), "intrigue", { sabotagePenalty: 2 }),
  spell("fake-bill", text("Falsche Rechnung", "Fake invoice"), text("Stiehl einer anderen Person bis zu 2 Gold.", "Steal up to 2 gold from another hero."), "false_bill"),
  spell("rallying-song", text("Heldengesang mit falschen Tönen", "Off-key heroic anthem"), text("+4 Gruppenkraft und +1 Ruhm für dich.", "+4 party power and +1 fame for you."), "rally"),
  spell("padded-coat", text("Mantel aus geliehenen Vorhängen", "Coat of borrowed curtains"), text("Schütze eine Person: 1 Schaden weniger bei Niederlage.", "Protect a hero: take 1 less damage on failure."), "ward"),
  spell("loose-floorboard", text("Lose Diele", "Loose floorboard"), text("Ziel: −3 Kraft. Bei Gruppenerfolg +1 Ruhm für dich, bei Niederlage −2.", "Target: −3 power. Gain 1 fame on party success; lose 2 on failure."), "jam", { sabotagePenalty: 2, sabotageReward: 1 }),
  spell("extra-paperwork", text("Zusätzlicher Papierkram", "Additional paperwork"), text("Zielwert +5. Bei Gruppenerfolg +2 Ruhm für dich, bei Niederlage −2.", "Target +5. Gain 2 fame on party success; lose 2 on failure."), "reinforce", { sabotagePenalty: 2, sabotageReward: 2 }),
  spell("healing-soup", text("Omas Notfallsuppe", "Grandma's emergency soup"), text("Eine Person erhält vor dem Kampf 2 Leben zurück. Höchstens 8 Leben.", "Restore 2 health to a hero before combat, up to 8."), "heal"),
  spell("pocket-cleric", text("Taschenheiliger", "Pocket saint"), text("Eine Person erhält vor dem Kampf 2 Leben zurück. Auch du selbst.", "Restore 2 health to a hero before combat. You may target yourself."), "heal"),
  spell("sleepy-tea", text("Schlummertee für Ungeheuer", "Monster bedtime tea"), text("Senke den Zielwert dieses Raums um 4.", "Reduce this room's target by 4."), "weaken"),
  spell("union-break", text("Gewerkschaftliche Monsterpause", "Union-mandated monster break"), text("Senke den Zielwert dieses Raums um 4.", "Reduce this room's target by 4."), "weaken"),
  spell("lucky-sock", text("Glückssocke, ungewaschen", "Lucky sock, unwashed"), text("Ein Ziel würfelt bei einer 1–3 einmal neu und behält den besseren Wurf.", "A hero rolling 1–3 rerolls once and keeps the better die."), "fortune"),
  spell("loaded-hope", text("Amtlich genehmigtes Glück", "Officially licensed luck"), text("Ein Ziel würfelt bei einer 1–3 einmal neu und behält den besseren Wurf.", "A hero rolling 1–3 rerolls once and keeps the better die."), "fortune"),
  spell("table-shield", text("Der Tisch muss mit", "Bring the whole table"), text("Bei Niederlage erleiden alle 1 Schaden weniger. Schutz stapelt nicht.", "On failure everyone takes 1 less damage. Protection does not stack."), "barrier"),
  spell("bubble-wrap", text("Magische Luftpolsterfolie", "Enchanted bubble wrap"), text("Bei Niederlage erleiden alle 1 Schaden weniger. Schutz stapelt nicht.", "On failure everyone takes 1 less damage. Protection does not stack."), "barrier"),
  gear("pan", text("Bratpfanne der Überzeugung", "Frying pan of persuasion"), text("+2 Kampfkraft. Ein schlagendes Argument.", "+2 power. A compelling argument."), 2),
  gear("lantern", text("Laterne der offensichtlichen Fallen", "Lantern of obvious traps"), text("+2 Kampfkraft. Jetzt siehst du wenigstens, was dich trifft.", "+2 power. At least you can see what hits you."), 2)
];

export function cardCatalog(language: "de" | "en"): DungeonCard[] {
  return cards.map((card) => ({ ...card, name: card.name[language], description: card.description[language] }));
}

export const campActions: Record<DungeonCampAction, { name: Text; description: Text; symbol: string; cost: number }> = {
  rest: { name: text("Am Feuer ausruhen", "Rest by the fire"), description: text("Kostenlos · +3 Leben, höchstens 8.", "Free · restore 3 health, up to 8."), symbol: "♥", cost: 0 },
  stock: { name: text("Karten nachkaufen", "Restock cards"), description: text("2 Gold · Ziehe 2 Aktionskarten.", "2 gold · draw 2 action cards."), symbol: "▱", cost: 2 },
  upgrade: { name: text("Ausrüstung verbessern", "Upgrade equipment"), description: text("3 Gold · Dauerhaft +1 Kampfkraft.", "3 gold · permanently gain +1 power."), symbol: "⚒", cost: 3 },
  scout: { name: text("Den Weg auskundschaften", "Scout ahead"), description: text("Kostenlos · +2 Gruppenkraft im nächsten Raum. Mehrere Späher addieren sich.", "Free · +2 party power next room. Multiple scouts stack."), symbol: "⌖", cost: 0 }
};

const rules: Array<Omit<DungeonRoomRule, "name" | "description"> & { name: Text; description: Text }> = [
  { id: "frontline", name: text("Offene Flanke", "Open flank"), description: text("Kämpfen und Abfangen bringen +2 Kraft pro Person.", "Fight and Guard add +2 power per hero."), symbol: "⚔" },
  { id: "echo", name: text("Halle des Echos", "Echo chamber"), description: text("Helfen und Heilgebet bringen +3 Kraft pro Person.", "Help and Healing prayer add +3 power per hero."), symbol: "♫" },
  { id: "arcane", name: text("Magischer Sturm", "Arcane storm"), description: text("Jede Klassenaktion bringt +2 Kraft.", "Each class action adds +2 power."), symbol: "✦" },
  { id: "riches", name: text("Goldrausch", "Gold rush"), description: text("Wer Beute sichert, erhält bei Erfolg zusätzlich 2 Gold.", "Looting grants 2 extra gold on success."), symbol: "¤" },
  { id: "danger", name: text("Hinterhalt", "Ambush"), description: text("Niederlage: alle +1 Schaden. Erfolg: alle +1 Ruhm.", "Failure: everyone takes +1 damage. Success: everyone gains +1 fame."), symbol: "⚡" }
];
export function roomRules(language: "de" | "en"): DungeonRoomRule[] {
  return rules.map((rule) => ({ ...rule, name: rule.name[language], description: rule.description[language] }));
}

type Room = { id: string; name: Text; flavor: Text; kind: DungeonEncounter["kind"]; difficulty: number; artKey: string };
export const roomPools: Record<"early" | "middle" | "late", Room[]> = {
  early: [
    { id: "toll-troll", name: text("Der Troll mit den Nebenkosten", "The troll with service charges"), flavor: text("Er verlangt Wegzoll, rückwirkend und in bar.", "He wants his toll retroactively, in cash."), kind: "battle", difficulty: 13, artKey: "toll-troll" },
    { id: "bridge", name: text("Die Brücke mit Höhenangst", "The bridge afraid of heights"), flavor: text("Die Planken knarren, die Brücke ebenfalls.", "The planks creak. So does the bridge."), kind: "challenge", difficulty: 15, artKey: "bridge" },
    { id: "mimic", name: text("Die Truhe mit Mundgeruch", "The chest with bad breath"), flavor: text("Sie sagt, ihr Inhalt sei zum Anbeißen.", "It promises a mouth-watering treasure."), kind: "battle", difficulty: 14, artKey: "mimic" },
    { id: "mushrooms", name: text("Die Pilzversammlung", "The mushroom assembly"), flavor: text("Niemand geht, bevor das Protokoll genehmigt ist.", "Nobody leaves until the minutes are approved."), kind: "event", difficulty: 14, artKey: "mushrooms" },
    { id: "slime", name: text("Pudding mit Besitzanspruch", "Pudding with property rights"), flavor: text("Ihr steht auf seinem Grundstück. Und in seinem Nachtisch.", "You're on its property. And in its dessert."), kind: "battle", difficulty: 15, artKey: "slime" }
  ],
  middle: [
    { id: "vault", name: text("Gewölbe der schlechten Ideen", "Vault of bad ideas"), flavor: text("Eine Truhe, drei Schlösser und ein verdächtiger Hebel.", "One chest, three locks and a suspicious lever."), kind: "challenge", difficulty: 18, artKey: "vault" },
    { id: "skeletons", name: text("Das Skelett-Orchester", "The skeleton orchestra"), flavor: text("Sie spielen nur Trauermärsche und nehmen Wünsche an.", "They only play funeral marches. Requests welcome."), kind: "battle", difficulty: 17, artKey: "skeletons" },
    { id: "gargoyle", name: text("Wasserspeier im Streik", "Gargoyle on strike"), flavor: text("Ohne Gefahrenzulage lässt er niemanden vorbei.", "No hazard pay, no passage."), kind: "battle", difficulty: 18, artKey: "gargoyle" },
    { id: "clockwork", name: text("Der Hausmeister-Automat", "The caretaker automaton"), flavor: text("Ihr seid nach Dienstschluss noch im Dungeon.", "You're still in the dungeon after closing time."), kind: "battle", difficulty: 19, artKey: "clockwork" },
    { id: "mirror", name: text("Der Spiegel der Selbstüberschätzung", "Mirror of overconfidence"), flavor: text("Eure Spiegelbilder behaupten, sie könnten es besser.", "Your reflections insist they could do better."), kind: "challenge", difficulty: 18, artKey: "mirror" }
  ],
  late: [
    { id: "lost-treasury", name: text("Schatzkammer ohne Ausgangsschild", "Treasury without an exit sign"), flavor: text("Der Schatz ist echt. Die Beschilderung ist es nicht.", "The treasure is real. The signs aren't."), kind: "challenge", difficulty: 20, artKey: "lost-treasury" },
    { id: "royal-mimic", name: text("Die königliche Beißkasse", "The royal biting treasury"), flavor: text("Auch der Schatz verlangt jetzt seinen Anteil.", "Even the treasure demands its share."), kind: "battle", difficulty: 21, artKey: "mimic" },
    { id: "grand-clockwork", name: text("Die letzte Sicherheitskontrolle", "The final security check"), flavor: text("Bitte alle magischen Gegenstände auf das Band legen.", "Please place all magical items on the conveyor."), kind: "challenge", difficulty: 20, artKey: "clockwork" }
  ]
};

export function localizedRoom(room: Room, language: "de" | "en", scale: number): DungeonEncounter {
  return { id: room.id, name: room.name[language], flavor: room.flavor[language], artKey: room.artKey, kind: room.kind, difficulty: room.difficulty + scale, health: room.difficulty + scale, maxHealth: room.difficulty + scale, cleared: false };
}

export const routePools: Room[][] = [[
  { id: "merchant", name: text("Händler mit den sieben Preisen", "Merchant of seven prices"), flavor: text("Bei Erfolg: alle +1 Gold.", "On success: everyone gains 1 gold."), kind: "event", difficulty: 14, artKey: "merchant" },
  { id: "crypt", name: text("Gruft der klappernden Ahnen", "Crypt of rattling ancestors"), flavor: text("Bei Erfolg: stärkster Beitrag +2 Ruhm. Gleichstände teilen den Bonus.", "On success: strongest contributors gain 2 fame each, including ties."), kind: "battle", difficulty: 16, artKey: "crypt" },
  { id: "library", name: text("Bibliothek der lauten Bücher", "Library of loud books"), flavor: text("Bei Erfolg: Helfen und Heilgebet geben +2 Ruhm.", "On success: Help and Healing prayer earn 2 extra fame."), kind: "challenge", difficulty: 15, artKey: "mirror" },
  { id: "well", name: text("Brunnen der guten Ausreden", "Well of good excuses"), flavor: text("Bei Erfolg: alle +1 Leben, höchstens 8.", "On success: everyone restores 1 health, up to 8."), kind: "challenge", difficulty: 15, artKey: "shrine" }
], [
  { id: "shrine", name: text("Schrein der zweiten Chancen", "Shrine of second chances"), flavor: text("Bei Erfolg: alle +1 Leben, höchstens 8.", "On success: everyone restores 1 health, up to 8."), kind: "challenge", difficulty: 16, artKey: "shrine" },
  { id: "cursed-armory", name: text("Waffenkammer mit Eigenleben", "Armory with a life of its own"), flavor: text("Bei Erfolg: Beute sichern zieht eine zweite Karte.", "On success: Loot draws a second extra card."), kind: "battle", difficulty: 19, artKey: "cursed-armory" },
  { id: "forge", name: text("Schmiede der heißen Angebote", "Forge of hot deals"), flavor: text("Bei Erfolg: alle erhalten dauerhaft +1 Kampfkraft.", "On success: everyone permanently gains +1 power."), kind: "challenge", difficulty: 20, artKey: "clockwork" },
  { id: "arena", name: text("Arena der schlechten Verlierer", "Arena of sore losers"), flavor: text("Bei Erfolg: alle +2 Ruhm.", "On success: everyone gains 2 fame."), kind: "battle", difficulty: 21, artKey: "gargoyle" }
]];
