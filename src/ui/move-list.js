function createMoveRow() {
  const row = document.createElement("div");
  row.className = "move-row";
  const number = document.createElement("span");
  number.className = "move-no";
  const white = document.createElement("span");
  const black = document.createElement("span");
  row.append(number, white, black);
  return { row, number, white, black };
}

export function createMoveListView(element) {
  const rows = [];
  const empty = document.createElement("div");
  empty.className = "hint";
  empty.textContent = "아직 둔 수가 없습니다.";

  return {
    render(moveHistory) {
      if (moveHistory.length === 0) {
        element.replaceChildren(empty);
        return;
      }

      const requiredRows = Math.ceil(moveHistory.length / 2);
      while (rows.length < requiredRows) rows.push(createMoveRow());
      rows.forEach((view, index) => {
        view.row.hidden = index >= requiredRows;
        if (index >= requiredRows) return;
        view.number.textContent = String(index + 1) + ".";
        view.white.textContent = moveHistory[index * 2]?.san || "";
        view.black.textContent = moveHistory[index * 2 + 1]?.san || "";
      });
      element.replaceChildren(...rows.map(view => view.row));
      element.scrollTop = element.scrollHeight;
    }
  };
}
