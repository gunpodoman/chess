import { createPieceImage } from "./pieces.js";

const PIECE_NAMES = { Q: "퀸", R: "룩", B: "비숍", N: "나이트" };

export function createPromotionView(modal, optionsElement, onSelect) {
  const buttons = ["q", "r", "b", "n"].map(type => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "promotion-option";
    button.setAttribute("aria-label", PIECE_NAMES[type.toUpperCase()]);
    button.addEventListener("click", () => onSelect(type));
    return { button, type, piece: null };
  });
  optionsElement.replaceChildren(...buttons.map(item => item.button));

  return {
    show(color) {
      buttons.forEach(item => {
        const piece = color === "w" ? item.type.toUpperCase() : item.type;
        if (item.piece !== piece) {
          item.button.replaceChildren(createPieceImage(piece));
          item.piece = piece;
        }
      });
      modal.classList.add("show");
    },
    hide() {
      modal.classList.remove("show");
    }
  };
}
