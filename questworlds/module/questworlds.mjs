/**
 * QuestWorlds — Foundry VTT System
 * Main entry point. Registers data models, documents, sheets, and hooks.
 */

import { QWCharacterData, QWNpcData } from "./models/actor-models.mjs";
import { QWAbilityData, QWFlawData, QWBenefitData, QWConsequenceData } from "./models/item-models.mjs";
import { QWActor } from "./documents/actor.mjs";
import { QWItem } from "./documents/item.mjs";
import { QWCharacterSheet } from "./sheets/character-sheet.mjs";
import { QWNpcSheet } from "./sheets/npc-sheet.mjs";
import { QWAbilitySheet } from "./sheets/ability-sheet.mjs";
import { registerHandlebarsHelpers, preloadHandlebarsTemplates } from "./helpers/handlebars.mjs";
import { openContestDialog, runContest } from "./helpers/contest.mjs";

/* ------------------------------------------------------------------ */
/*  Hooks: init                                                          */
/* ------------------------------------------------------------------ */
Hooks.once("init", function () {
  console.log("QuestWorlds | Initialising QuestWorlds system");

  // Expose system namespace on the global game object for convenience
  game.questworlds = {
    QWActor,
    QWItem,
    openContestDialog,
  };

  // ---- Data Models ------------------------------------------------
  CONFIG.Actor.dataModels = {
    character: QWCharacterData,
    npc: QWNpcData,
  };

  CONFIG.Item.dataModels = {
    ability:     QWAbilityData,
    flaw:        QWFlawData,
    benefit:     QWBenefitData,
    consequence: QWConsequenceData,
  };

  // ---- Document Classes -------------------------------------------
  CONFIG.Actor.documentClass = QWActor;
  CONFIG.Item.documentClass  = QWItem;

  // ---- Actor / Item Sheet Classes ---------------------------------
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("questworlds", QWCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "QUESTWORLDS.SheetCharacter",
  });
  Actors.registerSheet("questworlds", QWNpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "QUESTWORLDS.SheetNpc",
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("questworlds", QWAbilitySheet, {
    types: ["ability", "flaw", "benefit", "consequence"],
    makeDefault: true,
    label: "QUESTWORLDS.SheetAbility",
  });

  // ---- Handlebars -------------------------------------------------
  registerHandlebarsHelpers();
  preloadHandlebarsTemplates();

  console.log("QuestWorlds | System initialised successfully");
});

/* ------------------------------------------------------------------ */
/*  Hooks: ready                                                         */
/* ------------------------------------------------------------------ */
Hooks.once("ready", function () {
  console.log("QuestWorlds | Ready");

  // Allow spending a Story Point from the chat card to reroll a contest.
  Hooks.on("renderChatMessage", (message, html) => {
    html.on("click", ".questworlds-reroll", async (event) => {
      event.preventDefault();
      const button = $(event.currentTarget);
      const actorId = button.data("actor-id");
      const abilityId = button.data("ability-id");
      const resistance = Number(button.data("resistance")) || 14;
      const oppositionMasteries = Number(button.data("opposition-masteries")) || 0;

      const actor = game.actors.get(actorId);
      if (!actor) return;
      const abilityItem = actor.items.get(abilityId);
      if (!abilityItem) return;

      await runContest({
        actor,
        abilityItem,
        resistance,
        oppositionMasteries,
        spendStoryPoint: true,
      });
    });
  });
});
