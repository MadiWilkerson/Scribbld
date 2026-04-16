import { useNavigate, useLocation } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { AppNavFooter } from '../app/components/AppNavFooter'
import { HeartIcon } from '../app/components/HeartIcon'
import { MonsterAvatar } from '../app/components/MonsterAvatar'
import { ASSETS } from './assets'
import { parseMonsterConfig } from './monsterConfig'
import {
  getActiveUserForLikes,
  loadOrMigrateDrawingLikers,
  writeDrawingLikers,
} from './likeStorage'
import {
  displayLabel,
  loadSavedProfiles,
  resolveMonsterForUser,
  type SavedProfileRow,
} from './savedProfiles'

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

interface Drawing {
  id: number
  image: string
  timestamp: string
  userName?: string
  /** Monster JSON config or legacy image data URL */
  userMonster?: string
  prompt?: string
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

/** Avatar + name come from the drawing and saved profiles (same rules as Profile hub), not session-only keys. */
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

export default function HomeFeed() {
  const navigate = useNavigate()
  const location = useLocation()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [likersByDrawing, setLikersByDrawing] = useState<Map<number, Set<string>>>(() =>
    loadOrMigrateDrawingLikers(),
  )
  const [savedProfiles, setSavedProfiles] = useState<SavedProfileRow[]>(() => loadSavedProfiles())

  useEffect(() => {
    const savedDrawings = localStorage.getItem('drawings')
    if (savedDrawings) {
      setDrawings(JSON.parse(savedDrawings))
    } else {
      setDrawings([])
    }

    setLikersByDrawing(loadOrMigrateDrawingLikers())
    setSavedProfiles(loadSavedProfiles())
  }, [location.pathname])

  const toggleLike = (drawingId: number) => {
    const label = displayLabel(getActiveUserForLikes())
    setLikersByDrawing((prev) => {
      const next = new Map<number, Set<string>>()
      prev.forEach((set, id) => next.set(id, new Set(set)))
      const set = new Set(next.get(drawingId) ?? [])
      if (set.has(label)) set.delete(label)
      else set.add(label)
      if (set.size === 0) next.delete(drawingId)
      else next.set(drawingId, set)
      writeDrawingLikers(next)
      return next
    })
  }

  const promptGroups = useMemo(() => groupDrawingsByPrompt(drawings), [drawings])

  const activeLikerLabel = displayLabel(getActiveUserForLikes())

  return (
    <div className="bg-[#f9fdff] relative w-full min-h-screen flex items-start justify-center overflow-y-auto" data-name="HomeFeed">
      <div className="relative w-[393px] min-h-full">
        <Header navigate={navigate} />
        <div className="absolute left-[41px] top-[156px] w-[312px] space-y-8 pb-[120px]">
          {promptGroups.map((group) => (
            <section key={group.promptKey} className="space-y-2" data-name="prompt-feed-section">
              <h2 className="px-0.5 font-sans text-lg font-semibold leading-snug text-[#0f1027] line-clamp-4">
                {group.promptLabel}
              </h2>
              <div
                className="flex touch-pan-x gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory overscroll-x-contain [&::-webkit-scrollbar]:hidden"
                data-name="prompt-posts-scroll"
              >
                {group.items.map((drawing) => (
                  <div
                    key={drawing.id}
                    className="relative w-[312px] shrink-0 snap-start"
                    data-name="post"
                  >
                    <div className="relative bg-white rounded-[31px] size-[312px] overflow-hidden" data-name="postbox">
                      <img
                        src={drawing.image}
                        alt="Drawing"
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
                        <PosterAvatar
                          drawing={drawing}
                          savedProfiles={savedProfiles}
                          allDrawings={drawings}
                        />
                        <span className="max-w-[200px] truncate text-left text-sm text-[#0f1027]">
                          {displayLabel(drawing.userName)}
                        </span>
                      </div>
                      <span className="flex shrink-0 -translate-x-1.5 items-center gap-1">
                        <HeartIcon
                          filled={likersByDrawing.get(drawing.id)?.has(activeLikerLabel) ?? false}
                          onClick={() => toggleLike(drawing.id)}
                        />
                        <span className="min-w-[1ch] text-sm tabular-nums text-[#0f1027]">
                          {likersByDrawing.get(drawing.id)?.size ?? 0}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <AppNavFooter />
      </div>
    </div>
  )
}
