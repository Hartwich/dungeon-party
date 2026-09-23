# Dungeon Party

Kompetitives Koop-Fantasyspiel: gemeinsam durch den Dungeon, persönlich um Ruhm und Beute.

**Status: frühe Vertikalscheibe.** Das Paket enthält acht Encounter, zwei geheime Gruppenabstimmungen über alternative Dungeonwege, einen dreiphasigen Bosskampf mit begrenzten Wiederholungsversuchen, sechs Klassen, geheime Grundaktionen mit anschließendem zehnsekündigem Kartenfenster, sechs Effektfamilien, erste Ausrüstung, gemeinsame Moral und individuelle Ruhmwertung. Sabotagekarten belohnen einen trotzdem gewonnenen Kampf und kosten bei einer Niederlage 2 Ruhm. Inhaltstiefe, Laufzeit und Balance sind noch Prototypniveau.

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
