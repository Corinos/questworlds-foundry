/**
 * QuestWorlds — Character Sheet
 * Full implementation in Phase 3. This stub ensures the system loads cleanly.
 */
export class QWCharacterSheet extends ActorSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["questworlds", "sheet", "actor", "character"],
      template: "systems/questworlds/templates/actors/character-sheet.hbs",
      width: 720,
      height: 680,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "abilities",
        },
      ],
      scrollY: [".abilities-list", ".notes-tab"],
    });
  }

  /** @inheritDoc */
  getData() {
    const context = super.getData();
    const actor   = this.actor;

    // Make system data available at top level for easier template access
    context.system      = actor.system;
    context.items       = actor.items;
    context.grouped     = actor.getGroupedAbilities();
    context.consequences = actor.items.filter((i) => i.type === "consequence");
    context.benefits     = actor.items.filter((i) => i.type === "benefit");
    context.config      = CONFIG.QUESTWORLDS ?? {};
    context.isOwner     = actor.isOwner;
    context.isGM        = game.user.isGM;

    // Annotate each breakout with its actor-derived effectiveRating so
    // templates can use breakout.effectiveRating directly without reaching
    // into actor internals or calling a helper method from HBS.
    for (const group of context.grouped.keywords) {
      for (const breakout of group.breakouts) {
        breakout.effectiveRating = actor.getEffectiveRating(breakout);
      }
    }

    return context;
  }

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Item CRUD (wired up fully in Phase 3)
    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));

    // Inline editing
    html.find(".inline-name").change(this._onInlineEdit.bind(this));
    html.find(".inline-rating").change(this._onInlineEdit.bind(this));

    // Story points
    html.find(".sp-pip").click(this._onStoryPointClick.bind(this));

    // XP / Advances controls
    html.find(".xp-increment").click(this._onXpIncrement.bind(this));
    html.find(".xp-decrement").click(this._onXpDecrement.bind(this));

    // Roll placeholder
    html.find(".ability-roll").click(this._onAbilityRoll.bind(this));

    // Drag-to-reorder
    html.find("[draggable=true]").on("dragstart", this._onDragStart.bind(this));
    html.find("[draggable=true]").on("dragover", this._onDragOver.bind(this));
    html.find("[draggable=true]").on("dragleave", this._onDragLeave.bind(this));
    html.find("[draggable=true]").on("drop", this._onDropRow.bind(this));
  }

  /** @type {string?} */
  _draggedItemId = null;
  /** @type {HTMLElement?} */
  _dragSourceContainer = null;

  _onDragStart(event) {
    const row = event.currentTarget;
    this._draggedItemId = row.dataset.itemId;
    this._dragSourceContainer = row.closest("[data-sort-container]");

    const dataTransfer = event.originalEvent?.dataTransfer;
    if (dataTransfer) {
      dataTransfer.setData("text/plain", this._draggedItemId);
      dataTransfer.effectAllowed = "move";
    }
  }

  _onDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add("drag-over");
    const dataTransfer = event.originalEvent?.dataTransfer;
    if (dataTransfer) dataTransfer.dropEffect = "move";
  }

  _onDragLeave(event) {
    event.currentTarget.classList.remove("drag-over");
  }

  async _onDropRow(event) {
    event.preventDefault();
    const targetRow = event.currentTarget;
    const dropContainer = targetRow.closest("[data-sort-container]");
    if (!dropContainer || dropContainer !== this._dragSourceContainer) return;

    const draggedId =
      this._draggedItemId || event.originalEvent?.dataTransfer?.getData("text/plain");
    if (!draggedId) return;

    const targetChild = targetRow.closest("[data-item-id]");
    if (!targetChild || !dropContainer.contains(targetChild)) return;

    const children = Array.from(dropContainer.children).filter(
      (child) => child.dataset?.itemId,
    );

    const draggedElement = dropContainer.querySelector(`[data-item-id="${draggedId}"]`);
    if (!draggedElement) return;

    const draggedIndex = children.findIndex((c) => c === draggedElement);
    const targetIndex = children.findIndex((c) => c === targetChild);
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const reordered = [...children];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updates = reordered.map((el, index) => ({
      _id: el.dataset.itemId,
      sort: index * 100,
    }));

    await this.actor.updateEmbeddedDocuments("Item", updates);

    // Cleanup visual state
    targetChild?.classList.remove("drag-over");
  }

  async _onXpIncrement() {
    await this.actor.update({ "system.experience.value": this.actor.system.experience.value + 1 });
  }

  async _onXpDecrement() {
    const newValue = Math.max(0, this.actor.system.experience.value - 1);
    await this.actor.update({ "system.experience.value": newValue });
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

    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  async _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest("[data-item-id]")?.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    item?.sheet.render(true);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest("[data-item-id]")?.dataset.itemId;
    const item   = this.actor.items.get(itemId);
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

      // Fallback: update rating directly
      await this.actor.updateEmbeddedDocuments("Item", [
        { _id: itemId, "system.rating": value },
      ]);
      return;
    }

    await this.actor.updateEmbeddedDocuments("Item", [
      { _id: itemId, [field]: value },
    ]);
  }

  async _onStoryPointClick(event) {
    const value = Number(event.currentTarget.dataset.value);
    if (Number.isNaN(value)) return;
    await this.actor.update({ "system.storyPoints.value": value });
  }

  async _onAbilityRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    await game.questworlds.openContestDialog(this.actor, item);
  }
}

