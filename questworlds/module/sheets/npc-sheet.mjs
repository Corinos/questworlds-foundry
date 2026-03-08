/**
 * QuestWorlds — NPC Sheet
 *
 * This sheet supports GM-facing tools such as rolling opposition contests and
 * building NPC ability lists for use in group contests.
 */
import { masteryCount } from "../helpers/handlebars.mjs";

export class QWNpcSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["questworlds", "sheet", "actor", "npc"],
      template: "systems/questworlds/templates/actors/npc-sheet.hbs",
      width: 520,
      height: 620,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "abilities" }],
      scrollY: [".abilities-list", ".notes-tab"],
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.actor.system;
    context.items = this.actor.items;
    context.grouped = this.actor.getGroupedAbilities();
    context.isOwner = this.actor.isOwner;
    context.isGM = game.user.isGM;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Item CRUD / editing
    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".inline-name").change(this._onInlineEdit.bind(this));
    html.find(".inline-rating").change(this._onInlineEdit.bind(this));

    // Roll as opposition (GM-facing)
    html.find(".ability-roll").click(this._onAbilityRoll.bind(this));
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type ?? "ability";
    const abilityType = event.currentTarget.dataset.abilityType;
    const keywordId = event.currentTarget.dataset.keywordId;

    const itemData = {
      name: game.i18n.format("QUESTWORLDS.NewItem", { type }),
      type,
    };

    if (type === "ability") {
      itemData.system = {
        abilityType: abilityType ?? "standalone",
        keywordId: keywordId ?? "",
      };
    }

    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  async _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    item?.sheet.render(true);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) await item.delete();
  }

  async _onInlineEdit(event) {
    const input = event.currentTarget;
    const itemId = input.dataset.itemId;
    const field = input.dataset.field;
    if (!itemId || !field) return;

    const value = input.type === "number" ? Number(input.value) : input.value;
    if (isNaN(value) && input.type === "number") return;

    // Special handling: editing a breakout's effective rating updates the bonus
    if (field === "effectiveRating") {
      const item = this.actor.items.get(itemId);
      if (!item || item.type !== "ability") return;

      if (item.system.abilityType === "breakout") {
        const keyword = this.actor.items.get(item.system.keywordId);
        const baseRating = keyword?.system?.rating ?? 0;
        const desiredRating = Number(value);
        const bonus = Math.max(0, desiredRating - baseRating);
        await this.actor.updateEmbeddedDocuments("Item", [
          { _id: itemId, "system.breakoutBonus": bonus },
        ]);
        return;
      }

      await this.actor.updateEmbeddedDocuments("Item", [
        { _id: itemId, "system.rating": value },
      ]);
      return;
    }

    await this.actor.updateEmbeddedDocuments("Item", [
      { _id: itemId, [field]: value },
    ]);
  }

  async _onAbilityRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const ability = this.actor.items.get(itemId);
    if (!ability) return;

    const controlled = canvas.tokens.controlled?.[0];
    if (!controlled || !controlled.actor) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.NpcSheet.SelectHeroToken"));
      return;
    }

    const heroActor = controlled.actor;
    const heroAbilities = heroActor.items.filter((i) => i.type === "ability");
    if (!heroAbilities.length) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.NpcSheet.HeroNoAbilities"));
      return;
    }

    const selectHeroAbility = async () => {
      if (heroAbilities.length === 1) return heroAbilities[0];
      return await new Promise((resolve) => {
        const options = heroAbilities
          .map((a) => `<option value="${a.id}">${a.name} (${a.system.rating})</option>`) 
          .join("");
        const content = `
          <p>${game.i18n.localize("QUESTWORLDS.NpcSheet.SelectHeroAbility")}</p>
          <div class="form-group">
            <label>${game.i18n.localize("QUESTWORLDS.NpcSheet.HeroAbility")}</label>
            <select id="hero-ability">${options}</select>
          </div>
        `;
        new Dialog({
          title: game.i18n.localize("QUESTWORLDS.NpcSheet.SelectHeroAbilityTitle"),
          content,
          buttons: {
            confirm: {
              icon: "fas fa-check",
              label: game.i18n.localize("QUESTWORLDS.Confirm"),
              callback: (html) => {
                const chosenId = html.find("#hero-ability").val();
                resolve(heroAbilities.find((a) => a.id === chosenId));
              },
            },
            cancel: {
              icon: "fas fa-times",
              label: game.i18n.localize("QUESTWORLDS.Cancel"),
              callback: () => resolve(null),
            },
          },
          default: "confirm",
          close: () => resolve(null),
        }).render(true);
      });
    };

    const heroAbility = await selectHeroAbility();
    if (!heroAbility) return;

    const oppositionMasteries = masteryCount(ability.system.rating);

    await game.questworlds.openContestDialog(heroActor, heroAbility, {
      defaultResistance: this.actor.system.resistanceRating,
      defaultOppositionMasteries: oppositionMasteries,
    });
  }
}
