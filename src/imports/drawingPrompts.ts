const STORAGE_PROMPT = 'scribbleCurrentPrompt'
const STORAGE_STARTED = 'scribblePromptStartedAt'
const STORAGE_RECENT = 'scribblePromptRecentHistory'

/** How long the same prompt stays active app-wide (scribble creator). */
export const SCRIBBLE_PROMPT_DURATION_MS = 60 * 60 * 1000

/** A prompt won’t be chosen again while it appears in this rolling window. */
export const SCRIBBLE_PROMPT_NO_REPEAT_MS = 12 * 60 * 60 * 1000

export type ScribblePromptSession = { text: string; expiresAt: number }

type PromptHistoryEntry = { text: string; at: number }

/** Shown while creating a drawing; stored on save so the profile gallery can recall it. Order is not significant (selection is random). */
export const DRAWING_PROMPTS: readonly string[] = [
  'Something that made you smile today',
  'Your favorite place',
  'A creature from another planet',
  'What you had for breakfast',
  'Your dream house',
  'A plant that doesn’t exist yet',
  'The weather in one picture',
  'Your mood as a pattern',
  'Something tiny, zoomed in',
  'A gift you’d give a friend',
  'Your favorite season',
  'A song, without using words',
  'What’s outside your window',
  'A made-up holiday',
  'Your pet — real or imaginary',
  'Your favorite animal',
  'Something too heavy to pick up',
  'Your dream snack right now',
  'Something that feels cozy',
  'Your mood as a weather pattern',
  'A place you wish you were',
  'Your favorite color as a character',
  'Something that smells really good',
  'A tiny version of something big',
  'Something that makes you laugh',
  'Your least favorite chore',
  'A snack with a personality',
  'Something that is always lost',
  'A very dramatic cloud',
  'Your favorite season as a face',
  'Something that is way too loud',
  'A shy object',
  'Something that feels nostalgic',
  'Your dream pet',
  'Something that is always late',
  'A very fancy version of something boring',
  'Something that is secretly alive',
  'A grumpy food',
  'Something that is super soft',
  'Your favorite holiday vibe',
  'Something that is way too expensive',
  'A chaotic morning',
  'Something that is glowing',
  'Your comfort object',
  'Something that is always sticky',
  'A sleepy animal',
  'Something that is melting',
  'A proud object',
  'Something that is really tiny',
  'Your favorite drink as a character',
  'Something that is confused',
  'A happy accident',
  'Something that is floating',
  'A dramatic entrance',
  'Something that is always cold',
  'A silly fear',
  'Something that is upside down',
  'A very jealous object',
  'Something that sparkles',
  'Your favorite sound',
  'Something that is hiding',
  'A very fast thing',
  'Something that is tangled',
  'A cozy corner',
  'Something that is about to fall',
  'A mischievous character',
  'Something that is always broken',
  'A proud pet',
  'Something that is way too big',
  'A snack you regret',
  'Something that is dancing',
  'A very serious fruit',
  'Something that is glowing in the dark',
  'A rainy day mood',
  'Something that is stuck',
  'A very polite object',
  'Something that is brand new',
  'A tiny adventure',
  'Something that is spinning',
  'A very dramatic reaction',
  'Something that is invisible',
  'A favorite memory',
  'Something that is falling apart',
  'A happy place',
  'Something that is buzzing',
  'A very stylish animal',
  'Something that is always clean',
  'A cozy outfit',
  'Something that is too sweet',
  'A very tired object',
  'Something that is jumping',
  'A secret hiding spot',
  'Something that is magical',
  'A very awkward moment',
  'Something that is always early',
  'A snack from your childhood',
  'Something that is glowing with pride',
  'A very confused animal',
  'Something that is cracking',
  'A silly little guy',
  'Something that is full',
  'A tiny world',
  'Something that is echoing',
  'A very dramatic pet',
  'Something that is wobbly',
  'A favorite outfit',
  'Something that is sleepy',
  'A weird invention',
  'Something that is almost done',
  'A very proud snack',
  'Something that is floating away',
  'A chaotic desk',
  'Something that is too cute',
  'Your day in one doodle',
]

function readPromptHistory(now: number): PromptHistoryEntry[] {
  const raw = localStorage.getItem(STORAGE_RECENT)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const cutoff = now - SCRIBBLE_PROMPT_NO_REPEAT_MS
    return parsed
      .filter(
        (e): e is PromptHistoryEntry =>
          e != null &&
          typeof (e as PromptHistoryEntry).text === 'string' &&
          typeof (e as PromptHistoryEntry).at === 'number',
      )
      .filter((e) => e.at >= cutoff)
  } catch {
    return []
  }
}

function writePromptHistory(entries: PromptHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_RECENT, JSON.stringify(entries))
  } catch {
    /* quota / private mode */
  }
}

/** Uniform random choice among prompts not used within {@link SCRIBBLE_PROMPT_NO_REPEAT_MS}. */
function pickPromptExcludingRecent(now: number): string {
  const history = readPromptHistory(now)
  const blocked = new Set(history.map((e) => e.text))
  const candidates = DRAWING_PROMPTS.filter((p) => !blocked.has(p))
  const pool = candidates.length > 0 ? candidates : [...DRAWING_PROMPTS]
  const i = Math.floor(Math.random() * pool.length)
  return pool[i] ?? DRAWING_PROMPTS[0]
}

function recordPromptUse(text: string, now: number) {
  const history = readPromptHistory(now)
  history.push({ text, at: now })
  writePromptHistory(history)
}

/** Picks a new prompt and stores the start time (1-hour window). */
export function rollNewPromptSession(): ScribblePromptSession {
  const now = Date.now()
  const text = pickPromptExcludingRecent(now)
  recordPromptUse(text, now)
  localStorage.setItem(STORAGE_PROMPT, text)
  localStorage.setItem(STORAGE_STARTED, String(now))
  return { text, expiresAt: now + SCRIBBLE_PROMPT_DURATION_MS }
}

/** Current prompt if still within the hour; otherwise rolls a new one. */
export function getActivePromptSession(): ScribblePromptSession {
  const now = Date.now()
  const text = localStorage.getItem(STORAGE_PROMPT)
  const started = localStorage.getItem(STORAGE_STARTED)
  if (text && started) {
    const t = Number(started)
    if (Number.isFinite(t)) {
      const expiresAt = t + SCRIBBLE_PROMPT_DURATION_MS
      if (expiresAt > now) {
        return { text, expiresAt }
      }
    }
  }
  return rollNewPromptSession()
}

/** e.g. "59:42 left" */
export function formatScribblePromptTimeLeft(ms: number): string {
  const clamped = Math.max(0, ms)
  const totalSec = Math.floor(clamped / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')} left`
}
