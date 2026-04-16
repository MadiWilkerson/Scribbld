export const MONSTER_COLORS = ['Blue', 'Green', 'Orange', 'Pink', 'Purple', 'Yellow'] as const
export type MonsterColor = (typeof MONSTER_COLORS)[number]

export const MONSTER_SHAPES = [1, 2, 3, 4, 5, 6] as const
export type MonsterShape = (typeof MONSTER_SHAPES)[number]

export type MonsterFeature = 1 | 2 | 3

export interface MonsterConfig {
  v: 1
  shape: MonsterShape
  color: MonsterColor
  eye: MonsterFeature
  mouth: MonsterFeature
  horn: MonsterFeature
}

export const DEFAULT_MONSTER: MonsterConfig = {
  v: 1,
  shape: 1,
  color: 'Blue',
  eye: 1,
  mouth: 1,
  horn: 1,
}

export function monsterBodyUrl(shape: MonsterShape, color: MonsterColor): string {
  return `/assets/scribbld_Monster${shape}${color}.svg`
}

export function eyeUrl(n: MonsterFeature): string {
  return `/assets/scribbld_Eye${n}.svg`
}

export function mouthUrl(n: MonsterFeature): string {
  return `/assets/scribbld_Mouth${n}.svg`
}

export function hornUrl(n: MonsterFeature): string {
  return `/assets/scribbld_Horn${n}.svg`
}

export function parseMonsterConfig(raw: string | null | undefined): MonsterConfig | null {
  if (!raw || raw.startsWith('data:') || raw.startsWith('http') || raw.startsWith('/')) {
    return null
  }
  try {
    const o = JSON.parse(raw) as Partial<MonsterConfig>
    if (o.v !== 1 || !o.shape || !o.color) return null
    if (!MONSTER_SHAPES.includes(o.shape as MonsterShape)) return null
    if (!MONSTER_COLORS.includes(o.color as MonsterColor)) return null
    const eye = (o.eye ?? 1) as MonsterFeature
    const mouth = (o.mouth ?? 1) as MonsterFeature
    const horn = (o.horn ?? 1) as MonsterFeature
    if (![1, 2, 3].includes(eye) || ![1, 2, 3].includes(mouth) || ![1, 2, 3].includes(horn)) return null
    return {
      v: 1,
      shape: o.shape as MonsterShape,
      color: o.color as MonsterColor,
      eye,
      mouth,
      horn,
    }
  } catch {
    return null
  }
}

export function stringifyMonsterConfig(c: MonsterConfig): string {
  return JSON.stringify(c)
}
