import {
  firebaseDb,
  limitToLast,
  onChildAdded,
  push,
  query,
  ref,
  serverTimestamp,
  set
} from "./client.js";

export function subscribeRoomChat(roomId, listener) {
  const messages = query(ref(firebaseDb, "rooms/" + roomId + "/chat"), limitToLast(100));
  return onChildAdded(messages, snapshot => listener(snapshot.key, snapshot.val()));
}

export async function sendRoomChatMessage(roomId, uid, text) {
  const messageRef = push(ref(firebaseDb, "rooms/" + roomId + "/chat"));
  await set(messageRef, {
    uid,
    text: text.slice(0, 200),
    createdAt: serverTimestamp()
  });
}
