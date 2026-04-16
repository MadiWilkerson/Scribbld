import { displayLabel, PROFILE_HUB_VIEWING_KEY } from './savedProfiles'

const USER_NAME_KEY = 'userName'

/** @deprecated Legacy single-device liked ids */
export const LIKED_DRAWING_IDS_KEY = 'likedDrawings'

/** @deprecated Legacy total counts */
export const DRAWING_LIKE_COUNTS_KEY = 'drawingLikeCounts'

/**
 * Per drawing: set of profile display names who liked it (same labels as Profile hub / create flow).
 */
export const DRAWING_LIKERS_BY_USER_KEY = 'drawingLikersByUser'

/** Active identity for likes: hub selection if set, else session userName. */
export function getActiveUserForLikes(): string {
  const hub = localStorage.getItem(PROFILE_HUB_VIEWING_KEY)?.trim()
  const session = localStorage.getItem(USER_NAME_KEY)
  return displayLabel((hub || session) ?? undefined)
}

function readLegacyLikedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(LIKED_DRAWING_IDS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as number[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function readLegacyLikeCounts(): Map<number, number> {
  try {
    const raw = localStorage.getItem(DRAWING_LIKE_COUNTS_KEY)
    if (!raw) return new Map()
    const o = JSON.parse(raw) as Record<string, number>
    const m = new Map<number, number>()
    for (const [k, v] of Object.entries(o)) {
      const id = Number(k)
      if (!Number.isFinite(id) || typeof v !== 'number') continue
      const n = Math.max(0, Math.floor(v))
      if (n > 0) m.set(id, n)
    }
    return m
  } catch {
    return new Map()
  }
}

export function readDrawingLikers(): Map<number, Set<string>> {
  try {
    const raw = localStorage.getItem(DRAWING_LIKERS_BY_USER_KEY)
    if (!raw) return new Map()
    const o = JSON.parse(raw) as Record<string, string[]>
    const m = new Map<number, Set<string>>()
    for (const [k, arr] of Object.entries(o)) {
      const id = Number(k)
      if (!Number.isFinite(id) || !Array.isArray(arr)) continue
      const set = new Set<string>()
      for (const name of arr) {
        const l = displayLabel(name)
        set.add(l)
      }
      if (set.size > 0) m.set(id, set)
    }
    return m
  } catch {
    return new Map()
  }
}

export function writeDrawingLikers(m: Map<number, Set<string>>): void {
  const o: Record<string, string[]> = {}
  for (const [id, set] of m) {
    if (set.size > 0) o[String(id)] = [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }
  localStorage.setItem(DRAWING_LIKERS_BY_USER_KEY, JSON.stringify(o))
}

/**
 * Load per-user likers, or migrate once from legacy single-device liked ids / counts
 * (each old like becomes one entry for the current session user label).
 */
export function loadOrMigrateDrawingLikers(): Map<number, Set<string>> {
  const existing = readDrawingLikers()
  if (existing.size > 0) return existing

  const legacyIds = readLegacyLikedIds()
  const legacyCounts = readLegacyLikeCounts()
  const user = displayLabel(localStorage.getItem(USER_NAME_KEY) ?? undefined)

  const allIds = new Set<number>([...legacyIds, ...legacyCounts.keys()])
  const m = new Map<number, Set<string>>()
  for (const id of allIds) {
    m.set(id, new Set([user]))
  }

  if (m.size > 0) {
    writeDrawingLikers(m)
    localStorage.removeItem(LIKED_DRAWING_IDS_KEY)
    localStorage.removeItem(DRAWING_LIKE_COUNTS_KEY)
  }

  return readDrawingLikers()
}

export function removeDrawingIdFromLikes(drawingId: number): void {
  const m = readDrawingLikers()
  m.delete(drawingId)
  writeDrawingLikers(m)
}

export function removeDrawingIdsFromLikes(removed: Set<number>): void {
  if (removed.size === 0) return
  const m = readDrawingLikers()
  for (const id of removed) m.delete(id)
  writeDrawingLikers(m)
}
