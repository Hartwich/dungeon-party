import { dungeonPartyManifest } from "../manifest.js";
import type { DungeonPartyPublicState } from "../protocol.js";
import { classEmblem, effectSymbol, encounterIllustration } from "./art.js";

interface HostState {
  game?: { phase?: string; state?: unknown } | null;
  room?: { language?: "de" | "en" } | null;
}
interface HostSource {
  getState(): HostState | null;
  subscribe(callback: (state: HostState) => void): () => void;
}

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function delta(value: number, icon: string): string {
  return value === 0 ? "" : '<span class="dp-delta ' + (value > 0 ? "up" : "down") + '">' + icon + " " + (value > 0 ? "+" : "") + value + "</span>";
}

function render(root: HTMLElement, appState: HostState | null, animateResult = false): void {
  const state = (appState?.game?.state ?? {}) as Partial<DungeonPartyPublicState>;
  const en = appState?.room?.language === "en";
  const encounter = state.encounters?.[state.encounterIndex ?? -1];
  const heroes = [...(state.heroes ?? [])].sort((a, b) => b.fame - a.fame);
  const final = state.stage === "complete";
  const done = state.phase === "finished" || state.phase === "scoreboard" || state.phase === "result" || state.phase === "locked";
  const result = state.lastResolution;
  const actionLabel = (action?: string) => ({ fight: en ? "Fight" : "Kampf", aid: en ? "Help" : "Hilfe", loot: en ? "Loot" : "Beute" } as Record<string, string>)[action ?? "fight"];
  const stageLabel = state.stage === "voting" ? (en ? "ROUTE VOTE" : "WEGWAHL")
    : state.stage === "planning" ? (en ? "SECRET ACTIONS" : "GEHEIME AKTIONEN")
      : state.stage === "response" ? (en ? "PLAY A CARD" : "KARTE SPIELEN")
        : state.stage === "reveal" ? (en ? "ROOM RESULT" : "RAUMERGEBNIS")
          : final ? (en ? "CAMPAIGN END" : "KAMPAGNENENDE") : "DUNGEON";
  const readyCount = state.stage === "voting" ? state.routeVoteCount ?? 0
    : state.stage === "response" ? state.responseCount ?? 0
      : state.stage === "reveal" ? Object.keys(state.continueByPlayerId ?? {}).length
        : state.submittedCount ?? 0;
  const nextPaths = (state.routeHistory ?? []).map((route) => '<span class="dp-path-step"><i></i><b>' + esc(route.name) + "</b></span>").join("");
  const routeOptions = (state.routeOptions ?? []).map((route, index) =>
    '<article class="dp-route-card" style="--route-i:' + index + '"><div class="dp-route-art"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 53 25 36 36 44 54 18M43 18h11v11"/><circle cx="25" cy="36" r="5"/><circle cx="48" cy="25" r="4"/></svg></div><div><span>' +
    esc(route.kind.toUpperCase()) + " · " + (en ? "TARGET" : "ZIELWERT") + " " + route.difficulty + "</span><h3>" + esc(route.name) + "</h3><p>" + esc(route.description) + "</p></div></article>"
  ).join("");
  const responseActions = state.stage === "response" ?
    '<section class="dp-action-strip"><div class="dp-section-label"><span>' + (en ? "SEALED ACTIONS REVEALED" : "AKTIONEN AUFGEDECKT") + '</span><b>' + (state.submittedCount ?? heroes.length) + "/" + heroes.length + '</b></div><div class="dp-action-chips">' +
    heroes.map((hero) => '<span class="dp-action-chip"><i class="action-' + (state.revealedActionsByPlayer?.[hero.playerId] ?? "fight") + '"></i><b>' + esc(hero.name) + "</b><em>" + actionLabel(state.revealedActionsByPlayer?.[hero.playerId]) + "</em></span>").join("") +
    "</div></section>" : "";
  const routeVoting = state.stage === "voting" ?
    '<section class="dp-route-vote"><div class="dp-section-label"><span>' + (en ? "CHOOSE THE BRANCH" : "WÄHLT DEN WEG") + '</span><b>' + readyCount + "/" + heroes.length + '</b></div><div class="dp-route-grid">' + routeOptions + "</div></section>" : "";
  const responseCards = result?.cards?.length ?
    '<section class="dp-card-reveal"><div class="dp-section-label"><span>' + (en ? "PLAYED CARDS" : "GEBRAUCHTE KARTEN") + '</span></div><div class="dp-revealed-cards">' +
    result.cards.map((card) => '<article class="dp-card-reveal-item ' + (animateResult ? "enter" : "") + '"><div class="dp-card-glyph">' + effectSymbol(card.effect) + '</div><div><small>' + esc(card.playerName) + (en ? " plays" : " spielt") + '</small><b>' + esc(card.name) + '</b><span>' +
      (card.targetName ? (en ? "Target: " : "Ziel: ") + esc(card.targetName) : (en ? "Group effect" : "Gruppeneffekt")) + "</span></div></article>").join("") +
    "</div></section>" : "";
  const resultPanel = result ?
    '<section class="dp-result ' + (result.success ? "success" : "failure") + '">' +
    '<div class="dp-result-heading"><div class="dp-verdict-mark">' + (result.success ? "✓" : "×") + '</div><div><small>' + (en ? "ROOM CHECK" : "RAUMPROBE") + '</small><h2>' +
    (result.success ? (en ? "The party prevails" : "Die Gruppe schafft es") : (en ? "The dungeon strikes back" : "Der Dungeon schlägt zurück")) +
    '</h2></div><div class="dp-total"><span>' + (en ? "POWER / TARGET" : "KRAFT / ZIEL") + '</span><b>' + result.partyPower + '<i>/</i>' + result.targetDifficulty + "</b></div></div>" +
    '<div class="dp-dice-grid">' + result.heroes.map((entry, index) =>
      '<article class="dp-roll-card ' + (animateResult ? "roll-in" : "") + '" style="--roll-i:' + index + '"><div class="dp-roll-person"><span class="dp-die ' + (animateResult ? "tumble" : "") + '"><b>' + entry.roll + '</b></span><div><b>' + esc(entry.name) + '</b><small>' + actionLabel(entry.action) +
      '</small></div></div><strong class="dp-contribution">+' + entry.contribution + '</strong><div class="dp-roll-changes">' + delta(entry.healthDelta, "♥") + delta(entry.fameDelta, "✦") + delta(entry.goldDelta, "¤") + "</div>" +
      (entry.outcome && !en ? "<p>" + esc(entry.outcome) + "</p>" : "") + "</article>").join("") + "</div>" + responseCards + "</section>" : "";
  const pending = !result && state.stage !== "voting" && !final ?
    '<section class="dp-pending"><div class="dp-pending-icon">' + (state.stage === "response" ? "▱" : "⚄") + '</div><div><b>' +
    (state.stage === "response" ? (en ? "Cards in hand" : "Karten in der Hand") : (en ? "Choose your move" : "Wählt eure Aktion")) +
    '</b><span>' + (state.stage === "response" ? (en ? "The group reacts at its own pace." : "Die Gruppe spielt Karten ohne Zeitdruck.") : (en ? "Choices stay open until everyone submits." : "Die Wahl bleibt offen, bis alle entschieden haben.")) +
    '</span></div><strong>' + readyCount + "/" + heroes.length + "</strong></section>" : "";
  const heroRows = heroes.map((hero, index) => {
    const rowResult = result?.heroes.find((entry) => entry.playerId === hero.playerId);
    const hp = Math.max(0, Math.min(100, hero.health / 8 * 100));
    const classLabel = en
      ? ({ warrior: "Warrior", mage: "Mage", rogue: "Rogue", cleric: "Cleric", bard: "Bard", tinkerer: "Tinkerer" } as Record<string, string>)[hero.classId]
      : ({ warrior: "Krieger", mage: "Magier", rogue: "Schurke", cleric: "Kleriker", bard: "Barde", tinkerer: "Tüftler" } as Record<string, string>)[hero.classId];
    return '<article class="dp-hero-row ' + (hero.playerId === state.winnerPlayerId ? "winner " : "") + (rowResult?.healthDelta && rowResult.healthDelta < 0 ? "hurt" : "") + '" style="--hero-i:' + index + '"><div class="dp-rank">' +
      String(index + 1).padStart(2, "0") + '</div><div class="dp-hero-emblem">' + classEmblem(hero.classId) + '</div><div class="dp-hero-main"><div class="dp-hero-name"><b>' + esc(hero.name) + '</b><span>' + esc(classLabel ?? hero.classId) +
      '</span></div><div class="dp-hp-line"><div class="dp-hp-bar"><i style="width:' + hp + '%"></i></div><span>♥ ' + hero.health + '/8</span>' +
      (rowResult?.healthDelta ? '<b class="dp-hp-delta ' + (rowResult.healthDelta < 0 ? "down" : "up") + '">' + (rowResult.healthDelta > 0 ? "+" : "") + rowResult.healthDelta + "</b>" : "") +
      '</div></div><div class="dp-score"><span>' + (en ? "FAME" : "RUHM") + '</span><b>' + hero.fame + '</b><small>¤ ' + hero.gold + " · ▱ " + (hero.handCount ?? 0) + "</small></div></article>";
  }).join("");
  const finalPanel = final || done ?
    '<section class="dp-finale"><div class="dp-finale-mark">' + (state.campaignWon ? "♛" : "⌁") + '</div><div><small>' + (state.campaignWon ? (en ? "BOSS DEFEATED" : "DRACHE BESIEGT") : (en ? "CAMPAIGN FAILED" : "KAMPAGNE GESCHEITERT")) +
    '</small><h2>' + (state.campaignWon ? (en ? "The party escaped." : "Die Gruppe ist entkommen.") : (en ? "The dungeon held." : "Der Dungeon hat gewonnen.")) +
    '</h2><p>' + (state.winnerPlayerIds ?? (state.winnerPlayerId ? [state.winnerPlayerId] : [])).map((id) => esc(heroes.find((hero) => hero.playerId === id)?.name)).join(en ? " & " : " und ") + (en ? " wins on fame." : " gewinnt mit Ruhm.") + "</p></div></section>" : "";
  const bossName = encounter?.id === "boss" ? (en ? ["THE CONTRACT", "DRAGONFIRE", "THE FINAL CLAUSE"] : ["DER VERTRAG", "DAS DRACHENFEUER", "DIE LETZTE KLAUSEL"])[(encounter.phaseIndex ?? 1) - 1] : undefined;
  const sceneText = state.stage === "planning" ? encounter?.flavor
    : state.stage === "response" ? (en ? "Actions are in. The party can still help, meddle, or protect." : "Die Aktionen stehen. Jetzt kann die Gruppe helfen, intrigieren oder schützen.")
      : encounter?.resolution ?? encounter?.flavor;
  const revealProgress = Math.max(0, 100 - ((encounter?.health ?? 0) / Math.max(1, encounter?.maxHealth ?? 1)) * 100);
  const routeStatus = state.stage === "voting" ? (en ? "VOTE" : "ABSTIMMUNG")
    : state.stage === "response" ? (en ? "REACTIONS" : "REAKTIONEN")
      : state.stage === "reveal" ? (en ? "CONTINUE WHEN READY" : "WEITER WENN BEREIT")
        : (en ? "NO TURN TIMER" : "OHNE ZUG-ZEITLIMIT");

  root.innerHTML = '<main class="dp-shell">' +
    '<header class="dp-header"><div class="dp-brand"><span class="dp-brand-mark">⌘</span><div><small>' + (en ? "A COMPETITIVE CO-OP DUNGEON" : "EIN KOMPETITIVER KOOP-DUNGEON") + '</small><h1>DUNGEON <i>PARTY</i></h1></div></div><div class="dp-path"><span class="dp-path-label">' + (en ? "ROUTE" : "WEG") + '</span>' +
    (state.encounters ?? []).map((room, index) => '<i class="' + (index < (state.encounterIndex ?? 0) ? room.cleared ? "cleared" : "failed" : index === state.encounterIndex ? "current" : "") + '" title="' + esc(room.name) + '"></i>').join("") +
    "</div></header>" +
    (nextPaths ? '<nav class="dp-history"><b>' + (en ? "PATH TAKEN" : "GEWÄHLTER PFAD") + '</b><div>' + nextPaths + "</div></nav>" : "") +
    finalPanel +
    (!final && !done && state.stage !== "voting" ? '<section class="dp-scene"><div class="dp-illustration">' + encounterIllustration(encounter?.id, encounter?.phaseIndex) + '<span class="dp-scene-index">' + String((state.encounterIndex ?? 0) + 1).padStart(2, "0") +
      '</span></div><div class="dp-scene-info"><div class="dp-scene-kicker"><span>' + stageLabel + '</span><b>' + (encounter?.id === "boss" ? (en ? "PHASE " : "PHASE ") + (encounter.phaseIndex ?? 1) + "/" + (encounter.phaseCount ?? 3) : (en ? "ROOM " : "RAUM ") + ((state.encounterIndex ?? 0) + 1)) +
      '</b></div><h2>' + esc(bossName ?? encounter?.name ?? "Dungeon Party") + '</h2><p>' + esc(sceneText ?? "") + '</p><div class="dp-progress-track"><i style="width:' + revealProgress + '%"></i></div><div class="dp-scene-metrics"><span>' +
      (state.stage === "planning" ? (en ? "POWER TARGET" : "KRAFTZIEL") : (en ? "PARTY POWER / TARGET" : "GRUPPENKRAFT / ZIEL")) + '</span><b>' + (result ? result.partyPower + " / " + result.targetDifficulty : (encounter?.partyPower ?? "—") + " / " + (encounter?.difficulty ?? 0)) + "</b></div></div></section>" : "") +
    routeVoting + responseActions + resultPanel + pending +
    (!final && !done ? '<section class="dp-party"><div class="dp-section-label"><span>' + (en ? "THE PARTY" : "DIE GRUPPE") + '</span><b>' + (state.partyMorale ?? 3) + " " + (en ? "MORALE" : "MORAL") + '</b></div><div class="dp-hero-grid">' + heroRows + "</div></section>" : "") +
    '<footer class="dp-footer"><span>' + routeStatus + '</span><span>' + readyCount + "/" + heroes.length + " " + (state.stage === "voting" ? (en ? "votes" : "Stimmen") : state.stage === "response" ? (en ? "responses" : "Reaktionen") : state.stage === "reveal" ? (en ? "ready" : "bereit") : (en ? "locked" : "entschieden")) +
    '</span><span>' + (en ? "CO-OP PROGRESS · INDIVIDUAL FAME" : "KOOP-FORTSCHRITT · PERSÖNLICHER RUHM") + "</span></footer></main>";
}

const styles = [
  ".dp-shell{box-sizing:border-box;min-height:100%;padding:clamp(20px,3vw,48px);display:grid;grid-template-rows:auto auto auto 1fr auto;gap:clamp(14px,2.1vh,24px);background:radial-gradient(ellipse at 52% -18%,#604329 0%,transparent 48%),#171613;color:#f5ecd9;font-family:Inter,ui-sans-serif,system-ui,sans-serif}",
  ".dp-header{display:flex;align-items:center;justify-content:space-between;gap:24px}.dp-brand{display:flex;align-items:center;gap:13px}.dp-brand-mark{display:grid;place-items:center;width:48px;height:48px;border:1px solid #8f6736;border-radius:50%;font:30px Georgia,serif;color:#edc273;box-shadow:0 0 26px #d19a4c22}.dp-brand small{display:block;font-size:9px;letter-spacing:.2em;color:#c9a76b;font-weight:800}.dp-brand h1{font:700 clamp(20px,2.2vw,32px)/1 Georgia,serif;letter-spacing:.08em;margin:5px 0 0}.dp-brand h1 i{font-weight:400;color:#d6a451}.dp-path{display:flex;align-items:center;gap:7px}.dp-path-label{color:#a99574;font-size:9px;letter-spacing:.16em;margin-right:5px}.dp-path i{display:block;width:clamp(13px,1.4vw,21px);height:5px;border-radius:8px;background:#4d4538}.dp-path i.current{background:#efbf6e;box-shadow:0 0 14px #d49a49aa}.dp-path i.cleared{background:#7d9a6a}.dp-path i.failed{background:#9d574c}",
  ".dp-history{display:flex;align-items:center;gap:14px;color:#cfb983}.dp-history>b{font-size:9px;letter-spacing:.16em;white-space:nowrap}.dp-history>div{display:flex;align-items:center;gap:9px;overflow:hidden}.dp-path-step{display:flex;align-items:center;gap:6px;color:#b4a489;font:12px Georgia,serif;white-space:nowrap}.dp-path-step i{width:6px;height:6px;background:#bd8a4b;border-radius:50%;box-shadow:0 0 8px #bd8a4b77}",
  ".dp-scene{position:relative;min-height:clamp(250px,32vh,390px);display:grid;grid-template-columns:minmax(260px,.95fr) minmax(340px,1.05fr);overflow:hidden;border:1px solid #594832;border-radius:22px;background:linear-gradient(107deg,#31271c,#241f19 62%,#1e1b17);box-shadow:0 22px 70px #0006}.dp-illustration{position:relative;min-height:250px;background:#1b1915;overflow:hidden}.dp-illustration svg{position:absolute;width:100%;height:100%;inset:0;object-fit:cover}.dp-scene:after{position:absolute;content:\"\";inset:0;pointer-events:none;background:linear-gradient(90deg,transparent 32%,#262119 51%,transparent 100%);opacity:.56}.dp-scene-index{position:absolute;left:20px;bottom:15px;color:#e1bd7e;font:40px Georgia,serif;opacity:.72}.dp-scene-info{position:relative;z-index:1;padding:clamp(20px,3vw,40px);display:flex;flex-direction:column;justify-content:center}.dp-scene-kicker{display:flex;gap:15px;align-items:center;color:#dfb977;font-size:10px;font-weight:800;letter-spacing:.16em}.dp-scene-kicker b{padding:5px 8px;border:1px solid #715936;border-radius:999px;font-size:9px}.dp-scene-info h2{font:500 clamp(28px,4vw,51px)/1.03 Georgia,serif;margin:14px 0 8px;max-width:15ch}.dp-scene-info p{font-size:clamp(13px,1.25vw,17px);line-height:1.45;color:#c4b69c;max-width:48ch;margin:0}.dp-progress-track{height:6px;background:#4c3c2b;border-radius:9px;overflow:hidden;margin-top:26px}.dp-progress-track i{height:100%;display:block;background:linear-gradient(90deg,#ac5c3f,#eabf6f);transition:width .45s}.dp-scene-metrics{display:flex;justify-content:space-between;align-items:center;margin-top:8px;color:#ad9b7c;font-size:9px;letter-spacing:.13em}.dp-scene-metrics b{font:22px Georgia,serif;color:#f2d49b;letter-spacing:0}",
  ".dp-section-label{display:flex;justify-content:space-between;align-items:center;color:#beaa84;font-size:9px;font-weight:800;letter-spacing:.17em}.dp-section-label b{font:12px Georgia,serif;color:#edcd8b;letter-spacing:0}.dp-route-vote,.dp-action-strip,.dp-result,.dp-party{display:grid;gap:11px}.dp-route-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.dp-route-card{display:grid;grid-template-columns:62px minmax(0,1fr);gap:13px;align-items:center;min-height:112px;padding:12px;border:1px solid #695337;border-radius:15px;background:linear-gradient(120deg,#352a1e,#27211a);animation:rise .35s ease-out both;animation-delay:calc(var(--route-i)*70ms)}.dp-route-art{display:grid;place-items:center;height:62px;border-radius:13px;background:#473624;color:#e6bd72}.dp-route-art svg{width:42px;stroke:currentColor;stroke-width:2.4;fill:none}.dp-route-card span{color:#d0a866;font-size:8px;font-weight:800;letter-spacing:.14em}.dp-route-card h3{font:20px/1.05 Georgia,serif;margin:5px 0}.dp-route-card p{font-size:11px;line-height:1.3;color:#b9ad99;margin:0}",
  ".dp-action-chips{display:flex;gap:8px;flex-wrap:wrap}.dp-action-chip{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:#29241e;border:1px solid #514332}.dp-action-chip i{width:23px;height:23px;border-radius:50%;display:grid;place-items:center;background:#4b3927;color:#e8c780}.dp-action-chip i:before{content:\"⚔\";font-size:12px}.dp-action-chip i.action-aid:before{content:\"✚\"}.dp-action-chip i.action-loot:before{content:\"◈\"}.dp-action-chip b{font-size:11px}.dp-action-chip em{font:italic 11px Georgia,serif;color:#b9a98c}",
  ".dp-pending{display:flex;align-items:center;gap:13px;padding:12px 15px;background:#27221b;border-left:3px solid #c4934e;border-radius:0 11px 11px 0}.dp-pending-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#493726;color:#efc374;font-size:22px}.dp-pending div:nth-child(2){display:grid;gap:3px;flex:1}.dp-pending b{font:17px Georgia,serif}.dp-pending span{font-size:11px;color:#b9aa91}.dp-pending>strong{font:19px Georgia,serif;color:#eac47a}",
  ".dp-result{padding:15px 18px 18px;border-radius:17px;border:1px solid #5a4a35;background:#211e19}.dp-result.success{border-color:#6a7a50}.dp-result.failure{border-color:#8b5145}.dp-result-heading{display:flex;align-items:center;gap:13px}.dp-verdict-mark{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#31412b;color:#c9dc9b;font:25px Georgia,serif}.failure .dp-verdict-mark{background:#542f29;color:#f1aa88}.dp-result-heading small{font-size:8px;letter-spacing:.19em;color:#b7a27d;font-weight:800}.dp-result-heading h2{font:22px Georgia,serif;margin:4px 0 0}.dp-total{margin-left:auto;display:grid;text-align:right;gap:3px}.dp-total span{font-size:8px;letter-spacing:.13em;color:#ac9c80}.dp-total b{font:25px Georgia,serif;color:#f4d99f}.dp-total i{font:14px Georgia,serif;color:#9e8b6d;padding:0 5px}.dp-dice-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:8px}.dp-roll-card{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px 10px;padding:9px 11px;border:1px solid #473b2b;border-radius:12px;background:#2b261f;animation:rise .38s ease-out both;animation-delay:calc(var(--roll-i)*75ms)}.dp-roll-person{display:flex;align-items:center;gap:9px}.dp-roll-person>div{display:grid;gap:3px}.dp-roll-person>div>b{font-size:12px}.dp-roll-person small{font-size:9px;color:#b9a98c}.dp-die{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;background:linear-gradient(140deg,#f0d494,#a97b3d);box-shadow:inset 0 1px 3px #fff7,0 4px 10px #0006;color:#322518;transform:rotate(-7deg);font:20px Georgia,serif}.dp-die.tumble{animation:die-tumble .9s cubic-bezier(.17,.7,.25,1) both}.dp-contribution{align-self:center;color:#efd08b;font:19px Georgia,serif}.dp-roll-changes{grid-column:1/-1;display:flex;gap:7px;min-height:16px}.dp-delta{padding:2px 6px;border-radius:99px;font-size:10px;background:#4a352a}.dp-delta.up{background:#33452d;color:#d4e2ad}.dp-delta.down{color:#f2b3a0}.dp-roll-card p{grid-column:1/-1;margin:0;color:#bfad8e;font-size:10px;line-height:1.35}",
  ".dp-card-reveal{display:grid;gap:7px;border-top:1px solid #51432f;padding-top:12px}.dp-revealed-cards{display:flex;gap:8px;overflow:auto}.dp-card-reveal-item{display:flex;align-items:center;gap:9px;min-width:190px;padding:8px 10px;border-radius:10px;border:1px solid #735638;background:linear-gradient(125deg,#483322,#30271e)}.dp-card-reveal-item.enter{animation:card-flip .6s cubic-bezier(.2,.75,.2,1) both}.dp-card-glyph{width:35px;height:43px;display:grid;place-items:center;border-radius:6px;background:#c99a58;color:#34271a;font:21px Georgia,serif;box-shadow:inset 0 0 0 2px #efd294}.dp-card-reveal-item div:last-child{display:grid;gap:2px}.dp-card-reveal-item small{font-size:9px;color:#bea987}.dp-card-reveal-item b{font:14px Georgia,serif}.dp-card-reveal-item span{font-size:9px;color:#c2b295}",
  ".dp-party{align-content:start}.dp-hero-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:8px}.dp-hero-row{display:grid;grid-template-columns:20px 36px minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px 11px;border:1px solid #40382c;border-radius:13px;background:#24211c;animation:rise .32s ease-out both;animation-delay:calc(var(--hero-i)*35ms)}.dp-hero-row.winner{border-color:#bd9655;background:#30271b}.dp-hero-row.hurt{animation:hit-shake .38s ease-out}.dp-rank{font:12px Georgia,serif;color:#8a7c64}.dp-hero-emblem{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#473a29;color:#ecc77b;font:18px Georgia,serif}.dp-hero-name{display:flex;align-items:baseline;gap:7px;min-width:0}.dp-hero-name b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.dp-hero-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#a99a7e;font-size:9px}.dp-hp-line{display:flex;align-items:center;gap:6px;margin-top:6px}.dp-hp-bar{height:4px;flex:1;max-width:94px;background:#45372b;border-radius:9px;overflow:hidden}.dp-hp-bar i{display:block;height:100%;background:linear-gradient(90deg,#a54f3d,#dfaa62)}.dp-hp-line>span{color:#c6b69b;font-size:9px;white-space:nowrap}.dp-hp-delta{font-size:9px}.dp-hp-delta.down{color:#f2a28b}.dp-hp-delta.up{color:#b9d498}.dp-score{text-align:right;display:grid;gap:1px}.dp-score span{font-size:7px;letter-spacing:.14em;color:#ae9b78}.dp-score b{font:21px Georgia,serif;color:#f1cf8c}.dp-score small{font-size:8px;color:#a99a7e;white-space:nowrap}",
  ".dp-finale{display:flex;align-items:center;gap:18px;padding:23px 28px;border:1px solid #9b7845;border-radius:20px;background:radial-gradient(ellipse at 15% 50%,#644727,#272119 70%)}.dp-finale-mark{display:grid;place-items:center;width:68px;height:68px;border-radius:50%;border:1px solid #d5ad63;color:#f0cd84;font:40px Georgia,serif}.dp-finale small{font-size:9px;letter-spacing:.2em;color:#d7ae66;font-weight:800}.dp-finale h2{font:32px Georgia,serif;margin:6px 0}.dp-finale p{margin:0;color:#c6b798;font-size:13px}.dp-footer{display:flex;justify-content:space-between;gap:12px;color:#8d806b;font-size:8px;letter-spacing:.16em;font-weight:800;border-top:1px solid #332e25;padding-top:12px}",
  "@keyframes die-tumble{0%{transform:rotate(-7deg) translateY(-13px) rotateX(0);filter:brightness(1.8)}40%{transform:rotate(220deg) translateY(-4px) rotateX(210deg)}75%{transform:rotate(430deg) translateY(-1px) rotateX(380deg)}100%{transform:rotate(713deg);filter:brightness(1)}}@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes card-flip{0%{opacity:0;transform:rotateY(80deg) translateY(10px)}100%{opacity:1;transform:rotateY(0) translateY(0)}}@keyframes hit-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px);box-shadow:0 0 0 1px #c65a49}60%{transform:translateX(4px)}}",
  "@media(max-width:760px){.dp-shell{padding:16px;gap:14px}.dp-header{align-items:flex-start}.dp-brand-mark{width:39px;height:39px;font-size:24px}.dp-brand h1{font-size:20px}.dp-brand small{font-size:7px}.dp-path{gap:4px}.dp-path i{width:11px}.dp-history{align-items:flex-start;flex-direction:column;gap:7px}.dp-scene{grid-template-columns:minmax(0,1fr);min-height:0}.dp-illustration{min-height:210px;height:24vh}.dp-scene:after{background:linear-gradient(180deg,transparent 35%,#262119 100%)}.dp-scene-info{padding:19px}.dp-scene-info h2{font-size:32px}.dp-route-grid{grid-template-columns:1fr}.dp-route-card{min-height:88px}.dp-dice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dp-hero-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dp-hero-row{grid-template-columns:16px 29px minmax(0,1fr) auto;padding:8px 7px;gap:6px}.dp-hero-emblem{width:28px;height:28px;font-size:14px}.dp-hero-name{display:block}.dp-hero-name b{display:block;font-size:11px}.dp-hero-name span{display:block;font-size:8px}.dp-hp-bar{max-width:48px}.dp-footer{flex-wrap:wrap}.dp-footer span:last-child{width:100%}}",
  "@media(max-width:450px){.dp-path{max-width:45%;flex-wrap:wrap;justify-content:flex-end}.dp-path-label{width:100%;text-align:right}.dp-dice-grid{grid-template-columns:1fr}.dp-hero-grid{grid-template-columns:1fr}.dp-result-heading h2{font-size:19px}.dp-total b{font-size:21px}.dp-scene-metrics{font-size:8px}}",
  "@media(prefers-reduced-motion:reduce){.dp-shell *{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition:none!important}}"
].join("");

export const hostGame = {
  id: dungeonPartyManifest.id,
  displayName: dungeonPartyManifest.displayName,
  mountDom(rootValue: unknown, client: HostSource) {
    const root = rootValue as HTMLElement;
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.append(style);
    let lastResolutionId: string | undefined;
    const update = (state: HostState | null) => {
      const gameState = (state?.game?.state ?? {}) as Partial<DungeonPartyPublicState>;
      const resolutionId = gameState.lastResolution?.id;
      const animateResult = Boolean(resolutionId && resolutionId !== lastResolutionId);
      render(root, state, animateResult);
      lastResolutionId = resolutionId;
    };
    const unsubscribe = client.subscribe(update);
    update(client.getState());
    return () => { unsubscribe(); style.remove(); root.replaceChildren(); };
  }
} as const;
