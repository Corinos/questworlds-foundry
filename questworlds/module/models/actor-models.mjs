/**
 * QuestWorlds — Actor Data Models
 *
 * QWCharacterData  — Player Character
 * QWNpcData        — Non-Player Character / Opposition
 *
 * Ratings are stored as raw integers. 
 * e.g. a rating of "5M2" is stored as masteryRating = 45 (5 + 20 + 20).
 * The handlebars helper `qwRating` converts this to display notation.
 *
 * Mastery encoding:  raw = base + (masteries × 20)
 *   1–20   → no mastery (e.g. raw 15 → "15")
 *   21–40  → 1 mastery  (e.g. raw 26 → "6M")
 *   41–60  → 2 masteries(e.g. raw 43 → "3M2")
 */

const { fields } = foundry.data;

// Compatibility shim for Foundry v13 (TypeDataModel renamed/relocated in some builds)
const TypeDataModel =
  foundry.abstract?.TypeDataModel ??
  foundry.data?.TypeDataModel ??
  foundry.data?.DataModel ??
  foundry.abstract?.DataModel ??
  class {};

/* ------------------------------------------------------------------ */
/*  Shared base for both actor types                                    */
/* ------------------------------------------------------------------ */
class QWBaseActorData extends TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Character (PC)                                                      */
/* ------------------------------------------------------------------ */
export class QWCharacterData extends QWBaseActorData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,

      // ---- Story Points -------------------------------------------
      storyPoints: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 3 }),
        max:   new fields.NumberField({ required: true, integer: true, min: 0, initial: 3 }),
      }),

      // ---- Experience Points & Advances ---------------------------
      experience: new fields.SchemaField({
        value:    new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        advances: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      }),

      // ---- Occupation / Community / Home --------------------------
      occupation: new fields.StringField({ required: false, blank: true, initial: "" }),
      community:  new fields.StringField({ required: false, blank: true, initial: "" }),
      homeland:   new fields.StringField({ required: false, blank: true, initial: "" }),

      // ---- Sequence state (used during Sequences) -----------------
      resolutionPoints: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max:   new fields.NumberField({ required: true, integer: true, min: 0, initial: 5 }),
      }),

      // ---- Current active consequences / benefits -----------------
      // These are tracked as Items embedded on the actor, but we
      // store a summary scalar for quick sheet display.
      penaltyTotal:  new fields.NumberField({ required: true, integer: true, initial: 0 }),
      bonusTotal:    new fields.NumberField({ required: true, integer: true, initial: 0 }),

      // ---- Biography / Notes --------------------------------------
      notes: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    };
  }

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Recalculate total penalty from embedded consequence items
    // (Full recalc happens in QWActor.prepareDerivedData)
    if (this.storyPoints.value > this.storyPoints.max) {
      this.storyPoints.value = this.storyPoints.max;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  NPC / Opposition                                                    */
/* ------------------------------------------------------------------ */
export class QWNpcData extends QWBaseActorData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,

      // Simple NPCs have a single resistance rating used as their
      // target number in all contests.
      resistanceRating: new fields.NumberField({
        required: true,
        integer: true,
        min: 1,
        initial: 14, // "Moderate" on the resistance ladder
      }),

      // Optional: a short label from the resistance ladder
      resistanceLabel: new fields.StringField({
        required: false,
        blank: true,
        initial: "Moderate",
      }),

      // NPCs may also have named abilities for use in Group Contests
      // (stored as embedded Items, same as PCs)

      // NPC type tag: "minion" | "master" | "independent"
      npcType: new fields.StringField({
        required: true,
        initial: "independent",
        choices: ["minion", "master", "independent"],
      }),

      notes: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    };
  }
}
