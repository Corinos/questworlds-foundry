/**
 * QuestWorlds — Seed Content Helpers
 *
 * These helpers create world content (actors, journals, compendia) to
 * accelerate setup and provide out-of-the-box playability.
 */

export async function createHelpJournal() {
  const title = game.i18n.localize("QUESTWORLDS.Help.Title");
  const existing = game.journal.getName(title);
  if (existing) return existing;

  const content = `
  <h1>${title}</h1>
  <p>${game.i18n.localize("QUESTWORLDS.Help.Intro")}</p>
  <h2>${game.i18n.localize("QUESTWORLDS.Help.Contests")}</h2>
  <p>${game.i18n.localize("QUESTWORLDS.Help.ContestsDesc")}</p>
  <h2>${game.i18n.localize("QUESTWORLDS.Help.Advancement")}</h2>
  <p>${game.i18n.localize("QUESTWORLDS.Help.AdvancementDesc")}</p>
  `;

  return JournalEntry.create({ name: title, content });
}

export async function createSampleCharacters() {
  const samples = [
    {
      name: "Rogue",
      type: "character",
      img: "icons/svg/dagger.svg",
      system: {
        storyPoints: { value: 3, max: 3 },
        experience: { value: 0, advances: 0 },
        resolutionPoints: { value: 0, max: 5 },
        occupation: "Scoundrel",
        community: "Thieves' Guild",
        homeland: "Port City",
      },
      items: [
        { name: "Sneak", type: "ability", system: { rating: 18, abilityType: "standalone", keywordId: "", breakoutBonus: 0 } },
        { name: "Pickpocket", type: "ability", system: { rating: 15, abilityType: "standalone", keywordId: "", breakoutBonus: 0 } },
        { name: "Cunning", type: "ability", system: { rating: 16, abilityType: "keyword", keywordId: "", breakoutBonus: 0 } },
        { name: "Distract", type: "ability", system: { rating: 13, abilityType: "breakout", keywordId: "", breakoutBonus: 5 } },
      ],
    },
    {
      name: "Scholar",
      type: "character",
      img: "icons/svg/book.svg",
      system: {
        storyPoints: { value: 3, max: 3 },
        experience: { value: 0, advances: 0 },
        resolutionPoints: { value: 0, max: 5 },
        occupation: "Academic",
        community: "University",
        homeland: "Capital",
      },
      items: [
        { name: "Lore", type: "ability", system: { rating: 17, abilityType: "standalone", keywordId: "", breakoutBonus: 0 } },
        { name: "Research", type: "ability", system: { rating: 15, abilityType: "standalone", keywordId: "", breakoutBonus: 0 } },
      ],
    },
  ];

  const created = [];
  for (const data of samples) {
    const existing = game.actors.getName(data.name);
    if (existing) continue;
    const actor = await Actor.create(data);
    created.push(actor.name);
  }

  if (created.length) {
    ui.notifications.info(
      game.i18n.format("QUESTWORLDS.Seed.CreatedActors", { names: created.join(", ") }),
    );
  }
  return created;
}

export async function createBlankCharacterTemplate() {
  const title = game.i18n.localize("QUESTWORLDS.Template.BlankCharacter");
  const existing = game.actors.getName(title);
  if (existing) return existing;

  const actor = await Actor.create({
    name: title,
    type: "character",
    img: "icons/svg/mystery-man.svg",
    system: {
      storyPoints: { value: 3, max: 3 },
      experience: { value: 0, advances: 0 },
      resolutionPoints: { value: 0, max: 5 },
      occupation: "",
      community: "",
      homeland: "",
    },
    items: [],
  });

  ui.notifications.info(game.i18n.localize("QUESTWORLDS.Template.Created"));
  return actor;
}
