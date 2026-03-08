/**
 * QuestWorlds — Handlebars Helpers & Template Preloader
 *
 * Key helper: qwRating
 *   Converts a raw integer rating into QuestWorlds mastery notation.
 *
 *   Raw encoding:  rating = base (1–20) + masteries × 20
 *   Examples:
 *     raw  5  →  "5"
 *     raw 20  →  "20"
 *     raw 21  →  "1M"
 *     raw 26  →  "6M"
 *     raw 40  →  "20M"  (or "1M2" for raw 41)
 *     raw 43  →  "3M2"
 *     raw 61  →  "1M3"
 */

/* ------------------------------------------------------------------ */
/*  Rating conversion utility (exported for use in roll engine)        */
/* ------------------------------------------------------------------ */

/**
 * Convert raw integer rating to QuestWorlds notation string.
 * @param {number} raw  The raw numeric rating
 * @returns {string}    e.g. "6M", "3M2", "15"
 */
export function rawToQWNotation(raw) {
  if (typeof raw !== "number" || isNaN(raw) || raw < 1) return "—";
  const masteries = Math.floor((raw - 1) / 20);
  const base      = raw - (masteries * 20);
  if (masteries === 0) return `${base}`;
  if (masteries === 1) return `${base}M`;
  return `${base}M${masteries}`;
}

/**
 * Convert QuestWorlds notation string back to raw integer.
 * @param {string} notation  e.g. "6M", "3M2", "15"
 * @returns {number}
 */
export function qwNotationToRaw(notation) {
  if (typeof notation === "number") return notation;
  const match = String(notation).match(/^(\d+)(M(\d*))?$/i);
  if (!match) return NaN;
  const base      = parseInt(match[1], 10);
  const masteries = match[2] ? (match[3] ? parseInt(match[3], 10) : 1) : 0;
  return base + (masteries * 20);
}

/**
 * Return the target number for a roll (always 1–20 regardless of masteries).
 * Excess masteries become bumps.
 * @param {number} raw
 * @returns {number}  1–20
 */
export function targetNumber(raw) {
  if (typeof raw !== "number" || raw < 1) return 1;
  return ((raw - 1) % 20) + 1;
}

/**
 * Return how many masteries a raw rating contains.
 * @param {number} raw
 * @returns {number}
 */
export function masteryCount(raw) {
  if (typeof raw !== "number" || raw < 1) return 0;
  return Math.floor((raw - 1) / 20);
}

/* ------------------------------------------------------------------ */
/*  Handlebars helper registration                                      */
/* ------------------------------------------------------------------ */
export function registerHandlebarsHelpers() {

  // Display a raw rating as QuestWorlds notation
  Handlebars.registerHelper("qwRating", (raw) => rawToQWNotation(raw));

  // Display just the base (1–20) portion of a rating
  Handlebars.registerHelper("qwBase", (raw) => targetNumber(raw));

  // Display just the mastery count
  Handlebars.registerHelper("qwMasteries", (raw) => masteryCount(raw));

  // Localisation shorthand
  Handlebars.registerHelper("qwLocalize", (key) => game.i18n.localize(key));

  // Severity label for consequences
  Handlebars.registerHelper("qwSeverityLabel", (severity) => {
    const labels = {
      1: game.i18n.localize("QUESTWORLDS.Consequence.Hurt"),
      2: game.i18n.localize("QUESTWORLDS.Consequence.Injured"),
      3: game.i18n.localize("QUESTWORLDS.Consequence.Dying"),
      4: game.i18n.localize("QUESTWORLDS.Consequence.Dead"),
    };
    return labels[severity] ?? severity;
  });

  // Penalty display (–3, –6, –9)
  Handlebars.registerHelper("qwPenalty", (severity) => {
    if (severity >= 4) return game.i18n.localize("QUESTWORLDS.Consequence.Dead");
    return `–${severity * 3}`;
  });

  // Check if value equals comparator (useful in templates)
  Handlebars.registerHelper("qwEq", (a, b) => a === b);

  // Concatinate strings (useful for dynamic template partials)
  Handlebars.registerHelper("qwConcat", (...args) => {
    args.pop(); // remove Handlebars options object
    return args.join("");
  });

  // Render a range of numbers (for dots / pips UI)
  Handlebars.registerHelper("qwRange", (n) => Array.from({ length: n }, (_, i) => i + 1));

  console.log("QuestWorlds | Handlebars helpers registered");
}

/* ------------------------------------------------------------------ */
/*  Template preloader                                                  */
/* ------------------------------------------------------------------ */
export async function preloadHandlebarsTemplates() {
  const templatePaths = [
    // Actor sheet partials
    "systems/questworlds/templates/partials/ability-list.hbs",
    "systems/questworlds/templates/partials/keyword-block.hbs",
    "systems/questworlds/templates/partials/consequence-list.hbs",
    "systems/questworlds/templates/partials/benefit-list.hbs",
    "systems/questworlds/templates/partials/story-points.hbs",
    // Chat partials
    "systems/questworlds/templates/chat/contest-result.hbs",
    "systems/questworlds/templates/chat/contest-roll.hbs",
    "systems/questworlds/templates/scene/scene-tracker.hbs",
    // Apps
    "systems/questworlds/templates/apps/seed-content.hbs",
  ];

  return loadTemplates(templatePaths);
}
