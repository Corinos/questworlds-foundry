/**
 * QuestWorlds — NPC Sheet (stub for Phase 1)
 */
import { masteryCount } from "../helpers/handlebars.mjs";

export class QWNpcSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["questworlds", "sheet", "actor", "npc"],
      template: "systems/questworlds/templates/actors/npc-sheet.hbs",
      width: 480,
      height: 400,
    });
  }

  getData() {
    const context  = super.getData();
    context.system = this.actor.system;
    context.items  = this.actor.items;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".ability-roll").click(this._onAbilityRoll.bind(this));
  }

  async _onAbilityRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const ability = this.actor.items.get(itemId);
    if (!ability) return;

    const controlled = canvas.tokens.controlled?.[0];
    if (!controlled || !controlled.actor) {
      ui.notifications.warn("Select a token (player character) to roll against.");
      return;
    }

    const heroActor = controlled.actor;
    const heroAbility = heroActor.items.find((i) => i.type === "ability");
    if (!heroAbility) {
      ui.notifications.warn("Selected token has no abilities to roll.");
      return;
    }

    const oppositionMasteries = masteryCount(ability.system.rating);

    await game.questworlds.openContestDialog(heroActor, heroAbility, {
      defaultResistance: this.actor.system.resistanceRating,
      defaultOppositionMasteries: oppositionMasteries,
    });
  }
}
