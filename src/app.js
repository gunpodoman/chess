import { createFeatureServices } from "./services/feature-services.js";
import { mountGameView } from "./views/game-view.js";

const featureServices = createFeatureServices();
const views = new Map();
let activeView = null;

export function registerView(name, mount) {
  views.set(name, mount);
}

export function mountView(name = "game") {
  const mount = views.get(name);
  if (!mount) throw new Error("Unknown view: " + name);
  activeView?.destroy?.();
  activeView = mount();
  return activeView;
}

registerView("game", () => mountGameView({ featureServices }));
mountView(document.body.dataset.view || "game");
