/**
 * QuestWorlds — NPC Sheet (stub for Phase 1)
 */
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
  }
}
