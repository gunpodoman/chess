import {
  firebaseDb,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set
} from "./client.js";

export function subscribeServerConnection(listener) {
  return onValue(ref(firebaseDb, ".info/connected"), snapshot => listener(snapshot.val() === true));
}

export function subscribeRoomPresence(roomId, listener) {
  return onValue(ref(firebaseDb, "rooms/" + roomId + "/presence"), snapshot => listener(snapshot.val() || {}));
}

export async function createPresenceSession(roomId, uid, connectionId) {
  const presenceRef = ref(firebaseDb, "rooms/" + roomId + "/presence/" + uid + "/" + connectionId);
  const disconnect = onDisconnect(presenceRef);
  await disconnect.remove();
  await set(presenceRef, { connectedAt: serverTimestamp() });

  return {
    async dispose() {
      try { await disconnect.cancel(); } catch (error) { console.debug(error); }
      try { await remove(presenceRef); } catch (error) { console.debug(error); }
    },
    removeNow() {
      return remove(presenceRef);
    }
  };
}
