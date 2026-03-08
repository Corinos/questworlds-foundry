/**
 * QuestWorlds — QWItem
 * Extends the base Foundry Item document.
 */
export class QWItem extends Item {

  /** @inheritDoc */
  prepareData() {
    super.prepareData();
  }

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
  }

  /* ---------------------------------------------------------------- */
  /*  Chat Message helper                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Display the item description in chat.
   */
  async displayInChat() {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const label   = `[${game.i18n.localize(`QUESTWORLDS.ItemType.${this.type}`)}] ${this.name}`;

    await ChatMessage.create({
      speaker,
      flavor: label,
      content: this.system.description ?? "",
    });
  }
}
