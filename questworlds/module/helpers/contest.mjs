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
  const fallbackResistance =
    controlledToken?.actor?.system?.resistanceRating ?? 14;
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
    { label: game.i18n.localize("QUESTWORLDS.ResistanceLadder.VeryEasy"), value: 6 },
    { label: game.i18n.localize("QUESTWORLDS.ResistanceLadder.Easy"), value: 9 },
    { label: game.i18n.localize("QUESTWORLDS.ResistanceLadder.Moderate"), value: 14 },
    { label: game.i18n.localize("QUESTWORLDS.ResistanceLadder.Hard"), value: 18 },
    { label: game.i18n.localize("QUESTWORLDS.ResistanceLadder.VeryHard"), value: 20 },
  ];

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
        <div class="form-group">
          <label for="spendStoryPoint">${game.i18n.localize("QUESTWORLDS.StoryPointSpend")}</label>
          <input type="checkbox" id="spendStoryPoint" name="spendStoryPoint" ${
            actor.system.storyPoints.value > 0 ? "" : "disabled"
          } />
        </div>
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
          const spendStoryPoint = html.find("#spendStoryPoint").is(":checked");
          const applyModifiers = html.find("#applyModifiers").is(":checked");
          const augmentAbilityId = html.find("#augmentAbility").val() || null;
          await runContest({
            actor,
            abilityItem,
            resistance,
            oppositionMasteries,
            situationalModifier,
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

const EXPIRES_NEXT_CONTEST = "nextContest";

export async function runContest({ actor, abilityItem, resistance, oppositionMasteries, situationalModifier, spendStoryPoint, applyModifiers, augmentAbilityId }) {
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

  // Allow spending a story point to upgrade the result one tier
  const canSpendStoryPoint = spendStoryPoint && actor.system.storyPoints.value > 0;
  if (canSpendStoryPoint) {
    await actor.update({ "system.storyPoints.value": actor.system.storyPoints.value - 1 });
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

  if (canSpendStoryPoint) {
    // Upgrade outcome one level (e.g., Defeat -> Tie, Tie -> Victory)
    heroLevel = applyMasteryBump(heroLevel, 1);
  }

  const outcomeKey = determineOutcome(heroLevel, oppLevel);

  const narrationKey = `QUESTWORLDS.ContestResult.Narration.${outcomeKey}`;

  const chatData = {
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
    outcome: game.i18n.localize(`QUESTWORLDS.ContestResult.${outcomeKey}`),
    outcomeKey,
    narrationKey,
    narration: game.i18n.localize(narrationKey),
    spentStoryPoint: canSpendStoryPoint,
    remainingStoryPoints: actor.system.storyPoints.value,
    canReroll:
      actor.system.storyPoints.value > 0 && outcomeKey !== "CompleteVictory",
    autoSuccess,
    rpDelta: {
      CompleteVictory: 2,
      MarginalVictory: 1,
      Tie: 0,
      MarginalDefeat: -1,
      CompleteDefeat: -2,
    }[outcomeKey],
    canApplyRp:
      (game.user.isGM || actor.isOwner) &&
      typeof actor.system.resolutionPoints?.value === "number" &&
      ({
        CompleteVictory: 2,
        MarginalVictory: 1,
        Tie: 0,
        MarginalDefeat: -1,
        CompleteDefeat: -2,
      }[outcomeKey] || 0) !== 0,
  };

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

  // Expire any temporary effects that were meant for a single contest.
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
