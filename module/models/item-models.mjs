/**
 * QuestWorlds — Item Data Models
 *
 * Item types:
 *   ability     — A named ability, keyword, or breakout
 *   flaw        — A named flaw (negative ability)
 *   benefit     — A temporary positive modifier (augment, boon, etc.)
 *   consequence — A temporary negative modifier (hurt, injured, dying, etc.)
 *
 * Rating encoding (same as actor models):
 *   raw integer: base + (masteries × 20)
 *   The `qwRating` Handlebars helper formats this for display.
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
/*  Shared rating field schema (reused across types)                   */
/* ------------------------------------------------------------------ */
function ratingSchema() {
  return {
    // Raw integer rating (1–20 + masteries*20)
    rating: new fields.NumberField({
      required: true,
      integer: true,
      min: 1,
      initial: 13,  // Starting ability default per SRD
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Ability                                                             */
/* ------------------------------------------------------------------ */
export class QWAbilityData extends TypeDataModel {
  static defineSchema() {
    return {
      ...ratingSchema(),

      // "standalone" | "keyword" | "breakout"
      abilityType: new fields.StringField({
        required: true,
        initial: "standalone",
        choices: ["standalone", "keyword", "breakout"],
      }),

      // For breakouts: the name of the parent keyword (denormalised for
      // display; the actual link is via the keyword item's ID stored here)
      keywordId: new fields.StringField({
        required: false,
        blank: true,
        initial: "",
      }),

      // Breakout bonus: breakouts use parent keyword rating + this bonus
      // Typically +5 or +10. 0 = use own rating independently.
      breakoutBonus: new fields.NumberField({
        required: true,
        integer: true,
        initial: 0,
      }),

      // Whether this ability is currently being used as an augment
      isAugmenting: new fields.BooleanField({ initial: false }),

      // Player notes / description
      description: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    };
  }

  // NOTE: effectiveRating (breakout parent rating + bonus) is NOT stored here.
  // It is derived in QWActor._prepareCharacterData() and cached in
  // QWActor._breakoutRatings (Map<itemId, number>).
  // Use actor.getEffectiveRating(item) everywhere you need the display rating.
}

/* ------------------------------------------------------------------ */
/*  Flaw                                                                */
/* ------------------------------------------------------------------ */
export class QWFlawData extends TypeDataModel {
  static defineSchema() {
    return {
      ...ratingSchema(),
      description: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Benefit  (temporary positive modifier)                             */
/* ------------------------------------------------------------------ */
export class QWBenefitData extends TypeDataModel {
  static defineSchema() {
    return {
      // Bonus modifier applied to rolls (+3, +6, +9)
      bonus: new fields.NumberField({
        required: true,
        integer: true,
        initial: 3,
      }),

      // "fresh-hero" | "victory" | "augment" | "story" | "other"
      benefitType: new fields.StringField({
        required: true,
        initial: "other",
        choices: ["fresh-hero", "victory", "augment", "story", "other"],
      }),

      // Session or contest when benefit expires (narrative trigger)
      expiresOn: new fields.StringField({ required: false, blank: true, initial: "" }),

      description: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Consequence  (temporary negative modifier)                         */
/* ------------------------------------------------------------------ */
export class QWConsequenceData extends TypeDataModel {
  static defineSchema() {
    return {
      /**
       * Consequence degree per QuestWorlds rules (degree of defeat):
       *   0 = Stung       (–5)   Victory at a price / defeat with a silver lining
       *   1 = Hurt        (–10)  Clear outcome, lasting but manageable
       *   2 = Injured     (–15)  Significant, lasting days or weeks
       *   3 = Dying       (–20)  Major, story-changing
       *   4 = Dead / Out of contest — removed from scene, handled narratively
       */
      degree: new fields.NumberField({
        required: true,
        integer: true,
        min: 0,
        max: 4,
        initial: 1,
      }),

      // Computed penalty (degree × –5; 0 for degree 4 — handled narratively)
      // Stored for quick access; recalculated in prepareDerivedData
      penalty: new fields.NumberField({
        required: true,
        integer: true,
        initial: -10,
      }),

      // Source: what contest / narrative event caused this
      source: new fields.StringField({ required: false, blank: true, initial: "" }),

      // Whether the character is currently receiving healing / recovery
      recovering: new fields.BooleanField({ initial: false }),

      description: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    };
  }

  /** Derive penalty from degree of defeat */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.degree < 4) {
      this.penalty = -(this.degree * 5);
    } else {
      this.penalty = 0; // Dead/Out of contest — handled narratively
    }
  }
}
