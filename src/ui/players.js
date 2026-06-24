import { opposite, pieceColor } from "../chess/engine.js";
import { createPieceImage } from "./pieces.js";

function createPlayerCard(element) {
  const playerLeft = document.createElement("div");
  playerLeft.className = "player-left";
  const avatar = document.createElement("div");
  const details = document.createElement("div");
  const name = document.createElement("div");
  name.className = "player-name";
  const meta = document.createElement("div");
  meta.className = "player-meta";
  const captured = document.createElement("div");
  captured.className = "captured";
  details.append(name, meta);
  playerLeft.append(avatar, details);
  element.replaceChildren(playerLeft, captured);
  return { avatar, name, meta, captured, color: null, capturedKey: null };
}

function capturedPieces(game, color) {
  const order = { P: 1, N: 2, B: 3, R: 4, Q: 5 };
  return game.moveHistory
    .filter(entry => entry.captured && pieceColor(entry.captured) === color)
    .map(entry => entry.captured)
    .sort((a, b) => order[a.toUpperCase()] - order[b.toUpperCase()]);
}

function updateCard(view, color, context) {
  let name = color === "w" ? "백" : "흑";
  let meta = context.game.turn === color && !context.game.result ? "둘 차례" : "대기 중";
  if (context.networkMode !== "offline") {
    if (context.connectionRole === "spectator") {
      name += " · 대국자";
      meta = context.game.turn === color && !context.game.result ? "현재 차례" : "관전 중";
    } else if (context.localColor === color) {
      name += " · 나";
    } else {
      name += " · 상대";
    }
    if (!context.connected && context.networkRole !== "host") meta = "연결 대기";
    if (context.networkRole === "host" && color === context.remoteColor && !context.connected) meta = "재접속 대기";
  } else {
    name += " · 로컬";
  }

  if (view.color !== color) {
    view.avatar.className = color === "b" ? "avatar black" : "avatar";
    view.avatar.replaceChildren(createPieceImage(color === "w" ? "K" : "k", "avatar-piece"));
    view.color = color;
  }
  view.name.textContent = name;
  view.meta.textContent = meta;

  const pieces = capturedPieces(context.game, opposite(color));
  const capturedKey = pieces.join("");
  if (view.capturedKey !== capturedKey) {
    if (pieces.length === 0) {
      const empty = document.createElement("span");
      empty.className = "hint";
      empty.textContent = "없음";
      view.captured.replaceChildren(empty);
    } else {
      view.captured.replaceChildren(...pieces.map(piece => {
        const host = document.createElement("span");
        host.className = "captured-piece";
        host.appendChild(createPieceImage(piece));
        return host;
      }));
    }
    view.capturedKey = capturedKey;
  }
}

export function createPlayersView(topElement, bottomElement) {
  const top = createPlayerCard(topElement);
  const bottom = createPlayerCard(bottomElement);

  return {
    render(context) {
      const topColor = context.orientation === "w" ? "b" : "w";
      updateCard(top, topColor, context);
      updateCard(bottom, opposite(topColor), context);
    }
  };
}
