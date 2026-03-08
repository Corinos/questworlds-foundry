/**
 * QuestWorlds — Seed Content UI
 *
 * Provides a small UI for GMs to create sample characters, a blank character
 * template, a help journal entry, and install default macros.
 */

import { createHelpJournal, createSampleCharacters, createBlankCharacterTemplate } from "../helpers/seed-content.mjs";

export class SeedContentApp extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "questworlds-seed-content",
      template: "systems/questworlds/templates/apps/seed-content.hbs",
      title: game.i18n.localize("QUESTWORLDS.SeedMenu.Name"),
      width: 520,
      height: "auto",
      resizable: true,
      minimizable: true,
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='create-samples']").on("click", async () => {
      await createSampleCharacters();
    });

    html.find("[data-action='create-template']").on("click", async () => {
      await createBlankCharacterTemplate();
    });

    html.find("[data-action='create-help']").on("click", async () => {
      await createHelpJournal();
    });

    html.find("[data-action='create-macros']").on("click", async () => {
      if (!game.questworlds?.createDefaultMacros) return;
      await game.questworlds.createDefaultMacros();
    });
  }
}
