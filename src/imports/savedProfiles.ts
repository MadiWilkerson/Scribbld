import {
  DEFAULT_MONSTER,
  type MonsterConfig,
  parseMonsterConfig,
  stringifyMonsterConfig,
} from './monsterConfig'

export const PROFILE_LIST_KEY = 'savedProfiles'

/** Which profile name the hub is showing; separate from session `userName` so returning to /profile keeps the same selection. */
export const PROFILE_HUB_VIEWING_KEY = 'profileHubViewingName'

export type SavedProfileRow = { name: string; monster: string }

export function displayLabel(name: string | undefined): string {
  const t = name?.trim()
  return t || 'Anonymous'
}

function norm(name: string): string {
  return displayLabel(name).toLowerCase()
}

export function loadSavedProfiles(): SavedProfileRow[] {
  try {
    const raw = localStorage.getItem(PROFILE_LIST_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as SavedProfileRow[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function upsertSavedProfile(name: string, config: MonsterConfig) {
  const label = displayLabel(name)
  const list = loadSavedProfiles()
  const m = stringifyMonsterConfig(config)
  const idx = list.findIndex((p) => norm(p.name) === norm(label))
  const row: SavedProfileRow = { name: label, monster: m }
  if (idx >= 0) list[idx] = row
  else list.push(row)
  localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list))
}

/** Removes one saved profile row (by display name). Returns the updated list. */
export function removeSavedProfileByName(name: string): SavedProfileRow[] {
  const label = displayLabel(name)
  const list = loadSavedProfiles().filter((p) => displayLabel(p.name) !== label)
  localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list))
  return list
}

export function collectUserNamesFromDrawings(drawings: { userName?: string }[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const d of drawings) {
    const l = displayLabel(d.userName)
    const k = norm(l)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(l)
    }
  }
  return out
}

export function mergedUserList(profiles: SavedProfileRow[], drawingNames: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of profiles) {
    const l = displayLabel(p.name)
    const k = norm(l)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(l)
    }
  }
  for (const n of drawingNames) {
    const l = displayLabel(n)
    const k = norm(l)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(l)
    }
  }
  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return out
}

export function resolveMonsterForUser(
  userName: string,
  profiles: SavedProfileRow[],
  drawings: { userName?: string; userMonster?: string }[],
): MonsterConfig {
  const label = displayLabel(userName)
  const fromProfile = profiles.find((p) => displayLabel(p.name) === label)
  if (fromProfile) {
    const m = parseMonsterConfig(fromProfile.monster)
    if (m) return m
  }
  for (const d of drawings) {
    if (displayLabel(d.userName) !== label) continue
    if (!d.userMonster) continue
    const m = parseMonsterConfig(d.userMonster)
    if (m) return m
  }
  return DEFAULT_MONSTER
}
