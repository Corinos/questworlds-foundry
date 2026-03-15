---
"questworlds": patch
---

Character sheet migrated to ApplicationV2 multi-part template pattern.

- Split monolithic character-sheet.hbs into six separate part templates (header, tabs, abilities, flaws, effects, notes)
- Fixed tab switching by adopting Foundry's native tab system with static TABS and _prepareTabs()
- Rebuilt header layout using CSS grid to fix form-group height issues
- Rebuilt ability/breakout rows using CSS grid for consistent column alignment
- Added portrait click handler for ApplicationV2
- Fixed inline input backgrounds and text colours