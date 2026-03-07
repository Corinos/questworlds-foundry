/**
 * QuestWorlds — QWActor
 * Extends the base Foundry Actor document with QuestWorlds-specific logic.
 *
 * Tech debt fixes (2026-03-07):
 *
 * 1. effectiveRating is now stored in this._breakoutRatings (a Map keyed by
 *    item ID) rather than mutating item.system directly. TypeDataModel objects
 *    in v12 can be sealed/frozen after initialisation, making direct property
 *    assignment on them unreliable. Callers use actor.getEffectiveRating(item).
 *
 * 2. A _onDeleteDescendantDocuments override detects when a keyword Item is
 *    deleted and immediately demotes all its breakout children to standalone,
 *    clearing their keywordId. This prevents orphaned breakouts from silently
 *    losing their parent rating reference.
 */
export class QWActor extends Actor {

  /** @inheritDoc */
  prepareData() {
    // Initialise the breakout ratings cache before derived data runs
    this._breakoutRatings = new Map();
    super.prepareData();
  }

  /** @inheritDoc */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    const systemData = this.system;

    if (this.type === "character") {
      this._prepareCharacterData(systemData);
    } else if (this.type === "npc") {
      this._prepareNpcData(systemData);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Character preparation                                            */
  /* ---------------------------------------------------------------- */
  _prepareCharacterData(systemData) {
    // Sum penalties from all active consequence items
    let penaltyTotal = 0;
    let bonusTotal   = 0;

    for (const item of this.items) {
      if (item.type === "consequence") penaltyTotal += item.system.penalty ?? 0;
      if (item.type === "benefit")     bonusTotal   += item.system.bonus   ?? 0;
    }

    systemData.penaltyTotal = penaltyTotal;
    systemData.bonusTotal   = bonusTotal;

    // ---- Breakout effective ratings --------------------------------
    // Store derived ratings in this._breakoutRatings (Map<itemId, number>)
    // rather than mutating item.system, which is owned by the DataModel.
    for (const item of this.items) {
      if (item.type !== "ability" || item.system.abilityType !== "breakout") continue;
      if (!item.system.keywordId) continue;

      const keyword = this.items.get(item.system.keywordId);
      if (keyword) {
        const effective = keyword.system.rating + (item.system.breakoutBonus ?? 0);
        this._breakoutRatings.set(item.id, effective);
      }
      // If keyword not found the Map simply has no entry; getEffectiveRating()
      // falls back to the breakout's own stored rating.
    }
  }

  /* ---------------------------------------------------------------- */
  /*  NPC preparation                                                  */
  /* ---------------------------------------------------------------- */
  _prepareNpcData(_systemData) {
    // Nothing complex yet — resistance label is set manually.
  }

  /* ---------------------------------------------------------------- */
  /*  Public helper: safe effective rating lookup                     */
  /* ---------------------------------------------------------------- */

  /**
   * Return the effective (display) rating for any ability item on this actor.
   * For breakouts this is the parent keyword rating + breakoutBonus.
   * For all other abilities it is item.system.rating.
   *
   * @param {Item} item
   * @returns {number}
   */
  getEffectiveRating(item) {
    if (item.system.abilityType === "breakout" && this._breakoutRatings?.has(item.id)) {
      return this._breakoutRatings.get(item.id);
    }
    return item.system.rating;
  }

  /* ---------------------------------------------------------------- */
  /*  Orphan cleanup: demote breakouts when their keyword is deleted  */
  /* ---------------------------------------------------------------- */

  /** @inheritDoc */
  async _onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId) {
    await super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);

    // Only act when Items are deleted from this actor's own item collection
    if (parent !== this || collection !== "items") return;

    // Find IDs of deleted keyword abilities
    const deletedKeywordIds = new Set(
      documents
        .filter(d => d.type === "ability" && d.system.abilityType === "keyword")
        .map(d => d.id)
    );

    if (deletedKeywordIds.size === 0) return;

    // Find all breakouts that referenced one of the deleted keywords
    const orphans = this.items.filter(
      item =>
        item.type === "ability" &&
        item.system.abilityType === "breakout" &&
        deletedKeywordIds.has(item.system.keywordId)
    );

    if (orphans.length === 0) return;

    // Demote orphans to standalone abilities in a single batched update
    const updates = orphans.map(item => ({
      _id: item.id,
      "system.abilityType": "standalone",
      "system.keywordId":   "",
      // Keep breakoutBonus in case the GM re-attaches to a new keyword later,
      // but zero it so the rating is not misleading as a standalone.
      "system.breakoutBonus": 0,
    }));

    console.warn(
      `QuestWorlds | Keyword deleted — demoting ${orphans.length} breakout(s) to standalone:`,
      orphans.map(i => i.name)
    );

    await this.updateEmbeddedDocuments("Item", updates);
  }

  /* ---------------------------------------------------------------- */
  /*  Utility: get all abilities grouped for sheet display            */
  /* ---------------------------------------------------------------- */

  /**
   * Returns abilities grouped as:
   *   { keywords: Array<{item, breakouts}>, standalone: Item[], flaws: Item[] }
   *
   * Each keyword entry includes a `breakouts` array and an `effectiveRating`
   * getter on each breakout (via actor.getEffectiveRating).
   *
   * Because keyword deletion now cleans up orphans synchronously, there should
   * never be orphaned breakouts at render time — but we guard anyway.
   */
  getGroupedAbilities() {
    const keywords   = [];
    const standalone = [];
    const flaws      = [];

    // First pass: keywords and standalone
    for (const item of this.items) {
      if (item.type === "flaw") { flaws.push(item); continue; }
      if (item.type !== "ability") continue;

      if (item.system.abilityType === "keyword") {
        keywords.push({ item, breakouts: [] });
      } else if (item.system.abilityType === "standalone") {
        standalone.push(item);
      }
    }

    // Second pass: attach breakouts to their parent, or demote to standalone
    for (const item of this.items) {
      if (item.type !== "ability" || item.system.abilityType !== "breakout") continue;

      const parentGroup = keywords.find(k => k.item.id === item.system.keywordId);
      if (parentGroup) {
        parentGroup.breakouts.push(item);
      } else {
        // Should not happen after cleanup hook fires, but handle gracefully
        console.warn(`QuestWorlds | Orphaned breakout at render time: "${item.name}" (${item.id})`);
        standalone.push(item);
      }
    }

    return { keywords, standalone, flaws };
  }

  /* ---------------------------------------------------------------- */
  /*  Roll data for inline rolls in text                              */
  /* ---------------------------------------------------------------- */
  getRollData() {
    const data = super.getRollData();
    if (this.type === "character") {
      data.storyPoints  = this.system.storyPoints.value;
      data.penaltyTotal = this.system.penaltyTotal;
      data.bonusTotal   = this.system.bonusTotal;
    }
    return data;
  }
}
