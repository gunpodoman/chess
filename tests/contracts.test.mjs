import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function sourceFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await sourceFiles(target));
    else output.push(target);
  }
  return output;
}

test("legacy DOM ids and browser storage keys remain stable", async () => {
  const html = await read("index.html");
  const view = await read("src/views/game-view.js");
  const ids = [
    "board", "bottomPlayer", "chatInput", "chatLog", "copyInviteBtn",
    "copyPgnBtn", "createRoomBtn", "disconnectBtn", "flipBtn", "gameBanner",
    "gameBannerText", "gameBannerTitle", "hostColor", "hostWaitingText",
    "inviteArea", "inviteLinkOutput", "joinInput", "joinRoomBtn",
    "joinStatusText", "logoIcon", "moveList", "networkStatus", "newGameBtn",
    "offlineBtn", "promotionModal", "promotionOptions", "resignBtn",
    "sendChatBtn", "shareInviteBtn", "soundBtn", "statusDot", "tab-host",
    "tab-join", "tab-offline", "toast", "topPlayer"
  ];
  ids.forEach(id => assert.match(html, new RegExp('id="' + id + '"')));
  assert.match(view, /firebaseChessHostRoomV1/);
  assert.match(view, /firebaseChessOpponentSeatV1:/);
  assert.match(view, /#room=/);
});

test("Firebase configuration and room data paths remain stable", async () => {
  const config = await read("src/config/firebase-config.js");
  const firebaseSource = (await Promise.all([
    read("src/firebase/room-repository.js"),
    read("src/firebase/game-state-repository.js"),
    read("src/firebase/presence-repository.js"),
    read("src/firebase/chat-repository.js")
  ])).join("\n");

  assert.match(config, /chess-b0cd7/);
  assert.match(config, /chess-b0cd7-default-rtdb\.firebaseio\.com/);
  for (const pathPart of ["/meta", "/state", "/opponentSeat", "/presence", "/chat"]) {
    assert.ok(firebaseSource.includes(pathPart), pathPart);
  }
  for (const field of ["fen", "moveHistory", "positionCountsJson", "result", "lastMove", "resignedBy"]) {
    assert.ok((await read("src/chess/serialization.js")).includes(field), field);
  }
});

test("source contains neither Unicode chess glyphs nor P2P transports", async () => {
  const files = [
    path.join(root, "index.html"),
    ...await sourceFiles(path.join(root, "src")),
    ...await sourceFiles(path.join(root, "assets", "css"))
  ];
  const source = (await Promise.all(files.map(file => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(source, /[♔♕♖♗♘♙♚♛♜♝♞♟]/u);
  assert.doesNotMatch(source, /PeerJS|RTCPeerConnection|WebRTC|0\.peerjs\.com|openrelay|Metered/i);
  assert.doesNotMatch(source, /\b(?:STUN|TURN)\b/);
});
