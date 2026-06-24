import {
  publishGameState,
  readRoomState,
  subscribeGameState
} from "../firebase/game-state-repository.js";

export const gameSyncService = Object.freeze({
  get: readRoomState,
  publish: publishGameState,
  subscribe: subscribeGameState
});
