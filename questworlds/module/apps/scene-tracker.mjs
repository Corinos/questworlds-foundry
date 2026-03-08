/**
 * QuestWorlds — Scene Tracker
 *
 * Provides a GM-only panel that lists all tokens on the current scene and
 * highlights active consequences (and other temporary effects) on their actors.
 */

export class QWSceneTracker extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "questworlds-scene-tracker",
      title: game.i18n.localize("QUESTWORLDS.SceneTracker.Title"),
      template: "systems/questworlds/templates/scene/scene-tracker.hbs",
      classes: ["questworlds", "scene-tracker"],
      width: 520,
      height: "auto",
      resizable: true,
    });
  }

  getData(options = {}) {
    const tokens = canvas.tokens.placeables.map((token) => {
      const actor = token.actor;
      const consequences = actor
        ? actor.items
            .filter((i) => i.type === "consequence")
            .map((c) => ({
              id: c.id,
              name: c.name,
              severity: c.system.severity,
              penalty: c.system.penalty,
              source: c.system.source,
              description: c.system.description,
            }))
        : [];

      return {
        id: token.id,
        name: token.name,
        img: token.data.img,
        actorName: actor?.name ?? "",
        isHidden: token.document.hidden,
        consequences,
      };
    });

    return {
      isGM: game.user.isGM,
      hasConsequences: tokens.some((t) => t.consequences.length > 0),
      tokens,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".questworlds-clear-consequences").click(async (event) => {
      event.preventDefault();

      const tokenId = event.currentTarget.dataset.tokenId;
      const token = canvas.tokens.get(tokenId);
      if (!token?.actor) return;

      const actor = token.actor;
      const toRemove = actor.items
        .filter((i) => i.type === "consequence")
        .map((i) => i.id);

      if (!toRemove.length) return;

      const confirmed = await Dialog.confirm({
        title: game.i18n.localize("QUESTWORLDS.SceneTracker.ClearTitle"),
        content: `<p>${game.i18n.localize("QUESTWORLDS.SceneTracker.ClearPrompt")}</p>`,
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize("QUESTWORLDS.SceneTracker.ClearConfirm"),
        },
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: game.i18n.localize("QUESTWORLDS.SceneTracker.ClearCancel"),
        },
      });

      if (!confirmed) return;
      await actor.deleteEmbeddedDocuments("Item", toRemove);
      this.render();
    });
  }
}
