# QuestWorlds — Foundry VTT System

An implementation of the [QuestWorlds SRD](https://github.com/ChaosiumInc/QuestWorlds) for [Foundry Virtual Tabletop](https://foundryvtt.com) v12.

> QuestWorlds is a narrative RPG published by Chaosium Inc. This system implementation is based on the QuestWorlds SRD (Creative Commons CC BY 4.0).

---

## Installation (Development)

1. Clone this repository directly into your Foundry `systems/` directory:
   ```
   {userData}/Data/systems/questworlds/
   ```
2. Launch Foundry and create a new World using the **QuestWorlds** system.

## Development Tooling

This project includes a modern Node-based toolchain for linting, formatting, and building.

### Set up

```bash
cd questworlds
pnpm install
```

### Common commands

- `pnpm lint` — run ESLint on JS/TS sources
- `pnpm format` — format code with Prettier
- `pnpm build` — build a `dist/` package suitable for Foundry
- `pnpm dev` — run Vite dev server (for local Foundry development)

---

## Project Status

| Phase | Description                        | Status      |
|-------|------------------------------------|-------------|
| 1     | Scaffolding & Data Models          | ✅ Complete |
| 2     | Character Sheet (full UI)          | 🔜 Next     |
| 3     | Contest Resolution Engine          | 🔜 Planned  |
| 4     | Augments, Story Points             | 🔜 Planned  |
| 5     | Sequences (Scored & Wagered)       | 🔜 Planned  |
| 6     | NPC & GM Tools                     | 🔜 Planned  |
| 7     | XP, Advancement & Polish           | ✅ Complete |
| 8     | Compendium & Documentation         | ✅ Complete (except submission) |

## Quick Start (Seed Content)

This system ships with helpers you can run in the Foundry Console to create starter content in your World.

- Create a **help journal**: `game.questworlds.createHelpJournal()`
- Create **sample characters** (archetypes): `game.questworlds.createSampleCharacters()`
- Create a **blank character template**: `game.questworlds.createBlankCharacterTemplate()`

These helpers create Actors/Journal entries in your World so you can start playing without building everything from scratch.

## Macro Helpers

The system also provides macros to quickly set up useful tools:

- `game.questworlds.createDefaultMacros()` — creates macros for:
  - Quick Contest Launcher
  - Resistance Roller
  - Award XP
  - Scene Tracker

Run the function once, then add the created macros to your hotbar.

---

## File Structure

```
questworlds/
├── system.json                     # Foundry system manifest
├── module/
│   ├── questworlds.mjs             # Entry point — registers everything
│   ├── models/
│   │   ├── actor-models.mjs        # TypeDataModel: character, npc
│   │   └── item-models.mjs         # TypeDataModel: ability, flaw, benefit, consequence
│   ├── documents/
│   │   ├── actor.mjs               # QWActor — derived data, grouped abilities
│   │   └── item.mjs                # QWItem
│   ├── sheets/
│   │   ├── character-sheet.mjs     # PC sheet
│   │   ├── npc-sheet.mjs           # NPC sheet
│   │   └── ability-sheet.mjs       # Item sheet (all types)
│   └── helpers/
│       └── handlebars.mjs          # Helpers incl. qwRating, template preloader
├── templates/
│   ├── actors/
│   │   ├── character-sheet.hbs
│   │   └── npc-sheet.hbs
│   ├── items/
│   │   └── ability-sheet.hbs
│   ├── partials/                   # Preloaded partials (Phase 3+)
│   └── chat/                       # Contest result cards (Phase 3+)
├── styles/
│   └── questworlds.css
├── lang/
│   └── en.json
└── assets/                         # System artwork / icons
```

---

## Key Design Notes

### Rating Encoding
All ability ratings are stored as raw integers using the formula:
```
raw = base (1–20) + masteries × 20
```
Examples: `5` → "5", `26` → "6M", `43` → "3M2"

The `qwRating` Handlebars helper and `rawToQWNotation()` utility handle display conversion. The `targetNumber()` utility extracts the 1–20 roll target from any raw rating.

### Mastery Bump Mechanic
Masteries cancel against opponent masteries. Net masteries upgrade the winner's success level. This is implemented in the contest resolution engine (Phase 3).

### Keyword / Breakout Hierarchy
- **Keywords** are top-level ability Items with `abilityType: "keyword"`
- **Breakouts** are Items with `abilityType: "breakout"` and a `keywordId` reference
- Breakout effective rating = parent keyword rating + `breakoutBonus`
- This is computed in `QWActor._prepareCharacterData()`

---

## License

This system is released under the MIT license.

QuestWorlds is © Chaosium Inc., used under the Creative Commons Attribution 4.0 International License (CC BY 4.0). See the [QuestWorlds SRD](https://github.com/ChaosiumInc/QuestWorlds) for details.
