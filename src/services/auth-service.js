import { ensureAnonymousUser } from "../firebase/auth-repository.js";

export function authenticateGuest() {
  return ensureAnonymousUser();
}
