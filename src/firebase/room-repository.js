import {
  firebaseDb,
  get,
  onValue,
  ref,
  serverTimestamp,
  set
} from "./client.js";

const roomPath = roomId => "rooms/" + roomId;

export async function createRoomRecord(roomId, hostUid, hostColor, state) {
  await set(ref(firebaseDb, roomPath(roomId)), {
    meta: {
      hostUid,
      hostColor,
      guestColor: hostColor === "w" ? "b" : "w",
      createdAt: serverTimestamp(),
      closed: false
    },
    state: {
      ...state,
      revision: 0,
      action: "create",
      updatedBy: hostUid,
      updatedAt: serverTimestamp()
    }
  });
}

export async function readRoomMeta(roomId) {
  const snapshot = await get(ref(firebaseDb, roomPath(roomId) + "/meta"));
  return snapshot.val();
}

export async function readRoomState(roomId) {
  const snapshot = await get(ref(firebaseDb, roomPath(roomId) + "/state"));
  return snapshot.exists() ? snapshot.val() : null;
}

export function subscribeRoomMeta(roomId, listener) {
  return onValue(ref(firebaseDb, roomPath(roomId) + "/meta"), snapshot => listener(snapshot.val()));
}

export async function assignOpponent(roomId, uid, token) {
  await set(ref(firebaseDb, roomPath(roomId) + "/opponentSeat"), { uid, token });
  await set(ref(firebaseDb, roomPath(roomId) + "/meta/opponentUid"), uid);
}

export function closeRoomRecord(roomId) {
  return set(ref(firebaseDb, roomPath(roomId) + "/meta/closed"), true);
}
