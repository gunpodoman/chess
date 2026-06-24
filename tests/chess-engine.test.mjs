import test from "node:test";
import assert from "node:assert/strict";

import {
  START_FEN,
  algebraicToIndex,
  commitLegalMove,
  createInitialGame,
  evaluateResult,
  generateLegalMoves,
  parseFen,
  recordPosition,
  stateToFen
} from "../src/chess/engine.js";
import { gameToPgn } from "../src/chess/notation.js";

function gameFromFen(fen) {
  const game = parseFen(fen);
  game.moveHistory = [];
  game.positionCounts = {};
  game.result = null;
  game.lastMove = null;
  game.resignedBy = null;
  recordPosition(game);
  return game;
}

function findMove(game, from, to, promotion = null) {
  return generateLegalMoves(game).find(move =>
    move.from === algebraicToIndex(from)
    && move.to === algebraicToIndex(to)
    && (move.promotion || null) === promotion
  );
}

function play(game, from, to, promotion = null) {
  const result = commitLegalMove(game, {
    from: algebraicToIndex(from),
    to: algebraicToIndex(to),
    promotion
  });
  assert.ok(result, "Expected legal move " + from + "-" + to);
  return result;
}

test("starting position has 20 legal moves", () => {
  assert.equal(generateLegalMoves(createInitialGame()).length, 20);
});

test("pawns and knights have their expected starting moves", () => {
  const game = createInitialGame();
  assert.ok(findMove(game, "e2", "e3"));
  assert.ok(findMove(game, "e2", "e4"));
  assert.ok(findMove(game, "g1", "f3"));
  assert.ok(findMove(game, "g1", "h3"));
});

test("moves that leave the king in check are rejected", () => {
  const game = gameFromFen("r3k3/8/8/8/8/8/4R3/4K3 b - - 0 1");
  assert.equal(findMove(game, "a8", "a7"), undefined);
});

test("castling moves both king and rook", () => {
  const game = gameFromFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  assert.ok(findMove(game, "e1", "g1"));
  assert.ok(findMove(game, "e1", "c1"));
  play(game, "e1", "g1");
  assert.equal(game.board[algebraicToIndex("g1")], "K");
  assert.equal(game.board[algebraicToIndex("f1")], "R");
});

test("en passant removes the passed pawn", () => {
  const game = gameFromFen("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2");
  const move = findMove(game, "e5", "d6");
  assert.equal(move?.enPassant, true);
  play(game, "e5", "d6");
  assert.equal(game.board[algebraicToIndex("d6")], "P");
  assert.equal(game.board[algebraicToIndex("d5")], null);
});

test("promotion provides all choices and applies the selected piece", () => {
  const game = gameFromFen("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
  const promotions = generateLegalMoves(game)
    .filter(move => move.from === algebraicToIndex("a7") && move.to === algebraicToIndex("a8"))
    .map(move => move.promotion)
    .sort();
  assert.deepEqual(promotions, ["b", "n", "q", "r"]);
  play(game, "a7", "a8", "q");
  assert.equal(game.board[algebraicToIndex("a8")], "Q");
});

test("checkmate is detected", () => {
  const game = createInitialGame();
  play(game, "f2", "f3");
  play(game, "e7", "e5");
  play(game, "g2", "g4");
  const result = play(game, "d8", "h4");
  assert.equal(result.san, "Qh4#");
  assert.equal(game.result?.type, "checkmate");
  assert.equal(game.result?.winner, "b");
});

test("stalemate is detected", () => {
  const game = gameFromFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(evaluateResult(game)?.type, "stalemate");
});

test("insufficient material is detected", () => {
  const game = gameFromFen("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
  assert.equal(evaluateResult(game)?.type, "material");
});

test("FEN parsing and serialization round trip", () => {
  assert.equal(stateToFen(parseFen(START_FEN)), START_FEN);
  const fen = "r3k2r/ppp2ppp/2n5/3pp3/8/2N2N2/PPPP1PPP/R3K2R w KQkq - 4 8";
  assert.equal(stateToFen(parseFen(fen)), fen);
});

test("SAN history and PGN export preserve basic notation", () => {
  const game = createInitialGame();
  assert.equal(play(game, "e2", "e4").san, "e4");
  assert.equal(play(game, "e7", "e5").san, "e5");
  assert.equal(play(game, "g1", "f3").san, "Nf3");

  const pgn = gameToPgn(game, new Date(2026, 5, 24));
  assert.match(pgn, /\[Date "2026\.06\.24"\]/);
  assert.match(pgn, /1\. e4 e5 2\. Nf3 \*/);
});
