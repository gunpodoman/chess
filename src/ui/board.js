import {
  FILES,
  indexToAlgebraic,
  isKingInCheck,
  kingSquare
} from "../chess/engine.js";
import { createPieceImage } from "./pieces.js";

function createSquare(onSquareClick) {
  const button = document.createElement("button");
  button.type = "button";

  const marker = document.createElement("span");
  marker.hidden = true;

  const pieceHost = document.createElement("span");
  pieceHost.className = "piece";

  const file = document.createElement("span");
  file.className = "coord file";

  const rank = document.createElement("span");
  rank.className = "coord rank";

  button.append(marker, pieceHost, file, rank);
  button.addEventListener("click", () => onSquareClick(Number(button.dataset.square)));
  return { button, marker, pieceHost, file, rank, piece: null };
}

export function createBoardView(boardElement, onSquareClick) {
  const squares = Array.from({ length: 64 }, () => createSquare(onSquareClick));
  boardElement.replaceChildren(...squares.map(square => square.button));

  return {
    render({ game, orientation, selectedSquare, selectedMoves }) {
      const checkSquare = isKingInCheck(game, game.turn) ? kingSquare(game, game.turn) : -1;

      squares.forEach((view, displayIndex) => {
        const square = orientation === "w" ? displayIndex : 63 - displayIndex;
        const row = Math.floor(square / 8);
        const col = square % 8;
        const displayRow = Math.floor(displayIndex / 8);
        const displayCol = displayIndex % 8;
        const available = selectedMoves.filter(move => move.to === square);
        const isCapture = Boolean(game.board[square] || available.some(move => move.enPassant));

        view.button.dataset.square = String(square);
        view.button.className = "square " + ((row + col) % 2 === 0 ? "light" : "dark");
        view.button.classList.toggle("last", Boolean(game.lastMove && (square === game.lastMove.from || square === game.lastMove.to)));
        view.button.classList.toggle("selected", square === selectedSquare);
        view.button.classList.toggle("check", square === checkSquare);
        view.button.setAttribute("aria-label", indexToAlgebraic(square));

        view.marker.hidden = available.length === 0;
        view.marker.className = isCapture ? "capture-ring" : "move-dot";

        const piece = game.board[square];
        if (view.piece !== piece) {
          view.pieceHost.replaceChildren(...(piece ? [createPieceImage(piece)] : []));
          view.piece = piece;
        }

        view.file.hidden = displayRow !== 7;
        view.file.textContent = FILES[col];
        view.rank.hidden = displayCol !== 0;
        view.rank.textContent = String(8 - row);
      });
    }
  };
}
