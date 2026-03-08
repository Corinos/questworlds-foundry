# QuestWorlds Packs

This folder is intended to contain Foundry Compendium packs (`.db` files) for QuestWorlds.

## Creating Compendium Packs

Foundry uses SQLite `.db` files for compendia. This repository does not ship prebuilt `.db` packs, but you can create them inside your world using the built-in seed helpers.

### Option 1: Create content in your World
1. Start Foundry and open your world.
2. Open the Console (F12) and run:

```js
// Creates a help journal entry
await game.questworlds.createHelpJournal();

// Creates a few sample characters in the Actors directory
await game.questworlds.createSampleCharacters();

// Creates a blank character template actor
await game.questworlds.createBlankCharacterTemplate();
```

### Option 2: Create a compendium manually
1. In Foundry, open **Collections → Compendiums**.
2. Create a new Compendium for Actors/Journal Entries.
3. Drag the seeded actors/journals into the compendium.

---

If you want to distribute a `.db` pack, you can generate it from an existing Foundry world (the `.db` file is located in `Data/packs/`).
