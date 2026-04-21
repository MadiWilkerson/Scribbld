import type { Drawing } from './drawingRecord'

const DRAWINGS_KEY = 'drawings'

export function loadLegacyDrawingsFromStorage(): Drawing[] {
  try {
    const raw = localStorage.getItem(DRAWINGS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeLegacyDrawing)
  } catch {
    return []
  }
}

export function saveLegacyDrawingsToStorage(drawings: Drawing[]): void {
  localStorage.setItem(DRAWINGS_KEY, JSON.stringify(drawings))
}

function normalizeLegacyDrawing(d: unknown): Drawing {
  const o = d as Record<string, unknown>
  const idRaw = o.id
  const id = typeof idRaw === 'number' ? String(idRaw) : String(idRaw ?? '')
  return {
    id,
    image: String(o.image ?? ''),
    timestamp: String(o.timestamp ?? new Date().toISOString()),
    userName: o.userName != null ? String(o.userName) : undefined,
    userMonster: o.userMonster != null ? String(o.userMonster) : undefined,
    prompt: o.prompt != null ? String(o.prompt) : undefined,
  }
}
