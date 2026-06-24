import {
  browserLocalPersistence,
  firebaseAuth,
  setPersistence,
  signInAnonymously
} from "./client.js";

export async function ensureAnonymousUser() {
  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
  } catch (error) {
    console.debug("Firebase auth persistence:", error);
  }
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  const credential = await signInAnonymously(firebaseAuth);
  return credential.user;
}
