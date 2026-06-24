import { START_FEN, parseFen, recordPosition, stateToFen } from "./engine.js";

export function serializeGame(game) {
  return {
    fen: stateToFen(game),
    moveHistory: game.moveHistory,
    positionCountsJson: JSON.stringify(game.positionCounts || {}),
    result: game.result,
    lastMove: game.lastMove,
    resignedBy: game.resignedBy
  };
}

export function deserializeGame(data) {
  const state = parseFen((data && data.fen) || START_FEN);
  state.moveHistory = data && Array.isArray(data.moveHistory) ? data.moveHistory : [];
  try {
    state.positionCounts = data && typeof data.positionCountsJson === "string"
      ? JSON.parse(data.positionCountsJson)
      : (data && data.positionCounts && typeof data.positionCounts === "object" ? data.positionCounts : {});
  } catch {
    state.positionCounts = {};
  }
  state.result = data && data.result ? data.result : null;
  state.lastMove = data && data.lastMove ? data.lastMove : null;
  state.resignedBy = data && data.resignedBy ? data.resignedBy : null;
  if (Object.keys(state.positionCounts).length === 0) recordPosition(state);
  return state;
}
