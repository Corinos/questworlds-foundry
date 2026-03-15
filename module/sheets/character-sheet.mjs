/**
 * QuestWorlds — Character Sheet (ApplicationV2)
 */

import { EXPIRES_NEXT_CONTEST } from "../helpers/contest.mjs";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class QWCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["questworlds", "sheet", "actor", "character"],
    position: { width: 720, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      itemCreate:             QWCharacterSheet._onItemCreate,
      itemEdit:               QWCharacterSheet._onItemEdit,
      itemDelete:             QWCharacterSheet._onItemDelete,
      abilityRoll:            QWCharacterSheet._onAbilityRoll,
      xpIncrement:            QWCharacterSheet._onXpIncrement,
      xpDecrement:            QWCharacterSheet._onXpDecrement,
      xpAdvance:              QWCharacterSheet._onAdvanceAbility,
      rpIncrement:            QWCharacterSheet._onRpIncrement,
      rpDecrement:            QWCharacterSheet._onRpDecrement,
      storyPointClick:        QWCharacterSheet._onStoryPointClick,
      clearNextContestEffects: QWCharacterSheet._onClearNextContestEffects,
    },
  };

  static PARTS = {
    header:    { template: "systems/questworlds/templates/actors/character-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    abilities: { template: "systems/questworlds/templates/actors/character-abilities.hbs", scrollable: [""] },
    flaws:     { template: "systems/questworlds/templates/actors/character-flaws.hbs",     scrollable: [""] },
    effects:   { template: "systems/questworlds/templates/actors/character-effects.hbs",   scrollable: [""] },
    notes:     { template: "systems/questworlds/templates/actors/character-notes.hbs",     scrollable: [""] },
  };

  /* ------------------------------------------------------------------ */
  /*  Tabs                                                                */
  /* ------------------------------------------------------------------ */

  // tabGroups is inherited from ApplicationV2 and tracks the active tab per group.
  // We declare the default here; Foundry's changeTab() keeps it updated.
  tabGroups = { primary: "abilities" };

  static TABS = {
    primary: {
      tabs: [
        { id: "abilities" },
        { id: "flaws"     },
        { id: "effects"   },
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

    context.actor        = actor;
    context.system       = actor.system;
    context.items        = actor.items;
    context.grouped      = actor.getGroupedAbilities();
    context.consequences = actor.items.filter((i) => i.type === "consequence");
    context.benefits     = actor.items.filter((i) => i.type === "benefit");
    context.config       = CONFIG.QUESTWORLDS ?? {};
    context.isOwner      = actor.isOwner;
    context.isGM         = game.user.isGM;
    context.tabs         = this._prepareTabs("primary");

    context.nextContestEffects = actor.items
      .filter((i) =>
        (i.type === "benefit" || i.type === "consequence") &&
        i.system.expiresOn === EXPIRES_NEXT_CONTEST,
      )
      .map((i) => ({ id: i.id, name: i.name, type: i.type, description: i.system.description }));

    for (const group of context.grouped.keywords) {
      for (const breakout of group.breakouts) {
        breakout.effectiveRating = actor.getEffectiveRating(breakout);
      }
    }

    return context;
  }

  /**
   * Set context.tab for each tab part so the template can use {{tab.cssClass}}.
   * @override
   */
  async _preparePartContext(partId, context) {
    await super._preparePartContext(partId, context);
    const tabParts = ["abilities", "flaws", "effects", "notes"];
    if (tabParts.includes(partId)) {
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

    // Tab switching — Foundry's static TABS handles detection but doesn't
    // switch single-template panels, so we drive the DOM directly.
    html.querySelectorAll(".sheet-tabs .item[data-tab]").forEach((navEl) => {
      navEl.addEventListener("click", () => {
        const tabId = navEl.dataset.tab;
        this.tabGroups.primary = tabId;

        html.querySelectorAll(".sheet-tabs .item[data-tab]").forEach((el) =>
          el.classList.toggle("active", el.dataset.tab === tabId)
        );
        html.querySelectorAll(".sheet-body .tab[data-tab]").forEach((el) =>
          el.classList.toggle("active", el.dataset.tab === tabId)
        );
      });
    });

    // Inline editing
    html.querySelectorAll(".inline-name, .inline-rating").forEach((el) =>
      el.addEventListener("change", this._onInlineEdit.bind(this)),
    );
  // Portrait click to edit
    html.querySelector(".profile-img")?.addEventListener("click", () => {
      const fp = new FilePicker({
        type: "image",
        current: this.actor.img,
        callback: async (path) => {
        await this.actor.update({ img: path });
        this.render();
      },
      });
      fp.browse();
    });
    // Drag-to-reorder
    html.querySelectorAll("[draggable=true]").forEach((el) => {
      el.addEventListener("dragstart", this._onDragStart.bind(this));
      el.addEventListener("dragover",  this._onDragOver.bind(this));
      el.addEventListener("dragleave", this._onDragLeave.bind(this));
      el.addEventListener("drop",      this._onDropRow.bind(this));
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Static action handlers (bound via DEFAULT_OPTIONS.actions)         */
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

    return this.actor.createEmbeddedDocuments("Item", [itemData]);
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
    const itemId = target.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await game.questworlds.openContestDialog(this.actor, item);
  }

  static async _onXpIncrement() {
    await this.actor.update({ "system.experience.value": this.actor.system.experience.value + 1 });
  }

  static async _onXpDecrement() {
    const newValue = Math.max(0, this.actor.system.experience.value - 1);
    await this.actor.update({ "system.experience.value": newValue });
  }

  static async _onRpIncrement() {
    const current = this.actor.system.resolutionPoints.value ?? 0;
    const max     = this.actor.system.resolutionPoints.max   ?? 0;
    await this.actor.update({ "system.resolutionPoints.value": Math.min(max, current + 1) });
  }

  static async _onRpDecrement() {
    const current = this.actor.system.resolutionPoints.value ?? 0;
    await this.actor.update({ "system.resolutionPoints.value": Math.max(0, current - 1) });
  }

  static async _onStoryPointClick(event, target) {
    const value = Number(target.dataset.value);
    if (Number.isNaN(value)) return;
    await this.actor.update({ "system.storyPoints.value": value });
  }

  static async _onClearNextContestEffects() {
    if (!(game.user.isGM || this.actor.isOwner)) return;

    const toRemove = this.actor.items
      .filter((i) =>
        (i.type === "benefit" || i.type === "consequence") &&
        i.system.expiresOn === EXPIRES_NEXT_CONTEST,
      )
      .map((i) => i.id);

    if (!toRemove.length) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("QUESTWORLDS.NextContestEffects.ClearTitle") },
      content: `<p>${game.i18n.localize("QUESTWORLDS.NextContestEffects.ClearPrompt")}</p>`,
      yes: { label: game.i18n.localize("QUESTWORLDS.NextContestEffects.ClearConfirm") },
      no:  { label: game.i18n.localize("QUESTWORLDS.NextContestEffects.ClearCancel") },
      defaultYes: false,
    });

    if (!confirmed) return;
    await this.actor.deleteEmbeddedDocuments("Item", toRemove);
  }

  static async _onAdvanceAbility() {
    const actor = this.actor;
    const xp    = actor.system.experience.value ?? 0;
    const cost  = 10;
    const bump  = 5;

    if (xp < cost) {
      ui.notifications.warn(game.i18n.localize("QUESTWORLDS.Advancement.NotEnoughXp"));
      return;
    }

    const abilities      = actor.items.filter((i) => i.type === "ability");
    const keywords       = abilities.filter((i) => i.system.abilityType === "keyword");
    const abilityOptions = abilities.map((a) => `<option value="${a.id}">${a.name}</option>`).join("");
    const keywordOptions = keywords.map((k)  => `<option value="${k.id}">${k.name}</option>`).join("");

    const updateXp = () => actor.update({
      "system.experience.value":    xp - cost,
      "system.experience.advances": (actor.system.experience.advances ?? 0) + 1,
    });

    // DialogV2 with a form
    await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("QUESTWORLDS.Advancement.Title") },
      content: `
        <div class="form-group">
          <label>${game.i18n.localize("QUESTWORLDS.Advancement.ActionLabel")}</label>
          <select name="action">
            <option value="raise">${game.i18n.localize("QUESTWORLDS.Advancement.Action.Raise")}</option>
            <option value="breakout">${game.i18n.localize("QUESTWORLDS.Advancement.Action.Breakout")}</option>
            <option value="standalone">${game.i18n.localize("QUESTWORLDS.Advancement.Action.Standalone")}</option>
            <option value="keyword">${game.i18n.localize("QUESTWORLDS.Advancement.Action.Keyword")}</option>
          </select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("QUESTWORLDS.Advancement.ChooseAbility")}</label>
          <select name="ability">${abilityOptions}</select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("QUESTWORLDS.Advancement.ChooseKeyword")}</label>
          <select name="keyword">${keywordOptions}</select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("QUESTWORLDS.Advancement.NewName")}</label>
          <input name="name" type="text" />
        </div>
      `,
      ok: {
        label: game.i18n.localize("QUESTWORLDS.Advancement.Advance"),
        icon:  "fas fa-level-up-alt",
        callback: async (event, button) => {
          const form    = button.form;
          const action  = form.elements.action.value;
          const abilityId = form.elements.ability.value;
          const keywordId = form.elements.keyword.value;
          const name    = (form.elements.name.value || "").trim();

          if (action === "raise") {
            const ability = actor.items.get(abilityId);
            if (!ability) return;
            const newRating = Math.min(100, (ability.system?.rating ?? 0) + bump);
            await Promise.all([updateXp(), ability.update({ "system.rating": newRating })]);
            ui.notifications.info(game.i18n.format("QUESTWORLDS.Advancement.Result", { name: ability.name, cost, newRating }));

          } else if (action === "breakout") {
            const keyword = actor.items.get(keywordId);
            if (!keyword) { ui.notifications.warn(game.i18n.localize("QUESTWORLDS.Advancement.NoKeywords")); return; }
            if (!name)    { ui.notifications.warn(game.i18n.localize("QUESTWORLDS.Advancement.EnterName"));  return; }
            await Promise.all([
              updateXp(),
              actor.createEmbeddedDocuments("Item", [{ name, type: "ability", system: { rating: 13, abilityType: "breakout", keywordId: keyword.id, breakoutBonus: bump } }]),
            ]);
            ui.notifications.info(game.i18n.format("QUESTWORLDS.Advancement.Created", { name, cost }));

          } else if (action === "standalone") {
            if (!name) { ui.notifications.warn(game.i18n.localize("QUESTWORLDS.Advancement.EnterName")); return; }
            await Promise.all([
              updateXp(),
              actor.createEmbeddedDocuments("Item", [{ name, type: "ability", system: { rating: 13, abilityType: "standalone" } }]),
            ]);
            ui.notifications.info(game.i18n.format("QUESTWORLDS.Advancement.Created", { name, cost }));

          } else if (action === "keyword") {
            if (!name) { ui.notifications.warn(game.i18n.localize("QUESTWORLDS.Advancement.EnterName")); return; }
            await Promise.all([
              updateXp(),
              actor.createEmbeddedDocuments("Item", [{ name, type: "ability", system: { rating: 13, abilityType: "keyword" } }]),
            ]);
            ui.notifications.info(game.i18n.format("QUESTWORLDS.Advancement.Created", { name, cost }));
          }
        },
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Inline editing (not wired via actions — uses change event)         */
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

  /* ------------------------------------------------------------------ */
  /*  Drag-to-reorder                                                     */
  /* ------------------------------------------------------------------ */

  /** @type {string|null} */
  _draggedItemId = null;
  /** @type {HTMLElement|null} */
  _dragSourceContainer = null;

  _onDragStart(event) {
    const row = event.currentTarget;
    this._draggedItemId       = row.dataset.itemId;
    this._dragSourceContainer = row.closest("[data-sort-container]");

    if (event.dataTransfer) {
      event.dataTransfer.setData("text/plain", this._draggedItemId);
      event.dataTransfer.effectAllowed = "move";
    }
  }

  _onDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add("drag-over");
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  _onDragLeave(event) {
    event.currentTarget.classList.remove("drag-over");
  }

  async _onDropRow(event) {
    event.preventDefault();
    const targetRow    = event.currentTarget;
    const dropContainer = targetRow.closest("[data-sort-container]");
    if (!dropContainer || dropContainer !== this._dragSourceContainer) return;

    const draggedId = this._draggedItemId || event.dataTransfer?.getData("text/plain");
    if (!draggedId) return;

    const targetChild = targetRow.closest("[data-item-id]");
    if (!targetChild || !dropContainer.contains(targetChild)) return;

    const children      = Array.from(dropContainer.children).filter((c) => c.dataset?.itemId);
    const draggedElement = dropContainer.querySelector(`[data-item-id="${draggedId}"]`);
    if (!draggedElement) return;

    const draggedIndex = children.indexOf(draggedElement);
    const targetIndex  = children.indexOf(targetChild);
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const reordered = [...children];
    const [moved]   = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updates = reordered.map((el, i) => ({ _id: el.dataset.itemId, sort: i * 100 }));
    await this.actor.updateEmbeddedDocuments("Item", updates);

    targetChild.classList.remove("drag-over");
  }
}
