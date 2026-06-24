import {
  firebaseDb,
  onValue,
  ref,
  runTransaction
} from "./client.js";
import { readRoomState } from "./room-repository.js";

export { readRoomState };

export function subscribeGameState(roomId, listener) {
  return onValue(ref(firebaseDb, "rooms/" + roomId + "/state"), snapshot => listener(snapshot.val()));
}

export function publishGameState(roomId, expectedRevision, payload, action, uid) {
  return runTransaction(ref(firebaseDb, "rooms/" + roomId + "/state"), current => {
    if (!current || Number(current.revision || 0) !== expectedRevision) return;
    return {
      ...payload,
      revision: expectedRevision + 1,
      action,
      updatedBy: uid,
      updatedAt: Date.now()
    };
  }, { applyLocally: false });
}
