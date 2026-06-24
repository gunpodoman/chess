"use strict";

import {
  commitLegalMove,
  createInitialGame,
  evaluateResult,
  generateLegalMoves,
  opposite,
  pieceColor,
  stateToFen
} from "../chess/engine.js";
import { gameToPgn } from "../chess/notation.js";
import { createAppState } from "../core/app-state.js";
import { createDisposables } from "../core/disposables.js";
import { deserializeGame, serializeGame as serializeGameState } from "../chess/serialization.js";
import { createBoardView } from "../ui/board.js";
import { createChatView } from "../ui/chat.js";
import { createConnectionView } from "../ui/connection.js";
import { createGameBannerView } from "../ui/game-banner.js";
import { createMoveListView } from "../ui/move-list.js";
import { createPieceImage } from "../ui/pieces.js";
import { createPlayersView } from "../ui/players.js";
import { createPromotionView } from "../ui/promotion.js";
import { createToastView } from "../ui/toast.js";
import { authenticateGuest } from "../services/auth-service.js";
import { chatService } from "../services/chat-service.js";
import { gameSyncService } from "../services/game-sync-service.js";
import { presenceService } from "../services/presence-service.js";
import { roomService } from "../services/room-service.js";

export function mountGameView() {
  const boardEl = document.getElementById("board");
  const topPlayerEl = document.getElementById("topPlayer");
  const bottomPlayerEl = document.getElementById("bottomPlayer");
  const moveListEl = document.getElementById("moveList");
  const gameBanner = document.getElementById("gameBanner");
  const gameBannerTitle = document.getElementById("gameBannerTitle");
  const gameBannerText = document.getElementById("gameBannerText");
  const promotionModal = document.getElementById("promotionModal");
  const promotionOptions = document.getElementById("promotionOptions");
  const networkStatus = document.getElementById("networkStatus");
  const statusDot = document.getElementById("statusDot");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const chatLog = document.getElementById("chatLog");
  const chatInput = document.getElementById("chatInput");
  const toastEl = document.getElementById("toast");
  const logoIcon = document.getElementById("logoIcon");

  if (logoIcon) logoIcon.replaceChildren(createPieceImage("n"));

  const appState = createAppState();
  const disposables = createDisposables();
  const boardView = createBoardView(boardEl, onSquareClick);
  const playersView = createPlayersView(topPlayerEl, bottomPlayerEl);
  const moveListView = createMoveListView(moveListEl);
  const chatView = createChatView(chatLog);
  const connectionView = createConnectionView();
  const bannerView = createGameBannerView(gameBanner, gameBannerTitle, gameBannerText);
  const toastView = createToastView(toastEl);
  const promotionView = createPromotionView(promotionModal, promotionOptions, type => {
    const move = appState.pendingPromotion?.find(candidate => candidate.promotion === type);
    promotionView.hide();
    if (move) makeMove(move);
  });
  const HOST_ROOM_STORAGE = "firebaseChessHostRoomV1";
  const OPPONENT_SEAT_PREFIX = "firebaseChessOpponentSeatV1:";
  const connectionId = randomToken(10);


  function makeMove(move, options = {}) {
    const outcome = commitLegalMove(appState.game, move);
    if (!outcome) return false;

    appState.selectedSquare = -1;
    appState.selectedMoves = [];
    appState.pendingPromotion = null;
    renderAll();
    playMoveSound(Boolean(outcome.captured), outcome.san.endsWith("+") || outcome.san.endsWith("#"));
    if (options.send !== false && appState.networkMode === "firebase") {
      publishCurrentGame("move");
    }
    return true;
  }
  function canLocalMove(color) {
    if (appState.game.result || appState.stateWritePending) return false;
    if (appState.networkMode === "offline") return true;
    if (appState.connectionRole === "spectator") return false;
    if (!appState.connected || !appState.roomMeta || !appState.roomMeta.opponentUid) return false;
    return appState.localColor === color;
  }

  function onSquareClick(square) {
    if (appState.pendingPromotion || appState.game.result) return;
    const piece = appState.game.board[square];

    if (!canLocalMove(appState.game.turn)) {
      if (appState.networkMode !== "offline") showToast(appState.connected ? "상대 차례입니다" : "먼저 상대와 연결하세요");
      return;
    }

    if (appState.selectedSquare === -1) {
      if (piece && pieceColor(piece) === appState.game.turn) selectSquare(square);
      return;
    }

    if (piece && pieceColor(piece) === appState.game.turn) {
      selectSquare(square);
      return;
    }

    const choices = appState.selectedMoves.filter(move => move.to === square);
    if (choices.length === 0) {
      appState.selectedSquare = -1;
      appState.selectedMoves = [];
      renderBoard();
      return;
    }

    if (choices.some(move => move.promotion)) {
      appState.pendingPromotion = choices;
      showPromotion(appState.game.turn);
      return;
    }

    makeMove(choices[0]);
  }

  function selectSquare(square) {
    appState.selectedSquare = square;
    appState.selectedMoves = generateLegalMoves(appState.game, appState.game.turn).filter(move => move.from === square);
    renderBoard();
  }

  function showPromotion(color) {
    promotionView.show(color);
  }

  function renderBoard() {
    boardView.render({
      game: appState.game,
      orientation: appState.orientation,
      selectedSquare: appState.selectedSquare,
      selectedMoves: appState.selectedMoves
    });
  }


  function renderPlayers() {
    playersView.render(appState);
  }

  function renderMoves() {
    moveListView.render(appState.game.moveHistory);
  }

  function renderBanner() {
    bannerView.render(appState.game.result);
  }

  function renderAll() {
    renderBoard();
    renderPlayers();
    renderMoves();
    renderBanner();
  }

  function serializeGame() {
    return serializeGameState(appState.game);
  }

  function loadSerializedGame(data) {
    appState.game = deserializeGame(data);
    appState.selectedSquare = -1;
    appState.selectedMoves = [];
    appState.pendingPromotion = null;
    renderAll();
  }

  function newGame(send = true) {
    if (appState.networkMode === "firebase" && appState.connectionRole !== "host") {
      showToast("새 대국은 방장만 시작할 수 있습니다");
      return;
    }
    appState.game = createInitialGame();
    appState.selectedSquare = -1;
    appState.selectedMoves = [];
    appState.pendingPromotion = null;
    renderAll();
    addSystemMessage("새 대국이 시작되었습니다.");
    if (send && appState.networkMode === "firebase") publishCurrentGame("newGame");
  }

  function resign() {
    if (appState.game.result) return;
    const color = appState.networkMode === "offline" ? appState.game.turn : appState.localColor;
    if (!color || appState.connectionRole === "spectator") {
      showToast("대국자만 기권할 수 있습니다");
      return;
    }
    appState.game.resignedBy = color;
    appState.game.result = evaluateResult(appState.game);
    renderAll();
    if (appState.networkMode === "firebase") publishCurrentGame("resign");
  }

  function exportPgn() {
    return gameToPgn(appState.game);
  }

  function randomToken(byteLength = 18) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function setActiveTab(name) {
    connectionView.setActiveTab(name);
  }

  function buildInviteLink(id) {
    const base = location.href.split("#")[0];
    return `${base}#room=${encodeURIComponent(id)}`;
  }

  function parseInvite(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) throw new Error("초대 링크를 입력하세요");
    const hash = value.includes("#") ? value.slice(value.indexOf("#") + 1) : value;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const id = params.get("room") || value;
    if (!/^fc-[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error("올바른 Peer Chess 초대 링크가 아닙니다");
    return { roomId: id };
  }

  function seatStorageKey(id) {
    return OPPONENT_SEAT_PREFIX + id;
  }

  function getStoredSeatToken(id) {
    try { return localStorage.getItem(seatStorageKey(id)) || ""; }
    catch (error) { return ""; }
  }

  function saveSeatToken(id, token) {
    try { localStorage.setItem(seatStorageKey(id), token); }
    catch (error) { console.debug(error); }
  }

  function saveHostRoom(id) {
    try { localStorage.setItem(HOST_ROOM_STORAGE, JSON.stringify({ roomId: id, savedAt: Date.now() })); }
    catch (error) { console.debug(error); }
  }

  function readSavedHostRoom() {
    try {
      const saved = JSON.parse(localStorage.getItem(HOST_ROOM_STORAGE) || "null");
      return saved && /^fc-[A-Za-z0-9_-]{20,}$/.test(saved.roomId || "") ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function clearSavedHostRoom() {
    try { localStorage.removeItem(HOST_ROOM_STORAGE); }
    catch (error) { console.debug(error); }
  }

  async function ensureFirebaseAuth() {
    if (appState.authUser) return appState.authUser;
    appState.authUser = await authenticateGuest();
    return appState.authUser;
  }

  function clearRoomListeners() {
    for (const unsubscribe of appState.roomUnsubscribers) {
      try { unsubscribe(); } catch (error) { console.debug(error); }
    }
    appState.roomUnsubscribers = [];
    appState.seenChatKeys = new Set();
  }

  async function removePresence() {
    if (!appState.presenceSession) return;
    await appState.presenceSession.dispose();
    appState.presenceSession = null;
  }

  function roleForUid(uid) {
    if (!appState.roomMeta || !uid) return "spectator";
    if (uid === appState.roomMeta.hostUid) return "host";
    if (uid === appState.roomMeta.opponentUid) return "opponent";
    return "spectator";
  }

  function applyRole(role) {
    appState.connectionRole = role;
    appState.networkRole = role === "host" ? "host" : "client";
    if (!appState.roomMeta) return;
    if (role === "host") {
      appState.localColor = appState.roomMeta.hostColor;
      appState.remoteColor = appState.roomMeta.guestColor;
      appState.orientation = appState.localColor;
    } else if (role === "opponent") {
      appState.localColor = appState.roomMeta.guestColor;
      appState.remoteColor = appState.roomMeta.hostColor;
      appState.orientation = appState.localColor;
    } else {
      appState.localColor = null;
      appState.remoteColor = null;
      if (!["w", "b"].includes(appState.orientation)) appState.orientation = "w";
    }
    renderAll();
  }

  function updateServerStatus() {
    statusDot.classList.toggle("online", appState.firebaseOnline);
    disconnectBtn.disabled = appState.networkMode === "offline";
    if (appState.networkMode === "offline") {
      networkStatus.textContent = "오프라인 대국";
      appState.connected = false;
      renderPlayers();
      return;
    }

    appState.connected = appState.firebaseOnline;
    const opponentOnline = Boolean(appState.roomMeta && appState.roomMeta.opponentOnline);
    if (!appState.firebaseOnline) {
      networkStatus.textContent = "서버 재연결 중";
    } else if (appState.connectionRole === "host") {
      if (!appState.roomMeta || !appState.roomMeta.opponentUid) networkStatus.textContent = `첫 상대 접속 대기 · 관전자 ${appState.spectatorCount}명`;
      else networkStatus.textContent = `${opponentOnline ? "상대 접속 중" : "상대 재접속 대기"} · 관전자 ${appState.spectatorCount}명`;
      const waiting = document.getElementById("hostWaitingText");
      if (waiting) waiting.textContent = !appState.roomMeta || !appState.roomMeta.opponentUid
        ? `링크를 가장 먼저 연 사람이 상대가 됩니다. 관전자 ${appState.spectatorCount}명`
        : `${opponentOnline ? "상대와 연결되었습니다." : "최초 상대의 재접속을 기다리는 중입니다."} 관전자 ${appState.spectatorCount}명`;
    } else if (appState.connectionRole === "opponent") {
      networkStatus.textContent = `상대로 접속 · 관전자 ${appState.spectatorCount}명`;
      document.getElementById("joinStatusText").textContent = "상대 자리로 연결되었습니다. 새로고침해도 같은 자리가 유지됩니다.";
    } else {
      networkStatus.textContent = `관전 중 · 관전자 ${appState.spectatorCount}명`;
      document.getElementById("joinStatusText").textContent = "이미 상대가 정해져 있어 관전자로 접속했습니다.";
    }
    renderPlayers();
  }

  async function setupPresence() {
    if (!appState.roomId || !appState.authUser || !appState.firebaseOnline) return;
    await removePresence();
    try {
      appState.presenceSession = await presenceService.connect(appState.roomId, appState.authUser.uid, connectionId);
    } catch (error) {
      console.debug("presence:", error);
    }
  }

  function watchRoom(id) {
    clearRoomListeners();

    appState.roomUnsubscribers.push(presenceService.subscribeServer(isOnline => {
      appState.firebaseOnline = isOnline;
      if (appState.firebaseOnline) setupPresence();
      updateServerStatus();
    }));

    appState.roomUnsubscribers.push(roomService.subscribeMeta(id, value => {
      if (!value || value.closed) {
        showToast("방이 종료되었거나 존재하지 않습니다");
        leaveFirebaseRoom(true, true);
        return;
      }
      appState.roomMeta = value;
      const nextRole = roleForUid(appState.authUser && appState.authUser.uid);
      if (nextRole !== appState.connectionRole) applyRole(nextRole);
      updateServerStatus();
    }));

    appState.roomUnsubscribers.push(gameSyncService.subscribe(id, value => {
      if (!value) return;
      const revision = Number(value.revision || 0);
      if (revision === appState.serverRevision && stateToFen(appState.game) === value.fen) return;
      appState.restoringRemoteState = true;
      appState.serverRevision = revision;
      loadSerializedGame(value);
      appState.restoringRemoteState = false;
    }));

    appState.roomUnsubscribers.push(presenceService.subscribeRoom(id, allPresence => {
      const onlineUids = Object.keys(allPresence).filter(uid => allPresence[uid] && Object.keys(allPresence[uid]).length > 0);
      appState.spectatorCount = appState.roomMeta
        ? onlineUids.filter(uid => uid !== appState.roomMeta.hostUid && uid !== appState.roomMeta.opponentUid).length
        : 0;
      if (appState.roomMeta) {
        appState.roomMeta.hostOnline = onlineUids.includes(appState.roomMeta.hostUid);
        appState.roomMeta.opponentOnline = appState.roomMeta.opponentUid ? onlineUids.includes(appState.roomMeta.opponentUid) : false;
      }
      updateServerStatus();
    }));

    appState.roomUnsubscribers.push(chatService.subscribe(id, (key, message) => {
      if (appState.seenChatKeys.has(key)) return;
      appState.seenChatKeys.add(key);
      if (!message || typeof message.text !== "string") return;
      const mine = Boolean(appState.authUser && message.uid === appState.authUser.uid);
      let label = "관전자";
      if (appState.roomMeta && message.uid === appState.roomMeta.hostUid) label = "방장";
      else if (appState.roomMeta && message.uid === appState.roomMeta.opponentUid) label = "상대";
      addChatMessage(mine ? message.text : label + ": " + message.text, mine);
    }));
  }

  async function attachRoom(id, role) {
    appState.roomId = id;
    appState.networkMode = "firebase";
    applyRole(role);
    appState.inviteLink = buildInviteLink(id);
    disconnectBtn.disabled = false;
    if (role === "host") {
      setActiveTab("host");
      document.getElementById("inviteLinkOutput").value = appState.inviteLink;
      document.getElementById("inviteArea").hidden = false;
      saveHostRoom(id);
    } else {
      setActiveTab("join");
      document.getElementById("joinInput").value = appState.inviteLink;
    }
    watchRoom(id);
    addSystemMessage(role === "host" ? "Firebase 서버 방을 열었습니다." : role === "opponent" ? "상대 자리로 입장했습니다." : "관전자로 입장했습니다.");
  }

  async function claimOrRecoverOpponent(id, meta) {
    if (!appState.authUser || appState.authUser.uid === meta.hostUid) return "host";
    if (meta.opponentUid === appState.authUser.uid) return "opponent";

    let token = getStoredSeatToken(id);
    if (!token) {
      token = randomToken(28);
      saveSeatToken(id, token);
    }

    try {
      await roomService.assignOpponent(id, appState.authUser.uid, token);
      return "opponent";
    } catch (error) {
      console.debug("opponent seat claim:", error);
    }

    const latestMeta = await roomService.getMeta(id);
    return latestMeta && latestMeta.opponentUid === appState.authUser.uid ? "opponent" : "spectator";
  }

  async function createRoom() {
    try {
      await ensureFirebaseAuth();
      await leaveFirebaseRoom(false, false);
      networkStatus.textContent = "서버 방 생성 중";
      const selectedColor = document.getElementById("hostColor").value;
      const hostColor = selectedColor === "random" ? (Math.random() < 0.5 ? "w" : "b") : selectedColor;
      const id = "fc-" + randomToken(24);
      appState.game = createInitialGame();
      appState.serverRevision = 0;
      await roomService.create(id, appState.authUser.uid, hostColor, serializeGame());
      appState.roomMeta = await roomService.getMeta(id);
      await attachRoom(id, "host");
      renderAll();
      showToast("초대 링크를 만들었습니다");
    } catch (error) {
      console.error(error);
      showToast("Firebase 방을 만들지 못했습니다. 데이터베이스 규칙을 확인하세요.");
      networkStatus.textContent = "방 생성 실패";
    }
  }

  async function joinRoom(value) {
    try {
      const info = typeof value === "object" && value.roomId ? value : parseInvite(value);
      await ensureFirebaseAuth();
      await leaveFirebaseRoom(false, true);
      networkStatus.textContent = "Firebase 서버 접속 중";
      document.getElementById("joinStatusText").textContent = "방 정보를 확인하고 있습니다.";
      const meta = await roomService.getMeta(info.roomId);
      if (!meta || meta.closed) throw new Error("방이 종료되었거나 존재하지 않습니다");
      appState.roomMeta = meta;
      let role = roleForUid(appState.authUser.uid);
      if (role === "spectator") role = await claimOrRecoverOpponent(info.roomId, meta);
      appState.roomMeta = await roomService.getMeta(info.roomId) || meta;
      role = roleForUid(appState.authUser.uid) === "spectator" ? role : roleForUid(appState.authUser.uid);
      await attachRoom(info.roomId, role);
    } catch (error) {
      console.error(error);
      document.getElementById("joinStatusText").textContent = error.message || "방에 접속하지 못했습니다.";
      showToast(error.message || "방에 접속하지 못했습니다");
    }
  }

  async function restoreHostRoom(saved) {
    try {
      await ensureFirebaseAuth();
      const meta = await roomService.getMeta(saved.roomId);
      if (!meta || meta.closed || meta.hostUid !== appState.authUser.uid) {
        clearSavedHostRoom();
        return;
      }
      appState.roomMeta = meta;
      const state = await roomService.getState(saved.roomId);
      if (state) {
        appState.serverRevision = Number(state.revision || 0);
        loadSerializedGame(state);
      }
      await attachRoom(saved.roomId, "host");
      addSystemMessage("기존 Firebase 방을 복구했습니다.");
    } catch (error) {
      console.error(error);
      clearSavedHostRoom();
    }
  }

  async function publishCurrentGame(action) {
    if (appState.networkMode !== "firebase" || !appState.roomId || !appState.authUser || appState.restoringRemoteState || appState.stateWritePending) return false;
    if (!appState.firebaseOnline) {
      showToast("서버 연결이 복구된 뒤 다시 시도하세요");
      return false;
    }
    appState.stateWritePending = true;
    const expectedRevision = appState.serverRevision;
    const payload = serializeGame();
    try {
      const result = await gameSyncService.publish(appState.roomId, expectedRevision, payload, action, appState.authUser.uid);
      if (!result.committed) {
        const latest = result.snapshot && result.snapshot.val();
        if (latest) {
          appState.serverRevision = Number(latest.revision || 0);
          loadSerializedGame(latest);
        }
        showToast("다른 기기의 최신 대국 상태를 불러왔습니다");
        return false;
      }
      appState.serverRevision = expectedRevision + 1;
      return true;
    } catch (error) {
      console.error(error);
      const latest = await gameSyncService.get(appState.roomId).catch(() => null);
      if (latest) {
        appState.serverRevision = Number(latest.revision || 0);
        loadSerializedGame(latest);
      }
      showToast("서버 저장에 실패해 최신 상태로 되돌렸습니다");
      return false;
    } finally {
      appState.stateWritePending = false;
    }
  }

  async function leaveFirebaseRoom(resetMode = true, preserveHash = false, closeRoom = false) {
    const previousRole = appState.connectionRole;
    const previousRoomId = appState.roomId;
    if (closeRoom && previousRoomId && appState.authUser && previousRole === "host") {
      try { await roomService.close(previousRoomId); }
      catch (error) { console.debug(error); }
    }
    await removePresence();
    clearRoomListeners();
    appState.connected = false;
    appState.firebaseOnline = false;
    appState.roomMeta = null;
    appState.spectatorCount = 0;
    appState.serverRevision = 0;
    appState.stateWritePending = false;
    statusDot.classList.remove("online");
    if (resetMode) {
      if (previousRole === "host") clearSavedHostRoom();
      appState.networkMode = "offline";
      appState.networkRole = null;
      appState.connectionRole = null;
      appState.localColor = null;
      appState.remoteColor = null;
      appState.roomId = null;
      appState.inviteLink = "";
      appState.orientation = "w";
      networkStatus.textContent = "오프라인 대국";
      disconnectBtn.disabled = true;
      document.getElementById("inviteArea").hidden = true;
      document.getElementById("joinStatusText").textContent = "";
      if (!preserveHash && location.hash) history.replaceState(null, "", location.href.split("#")[0]);
      renderAll();
    }
  }

  async function startOffline() {
    const wasHost = appState.connectionRole === "host";
    await leaveFirebaseRoom(true, false, wasHost);
    appState.networkMode = "offline";
    appState.orientation = "w";
    newGame(false);
    addSystemMessage("오프라인 대국 모드입니다.");
    showToast("오프라인 대국을 시작했습니다");
  }

  function addChatMessage(text, mine) {
    chatView.addMessage(text, mine);
  }

  function addSystemMessage(text) {
    chatView.addSystemMessage(text);
  }

  async function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    if (appState.networkMode !== "firebase" || !appState.roomId || !appState.authUser || !appState.firebaseOnline) {
      showToast("온라인 방에 접속한 뒤 채팅할 수 있습니다");
      return;
    }
    chatInput.value = "";
    try {
      await chatService.send(appState.roomId, appState.authUser.uid, text);
    } catch (error) {
      console.error(error);
      showToast("채팅 전송에 실패했습니다");
    }
  }

  async function copyText(text, successMessage) {
    if (!text.trim()) {
      showToast("복사할 내용이 없습니다");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (error) {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.focus();
      temp.select();
      document.execCommand("copy");
      temp.remove();
      showToast(successMessage);
    }
  }


  function showToast(text) {
    toastView.show(text);
  }

  function playMoveSound(capture, check) {
    if (!appState.soundEnabled) return;
    try {
      appState.audioContext = appState.audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const now = appState.audioContext.currentTime;
      const oscillator = appState.audioContext.createOscillator();
      const gain = appState.audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(check ? 660 : capture ? 430 : 520, now);
      oscillator.frequency.exponentialRampToValueAtTime(check ? 520 : capture ? 350 : 430, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      oscillator.connect(gain).connect(appState.audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.12);
    } catch (error) {
      console.debug(error);
    }
  }

  document.querySelectorAll(".tab").forEach(tab => {
    disposables.listen(tab, "click", () => setActiveTab(tab.dataset.tab));
  });

  disposables.listen(document.getElementById("offlineBtn"), "click", startOffline);
  disposables.listen(document.getElementById("createRoomBtn"), "click", createRoom);
  disposables.listen(document.getElementById("joinRoomBtn"), "click", () => joinRoom(document.getElementById("joinInput").value));
  disposables.listen(document.getElementById("copyInviteBtn"), "click", () => copyText(appState.inviteLink, "초대 링크를 복사했습니다"));
  disposables.listen(document.getElementById("shareInviteBtn"), "click", async () => {
    if (!appState.inviteLink) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Peer Chess 초대", text: "체스 한 판 두시겠습니까?", url: appState.inviteLink });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
        console.debug(error);
      }
    }
    copyText(appState.inviteLink, "초대 링크를 복사했습니다");
  });
  disposables.listen(document.getElementById("copyPgnBtn"), "click", () => copyText(exportPgn(), "PGN을 복사했습니다"));
  disposables.listen(disconnectBtn, "click", async () => {
    const closeRoom = appState.connectionRole === "host";
    await leaveFirebaseRoom(true, false, closeRoom);
    addSystemMessage(closeRoom ? "방을 종료했습니다." : "방에서 나왔습니다.");
    showToast(closeRoom ? "방을 종료했습니다" : "방에서 나왔습니다");
  });
  disposables.listen(document.getElementById("flipBtn"), "click", () => {
    appState.orientation = opposite(appState.orientation);
    renderAll();
  });
  disposables.listen(document.getElementById("newGameBtn"), "click", () => newGame(true));
  disposables.listen(document.getElementById("resignBtn"), "click", resign);
  disposables.listen(document.getElementById("soundBtn"), "click", event => {
    appState.soundEnabled = !appState.soundEnabled;
    event.currentTarget.textContent = appState.soundEnabled ? "소리 켜짐" : "소리 꺼짐";
  });
  disposables.listen(document.getElementById("sendChatBtn"), "click", sendChat);
  disposables.listen(chatInput, "keydown", event => {
    if (event.key === "Enter") sendChat();
  });
  disposables.listen(window, "beforeunload", () => {
    if (appState.presenceSession) appState.presenceSession.removeNow().catch(() => {});
  });
  async function initializeOnlineSystem() {
    renderAll();
    addSystemMessage("대국 준비가 완료되었습니다.");
    try {
      await ensureFirebaseAuth();
    } catch (error) {
      console.error(error);
      showToast("Firebase 익명 인증에 실패했습니다");
      return;
    }

    if (location.hash.includes("room=")) {
      try {
        const info = parseInvite(location.href);
        setActiveTab("join");
        document.getElementById("joinInput").value = location.href;
        await joinRoom(info);
      } catch (error) {
        showToast(error.message);
      }
    } else {
      const savedHostRoom = readSavedHostRoom();
      if (savedHostRoom) await restoreHostRoom(savedHostRoom);
    }
  }

  initializeOnlineSystem();

  return {
    destroy() {
      disposables.dispose();
      toastView.destroy();
      clearRoomListeners();
      removePresence();
    }
  };
}
