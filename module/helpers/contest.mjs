/**
 * QuestWorlds contest resolution engine (Phase 3)
 *
 * This provides a minimal contest dialog + outcome resolution so that
 * ability rolls have meaningful results.
 *
 * Current implementation:
 *  - Hero rolls 1d20 vs their ability target (base 1–20)
 *  - Opposition rolls 1d20 vs a resistance target number
 *  - Masteries bump the success level (hero vs opposition)
 *  - Outcome is one of: Complete Victory, Marginal Victory, Tie, Marginal Defeat, Complete Defeat
 */

import { masteryCount, targetNumber, rawToQWNotation } from "./handlebars.mjs";

export const EXPIRES_NEXT_CONTEST = "nextContest";

export const RESISTANCE_LADDER = [
  { label: "QUESTWORLDS.ResistanceLadder.VeryEasy", value: 6 },
  { label: "QUESTWORLDS.ResistanceLadder.Easy", value: 9 },
  { label: "QUESTWORLDS.ResistanceLadder.Moderate", value: 14 },
  { label: "QUESTWORLDS.ResistanceLadder.Hard", value: 18 },
  { label: "QUESTWORLDS.ResistanceLadder.VeryHard", value: 20 },
  // Common obstacles (compendium-style built-in presets)
  { label: "QUESTWORLDS.ResistanceObstacle.LockedDoor", value: 14 },
  { label: "QUESTWORLDS.ResistanceObstacle.Guard", value: 18 },
  { label: "QUESTWORLDS.ResistanceObstacle.Storm", value: 20 },
];

/**
 * Roll a random resistance from the questworlds ladder.
 * Returns an object { label, value }.
 */
export function rollRandomResistance() {
  const idx = Math.floor(Math.random() * RESISTANCE_LADDER.length);
  return RESISTANCE_LADDER[idx];
}

const SuccessLevel = {
  FUMBLE: 0,
  FAILURE: 1,
  SUCCESS: 2,
  CRITICAL: 3,
};

function successLabel(level) {
  switch (level) {
    case SuccessLevel.FUMBLE:
      return "Fumble";
    case SuccessLevel.FAILURE:
      return "Failure";
    case SuccessLevel.SUCCESS:
      return "Success";
    case SuccessLevel.CRITICAL:
      return "Critical";
    default:
      return "Unknown";
  }
}

function rollD20() {
  const roll = new Roll("1d20").roll({ async: false });
  return roll.total;
}

function evaluateRoll(roll, target) {
  if (roll === 1) return SuccessLevel.CRITICAL;
  if (roll === 20) return SuccessLevel.FUMBLE;
  return roll <= target ? SuccessLevel.SUCCESS : SuccessLevel.FAILURE;
}

function applyMasteryBump(level, masteryDelta) {
  if (masteryDelta === 0) return level;

  const bumped = level + masteryDelta;
  if (bumped >= SuccessLevel.CRITICAL) return SuccessLevel.CRITICAL;
  if (bumped <= SuccessLevel.FUMBLE) return SuccessLevel.FUMBLE;
  return bumped;
}

function determineOutcome(heroLevel, oppLevel) {
  const diff = heroLevel - oppLevel;
  if (diff >= 2) return "CompleteVictory";
  if (diff === 1) return "MarginalVictory";
  if (diff === 0) return "Tie";
  if (diff === -1) return "MarginalDefeat";
  return "CompleteDefeat";
}

export async function openContestDialog(
  actor,
  abilityItem,
  {
    defaultResistance = undefined,
    defaultOppositionMasteries = undefined,
  } = {},
) {
  const abilityName = abilityItem.name;
  const baseRaw = actor.getEffectiveRating?.(abilityItem) ?? abilityItem.system.rating;
  const baseTarget = targetNumber(baseRaw);

  // Pre-fill resistance if a single token is selected and has a resistanceRating
  const controlledToken = canvas.tokens.controlled?.[0];
  const defaultResistanceSetting = game.settings.get("questworlds", "defaultResistance");
  const fallbackResistance =
    controlledToken?.actor?.system?.resistanceRating ?? defaultResistanceSetting;
  const defaultResistanceValue =
    typeof defaultResistance === "number" ? defaultResistance : fallbackResistance;

  // Track active penalties/benefits (from consequences/benefits)
  const penaltyTotal = actor.system.penaltyTotal ?? 0;
  const bonusTotal = actor.system.bonusTotal ?? 0;
  const modifierSummary = `Penalty ${penaltyTotal} / Bonus ${bonusTotal}`;

  // Build augment dropdown options (ability items only)
  const augmentOptions = [
    `<option value="">${game.i18n.localize("QUESTWORLDS.ContestDialog.None")}</option>`,
    ...actor.items
      .filter((i) => i.type === "ability")
      .map((ability) => {
        const raw = actor.getEffectiveRating?.(ability) ?? ability.system.rating;
        return `<option value="${ability.id}">${ability.name} (${rawToQWNotation(raw)})</option>`;
      }),
  ].join("");

  const resistanceLadder = [
    { label: game.i18n.localize("QUESTWORLDS.ResistanceLadder.Automatic"), value: 0 },
    ...RESISTANCE_LADDER.map((item) => ({ label: game.i18n.localize(item.label), value: item.value })),
  ];

  const showLadder = game.settings.get("questworlds", "showResistanceLadder");
  const enableWager = game.settings.get("questworlds", "enableWageredSequences");
  const enableStoryPoints = game.settings.get("questworlds", "enableStoryPoints");

  const ladderHtml = showLadder
    ? `
      <div class="questworlds-resistance-ladder">
        <h4>${game.i18n.localize("QUESTWORLDS.ContestDialog.ResistanceLadder")}</h4>
        <ul>
          ${RESISTANCE_LADDER.map((item) => `<li>${game.i18n.localize(item.label)}: ${item.value}</li>`).join("")}
        </ul>
      </div>
    `
    : "";

  const wagerHtml = enableWager
    ? `
        <div class="form-group">
          <label for="wager">${game.i18n.localize("QUESTWORLDS.ContestDialog.Wager")}</label>
          <input type="number" id="wager" name="wager" value="0" min="0" max="${actor.system.resolutionPoints.value ?? 0}" step="1" />
          <div class="help-text">${game.i18n.localize("QUESTWORLDS.ContestDialog.WagerHelp")}</div>
        </div>
      `
    : "";

  const storyPointHtml = enableStoryPoints
    ? `
        <div class="form-group">
          <label for="spendStoryPoint">${game.i18n.localize("QUESTWORLDS.StoryPointSpend")}</label>
          <input type="checkbox" id="spendStoryPoint" name="spendStoryPoint" ${
            actor.system.storyPoints.value > 0 ? "" : "disabled"
          } />
        </div>
      `
    : "";

  const resistanceOptions = resistanceLadder
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");

  const dialog = new Dialog({
    title: game.i18n.localize("QUESTWORLDS.ContestDialog.Title"),
    content: `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("QUESTWORLDS.ContestDialog.Attacker")}</label>
          <div>${abilityName} (${rawToQWNotation(baseRaw)})</div>
        </div>
        <div class="form-group">
          <label for="resistancePreset">${game.i18n.localize("QUESTWORLDS.ContestDialog.Resistance")}</label>
          <select id="resistancePreset" name="resistancePreset">
            ${resistanceOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="resistance">${game.i18n.localize("QUESTWORLDS.ContestDialog.Resistance")}</label>
          <input type="number" id="resistance" name="resistance" value="${defaultResistanceValue}" min="1" max="20" />
        </div>
        <div class="form-group">
          <label for="oppositionMastery">${game.i18n.localize("QUESTWORLDS.ContestDialog.OppositionMasteries")}</label>
          <input type="number" id="oppositionMastery" name="oppositionMastery" value="${
            typeof defaultOppositionMasteries === "number" ? defaultOppositionMasteries : 0
          }" min="0" max="5" />
        </div>
        <div class="form-group">
          <label for="augmentAbility">${game.i18n.localize("QUESTWORLDS.ContestDialog.Augment")}</label>
          <select id="augmentAbility" name="augmentAbility">
            ${augmentOptions}
          </select>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="applyModifiers" name="applyModifiers" checked />
            ${game.i18n.localize("QUESTWORLDS.ContestDialog.ApplyModifiers")}
          </label>
          <div class="help-text">${modifierSummary}</div>
        </div>
        <div class="form-group">
          <label for="situationalModifier">${game.i18n.localize("QUESTWORLDS.ContestDialog.SituationalModifier")}</label>
          <input type="number" id="situationalModifier" name="situationalModifier" value="0" step="1" />
          <div class="help-text">${game.i18n.localize("QUESTWORLDS.ContestDialog.SituationalModifierHelp")}</div>
        </div>
        ${ladderHtml}
        ${wagerHtml}
        ${storyPointHtml}
      </form>
    `,
    buttons: {
      roll: {
        icon: "fas fa-dice",
        label: game.i18n.localize("QUESTWORLDS.ContestDialog.Roll"),
        callback: async (html) => {
          const resistance = Number(html.find("#resistance").val()) || 14;
          const oppositionMasteries = Number(html.find("#oppositionMastery").val()) || 0;
          const situationalModifier = Number(html.find("#situationalModifier").val()) || 0;
          const wager = Number(html.find("#wager").val()) || 0;
          const spendStoryPoint = html.find("#spendStoryPoint").is(":checked");
          const applyModifiers = html.find("#applyModifiers").is(":checked");
          const augmentAbilityId = html.find("#augmentAbility").val() || null;
          await runContest({
            actor,
            abilityItem,
            resistance,
            oppositionMasteries,
            situationalModifier,
            wager,
            spendStoryPoint,
            applyModifiers,
            augmentAbilityId,
          });
        },
      },
      cancel: {
        icon: "fas fa-times",
        label: game.i18n.localize("Cancel"),
      },
    },
    default: "roll",
    close: (html) => {
      // No-op
    },
  });

  // Sync the preset selector with the numeric resistance field
  dialog.render(true).then((dlg) => {
    const html = dlg.element;
    html.find("#resistancePreset").on("change", (event) => {
      const value = Number(event.target.value);
      if (!Number.isNaN(value)) html.find("#resistance").val(value);
    });

    // Initialize preset to match current resistance value
    html.find("#resistancePreset").val(defaultResistance);
  });
}

export function evaluateContest({
  actor,
  abilityItem,
  resistance,
  oppositionMasteries,
  situationalModifier = 0,
  applyModifiers = true,
  augmentAbilityId = null,
  bumpOutcome = false,
  wager = 0,
}) {
  const enableWager = game.settings.get("questworlds", "enableWageredSequences");
  wager = enableWager ? wager : 0;

  const heroRaw = actor.getEffectiveRating?.(abilityItem) ?? abilityItem.system.rating;
  const heroBase = targetNumber(heroRaw);
  const heroMasteries = masteryCount(heroRaw);

  // Active penalties/benefits (from consequences/benefits)
  const penaltyTotal = actor.system.penaltyTotal ?? 0;
  const bonusTotal = actor.system.bonusTotal ?? 0;

  // Augment ability (optional) — roll against Moderate (14) for a bonus/penalty
  let augment = null;
  let augmentBonus = 0;
  if (augmentAbilityId) {
    const augmentItem = actor.items.get(augmentAbilityId);
    if (augmentItem) {
      const augmentRaw = actor.getEffectiveRating?.(augmentItem) ?? augmentItem.system.rating;
      const augmentTarget = targetNumber(augmentRaw);
      const augmentRoll = rollD20();
      const augmentLevel = evaluateRoll(augmentRoll, augmentTarget);
      augmentBonus =
        augmentLevel === SuccessLevel.CRITICAL
          ? 6
          : augmentLevel === SuccessLevel.SUCCESS
          ? 3
          : augmentLevel === SuccessLevel.FAILURE
          ? 0
          : -3;
      augment = {
        abilityName: augmentItem.name,
        roll: augmentRoll,
        target: augmentTarget,
        level: augmentLevel,
        bonus: augmentBonus,
      };
    }
  }

  const heroRoll = rollD20();
  const oppRoll = rollD20();

  const modifierTotal = applyModifiers ? penaltyTotal + bonusTotal : 0;
  const heroTarget = heroBase + augmentBonus + modifierTotal + (situationalModifier || 0);
  let heroLevel = evaluateRoll(heroRoll, heroTarget);
  let oppLevel = evaluateRoll(oppRoll, resistance);

  const autoSuccess = resistance <= 0;
  if (autoSuccess) {
    heroLevel = SuccessLevel.SUCCESS;
    oppLevel = SuccessLevel.FAILURE;
  }

  // Assured contest: if hero has extra masteries and opposition has none, ensure at least success.
  if (heroMasteries > 0 && oppositionMasteries === 0 && heroLevel === SuccessLevel.FAILURE) {
    heroLevel = SuccessLevel.SUCCESS;
  }

  // Bump logic (net masteries)
  const netMasteries = heroMasteries - oppositionMasteries;
  if (netMasteries > 0) {
    heroLevel = applyMasteryBump(heroLevel, netMasteries);
  } else if (netMasteries < 0) {
    oppLevel = applyMasteryBump(oppLevel, -netMasteries);
  }

  // Bump outcome for story point spend (if requested)
  if (bumpOutcome) {
    heroLevel = applyMasteryBump(heroLevel, 1);
  }

  const outcomeKey = determineOutcome(heroLevel, oppLevel);

  return {
    actorId: actor.id,
    actorName: actor.name,
    abilityId: abilityItem.id,
    abilityName: abilityItem.name,
    heroRoll,
    heroBase,
    heroTarget,
    heroLevelLabel: successLabel(heroLevel),
    heroMasteries,
    augment,
    augmentLevelLabel: augment ? successLabel(augment.level) : null,
    augmentBonus,
    applyModifiers,
    penaltyTotal,
    bonusTotal,
    modifierTotal,
    situationalModifier,
    oppRoll,
    oppTarget: resistance,
    oppLevelLabel: successLabel(oppLevel),
    oppositionMasteries,
    outcomeKey,
    outcome: game.i18n.localize(`QUESTWORLDS.ContestResult.${outcomeKey}`),
    narrationKey: `QUESTWORLDS.ContestResult.Narration.${outcomeKey}`,
    narration: game.i18n.localize(`QUESTWORLDS.ContestResult.Narration.${outcomeKey}`),
    wager,
    multiplier: wager + 1,
    autoSuccess,
    spentStoryPoint: bumpOutcome,
    remainingStoryPoints: Math.max(0, (actor.system.storyPoints.value ?? 0) - (bumpOutcome ? 1 : 0)),
    canReroll:
      (actor.system.storyPoints.value ?? 0) - (bumpOutcome ? 1 : 0) > 0 &&
      outcomeKey !== "CompleteVictory",
    rpDelta:
      ({
        CompleteVictory: 2,
        MarginalVictory: 1,
        Tie: 0,
        MarginalDefeat: -1,
        CompleteDefeat: -2,
      }[outcomeKey] || 0) * (wager + 1),
  };
}

export async function runContest({
  actor,
  abilityItem,
  resistance,
  oppositionMasteries,
  situationalModifier,
  wager = 0,
  spendStoryPoint,
  applyModifiers,
  augmentAbilityId,
  skipChat = false,
  skipExpire = false,
}) {
  const enableStoryPoints = game.settings.get("questworlds", "enableStoryPoints");
  const canSpendStoryPoint = enableStoryPoints && spendStoryPoint && actor.system.storyPoints.value > 0;
  if (canSpendStoryPoint) {
    await actor.update({ "system.storyPoints.value": actor.system.storyPoints.value - 1 });
  }

  let chatData = evaluateContest({
    actor,
    abilityItem,
    resistance,
    oppositionMasteries,
    situationalModifier,
    applyModifiers,
    augmentAbilityId,
    bumpOutcome: canSpendStoryPoint,
  });

  // Update reroll availability after adjusting story points
  chatData.canReroll =
    (actor.system.storyPoints.value ?? 0) > 0 && chatData.outcomeKey !== "CompleteVictory";

  // Determine whether the contest should create a message
  if (!skipChat) {
    const rollContent = await renderTemplate(
      "systems/questworlds/templates/chat/contest-roll.hbs",
      chatData,
    );

    const resultContent = await renderTemplate(
      "systems/questworlds/templates/chat/contest-result.hbs",
      chatData,
    );

    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: rollContent + resultContent,
    });
  }

  // Expire any temporary effects that were meant for a single contest.
  if (!skipExpire) {
    const expired = actor.items
      .filter((i) =>
        (i.type === "benefit" || i.type === "consequence") &&
        i.system.expiresOn === EXPIRES_NEXT_CONTEST,
      )
      .map((i) => i.id);
    if (expired.length) {
      await actor.deleteEmbeddedDocuments("Item", expired);
    }
  }

  return chatData;
}

export async function openGroupContestDialog({
  defaultResistance = undefined,
  defaultOppositionMasteries = undefined,
} = {}) {
  const controlled = canvas.tokens.controlled;
  if (!controlled.length) {
    ui.notifications.warn(game.i18n.localize("QUESTWORLDS.GroupContest.NoTokens"));
    return;
  }

  const actors = controlled.map((t) => t.actor).filter(Boolean);
  if (!actors.length) {
    ui.notifications.warn(game.i18n.localize("QUESTWORLDS.GroupContest.NoActors"));
    return;
  }

  // Use the first actor as the template for ability selection.
  const primaryActor = actors[0];
  const abilities = primaryActor.items.filter((i) => i.type === "ability");
  if (!abilities.length) {
    ui.notifications.warn(game.i18n.localize("QUESTWORLDS.GroupContest.NoAbilities"));
    return;
  }

  const abilityOptions = abilities
    .map((ability) => `<option value="${ability.id}">${ability.name}</option>`)
    .join("");

  const fallbackResistance = primaryActor.system.resistanceRating ?? 14;
  const defaultResistanceValue =
    typeof defaultResistance === "number" ? defaultResistance : fallbackResistance;

  const dialog = new Dialog({
    title: game.i18n.localize("QUESTWORLDS.GroupContest.DialogTitle"),
    content: `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("QUESTWORLDS.GroupContest.ChooseAbility")}</label>
          <select id="abilityId" name="abilityId">${abilityOptions}</select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("QUESTWORLDS.GroupContest.Resistance")}</label>
          <input type="number" id="resistance" name="resistance" value="${defaultResistanceValue}" min="1" max="20" />
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("QUESTWORLDS.ContestDialog.OppositionMasteries")}</label>
          <input type="number" id="oppositionMastery" name="oppositionMastery" value="${
            typeof defaultOppositionMasteries === "number" ? defaultOppositionMasteries : 0
          }" min="0" max="5" />
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="applyModifiers" name="applyModifiers" checked />
            ${game.i18n.localize("QUESTWORLDS.ContestDialog.ApplyModifiers")}
          </label>
        </div>
      </form>
    `,
    buttons: {
      roll: {
        icon: "fas fa-dice",
        label: game.i18n.localize("QUESTWORLDS.ContestDialog.Roll"),
        callback: async (html) => {
          const abilityId = html.find("#abilityId").val();
          const resistance = Number(html.find("#resistance").val()) || 14;
          const oppositionMasteries = Number(html.find("#oppositionMastery").val()) || 0;
          const applyModifiers = html.find("#applyModifiers").is(":checked");

          await runGroupContest({
            actors,
            abilityId,
            resistance,
            oppositionMasteries,
            applyModifiers,
          });
        },
      },
      cancel: {
        icon: "fas fa-times",
        label: game.i18n.localize("Cancel"),
      },
    },
    default: "roll",
  });

  dialog.render(true);
}

export async function runGroupContest({
  actors,
  abilityId,
  resistance,
  oppositionMasteries,
  situationalModifier = 0,
  applyModifiers = true,
  augmentAbilityId = null,
}) {
  const results = [];
  for (const actor of actors) {
    const abilityItem = actor.items.get(abilityId);
    if (!abilityItem) continue;

    const data = evaluateContest({
      actor,
      abilityItem,
      resistance,
      oppositionMasteries,
      situationalModifier,
      applyModifiers,
      augmentAbilityId,
    });
    results.push({ actor, data });
  }

  const tally = {
    CompleteVictory: 0,
    MarginalVictory: 0,
    Tie: 0,
    MarginalDefeat: 0,
    CompleteDefeat: 0,
  };
  results.forEach((r) => {
    if (tally[r.data.outcomeKey] !== undefined) tally[r.data.outcomeKey] += 1;
  });

  const wins = tally.CompleteVictory + tally.MarginalVictory;
  const losses = tally.CompleteDefeat + tally.MarginalDefeat;
  const groupOutcomeKey =
    wins > losses ? "MarginalVictory" : losses > wins ? "MarginalDefeat" : "Tie";

  const summaryRows = results
    .map(
      (r) =>
        `<li><strong>${r.actor.name}</strong>: ${r.data.outcome} (${r.data.heroRoll}/${r.data.heroTarget})</li>`,
    )
    .join("");

  const summary = `
    <div class="questworlds-group-contest">
      <h2>${game.i18n.localize("QUESTWORLDS.GroupContest.Title")}</h2>
      <ul>${summaryRows}</ul>
      <div class="questworlds-group-contest-outcome">
        <strong>${game.i18n.localize("QUESTWORLDS.GroupContest.Outcome")}:</strong>
        ${game.i18n.localize(`QUESTWORLDS.ContestResult.${groupOutcomeKey}`)}
      </div>
    </div>
  `;

  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: actors[0] }),
    content: summary,
  });

  return { results, groupOutcomeKey };
}

