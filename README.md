# Dungeon Party

Kompetitives Koop-Fantasyspiel: gemeinsam durch den Dungeon, persönlich um Ruhm und Beute.

**Status: frühe Vertikalscheibe.** Das Paket enthält sechs Encounter, sechs Klassen, geheime simultane Aktionen, erste Gegenstandskarten, eine gemeinsame Moral und eine individuelle Ruhmwertung. Inhaltstiefe, Laufzeit und Balance sind noch Prototypniveau.

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

Die vollständige Spiel- und Umsetzungsplanung liegt in [`docs/game-design.md`](docs/game-design.md). Das Spiel wird als öffentliches Repository geführt.
