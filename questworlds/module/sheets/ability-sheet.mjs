/**
 * QuestWorlds — Ability / Item Sheet (stub for Phase 3)
 */
export class QWAbilitySheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["questworlds", "sheet", "item"],
      template: "systems/questworlds/templates/items/ability-sheet.hbs",
      width: 480,
      height: 360,
    });
  }

  getData() {
    const context  = super.getData();
    context.system = this.item.system;
    context.config = CONFIG.QUESTWORLDS ?? {};
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}
