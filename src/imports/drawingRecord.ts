/** Shared drawing shape for feed, profile grid, and create flow. */
export interface Drawing {
  id: string
  image: string
  timestamp: string
  userName?: string
  userMonster?: string
  prompt?: string
  /** Filled when loaded from Supabase feed. */
  likeCount?: number
  likedByMe?: boolean
}
