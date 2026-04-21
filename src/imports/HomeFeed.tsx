import { useNavigate, useLocation } from 'react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppNavFooter } from '../app/components/AppNavFooter'
import { HeartIcon } from '../app/components/HeartIcon'
import { MonsterAvatar } from '../app/components/MonsterAvatar'
import { ASSETS } from './assets'
import { useAuth } from './authContext'
import type { Drawing } from './drawingRecord'
import {
  getActiveUserForLikes,
  loadOrMigrateDrawingLikers,
  writeDrawingLikers,
} from './likeStorage'
import { loadLegacyDrawingsFromStorage } from './legacyDrawings'
import { parseMonsterConfig } from './monsterConfig'
import {
  displayLabel,
  loadSavedProfiles,
  resolveMonsterForUser,
  type SavedProfileRow,
} from './savedProfiles'
import { scribbldCase } from './scribbldType'
import {
  fetchAllProfiles,
  fetchDrawingsFeed,
  subscribeDrawingsChanges,
  toggleDrawingLike,
} from './supabaseApi'

function Header({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="absolute contents left-0 top-[-10px]" data-name="Header">
      <div className="absolute flex h-[118px] items-center justify-center left-0 top-0 w-[393px]">
        <div className="bg-[#f9fdff] h-[118px] w-[393px] relative overflow-hidden" data-name="HeaderRectangle">
          <img
            src={ASSETS.line}
            alt=""
            className="absolute bottom-0 left-0 right-0 z-[2] h-[14px] w-full object-cover object-bottom pointer-events-none select-none"
            aria-hidden
          />
        </div>
      </div>
      <div
        className="absolute h-[142px] left-[81px] top-[-10px] w-[230px] z-10 cursor-pointer hover:scale-105 transition-transform"
        data-name="scribbld-01 1"
        onClick={() => navigate('/splash')}
      >
        <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.logo} />
      </div>
    </div>
  )
}

function groupDrawingsByPrompt(drawings: Drawing[]) {
  const map = new Map<string, Drawing[]>()
  for (const d of drawings) {
    const key = (d.prompt ?? '').trim() || '__empty__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  const groups = Array.from(map.entries()).map(([promptKey, items]) => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    return {
      promptKey,
      promptLabel: promptKey === '__empty__' ? 'No prompt' : promptKey,
      items: sorted,
    }
  })
  groups.sort((a, b) => {
    const maxTs = (items: Drawing[]) =>
      Math.max(0, ...items.map((x) => new Date(x.timestamp).getTime()))
    return maxTs(b.items) - maxTs(a.items)
  })
  return groups
}

function PosterAvatar({
  drawing,
  savedProfiles,
  allDrawings,
}: {
  drawing: Drawing
  savedProfiles: SavedProfileRow[]
  allDrawings: Drawing[]
}) {
  const raw = drawing.userMonster
  const direct = parseMonsterConfig(raw || '')
  if (direct) {
    return <MonsterAvatar config={direct} size={32} />
  }
  if (raw?.trim() && (raw.startsWith('data:') || raw.startsWith('http'))) {
    return (
      <img src={raw} alt="" className="size-8 shrink-0 object-cover rounded-full bg-white" />
    )
  }
  const cfg = resolveMonsterForUser(drawing.userName || '', savedProfiles, allDrawings)
  return <MonsterAvatar config={cfg} size={32} />
}

const PROMPT_POST_STRIDE_PX = 312 + 16

function PromptPostsCarousel({
  promptKey,
  promptLabel,
  items,
  drawings,
  savedProfiles,
  toggleLike,
}: {
  promptKey: string
  promptLabel: string
  items: Drawing[]
  drawings: Drawing[]
  savedProfiles: SavedProfileRow[]
  toggleLike: (drawingId: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const loopTeleportRef = useRef(false)
  const n = items.length
  const multi = n > 1

  const normalizeScrollLeft = useCallback(() => {
    const el = scrollRef.current
    if (!el || !multi || loopTeleportRef.current) return
    const cycle = n * PROMPT_POST_STRIDE_PX
    while (el.scrollLeft >= cycle) {
      el.scrollLeft -= cycle
    }
  }, [multi, n])

  const itemIdsKey = items.map((d) => d.id).join(',')

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ left: 0 })
  }, [promptKey, itemIdsKey])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !multi) return
    const onScroll = () => normalizeScrollLeft()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [multi, normalizeScrollLeft])

  const endLoopTeleport = useCallback(() => {
    loopTeleportRef.current = false
  }, [])

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el || !multi) return
    normalizeScrollLeft()
    const stride = PROMPT_POST_STRIDE_PX
    const cycle = n * stride
    let sl = el.scrollLeft
    while (sl >= cycle) sl -= cycle
    let idx = Math.round(sl / stride)
    idx = Math.max(0, Math.min(n - 1, idx))

    if (dir === 1 && idx === n - 1) {
      el.scrollTo({ left: cycle, behavior: 'smooth' })
      return
    }

    if (dir === -1 && idx === 0) {
      loopTeleportRef.current = true
      el.scrollLeft = cycle
      requestAnimationFrame(() => {
        el.scrollTo({ left: (n - 1) * stride, behavior: 'smooth' })
        let cleared = false
        const done = () => {
          if (cleared) return
          cleared = true
          endLoopTeleport()
        }
        el.addEventListener('scrollend', done, { once: true })
        window.setTimeout(done, 500)
      })
      return
    }

    const nextIdx = (idx + dir + n) % n
    el.scrollTo({ left: nextIdx * stride, behavior: 'smooth' })
  }

  const slides = multi
    ? ([0, 1] as const).flatMap((dup) => items.map((d) => ({ drawing: d, dup })))
    : items.map((d) => ({ drawing: d, dup: 0 as const }))

  return (
    <section className="space-y-2" data-name="prompt-feed-section">
      <h2 className="px-0.5 font-sans text-lg font-semibold leading-snug text-[#0f1027] line-clamp-4">
        {scribbldCase(promptLabel)}
      </h2>
      <div className="relative w-[312px] overflow-visible" data-name="prompt-posts-carousel">
        {multi && (
          <button
            type="button"
            className="absolute left-[-22px] top-[156px] z-20 flex -translate-y-1/2 cursor-pointer items-center border-0 bg-transparent p-0 outline-none transition-opacity hover:opacity-80 active:opacity-70 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#0f1027]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f9fdff]"
            aria-label={scribbldCase('Previous post')}
            onClick={() => scrollByDir(-1)}
          >
            <img src={ASSETS.scrollLeft} alt="" className="size-7 max-w-none object-contain" draggable={false} />
          </button>
        )}
        {multi && (
          <button
            type="button"
            className="absolute right-[-22px] top-[156px] z-20 flex -translate-y-1/2 cursor-pointer items-center border-0 bg-transparent p-0 outline-none transition-opacity hover:opacity-80 active:opacity-70 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#0f1027]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f9fdff]"
            aria-label={scribbldCase('Next post')}
            onClick={() => scrollByDir(1)}
          >
            <img src={ASSETS.scrollRight} alt="" className="size-7 max-w-none object-contain" draggable={false} />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex touch-pan-x gap-4 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-proximity [&::-webkit-scrollbar]:hidden"
          data-name="prompt-posts-scroll"
        >
          {slides.map(({ drawing, dup }) => (
            <div
              key={`${drawing.id}-${dup}`}
              className="relative w-[312px] shrink-0 snap-start"
              data-name="post"
            >
              <div className="relative bg-white rounded-[31px] size-[312px] overflow-hidden" data-name="postbox">
                <img
                  src={drawing.image}
                  alt={scribbldCase('Drawing')}
                  className="absolute inset-[10px] size-[calc(100%-20px)] object-contain rounded-[22px] z-0"
                />
                <img
                  src={ASSETS.square}
                  alt=""
                  className="absolute inset-0 size-full object-fill pointer-events-none z-10 rounded-[31px]"
                />
              </div>
              <div className="-mt-3 flex items-center justify-between gap-2">
                <div className="ml-4 flex min-w-0 flex-1 items-center justify-start gap-1.5">
                  <PosterAvatar drawing={drawing} savedProfiles={savedProfiles} allDrawings={drawings} />
                  <span className="max-w-[200px] truncate text-left text-sm text-[#0f1027]">
                    {scribbldCase(displayLabel(drawing.userName))}
                  </span>
                </div>
                <span className="flex shrink-0 -translate-x-1.5 items-center gap-1">
                  <HeartIcon
                    filled={drawing.likedByMe ?? false}
                    onClick={() => toggleLike(drawing.id)}
                  />
                  <span className="min-w-[1ch] text-sm tabular-nums text-[#0f1027]">
                    {drawing.likeCount ?? 0}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomeFeed() {
  const navigate = useNavigate()
  const location = useLocation()
  const { ready, user, isCloud } = useAuth()

  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [likersByDrawing, setLikersByDrawing] = useState<Map<string, Set<string>>>(() =>
    loadOrMigrateDrawingLikers(),
  )
  const [savedProfiles, setSavedProfiles] = useState<SavedProfileRow[]>(() => loadSavedProfiles())

  const refreshCloud = useCallback(async () => {
    if (!user) return
    const [d, p] = await Promise.all([fetchDrawingsFeed(user.id), fetchAllProfiles()])
    setDrawings(d)
    setSavedProfiles(p)
  }, [user])

  useEffect(() => {
    if (!ready) return

    if (!isCloud) {
      setDrawings(loadLegacyDrawingsFromStorage())
      setLikersByDrawing(loadOrMigrateDrawingLikers())
      setSavedProfiles(loadSavedProfiles())
      return
    }

    if (!user) return

    void refreshCloud()
    const unsub = subscribeDrawingsChanges(() => {
      void refreshCloud()
    })
    return () => {
      unsub?.()
    }
  }, [ready, isCloud, user, location.pathname, refreshCloud])

  const activeLikerLabel = displayLabel(getActiveUserForLikes())

  const feedDrawings = useMemo(() => {
    if (isCloud) return drawings
    return drawings.map((d) => ({
      ...d,
      likeCount: likersByDrawing.get(d.id)?.size ?? 0,
      likedByMe: likersByDrawing.get(d.id)?.has(activeLikerLabel) ?? false,
    }))
  }, [isCloud, drawings, likersByDrawing, activeLikerLabel])

  const toggleLike = useCallback(
    async (drawingId: string) => {
      if (!isCloud || !user) {
        const label = displayLabel(getActiveUserForLikes())
        setLikersByDrawing((prev) => {
          const next = new Map<string, Set<string>>()
          prev.forEach((set, id) => next.set(id, new Set(set)))
          const set = new Set(next.get(drawingId) ?? [])
          if (set.has(label)) set.delete(label)
          else set.add(label)
          if (set.size === 0) next.delete(drawingId)
          else next.set(drawingId, set)
          writeDrawingLikers(next)
          return next
        })
        return
      }

      const d = drawings.find((x) => x.id === drawingId)
      if (!d) return
      const wasLiked = !!d.likedByMe
      const ok = await toggleDrawingLike(user.id, drawingId, wasLiked)
      if (!ok) return
      setDrawings((prev) =>
        prev.map((x) =>
          x.id === drawingId
            ? {
                ...x,
                likedByMe: !wasLiked,
                likeCount: Math.max(0, (x.likeCount ?? 0) + (wasLiked ? -1 : 1)),
              }
            : x,
        ),
      )
    },
    [isCloud, user, drawings],
  )

  const promptGroups = useMemo(() => groupDrawingsByPrompt(feedDrawings), [feedDrawings])

  if (!ready || (isCloud && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fdff] font-sans text-sm text-[#0f1027]/70">
        {scribbldCase('Loading…')}
      </div>
    )
  }

  return (
    <div className="bg-[#f9fdff] relative w-full min-h-screen flex items-start justify-center overflow-y-auto" data-name="HomeFeed">
      <div className="relative w-[393px] min-h-full">
        <Header navigate={navigate} />
        <div className="absolute left-[41px] top-[156px] w-[312px] space-y-8 overflow-x-visible pb-[120px]">
          {promptGroups.map((group) => (
            <PromptPostsCarousel
              key={group.promptKey}
              promptKey={group.promptKey}
              promptLabel={group.promptLabel}
              items={group.items}
              drawings={feedDrawings}
              savedProfiles={savedProfiles}
              toggleLike={toggleLike}
            />
          ))}
        </div>
        <AppNavFooter />
      </div>
    </div>
  )
}
