import { dungeonPartyManifest } from "../manifest.js";
import type { DungeonPartyPublicState } from "../protocol.js";

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

function render(root: HTMLElement, appState: HostState | null): void {
  const state = (appState?.game?.state ?? {}) as Partial<DungeonPartyPublicState>;
  const en = appState?.room?.language === "en";
  const encounter = state.encounters?.[state.encounterIndex ?? -1];
  const seconds = Math.max(0, Math.ceil(((state.deadlineAt ?? Date.now()) - Date.now()) / 1000));
  const heroes = [...(state.heroes ?? [])].sort((a, b) => b.fame - a.fame);
  const classLabels: Record<string, string> = en
    ? { warrior: "Warrior", mage: "Mage", rogue: "Rogue", cleric: "Cleric", bard: "Bard", tinkerer: "Tinkerer" }
    : { warrior: "Krieger", mage: "Magier", rogue: "Schurke", cleric: "Kleriker", bard: "Barde", tinkerer: "Tüftler" };
  const final = state.stage === "complete";
  const done = state.phase === "finished" || state.phase === "scoreboard" || state.phase === "result" || state.phase === "locked";
  root.innerHTML = `
    <main class="dp-shell">
      <header class="dp-top"><div><span class="dp-kicker">${en ? "A DUNGEON PARTY" : "EIN ABEND IM DUNGEON"}</span><h1>${en ? "The dungeon remembers" : "Der Dungeon merkt sich alles"}</h1></div><div class="dp-progress">${(state.encounters ?? []).map((room, i) => `<span class="${i < (state.encounterIndex ?? 0) ? (room.cleared ? "cleared" : "failed") : i === state.encounterIndex ? "active" : ""}"></span>`).join("")}</div></header>
      ${done || final ? `<section class="dp-finale"><p class="dp-kicker">${state.campaignWon ? (en ? "BOSS DEFEATED" : "BOSS BESIEGT") : (en ? "THE DUNGEON WINS" : "DER DUNGEON GEWINNT")}</p><h2>${state.campaignWon ? (en ? "The party made it out." : "Die Gruppe hat es geschafft.") : (en ? "The party limps out." : "Die Gruppe schleppt sich hinaus.")}</h2><p>${(state.winnerPlayerIds ?? (state.winnerPlayerId ? [state.winnerPlayerId] : [])).map((id) => esc(heroes.find((h) => h.playerId === id)?.name)).join(en ? " & " : " und ")} ${en ? "win with the most fame" : "gewinnen mit dem meisten Ruhm"}.</p></section>` : `<section class="dp-encounter"><div class="dp-encounter-head"><span>${en ? `ROOM ${(state.encounterIndex ?? 0) + 1}` : `RAUM ${(state.encounterIndex ?? 0) + 1}`} · ${esc(encounter?.kind?.toUpperCase() ?? "DUNGEON")}</span><b>${state.stage === "planning" ? `${seconds}s` : (en ? "REVEAL" : "AUFLÖSUNG")}</b></div><h2>${esc(encounter?.name ?? "Dungeon Party")}</h2><p>${esc(encounter?.flavor ?? "")}</p><div class="dp-bar"><i style="width:${Math.max(0, 100 - ((encounter?.health ?? 0) / Math.max(1, encounter?.maxHealth ?? 1)) * 100)}%"></i></div><div class="dp-meta"><span>${state.stage === "planning" ? (en ? "Power target" : "Zielwert") : (en ? "Party power / target" : "Gruppenstärke / Zielwert")}</span><strong>${encounter?.partyPower ?? "—"} / ${encounter?.difficulty ?? 0}</strong></div>${state.lastRolls?.length ? `<div class="dp-rolls">${state.lastRolls.map((roll) => `<span>${esc(heroes.find((hero) => hero.playerId === roll.playerId)?.name)} · d6 ${roll.roll} · +${roll.contribution}</span>`).join("")}</div>` : ""}</section>`}
      <section class="dp-party"><div class="dp-section-title"><span>${en ? "THE QUESTIONABLE HEROES" : "DIE ZWEIFELHAFTEN HELDEN"}</span><span>${en ? "FAME" : "RUHM"}</span></div>${heroes.map((hero, i) => `<article class="dp-hero ${hero.playerId === state.winnerPlayerId ? "winner" : ""}"><div class="dp-rank">${String(i + 1).padStart(2, "0")}</div><div class="dp-avatar">${esc(({ warrior: "⚔", mage: "✦", rogue: "♠", cleric: "✚", bard: "♫", tinkerer: "⚙" } as Record<string, string>)[hero.classId] ?? "◆")}</div><div class="dp-identity"><b>${esc(hero.name)}</b><span>${esc(classLabels[hero.classId] ?? hero.classId)} · ♥ ${hero.health}/8 · ◈ ${hero.gold} · 🂠 ${hero.handCount ?? 0}</span>${hero.lastOutcome ? `<small>${esc(hero.lastOutcome)}</small>` : ""}${hero.items.length ? `<small>${hero.items.map((item) => esc(item.name)).join(" · ")}</small>` : ""}</div><strong class="dp-fame">${hero.fame}</strong></article>`).join("")}</section>
      <footer class="dp-footer"><span>${esc(appState?.game?.phase ?? "")}</span><span>${state.partyMorale ?? 3} ${en ? "party morale" : "Gruppenmoral"}</span><span>${state.submittedCount ?? 0}/${heroes.length} ${en ? "locked in" : "haben gewählt"}</span></footer>
    </main>`;
}

const styles = `
  .dp-shell{box-sizing:border-box;min-height:100%;padding:clamp(24px,4vw,64px);background:radial-gradient(ellipse at 85% 0%,#473423 0,transparent 36%),#171613;color:#f7f0e5;font-family:Inter,ui-sans-serif,system-ui,sans-serif;display:flex;flex-direction:column;gap:clamp(20px,3vh,38px)}
  .dp-top{display:flex;align-items:end;justify-content:space-between;gap:20px}.dp-kicker{font-size:12px;letter-spacing:.2em;color:#dcab71;font-weight:800}.dp-top h1{font-family:Georgia,serif;font-size:clamp(28px,4vw,54px);line-height:1;margin:9px 0 0;font-weight:500}.dp-progress{display:flex;gap:8px;align-items:center}.dp-progress span{width:clamp(20px,3vw,44px);height:6px;border-radius:9px;background:#50483d}.dp-progress .active{background:#e4a85e;box-shadow:0 0 16px #e4a85e88}.dp-progress .cleared{background:#8fb37f}.dp-progress .failed{background:#a45c4c}
  .dp-encounter,.dp-finale{border:1px solid #796449;background:linear-gradient(135deg,#2c261f,#211e1a);padding:clamp(22px,3vw,42px);border-radius:22px;box-shadow:0 20px 70px #0005}.dp-encounter-head{display:flex;justify-content:space-between;color:#d9b98f;font-size:12px;letter-spacing:.15em;font-weight:800}.dp-encounter-head b{color:#f2c889}.dp-encounter h2,.dp-finale h2{font-family:Georgia,serif;font-weight:500;font-size:clamp(30px,5vw,62px);margin:18px 0 10px}.dp-encounter p,.dp-finale p{font-size:clamp(16px,2vw,22px);color:#c9bca9;margin:0}.dp-bar{height:7px;background:#4a3930;border-radius:8px;margin-top:28px;overflow:hidden}.dp-bar i{display:block;height:100%;background:linear-gradient(90deg,#c06c48,#e7bd75);transition:width .4s}.dp-meta{display:flex;justify-content:space-between;margin-top:10px;color:#b9a992}.dp-meta strong{color:#fae2bc}.dp-rolls{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.dp-rolls span{padding:7px 10px;border:1px solid #554735;border-radius:9px;color:#cbbb9f;font-size:12px}.dp-finale{min-height:180px;display:flex;flex-direction:column;justify-content:center;background:radial-gradient(ellipse at 80% 10%,#75542f,#28221b 60%)}
  .dp-party{display:flex;flex-direction:column;gap:8px}.dp-section-title{display:flex;justify-content:space-between;color:#bca98d;font-size:11px;letter-spacing:.17em;font-weight:800;margin-bottom:5px}.dp-hero{display:grid;grid-template-columns:32px 44px minmax(0,1fr) auto;align-items:center;gap:13px;padding:12px 16px;background:#24211d;border:1px solid #41392f;border-radius:15px}.dp-hero.winner{border-color:#ddb36e;background:#34291d}.dp-rank{font:14px Georgia,serif;color:#8b7b64}.dp-avatar{width:40px;height:40px;display:grid;place-items:center;background:#443729;color:#f1c58c;border-radius:12px;font-size:22px}.dp-identity{min-width:0;display:flex;flex-direction:column;gap:3px}.dp-identity b{font-size:17px}.dp-identity span,.dp-identity small{font-size:12px;color:#baad99;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dp-identity small{color:#dda96c}.dp-fame{font:28px Georgia,serif;color:#f1cb89}.dp-footer{margin-top:auto;display:flex;justify-content:space-between;gap:12px;color:#958977;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
  @media(max-width:700px){.dp-shell{padding:18px}.dp-top{align-items:start;flex-direction:column}.dp-hero{grid-template-columns:26px 38px minmax(0,1fr) auto;padding:10px;gap:9px}.dp-avatar{width:36px;height:36px}.dp-footer{flex-wrap:wrap}.dp-identity small{max-width:55vw}}
`;

export const hostGame = {
  id: dungeonPartyManifest.id,
  displayName: dungeonPartyManifest.displayName,
  mountDom(rootValue: unknown, client: HostSource) {
    const root = rootValue as HTMLElement;
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.append(style);
    const unsubscribe = client.subscribe((state) => render(root, state));
    const timer = window.setInterval(() => render(root, client.getState()), 1000);
    return () => { unsubscribe(); window.clearInterval(timer); style.remove(); root.replaceChildren(); };
  }
} as const;
