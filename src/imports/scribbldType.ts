/**
 * Per-letter display casing for Latin A–Z (design reference: `ABCdefghijKlmnOpQRsTuVWXYz`).
 * Non-letters are left unchanged.
 */
export const SCRIBBLD_LETTER_CASE = 'ABCdefghijKlmnOpQRsTuVWXYz' as const

export function scribbldCase(text: string): string {
  return text.replace(/[A-Za-z]/g, (ch) => {
    const i = ch.toLowerCase().charCodeAt(0) - 0x61
    if (i < 0 || i > 25) return ch
    return SCRIBBLD_LETTER_CASE[i]!
  })
}
