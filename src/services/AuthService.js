import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { getFirebaseAuth, isFirebaseConfigured } from "../firebase";

function randomQuickLoginEmail() {
  return `quick-${crypto.randomUUID()}@motion-quicklogin.local`;
}

function randomQuickLoginPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
}

class AuthService {
  constructor() {
    this.user = null;
    // False until onAuthStateChanged has fired at least once, so an access
    // decision waits for the real answer instead of acting on the
    // momentarily-null state reported before a persisted session resolves.
    this.ready = false;
    this.listeners = new Set();
    this._initialized = false;
  }

  // Deferred until the first subscribe()/method call (not the constructor),
  // so importing this file is safe even when Firebase isn't configured at all.
  _ensureInit() {
    if (this._initialized) return;
    this._initialized = true;

    if (!isFirebaseConfigured()) {
      this.ready = true;
      return;
    }

    onAuthStateChanged(getFirebaseAuth(), (user) => {
      this.user = user;
      this.ready = true;
      this.listeners.forEach((callback) => callback(user));
    });
  }

  isConfigured() {
    return isFirebaseConfigured();
  }

  isReady() {
    this._ensureInit();
    return this.ready;
  }

  // Returns an unsubscribe function - call from
  // useEffect(() => AuthService.subscribe(setUser), []).
  subscribe(callback) {
    this._ensureInit();
    this.listeners.add(callback);
    callback(this.user);
    return () => this.listeners.delete(callback);
  }

  getCurrentUser() {
    this._ensureInit();
    return this.user;
  }

  async signInWithGoogle() {
    this._ensureInit();
    return signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  }

  async signUpWithEmail(email, password) {
    this._ensureInit();
    return createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  async signInWithEmail(email, password) {
    this._ensureInit();
    return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  async signOut() {
    this._ensureInit();
    return firebaseSignOut(getFirebaseAuth());
  }

  // A live password in a URL is a bearer secret: anyone who captures it can
  // sign in. Kept in the fragment, not the query string, so it never reaches
  // servers, `Referer` headers, or analytics.
  async createQuickLoginLink() {
    this._ensureInit();

    const email = randomQuickLoginEmail();
    const password = randomQuickLoginPassword();
    await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);

    const params = new URLSearchParams({ qrEmail: email, qrPass: password });
    return `${window.location.origin}/cloud#${params.toString()}`;
  }

  // Call once on page load. Clears the hash immediately after use so the
  // credentials don't linger in the address bar/history.
  async consumeQuickLoginParams() {
    this._ensureInit();

    const params = new URLSearchParams(window.location.hash.slice(1));
    const email = params.get("qrEmail");
    const password = params.get("qrPass");
    if (!email || !password) return false;

    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);

    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    return true;
  }
}

const authService = new AuthService();
export default authService;
