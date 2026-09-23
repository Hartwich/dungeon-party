const scene = `<defs>
  <linearGradient id="cave" x2="0" y2="1"><stop stop-color="#563a28"/><stop offset="1" stop-color="#151512"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="#f2b85d" stop-opacity=".58"/><stop offset="1" stop-color="#f2b85d" stop-opacity="0"/></radialGradient>
  <linearGradient id="metal" x2=".9" y2="1"><stop stop-color="#e5c895"/><stop offset=".55" stop-color="#8b6741"/><stop offset="1" stop-color="#33291f"/></linearGradient>
  <linearGradient id="skin" x2=".2" y2="1"><stop stop-color="#a8a35b"/><stop offset="1" stop-color="#55543a"/></linearGradient>
</defs>
<path fill="url(#cave)" d="M0 0h320v230H0z"/><circle cx="254" cy="36" r="112" fill="url(#glow)"/>
<path fill="#171512" d="M0 170 32 140l27 19 46-43 31 31 34-41 28 34 39-51 37 35 46-52v158H0z" opacity=".72"/>
<path fill="#30251b" d="M0 195q56-32 115-11t104-2q50-27 101-5v53H0z"/>
<g fill="#e4b866" opacity=".8"><circle cx="39" cy="72" r="2"/><circle cx="76" cy="39" r="1.5"/><circle cx="283" cy="97" r="2"/><circle cx="230" cy="62" r="1.5"/></g>`;

const figures: Record<string, string> = {
  "toll-troll": `<g stroke="#28251b" stroke-width="5" stroke-linejoin="round"><path fill="url(#skin)" d="M104 187q-7-32 3-66l-11-20q1-38 32-48 27-19 59 0 33 13 32 48l-12 24q12 33 5 62l-21 16h-69z"/><path fill="#969455" d="M111 95q-17-13-13-32l22 10m90 2q17-11 14-31l-22 12"/><path fill="#302b20" d="M125 95q11-10 22 0l-4 10h-15zm42 0q11-10 22 0l-3 10h-16z" stroke="none"/><path fill="#eee1b4" d="m123 124 20 4-14 26zm74 0-20 4 14 26z"/><path fill="#3e3728" d="M138 145q17 11 37 0l-4 12q-16 8-30 0z"/><path fill="none" stroke="#d19b56" stroke-width="7" d="M111 161q49 20 99-1"/></g><g fill="#e8bd60"><circle cx="103" cy="164" r="7"/><circle cx="222" cy="164" r="7"/><path d="M148 185h19v9h-19z"/></g>`,
  bridge: `<g stroke="#c49c62" stroke-width="6" stroke-linecap="round" fill="none"><path d="M36 79q124 116 248 0"/><path d="M36 78v65m26-41v53m27-31v49m28-25v50m28-35v45m29-56v45m30-65v48m29-83v51m29-69v55"/></g><g stroke="#4d3725" stroke-width="4" fill="#936d42"><path d="M31 145h32v12H31zm32 8h31v12H63zm31 11h31v12H94zm31 11h31v12h-31zm31-1h31v12h-31zm31-9h31v12h-31zm31-11h31v12h-31zm31-12h31v12h-31z"/></g><path fill="#10100f" d="M0 190 60 161l39 28 43-50 47 48 44-41 87 43v41H0z"/>`,
  vault: `<g stroke="#342619" stroke-width="7" stroke-linejoin="round"><path fill="url(#metal)" d="M82 111q4-54 78-54t78 54v69H82z"/><path fill="#784b2e" d="M91 117h138v59H91z"/><path fill="#c39c5e" d="M141 119h39v48h-39z"/><circle fill="#30271c" cx="160" cy="140" r="10"/><path fill="#e7cb8a" d="M150 70q10-13 20 0l-3 9h-14z"/><path fill="#e9d6a2" d="M103 124q-11-9-22 0l10 14zm115 0q11-9 22 0l-10 14z"/></g><path stroke="#e6bc6a" stroke-width="5" fill="none" d="M160 147v12m0 0h11"/>`,
  merchant: `<g stroke="#34271a" stroke-width="6" stroke-linejoin="round"><path fill="#a95a3e" d="M67 97q92-72 186 0v17H67z"/><path fill="#c79d58" d="M78 110h165v12H78z"/><path fill="#66472b" d="M92 122h138v57H92z"/><path fill="#d8b871" d="M108 132h28v46h-28zm78 0h28v46h-28z"/><path fill="#523a25" d="M140 144h42v35h-42z"/></g><g fill="#e9bd62"><circle cx="129" cy="92" r="8"/><circle cx="163" cy="83" r="10"/><circle cx="196" cy="92" r="8"/></g>`,
  crypt: `<g stroke="#29251d" stroke-width="5" stroke-linejoin="round" fill="url(#metal)"><path d="M100 180V100q0-42 60-52 60 10 60 52v80h-19v-74q0-30-41-38-41 8-41 38v74z"/><path d="M132 128q28-22 56 0v48h-56z" fill="#28231c"/><circle cx="146" cy="111" r="5" fill="#e8ba62"/><circle cx="174" cy="111" r="5" fill="#e8ba62"/><path d="m141 150 19-10 19 10-19 9z" fill="#d6bf8b"/></g><path stroke="#a28151" stroke-width="4" d="M160 147v22m-15-9 15 9 15-9"/>`,
  shrine: `<g stroke="#392b1c" stroke-width="6" stroke-linejoin="round"><path fill="#c69c5f" d="M70 184h180l-14-17H84zM91 166V91h21v75m96 0V91h21v75M72 89h176l-88-53z"/><path fill="#33291e" d="M134 127h52v39h-52z"/><path fill="#eac478" d="M160 103v45m-18-27h36"/></g><circle fill="#f3cd7c" opacity=".75" cx="160" cy="126" r="20"/>`,
  "cursed-armory": `<g stroke="#29251d" stroke-width="6" stroke-linejoin="round"><path fill="url(#metal)" d="m160 33 58 29-12 103-46 29-46-29-12-103z"/><path fill="#493c2a" d="M128 89q32-30 64 0l-8 32h-48z"/><path fill="#171512" d="m143 93 17 12 17-12-5 17h-24z"/><path stroke="#e3c480" fill="none" d="M160 56v102m-25-37 25 12 25-12"/></g><g stroke="#c18a43" stroke-width="5"><path d="M66 181 103 77m-16 29 31 11m117-39-26 103m13-68-26-8"/></g>`,
  skeletons: `<g stroke="#29251d" stroke-width="5" stroke-linejoin="round"><g fill="url(#metal)"><path d="M73 182q-7-43 1-76 13-26 31 0 8 33 1 76z"/><path d="M135 185q-9-43 1-80 13-27 31 0 8 36 0 80z"/><path d="M197 180q-8-42 1-74 13-26 31 0 7 31 0 74z"/></g><g fill="#27231d"><circle cx="89" cy="89" r="22"/><circle cx="151" cy="88" r="22"/><circle cx="213" cy="88" r="22"/></g><g fill="#e2d2a7"><circle cx="82" cy="87" r="5"/><circle cx="96" cy="87" r="5"/><circle cx="144" cy="86" r="5"/><circle cx="158" cy="86" r="5"/><circle cx="206" cy="86" r="5"/><circle cx="220" cy="86" r="5"/></g><path fill="#926641" d="M66 124h49v13H66zm60 8h52v13h-52zm60-4h53v13h-53z"/></g><g fill="#d6b76b"><path d="m104 99 45 37-7 9-47-36zm55 34 41-43 8 8-42 44z"/></g>`,
  "lost-treasury": `<g stroke="#3b2918" stroke-width="6" stroke-linejoin="round"><path fill="#9b582d" d="M77 107q5-29 83-29t83 29v67H77z"/><path fill="#d8ad5f" d="M86 112h148v55H86z"/><path fill="#66472b" d="M86 113h148v15H86z"/><path fill="#f0d17a" d="M145 117h31v48h-31z"/><path fill="#392a1b" d="M153 132h15v16h-15z"/></g><g fill="#e8c36c"><circle cx="97" cy="89" r="13"/><circle cx="130" cy="72" r="11"/><circle cx="188" cy="69" r="15"/><circle cx="221" cy="88" r="12"/></g><path fill="#f7d886" d="M151 134h9v13h-9zm12 7 11-9v5l-8 7 8 6v5l-11-9z"/>`,
  boss: `<g stroke="#241d17" stroke-width="7" stroke-linejoin="round"><path fill="#493d30" d="M74 174q-17-40 9-70 19-35 67-29 45-17 79 12 35 29 18 78l-27 23H99z"/><path fill="#735740" d="M90 102Q42 67 56 30q31 35 77 48m51 0q59-43 82-22-19 41-58 52"/><path fill="#b45137" d="M124 114q14-16 29 0l-5 13h-21zm45 0q14-16 29 0l-5 13h-21z"/><path fill="#f4cb71" d="M130 117h8v7h-8zm45 0h8v7h-8z"/><path fill="#25201b" d="M135 145q25 14 51 0l-6 15q-21 9-39 0z"/><path fill="#e4d1a6" d="m143 149 8 4 8-4-4 15h-8zm23 0 8 4 8-4-4 15h-8z"/></g><path fill="#8b3025" d="M202 149q69-3 76 46-43 22-85-4z"/><path fill="#dc8c42" d="M239 171q25 3 34 20-21 8-39-3z"/><g fill="#9c7650" opacity=".85"><path d="m91 177-19 31 31-14zm112 13 14 22 7-28z"/></g>`
};

export function encounterIllustration(encounterId = "toll-troll", phaseIndex = 1): string {
  let figure = figures[encounterId] ?? figures["toll-troll"]!;
  if (encounterId === "boss" && phaseIndex === 2) figure += `<path fill="#e68a3e" opacity=".8" d="M128 130q32-43 63 0-22-9-30 34-7-36-33-34zm83 9q26-28 42 2-21-2-18 29-8-24-24-31z"/>`;
  if (encounterId === "boss" && phaseIndex === 3) figure += `<path fill="#eee0bd" d="M111 58q12-18 25 0l-3 9h-18zm74 0q12-18 25 0l-3 9h-18z"/>`;
  return `<svg viewBox="0 0 320 230" role="img" aria-label="Dungeon illustration" xmlns="http://www.w3.org/2000/svg">${scene}${figure}</svg>`;
}

export function classEmblem(classId: string): string {
  const symbols: Record<string, string> = { warrior: "⚔", mage: "✦", rogue: "♠", cleric: "✚", bard: "♫", tinkerer: "⚙" };
  return symbols[classId] ?? "◆";
}

export function effectSymbol(effect?: string): string {
  const symbols: Record<string, string> = { intrigue: "♛", false_bill: "¤", rally: "♫", ward: "⬟", jam: "⌁", reinforce: "♞" };
  return symbols[effect ?? ""] ?? "✦";
}
