import { get, onValue, ref, set, update } from 'firebase/database'
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
  const id = crypto.randomUUID().replaceAll('-', '')
  let code = id.slice(0, 8).toUpperCase()
  if (firebaseEnabled) {
    while ((await get(ref(database, `huddleCodes/${code}`))).exists()) {
      code = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
    }
  } else {
    const existingCodes = new Set(getStoredHuddles().map((item) => item.code))
    while (existingCodes.has(code)) code = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
  }
  const member = { name: profileName, latitude: null, longitude: null, sharingEnabled: false, updatedAt: null }
  const huddle = { id, code, name, home, members: { [userId]: member } }
  if (firebaseEnabled) {
    await set(ref(database, `huddles/${id}`), { code, name, home, members: { [userId]: member } })
    await update(ref(database, `users/${userId}/huddles`), { [id]: true })
    await set(ref(database, `huddleCodes/${code}`), id)
  }
  const local = readLocal()
  writeLocal({ ...local, huddle, huddles: { ...(local.huddles || {}), [id]: huddle }, memberships: { ...(local.memberships || {}), [id]: true }, userId, passwordHint: null })
  return huddle
}

export async function joinHuddle({ name, password, profileName, userId }) {
  const possibleCode = name.trim().toUpperCase()
  let id = possibleCode
  if (firebaseEnabled && possibleCode.length <= 12) {
    const codeSnapshot = await get(ref(database, `huddleCodes/${possibleCode}`))
    if (codeSnapshot.exists()) id = codeSnapshot.val()
  }
  if (!firebaseEnabled && possibleCode.length <= 12) {
    const localMatch = Object.values(readLocal().huddles || {}).find((item) => item.code === possibleCode)
    if (localMatch) id = localMatch.id
  }
  if (id === possibleCode && possibleCode.length !== 20) id = await digest(`${name}:${password}`)
  const local = readLocal()
  const storedHuddle = local.huddles?.[id] || (local.huddle?.id === id ? local.huddle : null)
  let remoteHuddle = null
  if (firebaseEnabled && !storedHuddle) {
    const snapshot = await get(ref(database, `huddles/${id}`))
    remoteHuddle = snapshot.exists() ? { id, ...snapshot.val() } : null
  }
  if (!storedHuddle && !remoteHuddle) throw new Error('That Huddle code or password does not match.')
  const huddle = storedHuddle || remoteHuddle
  huddle.members[userId] = { name: profileName, latitude: null, longitude: null, sharingEnabled: false, updatedAt: null }
  if (firebaseEnabled) {
    await update(ref(database, `huddles/${id}/members/${userId}`), huddle.members[userId])
    await update(ref(database, `users/${userId}/huddles`), { [id]: true })
  }
  writeLocal({ ...local, huddle, huddles: { ...(local.huddles || {}), [id]: huddle }, memberships: { ...(local.memberships || {}), [id]: true }, userId })
  return huddle
}

export function getStoredHuddles() {
  const local = readLocal()
  return Object.values(local.huddles || {})
}

export function subscribeToUserHuddles(userId, onChange) {
  if (!firebaseEnabled) {
    onChange(getStoredHuddles())
    return () => {}
  }
  return onValue(ref(database, `users/${userId}/huddles`), async (snapshot) => {
    const ids = Object.keys(snapshot.val() || {})
    const records = await Promise.all(ids.map(async (id) => {
      const huddleSnapshot = await get(ref(database, `huddles/${id}`))
      return huddleSnapshot.exists() ? { id, ...huddleSnapshot.val() } : null
    }))
    onChange(records.filter(Boolean))
  })
}

export function saveMemberLocation(huddleId, userId, location) {
  const local = readLocal()
  if (local.huddle?.id === huddleId) {
    local.huddle.members[userId] = { ...local.huddle.members[userId], ...location }
    local.huddles = { ...(local.huddles || {}), [huddleId]: local.huddle }
    writeLocal(local)
  }
  if (firebaseEnabled) return update(ref(database, `huddles/${huddleId}/members/${userId}`), location)
}

export function subscribeToHuddle(huddleId, onChange) {
  if (!firebaseEnabled) {
    const local = readLocal()
    onChange(local.huddles?.[huddleId] || (local.huddle?.id === huddleId ? local.huddle : null))
    return () => {}
  }
  return onValue(ref(database, `huddles/${huddleId}`), (snapshot) => onChange(snapshot.val() ? { id: huddleId, ...snapshot.val() } : null))
}

export function clearLocalSession() {
  localStorage.removeItem(STORAGE_KEY)
}
