import { scribbldCase } from './scribbldType'

const STORAGE_PROMPT = 'scribbleCurrentPrompt'
const STORAGE_STARTED = 'scribblePromptStartedAt'
const STORAGE_RECENT = 'scribblePromptRecentHistory'

/** How long the same prompt stays active app-wide (scribble creator). */
export const SCRIBBLE_PROMPT_DURATION_MS = 15 * 60 * 1000

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

/** Picks a new prompt and stores the start time. */
export function rollNewPromptSession(at: number = Date.now()): ScribblePromptSession {
  const text = pickPromptExcludingRecent(at)
  recordPromptUse(text, at)
  localStorage.setItem(STORAGE_PROMPT, text)
  localStorage.setItem(STORAGE_STARTED, String(at))
  return { text, expiresAt: at + SCRIBBLE_PROMPT_DURATION_MS }
}

/**
 * Returns the session that should be active at `now`.
 *
 * Important: browsers can't run timers while the tab/app is closed, so we base the schedule on
 * persisted timestamps and "catch up" by rolling through any missed prompt intervals.
 */
export function getActivePromptSession(now: number = Date.now()): ScribblePromptSession {
  const storedText = localStorage.getItem(STORAGE_PROMPT)
  const storedStartedRaw = localStorage.getItem(STORAGE_STARTED)
  const storedStarted = storedStartedRaw != null ? Number(storedStartedRaw) : NaN

  // No prior session (first run or storage cleared)
  if (!storedText || !Number.isFinite(storedStarted)) {
    return rollNewPromptSession(now)
  }

  const elapsed = now - storedStarted
  if (elapsed < SCRIBBLE_PROMPT_DURATION_MS) {
    return { text: storedText, expiresAt: storedStarted + SCRIBBLE_PROMPT_DURATION_MS }
  }

  // We missed 1+ intervals. Roll forward at exact boundaries so history reflects what "would have" happened.
  const missed = Math.floor(elapsed / SCRIBBLE_PROMPT_DURATION_MS)
  let session: ScribblePromptSession = { text: storedText, expiresAt: storedStarted + SCRIBBLE_PROMPT_DURATION_MS }
  for (let i = 1; i <= missed; i++) {
    const at = storedStarted + i * SCRIBBLE_PROMPT_DURATION_MS
    session = rollNewPromptSession(at)
  }
  return session.expiresAt > now ? session : rollNewPromptSession(now)
}

/** e.g. "59:42 left" */
export function formatScribblePromptTimeLeft(ms: number): string {
  const clamped = Math.max(0, ms)
  const totalSec = Math.floor(clamped / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return scribbldCase(`${m}:${String(s).padStart(2, '0')} left`)
}
