# Dungeon Party

Kompetitives Koop-Fantasyspiel: gemeinsam durch den Dungeon, persönlich um Ruhm und Beute.

**Status: spielbare Alpha in Überarbeitung.** Acht Räume, zwei geheime Wegabstimmungen, ein dreiphasiger Boss, sechs Klassen und ein kompetitives Ruhmziel bilden die Kampagne. Abstimmungen, Grundaktionen, Kartenreaktionen und das Lesen der Auflösung haben kein Zeitlimit. Der Host zeigt eigene Raum- und Monsterillustrationen, Würfelwürfe und konkrete Folgen pro Held; auf dem Handy liegt die eigene Hand als auswählbare Kartenfächer vor. Inhaltstiefe, Laufzeit, Balance und Mehrtelefon-Runden bleiben noch zu prüfen.

## Spielen über Open Party Lab

Das Paket wird lokal über `config/known-games.json` und `npm run games:sync-local` geladen. Im Host-Lobby wählt jede Person eine Klasse; Mehrfachauswahl einer Klasse ist erlaubt.

## Paket-Entrypoints

- `@open-party-lab/game-dungeon-party/manifest`
- `@open-party-lab/game-dungeon-party/protocol`
- `@open-party-lab/game-dungeon-party/server`
- `@open-party-lab/game-dungeon-party/host`
- `@open-party-lab/game-dungeon-party/controller`

## Entwicklung

```bash
npm run typecheck
npm run build
```

Die vollständige Spiel- und Umsetzungsplanung liegt in [`docs/game-design.md`](docs/game-design.md). Das Spiel ist im öffentlichen Repository [Hartwich/dungeon-party](https://github.com/Hartwich/dungeon-party) verfügbar.
