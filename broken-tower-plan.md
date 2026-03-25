# The Broken Tower — Foundry VTT Implementation Plan
## QuestWorlds System (questworlds-foundry)

---

## Delivery Format: Adventure Document

A Foundry **Adventure Document** is the correct container. It bundles multiple
document types (Actors, Items, Journal Entries, Roll Tables) into a single
importable compendium entry. The GM double-clicks it, selects what to import,
and everything lands in their world with folder structure and cross-references
intact.

Plain Compendium Packs hold only one document type — they are not suitable as
a self-contained scenario package.

**Build workflow:**
1. Build all content in a live world
2. Create an Adventure compendium pack in system.json
3. Create the Adventure document and drag content into it
4. Export the compendium to the repo

---

## System Data Model Reference

### Actor: Character (QWCharacterData)
- `name` — string
- `system.occupation` — string
- `system.community` — string
- `system.homeland` — string
- `system.storyPoints.value` / `.max` — number
- `system.experience.value` / `.advances` — number
- `system.resolutionPoints.value` / `.max` — number
- `system.penaltyTotal` / `.bonusTotal` — derived

### Actor: NPC (QWNpcData)
- `system.resistanceRating` — number (the TN)
- `system.resistanceLabel` — string (e.g. "Hard (22)")
- `system.npcType` — "minion" | "master" | "independent"
- `system.notes` — rich text

### Item: Ability (QWAbilityData)
- `name` — string
- `system.rating` — number (raw integer; display converts to mastery notation)
- `system.abilityType` — "standalone" | "keyword" | "breakout"
- `system.keywordId` — string (parent keyword's item ID, breakouts only)
- `system.breakoutBonus` — number (e.g. +5, +3)
- `system.description` — string

### Item: Flaw (QWFlawData)
- `name` — string
- `system.rating` — number
- `system.description` — string

### Item: Consequence (QWConsequenceData)
- `name` — string
- `system.severity` — 1–4
- `system.penalty` — derived (severity × –3... wait, scenario uses –5/–10/–15 scale)
  - **NOTE:** Scenario uses degree-based penalties (0°=–5, 1°=–10, 2°=–15, 3°=–20).
    Active consequences on NPCs should be entered as pre-applied penalties in notes
    until the system's penalty model is confirmed.
- `system.source` — string
- `system.recovering` — boolean

### Item: Benefit (QWBenefitData)
- `name` — string
- `system.bonus` — number
- `system.benefitType` — "fresh-hero" | "victory" | "augment" | "story" | "other"
- `system.expiresOn` — string
- `system.description` — string

### Mastery Notation
- Ratings are stored as raw integers: 5M = 25, 10M = 30, 5M+ = 35, 10M+ = 40
- The `qwRating` helper converts for display
- Formula: rating > 20 → `(rating - 20)M`; rating > 40 → `(rating - 40)M+` etc.

---

## Content Inventory

### Actors (9)
| Name | Type | Notes |
|---|---|---|
| Vasana, Daughter of Farnan | Character | Pregen PC |
| Harmast, Son of Baranthos | Character | Pregen PC |
| Sorala, Daughter of Toria | Character | Pregen PC |
| Yanioth, Vareena's Daughter | Character | Pregen PC |
| Vishi Dunn | Character | Pregen PC |
| Danakos, Son of Egrost | NPC | Antagonist, master |
| Varanik, the Mad Greydog | NPC | Tower guardian, independent |
| Surviving Greydog | NPC | Witness/ally, independent |
| Rock Lizard Pack | NPC | Mook group, Scene 4 |

### Items (standalone — used by NPCs or as handouts)
| Name | Type | Notes |
|---|---|---|
| Idrima's Protection | Benefit | Post-adventure reward item |
| Pre-Heortling Deity Lore | Ability (breakout) | Sorala reward |
| Shame | Consequence | On Surviving Greydog |
| Broken Mind | Consequence | On Varanik (permanent) |

### Journal Entries (15)
See Phase 3 for full list.

### Roll Tables (2)
- Degrees of Victory/Defeat
- Resistance Quick Reference

---

## Phase 1: Actor Data Preparation

### Pre-generation: Ability Rating Conversion Table

All ratings from the scenario converted to raw integers for data entry:

| Notation | Raw Integer |
|---|---|
| 13 | 13 |
| 17 | 17 |
| 5M | 25 |
| 10M | 30 |
| 8M | 28 |
| 22 | 22 |
| 20 | 20 |
| 18 | 18 |

### 1.1 — Vasana, Daughter of Farnan
**Actor type:** Character | **Occupation:** Veteran Heavy Cavalry
**Community:** Ernaldori | **Homeland:** Sartar
**Story Points:** 3/3 | **XP:** 0 | **RP:** 0/5

**Abilities:**

| Item Name | Type | Rating | Breakout Bonus | Parent Keyword |
|---|---|---|---|---|
| Air Rune (Orlanth Adventurous) | keyword | 25 | — | — |
| Summon/Command Air Elemental | breakout | — | +5 | Air Rune |
| Lightning | breakout | — | +5 | Air Rune |
| Death Rune | standalone | 17 | — | — |
| Truth Rune | standalone | 17 | — | — |
| Movement Rune | standalone | 17 | — | — |
| Heortling Warrior | keyword | 17 | — | — |
| Broadsword | breakout | — | +5 | Heortling Warrior |
| Bison Rider | breakout | — | +5 | Heortling Warrior |
| Shield & Spear | breakout | — | +3 | Heortling Warrior |
| Honor | standalone | 25 | — | — |
| Hate (Lunar Empire) | standalone | 25 | — | — |
| Devotion (Orlanth) | standalone | 17 | — | — |
| Loyalty (Sartar / Argrath) | standalone | 17 | — | — |

**Flaws:**
- Grief (Father devoured by the Crimson Bat) — rating 13

**Notes field (GM):** Most powerful combatant. Honor 5M may trigger mandatory rolls if asked to act dishonorably — e.g. summary execution of incapacitated Danakos. Air Rune breakouts less useful against Idrima. Mount: Riding Bison (follower, Bison Charge 17, absorbs 1 RP before bolting).

---

### 1.2 — Harmast, Son of Baranthos
**Actor type:** Character | **Occupation:** Noble Farmer / Clan Leader
**Community:** Ernaldori | **Homeland:** Sartar
**Story Points:** 3/3 | **XP:** 0 | **RP:** 0/5

**Abilities:**

| Item Name | Type | Rating | Breakout Bonus | Parent Keyword |
|---|---|---|---|---|
| Air Rune (Orlanth Rex) | keyword | 17 | — | — |
| Voice of Command | breakout | — | +5 | Air Rune |
| Inspire Followers | breakout | — | +5 | Air Rune |
| Man Rune | standalone | 17 | — | — |
| Movement Rune | standalone | 13 | — | — |
| Heortling Warrior | keyword | 17 | — | — |
| Spear & Shield | breakout | — | +5 | Heortling Warrior |
| Farmer / Clan Leader | keyword | 17 | — | — |
| Negotiate | breakout | — | +5 | Farmer / Clan Leader |
| Clan Lore | breakout | — | +3 | Farmer / Clan Leader |
| Honor | standalone | 17 | — | — |
| Devotion (Orlanth) | standalone | 17 | — | — |
| Loyalty (Ernaldori Clan) | standalone | 17 | — | — |

**Notes field (GM):** Social anchor. Best candidate to understand legal/cultural dimensions. Clan Lore detects that Danakos broke deep taboos. Negotiate is the best tool for the surviving Greydog. Most likely to be suspicious of any deal with Idrima — Orlanth Rex initiates are not naturally aligned with chthonic earth goddesses.

---

### 1.3 — Sorala, Daughter of Toria
**Actor type:** Character | **Occupation:** Sage / Investigator
**Community:** Ernaldori | **Homeland:** Sartar
**Story Points:** 3/3 | **XP:** 0 | **RP:** 0/5

**Abilities:**

| Item Name | Type | Rating | Breakout Bonus | Parent Keyword |
|---|---|---|---|---|
| Truth Rune (Lhankor Mhy) | keyword | 25 | — | — |
| Reconstruction | breakout | — | +5 | Truth Rune |
| Spirit Sight | breakout | — | +5 | Truth Rune |
| Ancient Lore | breakout | — | +3 | Truth Rune |
| Earth Rune | standalone | 13 | — | — |
| Heortling | keyword | 13 | — | — |
| Fast Talk | breakout | — | +5 | Heortling |
| First Aid | breakout | — | +5 | Heortling |
| Curious | standalone | 17 | — | — |
| Devotion (Lhankor Mhy) | standalone | 17 | — | — |
| Loyalty (Ernaldori Clan) | standalone | 13 | — | — |

**Notes field (GM):** Reconstruction (10M) is the party's primary investigative tool — can read past events at Lannike's campsite, tower, cattle carcasses. Ancient Lore (8M) vs. Challenging (15) identifies Idrima; vs. Hard (20) also reveals the proper rite.

---

### 1.4 — Yanioth, Vareena's Daughter
**Actor type:** Character | **Occupation:** Earth Priestess / Warrior
**Community:** Ernaldori | **Homeland:** Sartar
**Story Points:** 3/3 | **XP:** 0 | **RP:** 0/5

**Abilities:**

| Item Name | Type | Rating | Breakout Bonus | Parent Keyword |
|---|---|---|---|---|
| Earth Rune (Ernalda) | keyword | 25 | — | — |
| Summon/Command Earth Elemental | breakout | — | +5 | Earth Rune |
| Heal | breakout | — | +5 | Earth Rune |
| Speak to Earth Spirits | breakout | — | +3 | Earth Rune |
| Fertility Rune | standalone | 17 | — | — |
| Harmony Rune | standalone | 13 | — | — |
| Heortling Warrior | keyword | 17 | — | — |
| Battle Axe | breakout | — | +5 | Heortling Warrior |
| Shield | breakout | — | +3 | Heortling Warrior |
| Devotion (Ernalda) | standalone | 17 | — | — |
| Loyalty (Vasana / family) | standalone | 17 | — | — |

**Notes field (GM):** Most naturally positioned to deal with Idrima. Earth Rune 5M speaks Idrima's language. Primary candidate for Idrima's devotion offer — theologically coherent for Ernalda initiate. CRITICAL: If she summons earth elemental near Idrima's sacred ground, Idrima may attempt to claim it (contest: Yanioth's Earth Rune 5M vs. Idrima's Earth Rune 10M). This is not hostility — it is simply what Idrima is.

---

### 1.5 — Vishi Dunn
**Actor type:** Character | **Occupation:** Praxian Shaman (Assistant)
**Community:** Bison Tribe | **Homeland:** Prax
**Story Points:** 3/3 | **XP:** 0 | **RP:** 0/5

**Abilities:**

| Item Name | Type | Rating | Breakout Bonus | Parent Keyword |
|---|---|---|---|---|
| Spirit Rune (Daka Fal) | keyword | 25 | — | — |
| Spirit Combat | breakout | — | +5 | Spirit Rune |
| Summon Ancestor Spirit | breakout | — | +5 | Spirit Rune |
| Speak with Dead | breakout | — | +5 | Spirit Rune |
| Illusion Rune | standalone | 13 | — | — |
| Water Rune | standalone | 13 | — | — |
| Praxian Shaman | keyword | 17 | — | — |
| Fetch (spirit companion) | breakout | — | +5 | Praxian Shaman |
| Sensing Hidden Spirits | breakout | — | +3 | Praxian Shaman |
| Devotion (Daka Fal) | standalone | 17 | — | — |
| Cousin Monkey (companion; Tracking +5) | standalone | 17 | — | — |

**Flaws:**
- Outsider (Praxian among Heortlings) — rating 13

**Notes field (GM):** Essential at Lannike's campsite. Fetch perceives Idrima's influence on landscape before tower — subdued earth-spirits, silence where animal spirits should be. Can perceive the moment Danakos stopped being fully himself. Speak with Dead raises Lannike (Base 10). Spirit Rune to reach Varanik's mind after combat (Challenging 15). Hears Idrima as subterranean language.

---

### 1.6 — Danakos, Son of Egrost
**Actor type:** NPC | **npcType:** master
**resistanceRating:** 22 | **resistanceLabel:** Hard (22)

**Abilities (enter in notes — NPC sheet):**

| Ability | TN | Notes |
|---|---|---|
| Air Rune (Orlanth Adventurous) | 17 | |
| Sword | 22 | Breakout +5 |
| Tactics | 20 | Breakout +3 |
| Death Rune | 17 | |
| Heortling Warrior | 17 | |
| Hate (Colymar / Ernaldori) | 25 (5M) | |
| Fanaticism (spirit magic) | +5 to one combat roll/scene | |
| Bladesharp (spirit magic) | +3 to sword | makes effective sword 25 |
| Demoralize (spirit magic) | vs. target's best Rune | |

**Resolve Points:** 3 (+1 from Idrima while on sacred ground = 4 effective)

**Notes field:** Idrima's Influence: while on sacred ground and Idrima is active, Danakos has a 4th resolve point. It cannot be removed by combat — only by Idrima withdrawing (when party negotiates with her) or severed directly (Spirit Rune vs. Punishing 5M). Fights without self-preservation. Attacks nearest threat with everything. No tactics, no disengagement — he is being used as a weapon. Remembers everything when Idrima withdraws. Genuine grievance against Colymar (GM detail). Not the villain — the second victim.

---

### 1.7 — Varanik, the Mad Greydog
**Actor type:** NPC | **npcType:** independent
**resistanceRating:** 22 | **resistanceLabel:** Hard (22)

**Abilities:**

| Ability | TN | Notes |
|---|---|---|
| Heortling Warrior | 17 | |
| Sword | 22 | Breakout +5 |
| Air Rune | 13 | |
| Berserk Ferocity | 17 | augments attacks; no hesitation/fear |
| Broken Mind (permanent consequence) | –10 | all social, reasoning, magical actions |

**Resolve Points:** 3

**Notes field:** Attacks immediately, no tactics, does not flee, cannot be negotiated with. Gains +3 on first exchange from surprise unless party was warned. Can be incapacitated but not killed easily — scenario prefers he is brought back to Clearwine Ford. After combat: Vishi's Spirit Rune vs. Challenging (15) reaches his mind — fragments on success (cold woman, she took something, still hungry). On 2+ degree victory: clear image of stone carvings inside tower. Idrima fed on his mind months ago — he was not useful, she just took what she wanted.

---

### 1.8 — Surviving Greydog
**Actor type:** NPC | **npcType:** independent
**resistanceRating:** 13 | **resistanceLabel:** Straightforward (13)

**Abilities:**

| Ability | TN | Notes |
|---|---|---|
| Heortling Warrior | 13 | |
| Honor | 13 | |
| Loyalty (Greydog Clan) | 17 | |
| Shame (active consequence) | –5 | all actions until reparations formally accepted |

**Notes field:** Does not wait to be questioned — approaches first if party is not weapons-drawn, gives full account, offers reparations. Not performing remorse: this is Heortling obligation. Rode with Danakos, present for farmers' deaths, did not strike but did not stop it. Does not understand Idrima's involvement theologically. Willing to return with party and testify. Key resource for Harmast's Clan Lore and Negotiate. Names/positions of dead Greydogs should be recorded — families also owe reparations.

---

### 1.9 — Rock Lizard Pack
**Actor type:** NPC | **npcType:** minion
**resistanceRating:** 17 | **resistanceLabel:** Base (17 as mook group)

**Notes field:** Scene 4. Mook group — one contest, they disengage if cow is made inaccessible. Yanioth's earth elemental works perfectly here (no sacred ground complications yet). Vishi can communicate with rescued cow — it knows where the others are and is extremely upset about the large stone woman.

---

## Phase 2: Supporting Item Documents

These items are created as standalone Items in the compendium for use as
post-adventure rewards or to drag onto character sheets.

### 2.1 — Idrima's Protection (Benefit)
- **Type:** Benefit | **benefitType:** other
- **bonus:** 5
- **description:** Usable when protecting cattle, herds, or grazing communities. Granted by Idrima to the PC who made the devotion offer. Small but will grow with play.

### 2.2 — Devotion (Idrima) (Ability — standalone)
- **Type:** Ability | **abilityType:** standalone
- **rating:** 13
- **description:** Secondary devotion to Idrima, an ancient earth goddess of herd protection. Mechanically functions as any Devotion passion. May support related Rune abilities. Awarded to the PC who sincerely offered devotion at the tower.

### 2.3 — Pre-Heortling Deity Lore (Ability — breakout)
- **Type:** Ability | **abilityType:** breakout
- **breakoutBonus:** +3
- **description:** Breakout under Truth Rune. Awarded to Sorala if she identified Idrima through Ancient Lore. There are other forgotten gods out there.

### 2.4 — Idrima's Blessing (Benefit)
- **Type:** Benefit | **benefitType:** other
- **bonus:** 0
- **description:** Narrative benefit only. The GM should occasionally manifest Idrima's favor tangibly: a herd that should have sickened doesn't, a predator that turns away, a dream that warns of danger to livestock or community.

---

## Phase 3: Journal Entries

All journals use rich text. GM-only content is clearly marked. Player-safe
content can be shared via Foundry's journal sharing. Structure entries in the
following folder hierarchy:

```
📁 The Broken Tower
  📁 GM Reference
    📄 Adventure Overview & Threads
    📄 Resistances Quick Reference
    📄 Rewards & Consequences
    📄 QuestWorlds Mechanics Cheat Sheet
    📄 Idrima — Full GM Notes
  📁 Scenes
    📄 Scene 1: The Call to Action
    📄 Scene 2: The Road into the Badlands
    📄 Scene 3: Lannike's Campsite
    📄 Scene 4: The Rock Lizards
    📄 Scene 5: The Cattle and the Surviving Greydog
    📄 Scene 6: Varanik
    📄 Scene 7: The Tower — Danakos and Idrima
    📄 Scene 8: Aftermath and the Question of Danakos
    📄 Scene 9: The Road Home
  📁 Player Handouts
    📄 Idrima's Stone Carvings (player-safe)
    📄 What Lannike's Ghost Said
```

### Journal Content Notes

**Adventure Overview & Threads** — The three-thread structure (Danakos,
Idrima, Surviving Greydogs), the escalation arc, and the resolution the
scenario points toward. The GM must understand that defeating Idrima is not
the goal; acknowledging her is. This is the most important single document.

**Each Scene journal** should contain:
- Location description (read-aloud or paraphrase)
- Key NPCs present
- Available contests with resistance TNs
- Decision points and branches
- Links to relevant Actor entries

**Resistances Quick Reference** — The full table from the scenario, formatted
for fast lookup at the table. Include both the general resistance scale and the
specific per-scene resistances.

**QuestWorlds Mechanics Cheat Sheet** — Condensed: Simple Contest vs.
Sequence, Augments (+3/+6/–3), Story Points, Degrees of Victory/Defeat and
their narrative penalties (0°=–5, 1°=–10, 2°=–15, 3°=–20, 4°=removed).
Mastery notation. Mook rules (yield after 1 RP lost; named NPCs start with 3).

**Idrima — Full GM Notes** — Her history, motivations, communication style,
what she will and won't do. The difference between proper rite (willing gift,
sincere devotion) and what Danakos was doing (slaughter, compulsion). Running
her as awesome rather than villainous.

---

## Phase 4: Roll Tables

### 4.1 — Degrees of Victory/Defeat

| Roll (d8) | Degree | Meaning | Narrative Penalty |
|---|---|---|---|
| 1–2 | 0° | Victory at a price / defeat with silver lining | –5 |
| 3–4 | 1° | Clear outcome, lasting but manageable | –10 |
| 5–6 | 2° | Significant outcome, lasting days/weeks | –15 |
| 7 | 3° | Major outcome, story-changing | –20 |
| 8 | 4° | Complete victory / total defeat | Removed from scene |

*(Note: this table is for narrative reference, not random generation. In
practice the GM reads the margin of success directly. Build as a display
table, not a mechanical random table.)*

### 4.2 — Resistance Scale Quick Reference

| Roll (d10) | Name | TN |
|---|---|---|
| 1 | Simple / Easy / Routine | 0 |
| 2–3 | Straightforward | 5 |
| 4–5 | Base | 10 |
| 6–7 | Challenging | 15 |
| 8 | Hard | 20 |
| 9 | Punishing | 25 (5M) |
| 10 | Exceptional | 30 (10M) |

---

## Phase 5: Adventure Document Assembly

### 5.1 — system.json Update

Add the compendium pack declaration:

```json
"packs": [
  {
    "name": "broken-tower",
    "label": "The Broken Tower",
    "path": "packs/broken-tower.db",
    "type": "Adventure",
    "system": "questworlds"
  }
]
```

### 5.2 — In-World Build Steps

1. Create all Actors in a folder: `The Broken Tower / Actors`
2. Create all Items in a folder: `The Broken Tower / Items`
3. Create all Journal Entries in the folder hierarchy above
4. Create Roll Tables in a folder: `The Broken Tower / Tables`
5. In the Compendium tab, create the `broken-tower` pack
6. Right-click the pack → Create Adventure Document
7. Name it "The Broken Tower"
8. Drag all folders into the Adventure Document
9. Click **Build Adventure** — Foundry packages everything with internal links preserved
10. Export the compendium to `packs/broken-tower.db` in the repo

### 5.3 — Cross-Reference Links

Use Foundry's `@UUID` linking syntax in journal text to link directly to
Actors and Items. For example, in Scene 6's journal, Varanik's name should
link to his Actor document so the GM can open his sheet without searching.

Format: `@Actor[ActorName]{Display Text}` or full UUID links once documents exist.

---

## Phase 6: QA Checklist

Before the Adventure Document is considered complete:

**Actors**
- [ ] All 5 pregens have correct abilities with breakout bonuses and parent keywords set
- [ ] All pregen flaws entered
- [ ] All NPCs have resistanceRating and resistanceLabel set
- [ ] Resolve Points noted in NPC notes fields
- [ ] GM notes populated for all actors

**Abilities**
- [ ] All keyword/breakout relationships correctly linked (keywordId set)
- [ ] Effective ratings display correctly (keyword + bonus = effective TN)
- [ ] Mastery notation displays correctly (25 → 5M, 30 → 10M, 28 → 8M)

**Journals**
- [ ] All 9 scene journals written
- [ ] All resistance TNs present in scene journals
- [ ] GM-only content clearly marked
- [ ] Player handouts contain no spoilers
- [ ] @UUID links working for all referenced Actors

**Roll Tables**
- [ ] Both tables present and formatted

**Adventure Document**
- [ ] All content dragged into Adventure Document
- [ ] Build Adventure completes without errors
- [ ] Test import into a clean world — all documents appear in correct folders
- [ ] No broken @UUID links after import

---

## Implementation Order

1. **Phase 1** — All 9 Actors (pregens first, then NPCs)
2. **Phase 2** — Reward/consequence Items
3. **Phase 4** — Roll Tables (quick)
4. **Phase 3** — Journal Entries (most time-consuming)
5. **Phase 5** — system.json update, Adventure Document assembly
6. **Phase 6** — QA

**Estimated sessions:** Actors in one focused session; Journals are the bulk
of the work and will take the most time.