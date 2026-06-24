const PIECE_ASSETS = Object.freeze({
  K: new URL("../../assets/pieces/white/king.svg", import.meta.url).href,
  Q: new URL("../../assets/pieces/white/queen.svg", import.meta.url).href,
  R: new URL("../../assets/pieces/white/rook.svg", import.meta.url).href,
  B: new URL("../../assets/pieces/white/bishop.svg", import.meta.url).href,
  N: new URL("../../assets/pieces/white/knight.svg", import.meta.url).href,
  P: new URL("../../assets/pieces/white/pawn.svg", import.meta.url).href,
  k: new URL("../../assets/pieces/black/king.svg", import.meta.url).href,
  q: new URL("../../assets/pieces/black/queen.svg", import.meta.url).href,
  r: new URL("../../assets/pieces/black/rook.svg", import.meta.url).href,
  b: new URL("../../assets/pieces/black/bishop.svg", import.meta.url).href,
  n: new URL("../../assets/pieces/black/knight.svg", import.meta.url).href,
  p: new URL("../../assets/pieces/black/pawn.svg", import.meta.url).href
});

export function pieceAsset(piece) {
  const asset = PIECE_ASSETS[piece];
  if (!asset) throw new Error("Unknown chess piece: " + piece);
  return asset;
}

export function createPieceImage(piece, className = "") {
  const image = document.createElement("img");
  image.src = pieceAsset(piece);
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  image.draggable = false;
  if (className) image.className = className;
  return image;
}
