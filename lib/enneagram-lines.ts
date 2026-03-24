export const RELEASE_LINES: Record<number, number> = {
  1: 7, 2: 4, 3: 6, 4: 1, 5: 8,
  6: 9, 7: 5, 8: 2, 9: 3
}

export const STRESS_LINES: Record<number, number> = {
  1: 4, 2: 8, 3: 9, 4: 2, 5: 7,
  6: 3, 7: 1, 8: 5, 9: 6
}

export const CENTER_MAP: Record<number, 'Body' | 'Heart' | 'Head'> = {
  8: 'Body', 9: 'Body', 1: 'Body',
  2: 'Heart', 3: 'Heart', 4: 'Heart',
  5: 'Head', 6: 'Head', 7: 'Head'
}

export const TYPE_NAMES: Record<number, string> = {
  1: 'The Reformer',
  2: 'The Helper',
  3: 'The Achiever',
  4: 'The Individualist',
  5: 'The Investigator',
  6: 'The Loyalist',
  7: 'The Enthusiast',
  8: 'The Challenger',
  9: 'The Peacemaker'
}

export const CLOCKWISE_ORDER: number[] = [9, 1, 2, 3, 4, 5, 6, 7, 8]

export function selectTritype(
  typeScores: Record<number, number>
): {
  tritype: string
  body: number
  heart: number
  head: number
} {
  const sorted = Object.entries(typeScores)
    .map(([t, s]) => ({ type: Number(t), score: s }))
    .sort((a, b) => b.score - a.score)

  const body = sorted.find(t => CENTER_MAP[t.type] === 'Body')
  const heart = sorted.find(t => CENTER_MAP[t.type] === 'Heart')
  const head = sorted.find(t => CENTER_MAP[t.type] === 'Head')

  if (!body || !heart || !head) {
    console.error('[tritype] could not find type for all centers', { typeScores })
    return { tritype: '', body: 0, heart: 0, head: 0 }
  }

  // Core type (overall highest) goes first, then the other two by score
  const coreType = sorted[0] // Overall highest scoring type
  const coreCenter = CENTER_MAP[coreType.type]
  const others = [body, heart, head]
    .filter(t => CENTER_MAP[t.type] !== coreCenter)
    .sort((a, b) => b.score - a.score)

  const ordered = [coreType, ...others].map(t => t.type)

  return {
    tritype: ordered.join('-'),
    body: body.type,
    heart: heart.type,
    head: head.type
  }
}

export function getLowestType(
  typeScores: Record<number, number>
): number {
  const entries = Object.entries(typeScores)
  if (entries.length === 0) return 0
  return Number(entries.sort(([, a], [, b]) => a - b)[0][0])
}

export function getSecondaryInfluences(
  typeScores: Record<number, number>,
  tritype: { body: number; heart: number; head: number }
): number[] {
  const tritypeSet = new Set(Object.values(tritype))
  return Object.entries(typeScores)
    .map(([t, s]) => ({ type: Number(t), score: s }))
    .sort((a, b) => b.score - a.score)
    .filter(t => !tritypeSet.has(t.type))
    .slice(0, 2)
    .map(t => t.type)
}

export function getSweepOrder(leadingType: number): number[] {
  const startIdx = CLOCKWISE_ORDER.indexOf(leadingType)
  if (startIdx === -1) return CLOCKWISE_ORDER
  return [
    ...CLOCKWISE_ORDER.slice(startIdx),
    ...CLOCKWISE_ORDER.slice(0, startIdx)
  ]
}

export function getWingTypes(leadingType: number): number[] {
  const circle = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const idx = circle.indexOf(leadingType)
  if (idx === -1) return []
  const prev = circle[(idx - 1 + 9) % 9]
  const next = circle[(idx + 1) % 9]
  return [prev, next]
}
