export const FILES = "abcdefgh";
export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
function createInitialGame() {
  const state = parseFen(START_FEN);
  state.moveHistory = [];
  state.positionCounts = {};
  state.result = null;
  state.lastMove = null;
  state.resignedBy = null;
  recordPosition(state);
  return state;
}

function parseFen(fen) {
  const parts = fen.trim().split(/\s+/);
  const board = Array(64).fill(null);
  const rows = parts[0].split("/");
  rows.forEach((row, rank) => {
    let file = 0;
    for (const char of row) {
      if (/\d/.test(char)) {
        file += Number(char);
      } else {
        board[rank * 8 + file] = char;
        file += 1;
      }
    }
  });
  return {
    board,
    turn: parts[1],
    castling: {
      K: parts[2].includes("K"),
      Q: parts[2].includes("Q"),
      k: parts[2].includes("k"),
      q: parts[2].includes("q")
    },
    ep: parts[3] === "-" ? -1 : algebraicToIndex(parts[3]),
    halfmove: Number(parts[4]),
    fullmove: Number(parts[5])
  };
}

function boardToFenPlacement(board) {
  const rows = [];
  for (let rank = 0; rank < 8; rank += 1) {
    let row = "";
    let empty = 0;
    for (let file = 0; file < 8; file += 1) {
      const piece = board[rank * 8 + file];
      if (piece) {
        if (empty > 0) {
          row += String(empty);
          empty = 0;
        }
        row += piece;
      } else {
        empty += 1;
      }
    }
    if (empty > 0) row += String(empty);
    rows.push(row);
  }
  return rows.join("/");
}

function stateToFen(state) {
  const rights = ["K", "Q", "k", "q"].filter(key => state.castling[key]).join("") || "-";
  const ep = state.ep === -1 ? "-" : indexToAlgebraic(state.ep);
  return `${boardToFenPlacement(state.board)} ${state.turn} ${rights} ${ep} ${state.halfmove} ${state.fullmove}`;
}

function positionKey(state) {
  const rights = ["K", "Q", "k", "q"].filter(key => state.castling[key]).join("") || "-";
  const ep = state.ep === -1 ? "-" : indexToAlgebraic(state.ep);
  return `${boardToFenPlacement(state.board)} ${state.turn} ${rights} ${ep}`;
}

function recordPosition(state) {
  const key = positionKey(state);
  state.positionCounts[key] = (state.positionCounts[key] || 0) + 1;
}

function pieceColor(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

function opposite(color) {
  return color === "w" ? "b" : "w";
}

function indexToAlgebraic(index) {
  const file = index % 8;
  const rank = 8 - Math.floor(index / 8);
  return FILES[file] + rank;
}

function algebraicToIndex(square) {
  const file = FILES.indexOf(square[0]);
  const rank = 8 - Number(square[1]);
  return rank * 8 + file;
}

function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function kingSquare(state, color) {
  return state.board.indexOf(color === "w" ? "K" : "k");
}

function isSquareAttacked(state, square, byColor) {
  const row = Math.floor(square / 8);
  const col = square % 8;
  const board = state.board;

  const pawn = byColor === "w" ? "P" : "p";
  const pawnSourceRow = row + (byColor === "w" ? 1 : -1);
  for (const dc of [-1, 1]) {
    const sourceCol = col + dc;
    if (inBounds(pawnSourceRow, sourceCol) && board[pawnSourceRow * 8 + sourceCol] === pawn) return true;
  }

  const knight = byColor === "w" ? "N" : "n";
  const knightSteps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightSteps) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && board[r * 8 + c] === knight) return true;
  }

  const bishop = byColor === "w" ? "B" : "b";
  const rook = byColor === "w" ? "R" : "r";
  const queen = byColor === "w" ? "Q" : "q";
  const king = byColor === "w" ? "K" : "k";

  const diagonalDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of diagonalDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const piece = board[r * 8 + c];
      if (piece) {
        if (piece === bishop || piece === queen) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  const straightDirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of straightDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const piece = board[r * 8 + c];
      if (piece) {
        if (piece === rook || piece === queen) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c) && board[r * 8 + c] === king) return true;
    }
  }

  return false;
}

function isKingInCheck(state, color) {
  const square = kingSquare(state, color);
  if (square === -1) return true;
  return isSquareAttacked(state, square, opposite(color));
}

function addSlidingMoves(state, from, color, directions, moves) {
  const row = Math.floor(from / 8);
  const col = from % 8;
  for (const [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const to = r * 8 + c;
      const target = state.board[to];
      if (!target) {
        moves.push({ from, to });
      } else {
        if (pieceColor(target) !== color) moves.push({ from, to });
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function generatePseudoMoves(state, color) {
  const moves = [];
  const board = state.board;

  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!piece || pieceColor(piece) !== color) continue;
    const type = piece.toUpperCase();
    const row = Math.floor(from / 8);
    const col = from % 8;

    if (type === "P") {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const promotionRow = color === "w" ? 0 : 7;
      const oneRow = row + dir;

      if (inBounds(oneRow, col)) {
        const one = oneRow * 8 + col;
        if (!board[one]) {
          if (oneRow === promotionRow) {
            for (const promotion of ["q", "r", "b", "n"]) moves.push({ from, to: one, promotion });
          } else {
            moves.push({ from, to: one });
            if (row === startRow) {
              const twoRow = row + dir + dir;
              const two = twoRow * 8 + col;
              if (!board[two]) moves.push({ from, to: two, doublePawn: true });
            }
          }
        }
      }

      for (const dc of [-1, 1]) {
        const r = row + dir;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const to = r * 8 + c;
        const target = board[to];
        if (target && pieceColor(target) !== color) {
          if (r === promotionRow) {
            for (const promotion of ["q", "r", "b", "n"]) moves.push({ from, to, promotion });
          } else {
            moves.push({ from, to });
          }
        } else if (to === state.ep) {
          const capturedSquare = to + (color === "w" ? 8 : -8);
          const expectedPawn = color === "w" ? "p" : "P";
          if (board[capturedSquare] === expectedPawn) moves.push({ from, to, enPassant: true });
        }
      }
    }

    if (type === "N") {
      const steps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of steps) {
        const r = row + dr;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const to = r * 8 + c;
        if (!board[to] || pieceColor(board[to]) !== color) moves.push({ from, to });
      }
    }

    if (type === "B") addSlidingMoves(state, from, color, [[-1,-1],[-1,1],[1,-1],[1,1]], moves);
    if (type === "R") addSlidingMoves(state, from, color, [[-1,0],[1,0],[0,-1],[0,1]], moves);
    if (type === "Q") addSlidingMoves(state, from, color, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], moves);

    if (type === "K") {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const r = row + dr;
          const c = col + dc;
          if (!inBounds(r, c)) continue;
          const to = r * 8 + c;
          if (!board[to] || pieceColor(board[to]) !== color) moves.push({ from, to });
        }
      }

      const enemy = opposite(color);
      if (color === "w" && from === 60 && !isKingInCheck(state, "w")) {
        if (state.castling.K && board[61] === null && board[62] === null && board[63] === "R" && !isSquareAttacked(state, 61, enemy) && !isSquareAttacked(state, 62, enemy)) {
          moves.push({ from, to: 62, castle: "K" });
        }
        if (state.castling.Q && board[59] === null && board[58] === null && board[57] === null && board[56] === "R" && !isSquareAttacked(state, 59, enemy) && !isSquareAttacked(state, 58, enemy)) {
          moves.push({ from, to: 58, castle: "Q" });
        }
      }
      if (color === "b" && from === 4 && !isKingInCheck(state, "b")) {
        if (state.castling.k && board[5] === null && board[6] === null && board[7] === "r" && !isSquareAttacked(state, 5, enemy) && !isSquareAttacked(state, 6, enemy)) {
          moves.push({ from, to: 6, castle: "K" });
        }
        if (state.castling.q && board[3] === null && board[2] === null && board[1] === null && board[0] === "r" && !isSquareAttacked(state, 3, enemy) && !isSquareAttacked(state, 2, enemy)) {
          moves.push({ from, to: 2, castle: "Q" });
        }
      }
    }
  }

  return moves;
}

function cloneCoreState(state) {
  return {
    board: state.board.slice(),
    turn: state.turn,
    castling: { ...state.castling },
    ep: state.ep,
    halfmove: state.halfmove,
    fullmove: state.fullmove
  };
}

function applyMoveCore(state, move) {
  const board = state.board;
  const piece = board[move.from];
  const color = pieceColor(piece);
  const type = piece.toUpperCase();
  const captured = move.enPassant ? board[move.to + (color === "w" ? 8 : -8)] : board[move.to];

  board[move.from] = null;
  if (move.enPassant) board[move.to + (color === "w" ? 8 : -8)] = null;

  let placedPiece = piece;
  if (move.promotion) placedPiece = color === "w" ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
  board[move.to] = placedPiece;

  if (move.castle === "K") {
    const rookFrom = color === "w" ? 63 : 7;
    const rookTo = color === "w" ? 61 : 5;
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }
  if (move.castle === "Q") {
    const rookFrom = color === "w" ? 56 : 0;
    const rookTo = color === "w" ? 59 : 3;
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }

  if (type === "K") {
    if (color === "w") {
      state.castling.K = false;
      state.castling.Q = false;
    } else {
      state.castling.k = false;
      state.castling.q = false;
    }
  }
  if (piece === "R" && move.from === 63) state.castling.K = false;
  if (piece === "R" && move.from === 56) state.castling.Q = false;
  if (piece === "r" && move.from === 7) state.castling.k = false;
  if (piece === "r" && move.from === 0) state.castling.q = false;
  if (captured === "R" && move.to === 63) state.castling.K = false;
  if (captured === "R" && move.to === 56) state.castling.Q = false;
  if (captured === "r" && move.to === 7) state.castling.k = false;
  if (captured === "r" && move.to === 0) state.castling.q = false;

  state.ep = -1;
  if (type === "P" && Math.abs(move.to - move.from) === 16) state.ep = (move.to + move.from) / 2;

  state.halfmove = type === "P" || captured ? 0 : state.halfmove + 1;
  if (color === "b") state.fullmove += 1;
  state.turn = opposite(color);
  return { piece, captured, color };
}

function generateLegalMoves(state, color = state.turn) {
  const pseudo = generatePseudoMoves(state, color);
  return pseudo.filter(move => {
    const test = cloneCoreState(state);
    applyMoveCore(test, move);
    return !isKingInCheck(test, color);
  });
}

function moveToSan(state, move, legalMovesBefore) {
  const piece = state.board[move.from];
  const type = piece.toUpperCase();
  const target = state.board[move.to];
  const capture = Boolean(target || move.enPassant);
  let san = "";

  if (move.castle === "K") san = "O-O";
  else if (move.castle === "Q") san = "O-O-O";
  else {
    if (type !== "P") {
      san += type;
      const conflicts = legalMovesBefore.filter(candidate => {
        if (candidate.from === move.from || candidate.to !== move.to) return false;
        const candidatePiece = state.board[candidate.from];
        return candidatePiece && candidatePiece.toUpperCase() === type;
      });
      if (conflicts.length > 0) {
        const sameFile = conflicts.some(candidate => candidate.from % 8 === move.from % 8);
        const sameRank = conflicts.some(candidate => Math.floor(candidate.from / 8) === Math.floor(move.from / 8));
        if (!sameFile) san += FILES[move.from % 8];
        else if (!sameRank) san += String(8 - Math.floor(move.from / 8));
        else san += indexToAlgebraic(move.from);
      }
    } else if (capture) {
      san += FILES[move.from % 8];
    }

    if (capture) san += "x";
    san += indexToAlgebraic(move.to);
    if (move.promotion) san += "=" + move.promotion.toUpperCase();
  }

  const test = cloneCoreState(state);
  applyMoveCore(test, move);
  if (isKingInCheck(test, test.turn)) {
    const replies = generateLegalMoves(test, test.turn);
    san += replies.length === 0 ? "#" : "+";
  }
  return san;
}

function insufficientMaterial(state) {
  const nonKings = [];
  for (let i = 0; i < 64; i += 1) {
    const piece = state.board[i];
    if (!piece || piece.toUpperCase() === "K") continue;
    const type = piece.toUpperCase();
    if (["P", "R", "Q"].includes(type)) return false;
    nonKings.push({ piece, square: i, type });
  }
  if (nonKings.length === 0) return true;
  if (nonKings.length === 1 && ["B", "N"].includes(nonKings[0].type)) return true;
  if (nonKings.every(item => item.type === "B")) {
    const colors = nonKings.map(item => {
      const row = Math.floor(item.square / 8);
      const col = item.square % 8;
      return (row + col) % 2;
    });
    return colors.every(color => color === colors[0]);
  }
  return false;
}

function evaluateResult(state) {
  if (state.resignedBy) {
    return {
      type: "resign",
      winner: opposite(state.resignedBy),
      title: `${state.resignedBy === "w" ? "백" : "흑"} 기권`,
      text: `${opposite(state.resignedBy) === "w" ? "백" : "흑"} 승리`
    };
  }

  const legal = generateLegalMoves(state, state.turn);
  const check = isKingInCheck(state, state.turn);
  if (legal.length === 0 && check) {
    const winner = opposite(state.turn);
    return { type: "checkmate", winner, title: "체크메이트", text: `${winner === "w" ? "백" : "흑"} 승리` };
  }
  if (legal.length === 0) return { type: "stalemate", winner: null, title: "스테일메이트", text: "무승부" };
  if (state.halfmove >= 100) return { type: "fifty", winner: null, title: "50수 규칙", text: "무승부" };
  if ((state.positionCounts[positionKey(state)] || 0) >= 3) return { type: "repetition", winner: null, title: "3회 동형 반복", text: "무승부" };
  if (insufficientMaterial(state)) return { type: "material", winner: null, title: "기물 부족", text: "무승부" };
  return null;
}
function commitLegalMove(state, requestedMove) {
  if (state.result) return null;
  const legalMoves = generateLegalMoves(state, state.turn);
  const move = legalMoves.find(candidate =>
    candidate.from === requestedMove.from
    && candidate.to === requestedMove.to
    && (candidate.promotion || null) === (requestedMove.promotion || null)
  );
  if (!move) return null;

  const movingPiece = state.board[move.from];
  const movingColor = state.turn;
  const moveNumber = state.fullmove;
  const captured = move.enPassant
    ? state.board[move.to + (pieceColor(movingPiece) === "w" ? 8 : -8)]
    : state.board[move.to];
  const san = moveToSan(state, move, legalMoves);

  applyMoveCore(state, move);
  state.lastMove = { from: move.from, to: move.to };
  state.moveHistory.push({
    san,
    from: move.from,
    to: move.to,
    promotion: move.promotion || null,
    color: movingColor,
    moveNumber,
    piece: movingPiece,
    captured: captured || null
  });
  recordPosition(state);
  state.result = evaluateResult(state);

  return { captured: captured || null, move, san };
}
export {
  addSlidingMoves,
  commitLegalMove,
  algebraicToIndex,
  applyMoveCore,
  boardToFenPlacement,
  cloneCoreState,
  createInitialGame,
  evaluateResult,
  generateLegalMoves,
  generatePseudoMoves,
  inBounds,
  indexToAlgebraic,
  insufficientMaterial,
  isKingInCheck,
  isSquareAttacked,
  kingSquare,
  moveToSan,
  opposite,
  parseFen,
  pieceColor,
  positionKey,
  recordPosition,
  stateToFen
};
