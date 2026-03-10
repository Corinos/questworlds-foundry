/**
 * QuestWorlds — NPC Sheet (ApplicationV2)
 */
import { masteryCount } from "../helpers/handlebars.mjs";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class QWNpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["questworlds", "sheet", "actor", "npc"],
    position: { width: 520, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      itemCreate:  QWNpcSheet._onItemCreate,
      itemEdit:    QWNpcSheet._onItemEdit,
      itemDelete:  QWNpcSheet._onItemDelete,
      abilityRoll: QWNpcSheet._onAbilityRoll,
    },
  };

  static PARTS = {
    sheet: {
      template: "systems/questworlds/templates/actors/npc-sheet.hbs",
      scrollable: [".abilities-list", ".notes-tab"],
    },
  };

  tabGroups = { primary: "abilities" };

  _getTabs() {
    return {
      abilities: { id: "abilities", group: "primary", label: "QUESTWORLDS.TabAbilities", active: this.tabGroups.primary === "abilities", cssClass: this.tabGroups.primary === "abilities" ? "active" : "" },
      notes:     { id: "notes",     group: "primary", label: "QUESTWORLDS.TabNotes",     active: this.tabGroups.primary === "notes",     cssClass: this.tabGroups.primary === "notes"     ? "active" : "" },
    };
  }

  async _prepareContext(options) {
    const context  = await super._prepareContext(options);
    context.system  = this.actor.system;
    context.items   = this.actor.items;
    context.grouped = this.actor.getGroupedAbilities();
    context.isOwner = this.actor.isOwner;
    context.isGM    = game.user.isGM;
    context.tabs    = this._getTabs();
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll(".inline-name, .inline-rating").forEach((el) =>
      el.addEventListener("change", this._onInlineEdit.bind(this)),
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Actions                                                             */
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

    const heroActor    = controlled.actor;
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
            <select name="heroAbility">${options}</select>
          </div>
        `,
        ok: {
          label: game.i18n.localize("QUESTWORLDS.Confirm"),
          callback: (event, button) => {
            const chosenId = button.form.elements.heroAbility.value;
            return heroAbilities.find((a) => a.id === chosenId) ?? null;
          },
        },
      });
    }

    if (!heroAbility) return;

    const oppositionMasteries = masteryCount(ability.system.rating);
    await game.questworlds.openContestDialog(heroActor, heroAbility, {
      defaultResistance:           this.actor.system.resistanceRating,
      defaultOppositionMasteries:  oppositionMasteries,
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
    if (isNaN(value) && input.type === "number") return;

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
