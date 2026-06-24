import {
  assignOpponent,
  closeRoomRecord,
  createRoomRecord,
  readRoomMeta,
  readRoomState,
  subscribeRoomMeta
} from "../firebase/room-repository.js";

export const roomService = Object.freeze({
  assignOpponent,
  close: closeRoomRecord,
  create: createRoomRecord,
  getMeta: readRoomMeta,
  getState: readRoomState,
  subscribeMeta: subscribeRoomMeta
});
