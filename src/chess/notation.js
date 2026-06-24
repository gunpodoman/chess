export function gameToPgn(game, date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  let resultTag = "*";
  if (game.result) {
    if (game.result.winner === "w") resultTag = "1-0";
    else if (game.result.winner === "b") resultTag = "0-1";
    else resultTag = "1/2-1/2";
  }

  const headers = [
    '[Event "Peer Chess"]',
    '[Site "GitHub Pages"]',
    `[Date "${yyyy}.${mm}.${dd}"]`,
    '[Round "1"]',
    '[White "White"]',
    '[Black "Black"]',
    `[Result "${resultTag}"]`
  ];
  const bodyParts = [];
  for (let index = 0; index < game.moveHistory.length; index += 2) {
    const white = game.moveHistory[index] ? game.moveHistory[index].san : "";
    const black = game.moveHistory[index + 1] ? " " + game.moveHistory[index + 1].san : "";
    bodyParts.push(`${index / 2 + 1}. ${white}${black}`);
  }
  bodyParts.push(resultTag);
  return headers.join("\n") + "\n\n" + bodyParts.join(" ");
}
