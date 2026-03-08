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
import {
  openContestDialog,
  runContest,
  openGroupContestDialog,
  runGroupContest,
  rollRandomResistance,
} from "./helpers/contest.mjs";
import { createHelpJournal, createSampleCharacters, createBlankCharacterTemplate } from "./helpers/seed-content.mjs";
import { QWSceneTracker } from "./apps/scene-tracker.mjs";
import { SeedContentApp } from "./apps/seed-content-app.mjs";

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

  // System settings
  game.settings.register("questworlds", "defaultResistance", {
    name: "QUESTWORLDS.Settings.DefaultResistance.Name",
    hint: "QUESTWORLDS.Settings.DefaultResistance.Hint",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 1, max: 20, step: 1 },
    default: 14,
  });

  game.settings.register("questworlds", "showResistanceLadder", {
    name: "QUESTWORLDS.Settings.ShowResistanceLadder.Name",
    hint: "QUESTWORLDS.Settings.ShowResistanceLadder.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("questworlds", "enableWageredSequences", {
    name: "QUESTWORLDS.Settings.EnableWageredSequences.Name",
    hint: "QUESTWORLDS.Settings.EnableWageredSequences.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("questworlds", "enableStoryPoints", {
    name: "QUESTWORLDS.Settings.EnableStoryPoints.Name",
    hint: "QUESTWORLDS.Settings.EnableStoryPoints.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.registerMenu("questworlds", "seedContent", {
    name: "QUESTWORLDS.SeedMenu.Name",
    label: "QUESTWORLDS.SeedMenu.Label",
    hint: "QUESTWORLDS.SeedMenu.Hint",
    icon: "fas fa-seedling",
    type: SeedContentApp,
    restricted: true,
  });

  game.settings.register("questworlds", "xpCostPerAdvance", {
    name: "QUESTWORLDS.Settings.XpCostPerAdvance.Name",
    hint: "QUESTWORLDS.Settings.XpCostPerAdvance.Hint",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 100, step: 1 },
    default: 10,
  });

  // Expose system namespace on the global game object for convenience
  function awardXpToSelected(amount = 1) {
    const tokens = canvas.tokens.controlled;
    if (!tokens.length) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.AwardXp.NoToken"));
      return;
    }

    const actors = tokens.map((t) => t.actor).filter((a) => a && a.type === "character");
    if (!actors.length) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.AwardXp.NoActors"));
      return;
    }

    actors.forEach((actor) => {
      const current = actor.system.experience?.value ?? 0;
      actor.update({ "system.experience.value": current + amount });
    });

    ui.notifications.info(
      game.i18n.format("QUESTWORLDS.AwardXp.Notice", { amount, count: actors.length }),
    );
  }

  async function createDefaultMacros({ overwrite = false } = {}) {
    if (!game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.Macros.NotGM"));
      return;
    }

    const definitions = [
      {
        name: "QW: Quick Contest",
        type: "script",
        img: "icons/svg/dice.svg",
        command: "game.questworlds.openContestLauncher();",
      },
      {
        name: "QW: Roll Resistance",
        type: "script",
        img: "icons/svg/d20.svg",
        command: "game.questworlds.rollResistance();",
      },
      {
        name: "QW: Award XP",
        type: "script",
        img: "icons/svg/book.svg",
        command: "game.questworlds.awardXp(1);",
      },
      {
        name: "QW: Scene Tracker",
        type: "script",
        img: "icons/svg/eye.svg",
        command: "game.questworlds.openSceneTracker();",
      },
    ];

    const created = [];
    const updated = [];
    const skipped = [];

    for (const def of definitions) {
      const existing = game.macros.find((m) => m.name === def.name && m.type === "script");
      if (existing) {
        if (overwrite) {
          await existing.update(def);
          updated.push(def.name);
        } else {
          skipped.push(def.name);
        }
        continue;
      }
      await Macro.create(def, { displaySheet: false });
      created.push(def.name);
    }

    const messages = [];
    if (created.length) messages.push(`${created.length} macro(s) created.`);
    if (updated.length) messages.push(`${updated.length} macro(s) updated.`);
    if (skipped.length) messages.push(`${skipped.length} macro(s) skipped (already exist).`);

    ui.notifications.info(
      game.i18n.format("QUESTWORLDS.Macros.CreateResult", {
        message: messages.join(" "),
      }),
    );
  }

  async function openContestLauncher() {
    const tokens = canvas.tokens.controlled;
    if (!tokens.length) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.ContestLauncher.NoToken"));
      return;
    }

    const actor = tokens[0]?.actor;
    if (!actor) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.ContestLauncher.NoToken"));
      return;
    }

    const abilities = actor.items.filter((i) => i.type === "ability");
    if (!abilities.length) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.ContestLauncher.NoAbilities"));
      return;
    }

    const options = abilities
      .map((ability) => `<option value="${ability.id}">${ability.name}</option>`)
      .join("");

    new Dialog({
      title: game.i18n.localize("QUESTWORLDS.ContestLauncher.Title"),
      content: `
        <form>
          <div class="form-group">
            <label>${game.i18n.localize("QUESTWORLDS.ContestLauncher.ChooseAbility")}</label>
            <select name="ability" id="ability">${options}</select>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: "fas fa-dice",
          label: game.i18n.localize("QUESTWORLDS.Roll"),
          callback: (html) => {
            const abilityId = html.find("select[name=ability]").val();
            const ability = actor.items.get(abilityId);
            if (ability) {
              openContestDialog(actor, ability);
            }
          },
        },
        cancel: {
          icon: "fas fa-times",
          label: game.i18n.localize("QUESTWORLDS.Cancel"),
        },
      },
      default: "roll",
    }).render(true);
  }

  game.questworlds = {
    QWActor,
    QWItem,
    openContestDialog,
    openContestLauncher,
    openGroupContestDialog,
    runGroupContest,
    openSceneTracker: () => new QWSceneTracker().render(true),
    openSeedContent: () => new SeedContentApp().render(true),
    rollResistance: () => {
      const result = rollRandomResistance();
      const label = game.i18n.localize(result.label);
      const content = `
        <div class="questworlds-resistance-roll">
          <h2>${game.i18n.localize("QUESTWORLDS.ResistanceRoll.Title")}</h2>
          <p>${game.i18n.format("QUESTWORLDS.ResistanceRoll.Result", {
            resistance: result.value,
            label,
          })}</p>
        </div>
      `;
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content,
      });
    },
    awardXp: awardXpToSelected,
    createDefaultMacros,
    createHelpJournal,
    createSampleCharacters,
    createBlankCharacterTemplate,
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

  // Display a small RP bar on each token's HUD (shows current RP / max RP).
  Hooks.on("renderTokenHUD", (hud, html, data) => {
    const token = canvas.tokens.get(data._id);
    if (!token) return;
    const actor = token.actor;
    if (!actor) return;

    const rp = actor.system.resolutionPoints;
    const value = rp?.value ?? 0;
    const max = rp?.max ?? 0;
    if (typeof value !== "number" || typeof max !== "number" || max <= 0) return;

    const pct = Math.round((value / max) * 100);
    const container = $(
      `<div class="questworlds-token-rp" title="RP: ${value}/${max}">
        <div class="questworlds-token-rp-bar">
          <div class="questworlds-token-rp-fill" style="width: ${pct}%;"></div>
        </div>
        <span class="questworlds-token-rp-label">${value}/${max}</span>
      </div>`,
    );

    html.find(".token-control").append(container);
  });

  // Add QuestWorlds tools to the token controls for GMs.
  Hooks.on("getSceneControlButtons", (controls) => {
    const tokenTools = controls.find((c) => c.name === "token");
    if (!tokenTools) return;

    tokenTools.tools.unshift(
      {
        name: "questworldsSeedContent",
        title: game.i18n.localize("QUESTWORLDS.SeedMenu.Button"),
        icon: "fas fa-seedling",
        onClick: () => game.questworlds.openSeedContent(),
        button: true,
      },
      {
        name: "questworldsSceneTracker",
        title: game.i18n.localize("QUESTWORLDS.SceneTracker.Button"),
        icon: "fas fa-heartbeat",
        onClick: () => game.questworlds.openSceneTracker(),
        button: true,
      },
      {
        name: "questworldsResistanceRoll",
        title: game.i18n.localize("QUESTWORLDS.ResistanceRoll.Button"),
        icon: "fas fa-dice",
        onClick: () => game.questworlds.rollResistance(),
        button: true,
      },
    );
  });

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
