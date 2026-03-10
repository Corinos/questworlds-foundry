/**
 * QuestWorlds — Ability / Item Sheet (ApplicationV2)
 */

const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class QWAbilitySheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["questworlds", "sheet", "item"],
    position: { width: 480, height: 360 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
  };

  static PARTS = {
    sheet: {
      template: "systems/questworlds/templates/items/ability-sheet.hbs",
    },
  };

  async _prepareContext(options) {
    const context  = await super._prepareContext(options);
    context.system = this.item.system;
    context.config = CONFIG.QUESTWORLDS ?? {};
    return context;
  }
}
