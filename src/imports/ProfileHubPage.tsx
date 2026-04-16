import { useNavigate, useLocation } from 'react-router'
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { AppNavFooter } from '../app/components/AppNavFooter'
import { MonsterAvatar } from '../app/components/MonsterAvatar'
import { RectanglePlate } from '../app/components/RectanglePlate'
import { ASSETS } from './assets'
import { parseMonsterConfig } from './monsterConfig'
import type { SavedProfileRow } from './savedProfiles'
import { removeDrawingIdFromLikes, removeDrawingIdsFromLikes } from './likeStorage'
import {
  collectUserNamesFromDrawings,
  displayLabel,
  loadSavedProfiles,
  mergedUserList,
  PROFILE_HUB_VIEWING_KEY,
  removeSavedProfileByName,
  resolveMonsterForUser,
  upsertSavedProfile,
} from './savedProfiles'

const STORAGE_KEY = 'userMonster'
const USER_NAME_KEY = 'userName'
const DRAWINGS_KEY = 'drawings'

interface Drawing {
  id: number
  image: string
  timestamp: string
  userName?: string
  userMonster?: string
  prompt?: string
}

export default function ProfileHubPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const nameMenuRef = useRef<HTMLDivElement>(null)

  const [savedProfiles, setSavedProfiles] = useState<SavedProfileRow[]>([])
  const [viewingName, setViewingName] = useState(() =>
    displayLabel(
      localStorage.getItem(PROFILE_HUB_VIEWING_KEY) || localStorage.getItem(USER_NAME_KEY) || 'Anonymous',
    ),
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [hoveredDrawing, setHoveredDrawing] = useState<number | null>(null)
  const [promptForDrawing, setPromptForDrawing] = useState<Drawing | null>(null)

  useEffect(() => {
    let profiles = loadSavedProfiles()
    if (profiles.length === 0) {
      const n = localStorage.getItem(USER_NAME_KEY) || 'Anonymous'
      const rawM = localStorage.getItem(STORAGE_KEY)
      const p = parseMonsterConfig(rawM)
      if (p) {
        upsertSavedProfile(n, p)
        profiles = loadSavedProfiles()
      }
    }
    setSavedProfiles(profiles)

    const savedDrawings = localStorage.getItem(DRAWINGS_KEY)
    setDrawings(savedDrawings ? JSON.parse(savedDrawings) : [])
  }, [location.pathname])

  useEffect(() => {
    localStorage.setItem(PROFILE_HUB_VIEWING_KEY, viewingName)
  }, [viewingName])

  useEffect(() => {
    const merged = mergedUserList(savedProfiles, collectUserNamesFromDrawings(drawings))
    const v = displayLabel(viewingName)
    if (merged.length === 0) return
    if (!merged.some((n) => displayLabel(n) === v)) {
      setViewingName(displayLabel(merged[0]))
    }
  }, [savedProfiles, drawings, viewingName])

  const userOptions = useMemo(() => {
    const drawingNames = collectUserNamesFromDrawings(drawings)
    const list = mergedUserList(savedProfiles, drawingNames)
    const v = displayLabel(viewingName)
    if (!list.some((n) => displayLabel(n) === v)) {
      list.push(v)
      list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    }
    return list
  }, [savedProfiles, drawings, viewingName])

  const avatarConfig = useMemo(
    () => resolveMonsterForUser(viewingName, savedProfiles, drawings),
    [viewingName, savedProfiles, drawings],
  )

  const filteredDrawings = useMemo(
    () => drawings.filter((d) => displayLabel(d.userName) === displayLabel(viewingName)),
    [drawings, viewingName],
  )

  useEffect(() => {
    if (!dropdownOpen) return

    let removeListener: (() => void) | undefined
    const timer = window.setTimeout(() => {
      const onDocClick = (e: globalThis.MouseEvent) => {
        if (nameMenuRef.current?.contains(e.target as Node)) return
        setDropdownOpen(false)
      }
      document.addEventListener('click', onDocClick, true)
      removeListener = () => document.removeEventListener('click', onDocClick, true)
    }, 0)

    return () => {
      clearTimeout(timer)
      removeListener?.()
    }
  }, [dropdownOpen])

  useEffect(() => {
    if (!promptForDrawing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPromptForDrawing(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [promptForDrawing])

  useEffect(() => {
    if (!dropdownOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dropdownOpen])

  const deleteDrawing = (drawingId: number) => {
    setPromptForDrawing((current) => (current?.id === drawingId ? null : current))
    const updated = drawings.filter((d) => d.id !== drawingId)
    setDrawings(updated)
    localStorage.setItem(DRAWINGS_KEY, JSON.stringify(updated))
    removeDrawingIdFromLikes(drawingId)
  }

  const deleteProfileFromList = (profileName: string, e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const label = displayLabel(profileName)

    const nextProfiles = removeSavedProfileByName(profileName)
    setSavedProfiles(nextProfiles)

    const removedIds = new Set<number>()
    const nextDrawings = drawings.filter((d) => {
      if (displayLabel(d.userName) === label) {
        removedIds.add(d.id)
        return false
      }
      return true
    })
    setDrawings(nextDrawings)
    localStorage.setItem(DRAWINGS_KEY, JSON.stringify(nextDrawings))
    removeDrawingIdsFromLikes(removedIds)

    if (displayLabel(localStorage.getItem(USER_NAME_KEY) || '') === label) {
      localStorage.removeItem(USER_NAME_KEY)
      localStorage.removeItem(STORAGE_KEY)
    }

    if (displayLabel(viewingName) === label) {
      const drawingNames = collectUserNamesFromDrawings(nextDrawings)
      const remaining = mergedUserList(nextProfiles, drawingNames)
      setViewingName(displayLabel(remaining[0] ?? 'Anonymous'))
    }
  }

  return (
    <div
      className="min-h-[100dvh] bg-[#f9fdff] text-[#0f1027]"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      data-name="ProfileHubPage"
    >
      <div className="mx-auto w-full max-w-[400px] px-4 pb-[calc(93px+max(1.25rem,env(safe-area-inset-bottom)))]">
        <div className="flex flex-col items-center gap-6 pt-2">
          <div className="flex w-full justify-center">
            <button
              type="button"
              className="shrink-0 cursor-pointer"
              onClick={() => navigate('/splash')}
              aria-label="SCRIBBLD — splash"
            >
              <img src={ASSETS.logo} alt="" className="h-auto w-[180px] object-contain" />
            </button>
          </div>

          <div className="flex w-full flex-col items-center gap-2">
            <MonsterAvatar config={avatarConfig} size={120} />
            <div
              ref={nameMenuRef}
              className="relative z-50 flex w-full max-w-[min(100%,280px)] flex-col items-center"
            >
              <div className="flex w-full justify-center">
                <div className="inline-flex w-auto max-w-full min-w-0 items-center gap-1.5">
                  <span className="min-w-0 text-center font-sans text-lg font-medium leading-tight text-[#0f1027] break-words">
                    {viewingName}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-0.5 transition-transform hover:bg-[#0f1027]/5"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="listbox"
                    aria-label="Past profiles"
                    onClick={() => setDropdownOpen((o) => !o)}
                  >
                    <img
                      src={ASSETS.downArrow}
                      alt=""
                      className={`size-7 object-contain transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </div>
              {dropdownOpen && (
                <ul
                  className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-48 min-w-[200px] overflow-y-auto rounded-xl border border-[#0f1027]/15 bg-[#f9fdff] py-1 shadow-lg [scrollbar-gutter:stable]"
                  role="listbox"
                >
                  {userOptions.map((name) => (
                    <li
                      key={`${name}`}
                      role="option"
                      aria-selected={displayLabel(name) === displayLabel(viewingName)}
                      className="group relative flex w-full items-stretch"
                    >
                      <button
                        type="button"
                        className={`min-w-0 flex-1 px-3 py-2.5 text-left font-sans text-sm font-medium ${
                          displayLabel(name) === displayLabel(viewingName)
                            ? 'bg-[#0f1027]/10 text-[#0f1027]'
                            : 'text-[#0f1027] hover:bg-[#0f1027]/5'
                        }`}
                        onClick={() => {
                          const next = displayLabel(name)
                          setViewingName(next)
                          localStorage.setItem(PROFILE_HUB_VIEWING_KEY, next)
                          setDropdownOpen(false)
                        }}
                      >
                        {name}
                      </button>
                      <button
                        type="button"
                        className="flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-100 transition-opacity [pointer-fine]:opacity-0 [pointer-fine]:group-hover:opacity-100 hover:bg-[#0f1027]/10"
                        aria-label={`Remove ${name}`}
                        title="Remove profile"
                        onClick={(e) => deleteProfileFromList(name, e)}
                      >
                        <img src={ASSETS.exit} alt="" className="size-4 object-contain opacity-80" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <RectanglePlate compact className="-mt-10">
              <button
                type="button"
                className="w-full min-h-0 cursor-pointer border-0 bg-transparent text-center font-sans text-base font-medium leading-tight text-[#0f1027] outline-none transition-opacity hover:opacity-90 active:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0f1027]/35 focus-visible:ring-offset-0"
                onClick={() => navigate('/profile/create', { state: { blankSlate: true } })}
              >
                Add profile
              </button>
            </RectanglePlate>
          </div>
        </div>

        <div className="mt-2">
          <p className="mb-2 text-center text-sm font-medium text-[#0f1027]">Your drawings</p>
          <div className="grid grid-cols-3 gap-2 pb-2">
            {filteredDrawings.length === 0 ? (
              <p className="col-span-3 text-center text-sm text-[#0f1027]/60">
                {drawings.length === 0
                  ? 'No drawings yet'
                  : 'No drawings for this profile yet.'}
              </p>
            ) : (
              filteredDrawings.map((drawing) => (
                <div
                  key={drawing.id}
                  className="relative w-full"
                  data-name="post"
                  onMouseEnter={() => setHoveredDrawing(drawing.id)}
                  onMouseLeave={() => setHoveredDrawing(null)}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-[14px] bg-white">
                    <img
                      src={drawing.image}
                      alt=""
                      className="absolute inset-[5px] z-0 size-[calc(100%-10px)] rounded-[10px] object-contain"
                    />
                    <img
                      src={ASSETS.square}
                      alt=""
                      className="pointer-events-none absolute inset-0 z-10 size-full rounded-[14px] object-fill"
                      aria-hidden
                    />
                  </div>
                  <button
                    type="button"
                    className="absolute inset-0 z-20 cursor-pointer rounded-[14px] border-0 bg-transparent"
                    aria-label="View drawing prompt"
                    onClick={() => setPromptForDrawing(drawing)}
                  />
                  {hoveredDrawing === drawing.id && (
                    <button
                      type="button"
                      className="absolute right-1 top-1 z-30 size-8 cursor-pointer transition-transform hover:scale-105"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteDrawing(drawing.id)
                      }}
                      aria-label="Delete drawing"
                    >
                      <img alt="" className="absolute inset-0 size-full max-w-none object-cover" src={ASSETS.exit} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {promptForDrawing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1027]/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-prompt-heading"
          onClick={() => setPromptForDrawing(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#0f1027]/15 bg-[#f9fdff] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="profile-prompt-heading" className="font-sans text-sm font-medium text-[#0f1027]/70">
              Prompt
            </h2>
            <p className="mt-3 font-sans text-lg leading-snug text-[#0f1027]">
              {promptForDrawing.prompt?.trim() || 'No prompt was saved for this drawing.'}
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-xl border-2 border-[#0f1027] bg-[#f9fdff] py-2.5 font-sans text-sm font-medium text-[#0f1027] transition-opacity hover:opacity-90"
              onClick={() => setPromptForDrawing(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <AppNavFooter />
    </div>
  )
}
