# QuestWorlds Foundry System — Development Tracker

> Last updated: 2026-03-07
> System version: 0.1.0
> Foundry target: v12 | Data model: TypeDataModel (modern)

---

## Included in v1.0 Scope
- [x] Scaffolding & Data Models
- [ ] Character Sheet (full UI)
- [ ] Contest Resolution Engine
- [ ] Augments, Modifiers & Story Points
- [ ] Sequences (Scored & Wagered)
- [ ] NPC Sheet & GM Tools
- [ ] Experience & Advancement
- [ ] Compendium & Documentation

---

## Phase 1 — Foundation & Scaffolding ✅ COMPLETE
*Goal: A working skeleton Foundry can load, with no errors.*

- [x] `system.json` manifest (v12 compatible, `documentTypes` block)
- [x] Full folder structure: `module/`, `templates/`, `styles/`, `lang/`, `assets/`, `packs/`
- [x] Entry point `module/questworlds.mjs` — registers models, sheets, helpers
- [x] `lang/en.json` — all strings externalized
- [x] `styles/questworlds.css` — parchment aesthetic, outcome colours, full sheet layout
- [x] `LICENSE.txt` + `README.md`

**Data Models (`module/models/`)**
- [x] `actor-models.mjs` — `QWCharacterData`, `QWNpcData` via `TypeDataModel`
  - [x] Character: story points, XP, occupation/community/homeland, resolution points, penalty/bonus totals, notes
  - [x] NPC: resistance rating, resistance label, NPC type (minion/master/independent)
- [x] `item-models.mjs` — `QWAbilityData`, `QWFlawData`, `QWBenefitData`, `QWConsequenceData`
  - [x] Ability: rating, abilityType (standalone/keyword/breakout), keywordId, breakoutBonus
  - [x] Consequence: severity (1–4), auto-derived penalty (–3/–6/–9), source, recovering flag
  - [x] Benefit: bonus, benefitType, expiresOn

**Documents (`module/documents/`)**
- [x] `QWActor` — `prepareDerivedData`: sums consequence penalties, derives breakout effective ratings, `getGroupedAbilities()`
- [x] `QWItem` — base class with `displayInChat()`

**Helpers (`module/helpers/`)**
- [x] `rawToQWNotation(raw)` — core rating display utility (e.g. `43` → `"3M2"`)
- [x] `qwNotationToRaw(notation)` — inverse converter
- [x] `targetNumber(raw)` — extracts 1–20 TN for rolling
- [x] `masteryCount(raw)` — counts masteries for bump logic
- [x] Handlebars helpers: `qwRating`, `qwBase`, `qwMasteries`, `qwSeverityLabel`, `qwPenalty`, `qwEq`, `qwConcat`, `qwRange`
- [x] `preloadHandlebarsTemplates()` — registers all partial paths

**Sheet Stubs (`module/sheets/`)**
- [x] `QWCharacterSheet` — tabs, item CRUD wired
- [x] `QWNpcSheet` — basic layout
- [x] `QWAbilitySheet` — all item types handled

**Templates (`templates/`)**
- [x] `actors/character-sheet.hbs` — header, tabs, abilities with keyword→breakout nesting, flaws, effects, notes
- [x] `actors/npc-sheet.hbs` — resistance block, abilities list
- [x] `items/ability-sheet.hbs` — handles all 4 item types conditionally

---

## Phase 2 — Character Sheet (Full UI) 🔜 NEXT
*Goal: A polished, fully interactive character sheet.*

- [x] Inline ability rating editing (click rating to edit in place, no sheet reload)
- [x] Inline ability name editing
- [x] Add ability with correct type pre-set (keyword vs standalone vs breakout)
- [x] Breakout "add" button pre-populates `keywordId` of parent
- [x] Drag-to-reorder abilities within their groups
- [x] Story points: click pips to spend/recover (update `system.storyPoints.value`)
- [x] Ability roll button (placeholder — fires contest dialog in Phase 3)
- [x] XP tracker with increment/decrement controls
- [x] Penalty/bonus summary bar below header
- [x] Sheet polish: icon for each ability type, empty-state illustrations

---

## Phase 3 — Contest Resolution Engine 🔜 PLANNED
*Goal: Clicking an ability runs a fully resolved Simple Contest.*

**Roll Dialog**
- [x] Dialog: select ability, enter/pick resistance, apply modifiers
- [x] Pre-fill resistance from targeted NPC token
- [x] Story point spend option in dialog (triggers retry / outcome upgrade)

**Roll Logic (`module/helpers/contest.mjs`)**
- [x] Both sides roll 1d20 vs target number
- [x] Determine raw success level: Fumble (20) / Failure / Success / Critical (1)
- [x] Mastery bump mechanic:
  - [x] Net masteries calculated (hero masteries – opposition masteries)
  - [x] Positive net: bump hero success level up per net mastery
  - [x] Negative net: bump opposition success level up per net mastery
- [x] Outcome table: cross-reference hero vs opposition success level
  - Complete Victory / Marginal Victory / Tie / Marginal Defeat / Complete Defeat
- [x] Assured contest: if modified TN > 20 with no opposition masteries → auto success

**Chat Output**
- [x] `templates/chat/contest-roll.hbs` — shows both dice, TNs, masteries
- [x] `templates/chat/contest-result.hbs` — outcome with colour coding + narration
- [x] Narrator prompt text per outcome level

---

## Phase 4 — Augments, Modifiers & Story Points 🔜 PLANNED
*Goal: Full support for roll modification mechanics.*

- [x] Augment workflow: select secondary ability → adds bonus to primary roll TN
  - [x] Augment roll: hero rolls augmenting ability vs Moderate (14)
  - [x] Success: +3 bonus; Critical: +6; Failure: no effect; Fumble: –3 penalty
- [x] Story Points:
  - [x] Spend to retry a just-failed contest (one retry per SP)
  - [x] Spend to bump outcome up one level after result
  - [x] SP value updated on actor when spent from chat card button
- [x] Consequences auto-apply penalty to relevant rolls (checkbox on dialog)
- [x] Benefits auto-apply bonus
- [x] Situational modifiers: freeform +/– field in roll dialog

---

## Phase 5 — Sequences (Scored & Wagered) 🔜 PLANNED
*Goal: Multi-round conflict resolution for dramatic scenes.*

**Scored Sequence**
- [x] Sequence tracker UI (sheet RP tracker)
- [ ] Resolution Point (RP) pools: hero starts at 0, climbs to 5 to win
- [ ] Per-exchange roll using contest engine
- [ ] RP award by outcome: Complete Victory +2 / Marginal Victory +1 / Tie 0 / Marginal Defeat −1 / Complete Defeat −2
- [ ] Sequence end detection: RP ≥ 5 or RP ≤ −5
- [ ] Final consequence determined by sequence outcome degree

**Group Simple Contest**
- [ ] Each PC rolls vs shared resistance
- [ ] Tally outcomes: count victories vs defeats
- [ ] Group outcome: majority wins; tie = marginal result

**Wagered Sequence**
- [ ] Bet RP before each exchange
- [ ] Wager doubles losses/gains for that exchange

**Token Integration**
- [ ] Token resource bar mapped to RP during active sequence

---

## Phase 6 — NPC Sheet & GM Tools 🔜 PLANNED
*Goal: GM-facing tooling for running encounters.*

- [ ] Full NPC sheet layout with named abilities for group contests
- [x] Resistance Ladder quick-reference panel (clickable to set resistance in roll dialog)
- [x] GM roll: click NPC ability/resistance → fires contest as opposition
- [ ] Compendium: default resistance values for common obstacle types
- [ ] Scene tracker: active consequences on all tokens visible to GM

---

## Phase 7 — Experience & Advancement 🔜 PLANNED
*Goal: Long-term character progression.*

- [ ] XP award macro / button (GM awards XP to selected tokens)
- [ ] Advance button on sheet:
  - [ ] Raise existing ability +5 (costs 10 XP)
  - [ ] New breakout at +5 under keyword (costs 10 XP)
  - [ ] New standalone ability at 13 (costs 10 XP)
  - [ ] New keyword at 13 (costs 10 XP)
- [ ] Advancement history log (journal entry per advance)
- [ ] System setting: configurable XP cost per advance

**Polish**
- [ ] Full localization pass — verify all strings in `en.json`
- [ ] CSS polish — responsive layout, icon set, print stylesheet
- [ ] System settings:
  - [ ] Default resistance (GM configurable)
  - [ ] Toggle: Wagered Sequences enabled
  - [ ] Toggle: Story Points enabled
  - [ ] Toggle: Show resistance ladder reference panel

---

## Phase 8 — Compendium & Documentation 🔜 PLANNED
*Goal: Out-of-the-box playability.*

- [ ] Sample pre-built characters (2–3 archetypes)
- [ ] Blank character template Item compendium
- [ ] Macro compendium:
  - [ ] Quick Contest Launcher
  - [ ] Resistance Roller (GM rolls random resistance from ladder)
  - [ ] Award XP to selected tokens
- [ ] In-system Help journal (QuestWorlds rules summary, how to use this system)
- [ ] README update for public release
- [ ] Submit to Foundry package browser

---

## Decisions Log

| Date       | Decision                                      |
|------------|-----------------------------------------------|
| 2026-03-07 | Target Foundry v12                            |
| 2026-03-07 | Use modern TypeDataModel (not template.json)  |
| 2026-03-07 | v1 includes: Sequences, Story Points, Keyword/Breakout nesting |
| 2026-03-07 | Follower/Sidekick support deferred post-v1    |
| 2026-03-07 | Rating encoding: raw int, base + masteries×20 |

---

## Known Issues / Tech Debt

- [x] ~~Breakout `keywordId` is set by item ID — if a keyword item is deleted, breakouts become orphaned. Need a cleanup hook.~~
      **Fixed 2026-03-07:** `QWActor._onDeleteDescendantDocuments` now detects deleted keyword items and batches an update to demote all orphaned breakouts to `standalone`, clearing `keywordId` and zeroing `breakoutBonus`.

- [x] ~~`prepareDerivedData` mutates `item.system.effectiveRating` directly on embedded items — verify this is safe in v12 or refactor to a Map on the actor.~~
      **Fixed 2026-03-07:** `effectiveRating` is no longer written to `item.system`. It is stored in `QWActor._breakoutRatings` (a `Map<itemId, number>`) initialised fresh each `prepareData()` cycle. Callers use `actor.getEffectiveRating(item)`. Sheet `getData()` annotates breakout objects with `effectiveRating` before passing to Handlebars so templates need no changes to their syntax.

- [ ] Chat card buttons (spend story point, retry) will require socket handling for non-owner players — defer to Phase 4.
