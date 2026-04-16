const STORAGE_PROMPT = 'scribbleCurrentPrompt'
const STORAGE_STARTED = 'scribblePromptStartedAt'

/** How long the same prompt stays active app-wide (scribble creator). */
export const SCRIBBLE_PROMPT_DURATION_MS = 60 * 60 * 1000

export type ScribblePromptSession = { text: string; expiresAt: number }

/** Shown while creating a drawing; stored on save so the profile gallery can recall it. */
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
]

export function pickRandomPrompt(): string {
  const i = Math.floor(Math.random() * DRAWING_PROMPTS.length)
  return DRAWING_PROMPTS[i] ?? DRAWING_PROMPTS[0]
}

/** Picks a new prompt and stores the start time (1-hour window). */
export function rollNewPromptSession(): ScribblePromptSession {
  const text = pickRandomPrompt()
  const now = Date.now()
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
