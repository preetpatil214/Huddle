import { onValue, ref, set, update } from 'firebase/database'
import { database, firebaseEnabled } from './firebase'

const STORAGE_KEY = 'huddle-local-state'

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeLocal(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

async function digest(value) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase())
  const buffer = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 20)
}

export async function createHuddle({ name, password, home, profileName, userId }) {
  const id = await digest(`${name}:${password}`)
  const member = { name: profileName, latitude: null, longitude: null, sharingEnabled: false, updatedAt: null }
  const huddle = { id, name, home, members: { [userId]: member } }
  if (firebaseEnabled) {
    await set(ref(database, `huddles/${id}`), { name, home, members: { [userId]: member } })
  }
  writeLocal({ huddle, userId, passwordHint: null })
  return huddle
}

export async function joinHuddle({ name, password, profileName, userId }) {
  const id = await digest(`${name}:${password}`)
  const local = readLocal()
  if (!firebaseEnabled && (!local.huddle || local.huddle.id !== id)) throw new Error('Those Huddle details don\'t match.')
  const huddle = local.huddle || { id, name, home: null, members: {} }
  huddle.members[userId] = { name: profileName, latitude: null, longitude: null, sharingEnabled: false, updatedAt: null }
  if (firebaseEnabled) await update(ref(database, `huddles/${id}/members/${userId}`), huddle.members[userId])
  writeLocal({ ...local, huddle, userId })
  return huddle
}

export function saveMemberLocation(huddleId, userId, location) {
  const local = readLocal()
  if (local.huddle?.id === huddleId) {
    local.huddle.members[userId] = { ...local.huddle.members[userId], ...location }
    writeLocal(local)
  }
  if (firebaseEnabled) return update(ref(database, `huddles/${huddleId}/members/${userId}`), location)
}

export function subscribeToHuddle(huddleId, onChange) {
  if (!firebaseEnabled) {
    onChange(readLocal().huddle || null)
    return () => {}
  }
  return onValue(ref(database, `huddles/${huddleId}`), (snapshot) => onChange(snapshot.val() ? { id: huddleId, ...snapshot.val() } : null))
}

export function clearLocalSession() {
  localStorage.removeItem(STORAGE_KEY)
}
