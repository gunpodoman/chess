import { createInitialGame } from "../chess/engine.js";

export function createAppState() {
  return {
    game: createInitialGame(),
    selectedSquare: -1,
    selectedMoves: [],
    orientation: "w",
    pendingPromotion: null,
    soundEnabled: true,
    audioContext: null,
    networkMode: "offline",
    networkRole: null,
    connectionRole: null,
    localColor: null,
    remoteColor: null,
    connected: false,
    firebaseOnline: false,
    authUser: null,
    roomId: null,
    inviteLink: "",
    roomMeta: null,
    spectatorCount: 0,
    serverRevision: 0,
    stateWritePending: false,
    presenceSession: null,
    roomUnsubscribers: [],
    seenChatKeys: new Set(),
    restoringRemoteState: false
  };
}
