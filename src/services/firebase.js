import { getApps, initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Object.values(firebaseConfig).every(Boolean)
export const firebaseApp = firebaseEnabled
  ? getApps()[0] || initializeApp(firebaseConfig)
  : null
export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const database = firebaseApp ? getDatabase(firebaseApp) : null

export async function ensureAnonymousUser() {
  if (!auth) return { uid: `local-${crypto.randomUUID()}` }
  if (auth.currentUser) return auth.currentUser
  const result = await signInAnonymously(auth)
  return result.user
}

export function subscribeToAuth(onChange) {
  if (!auth) {
    onChange(null)
    return () => {}
  }
  return onAuthStateChanged(auth, onChange)
}
