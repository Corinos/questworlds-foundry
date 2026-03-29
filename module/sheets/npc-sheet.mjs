/**
 * QuestWorlds — NPC Sheet (ApplicationV2)
 */
import { masteryCount } from "../helpers/handlebars.mjs";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class QWNpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["questworlds", "sheet", "actor", "npc"],
    position: { width: 520, height: 480 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      itemCreate: QWNpcSheet._onItemCreate,
      itemEdit:   QWNpcSheet._onItemEdit,
      itemDelete: QWNpcSheet._onItemDelete,
      abilityRoll: QWNpcSheet._onAbilityRoll,
    },
  };

  static PARTS = {
    header:  { template: "systems/questworlds/templates/actors/npc-header.hbs" },
    tabs:    { template: "templates/generic/tab-navigation.hbs" },
    abilities: { template: "systems/questworlds/templates/actors/npc-abilities.hbs", scrollable: [""] },
    notes:   { template: "systems/questworlds/templates/actors/npc-notes.hbs", scrollable: [""] },
  };

  /* ------------------------------------------------------------------ */
  /*  Tabs                                                                */
  /* ------------------------------------------------------------------ */

  tabGroups = { primary: "abilities" };

  static TABS = {
    primary: {
      tabs: [
        { id: "abilities" },
        { id: "notes"     },
      ],
      labelPrefix: "QUESTWORLDS.Tab",
      initial: "abilities",
    },
  };

  /* ------------------------------------------------------------------ */
  /*  Context                                                             */
  /* ------------------------------------------------------------------ */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor   = this.actor;

    context.actor    = actor;
    context.system   = actor.system;
    context.items    = actor.items;
    context.grouped  = actor.getGroupedAbilities();
    context.isOwner  = actor.isOwner;
    context.isGM     = game.user.isGM;
    context.tabs     = this._prepareTabs("primary");

    return context;
  }

  async _preparePartContext(partId, context) {
    await super._preparePartContext(partId, context);
    if (["abilities", "notes"].includes(partId)) {
      context.tab = context.tabs[partId];
    }
    return context;
  }

  /* ------------------------------------------------------------------ */
  /*  Listeners                                                           */
  /* ------------------------------------------------------------------ */

  _onRender(context, options) {
    super._onRender(context, options);

    const html = this.element;

    // Inline editing
    html.querySelectorAll(".inline-name, .inline-rating").forEach((el) =>
      el.addEventListener("change", this._onInlineEdit.bind(this)),
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Static action handlers                                              */
  /* ------------------------------------------------------------------ */

  static async _onItemCreate(event, target) {
    event.preventDefault();
    const type        = target.dataset.type ?? "ability";
    const abilityType = target.dataset.abilityType;
    const keywordId   = target.dataset.keywordId;

    const itemData = {
      name: game.i18n.format("QUESTWORLDS.NewItem", { type }),
      type,
    };

    if (type === "ability") {
      itemData.system = {
        abilityType: abilityType ?? "standalone",
        keywordId:   keywordId   ?? "",
      };
    }

    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  static async _onItemEdit(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    item?.sheet.render(true);
  }

  static async _onItemDelete(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (item) await item.delete();
  }

  static async _onAbilityRoll(event, target) {
    event.preventDefault();
    const itemId  = target.dataset.itemId;
    const ability = this.actor.items.get(itemId);
    if (!ability) return;

    const controlled = canvas.tokens.controlled?.[0];
    if (!controlled?.actor) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.NpcSheet.SelectHeroToken"));
      return;
    }

    const heroActor     = controlled.actor;
    const heroAbilities = heroActor.items.filter((i) => i.type === "ability");
    if (!heroAbilities.length) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.NpcSheet.HeroNoAbilities"));
      return;
    }

    let heroAbility;
    if (heroAbilities.length === 1) {
      heroAbility = heroAbilities[0];
    } else {
      const options = heroAbilities
        .map((a) => `<option value="${a.id}">${a.name} (${a.system.rating})</option>`)
        .join("");

      heroAbility = await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize("QUESTWORLDS.NpcSheet.SelectHeroAbilityTitle") },
        content: `
          <p>${game.i18n.localize("QUESTWORLDS.NpcSheet.SelectHeroAbility")}</p>
          <div class="form-group">
            <label>${game.i18n.localize("QUESTWORLDS.NpcSheet.HeroAbility")}</label>
            <select id="hero-ability">${options}</select>
          </div>
        `,
        ok: {
          label: game.i18n.localize("QUESTWORLDS.Confirm"),
          callback: (event, button, dialog) => {
            const chosenId = dialog.querySelector("#hero-ability").value;
            return heroAbilities.find((a) => a.id === chosenId) ?? null;
          },
        },
      });
    }

    if (!heroAbility) return;

    const oppositionMasteries = masteryCount(ability.system.rating);
    await game.questworlds.openContestDialog(heroActor, heroAbility, {
      defaultResistance:            this.actor.system.resistanceRating,
      defaultOppositionMasteries:   oppositionMasteries,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Inline editing                                                      */
  /* ------------------------------------------------------------------ */

  async _onInlineEdit(event) {
    const input  = event.currentTarget;
    const itemId = input.dataset.itemId;
    const field  = input.dataset.field;
    if (!itemId || !field) return;

    const value = input.type === "number" ? Number(input.value) : input.value;
    if (input.type === "number" && isNaN(value)) return;

    if (field === "effectiveRating") {
      const item = this.actor.items.get(itemId);
      if (!item || item.type !== "ability") return;
      if (item.system.abilityType === "breakout") {
        const keyword    = this.actor.items.get(item.system.keywordId);
        const baseRating = keyword?.system?.rating ?? 0;
        const bonus      = Math.max(0, Number(value) - baseRating);
        await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.breakoutBonus": bonus }]);
        return;
      }
      await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.rating": value }]);
      return;
    }

    await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, [field]: value }]);
  }
}
