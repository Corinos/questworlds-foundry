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
  const major = Number(game.version?.split?.[0] ?? 0);
  if (major && major !== 13) {
    ui.notifications.warn(
      `QuestWorlds is designed for Foundry V13; running on V${game.version}. Some features may not work as expected.`,
    );
  }

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

  // Socket handler for player requests (rerolls, RP application) when they lack ownership.
  if (game.user.isGM) {
    game.socket.on("system.questworlds", async (payload) => {
      if (!payload || payload.type !== "questworlds") return;

      if (payload.action === "reroll") {
        const actor = game.actors.get(payload.actorId);
        const ability = actor?.items.get(payload.abilityId);
        if (!actor || !ability) return;
        await runContest({
          actor,
          abilityItem: ability,
          resistance: payload.resistance,
          oppositionMasteries: payload.oppositionMasteries,
          spendStoryPoint: true,
        });
      }

      if (payload.action === "applyRp") {
        const actor = game.actors.get(payload.actorId);
        if (!actor) return;

        const current = actor.system.resolutionPoints?.value ?? 0;
        const max = actor.system.resolutionPoints?.max ?? 0;
        const next = Math.min(max, Math.max(0, current + payload.rpDelta));
        const updatedActor = await actor.update({ "system.resolutionPoints.value": next });

        ui.notifications.info(
          `${actor.name} ${payload.rpDelta >= 0 ? "gains" : "loses"} ${Math.abs(
            payload.rpDelta,
          )} RP (now ${next}/${max})`,
        );

        const endedType =
          max > 0 && next >= max
            ? "Success"
            : payload.rpDelta < 0 && current > 0 && next === 0
            ? "Failure"
            : null;

        if (endedType) {
          const outcomeKey = payload.outcomeKey || "";
          const quality =
            endedType === "Success"
              ? outcomeKey === "CompleteVictory"
                ? "StrongSuccess"
                : "WeakSuccess"
              : outcomeKey === "CompleteDefeat"
              ? "StrongFailure"
              : "WeakFailure";

          const message = game.i18n.localize(`QUESTWORLDS.Sequence.${quality}`);
          await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: updatedActor }),
            content: `<div class="questworlds-sequence-end questworlds-sequence-end--${endedType.toLowerCase()}">${message} (${next}/${max})</div>`,
          });

          const effectDefinitions = {
            StrongSuccess: {
              type: "benefit",
              name: game.i18n.localize("QUESTWORLDS.SequenceEffect.Name.StrongSuccess"),
              system: {
                bonus: 6,
                benefitType: "victory",
                expiresOn: "nextContest",
                description: game.i18n.localize(
                  "QUESTWORLDS.SequenceEffect.Description.StrongSuccess",
                ),
              },
            },
            WeakSuccess: {
              type: "benefit",
              name: game.i18n.localize("QUESTWORLDS.SequenceEffect.Name.WeakSuccess"),
              system: {
                bonus: 3,
                benefitType: "victory",
                expiresOn: "nextContest",
                description: game.i18n.localize(
                  "QUESTWORLDS.SequenceEffect.Description.WeakSuccess",
                ),
              },
            },
            WeakFailure: {
              type: "consequence",
              name: game.i18n.localize("QUESTWORLDS.SequenceEffect.Name.WeakFailure"),
              system: {
                severity: 1,
                source: game.i18n.localize("QUESTWORLDS.SequenceEffect.Source"),
                expiresOn: "nextContest",
                description: game.i18n.localize(
                  "QUESTWORLDS.SequenceEffect.Description.WeakFailure",
                ),
              },
            },
            StrongFailure: {
              type: "consequence",
              name: game.i18n.localize("QUESTWORLDS.SequenceEffect.Name.StrongFailure"),
              system: {
                severity: 2,
                source: game.i18n.localize("QUESTWORLDS.SequenceEffect.Source"),
                expiresOn: "nextContest",
                description: game.i18n.localize(
                  "QUESTWORLDS.SequenceEffect.Description.StrongFailure",
                ),
              },
            },
          };

          const effectDef = effectDefinitions[quality];
          if (effectDef) {
            await updatedActor.createEmbeddedDocuments("Item", [effectDef]);
            await ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: updatedActor }),
              content: `<div class="questworlds-sequence-end questworlds-sequence-end--${endedType.toLowerCase()}">${game.i18n.localize(
                "QUESTWORLDS.SequenceEffect.Applied",
              )} ${effectDef.name}.</div>`,
            });
          }
        }
      }
    });
  }

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

      if (game.user.isGM || actor.isOwner) {
        await runContest({
          actor,
          abilityItem,
          resistance,
          oppositionMasteries,
          spendStoryPoint: true,
        });
      } else {
        game.socket.emit("system.questworlds", {
          type: "questworlds",
          action: "reroll",
          actorId,
          abilityId,
          resistance,
          oppositionMasteries,
        });
        ui.notifications.info(game.i18n.localize("QUESTWORLDS.Notifications.RequestSent"));
      }
    });

    // Allow applying RP from the contest result card
    html.on("click", ".questworlds-apply-rp", async (event) => {
      event.preventDefault();
      const button = $(event.currentTarget);
      const actorId = button.data("actor-id");
      const rpDelta = Number(button.data("rp-delta")) || 0;
      const outcomeKey = button.data("outcome-key") || "";

      const actor = game.actors.get(actorId);
      if (!actor) return;

      const applyRp = async () => {
        const current = actor.system.resolutionPoints?.value ?? 0;
        const max = actor.system.resolutionPoints?.max ?? 0;
        const next = Math.min(max, Math.max(0, current + rpDelta));
        const updatedActor = await actor.update({ "system.resolutionPoints.value": next });

        ui.notifications.info(
          `${actor.name} ${rpDelta >= 0 ? "gains" : "loses"} ${Math.abs(rpDelta)} RP (now ${next}/${max})`,
        );

        // If RP hits a boundary, announce the end of the sequence
        const endedType =
          max > 0 && next >= max
            ? "Success"
            : rpDelta < 0 && current > 0 && next === 0
            ? "Failure"
            : null;

        if (endedType) {
          const quality =
            endedType === "Success"
              ? outcomeKey === "CompleteVictory"
                ? "StrongSuccess"
                : "WeakSuccess"
              : outcomeKey === "CompleteDefeat"
              ? "StrongFailure"
              : "WeakFailure";

          const message = game.i18n.localize(`QUESTWORLDS.Sequence.${quality}`);
          await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: updatedActor }),
            content: `<div class="questworlds-sequence-end questworlds-sequence-end--${endedType.toLowerCase()}">${message} (${next}/${max})</div>`,
          });

          const effectDefinitions = {
            StrongSuccess: {
              type: "benefit",
              name: game.i18n.localize("QUESTWORLDS.SequenceEffect.Name.StrongSuccess"),
              system: {
                bonus: 6,
                benefitType: "victory",
                expiresOn: "nextContest",
                description: game.i18n.localize(
                  "QUESTWORLDS.SequenceEffect.Description.StrongSuccess",
                ),
              },
            },
            WeakSuccess: {
              type: "benefit",
              name: game.i18n.localize("QUESTWORLDS.SequenceEffect.Name.WeakSuccess"),
              system: {
                bonus: 3,
                benefitType: "victory",
                expiresOn: "nextContest",
                description: game.i18n.localize(
                  "QUESTWORLDS.SequenceEffect.Description.WeakSuccess",
                ),
              },
            },
            WeakFailure: {
              type: "consequence",
              name: game.i18n.localize("QUESTWORLDS.SequenceEffect.Name.WeakFailure"),
              system: {
                severity: 1,
                source: game.i18n.localize("QUESTWORLDS.SequenceEffect.Source"),
                expiresOn: "nextContest",
                description: game.i18n.localize(
                  "QUESTWORLDS.SequenceEffect.Description.WeakFailure",
                ),
              },
            },
            StrongFailure: {
              type: "consequence",
              name: game.i18n.localize("QUESTWORLDS.SequenceEffect.Name.StrongFailure"),
              system: {
                severity: 2,
                source: game.i18n.localize("QUESTWORLDS.SequenceEffect.Source"),
                expiresOn: "nextContest",
                description: game.i18n.localize(
                  "QUESTWORLDS.SequenceEffect.Description.StrongFailure",
                ),
              },
            },
          };

          const effectDef = effectDefinitions[quality];
          if (effectDef) {
            await updatedActor.createEmbeddedDocuments("Item", [effectDef]);
            await ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: updatedActor }),
              content: `<div class="questworlds-sequence-end questworlds-sequence-end--${endedType.toLowerCase()}">${game.i18n.localize(
                "QUESTWORLDS.SequenceEffect.Applied",
              )} ${effectDef.name}.</div>`,
            });
          }
        }
      };

      if (game.user.isGM || actor.isOwner) {
        await applyRp();
      } else {
        game.socket.emit("system.questworlds", {
          type: "questworlds",
          action: "applyRp",
          actorId,
          rpDelta,
          outcomeKey,
        });
        ui.notifications.info(game.i18n.localize("QUESTWORLDS.Notifications.RequestSent"));
      }
    });
  });
});
