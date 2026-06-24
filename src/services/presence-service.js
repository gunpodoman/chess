import {
  createPresenceSession,
  subscribeRoomPresence,
  subscribeServerConnection
} from "../firebase/presence-repository.js";

export const presenceService = Object.freeze({
  connect: createPresenceSession,
  subscribeRoom: subscribeRoomPresence,
  subscribeServer: subscribeServerConnection
});
