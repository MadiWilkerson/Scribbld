import { useNavigate, useLocation } from 'react-router'
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { AppNavFooter } from '../app/components/AppNavFooter'
import { MonsterAvatar } from '../app/components/MonsterAvatar'
import { RectanglePlate } from '../app/components/RectanglePlate'
import { ASSETS } from './assets'
import { useAuth } from './authContext'
import type { Drawing } from './drawingRecord'
import { parseMonsterConfig, stringifyMonsterConfig } from './monsterConfig'
import { loadLegacyDrawingsFromStorage, saveLegacyDrawingsToStorage } from './legacyDrawings'
import { removeDrawingIdFromLikes, removeDrawingIdsFromLikes } from './likeStorage'
import type { SavedProfileRow } from './savedProfiles'
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
import { scribbldCase } from './scribbldType'
import {
  deleteDrawing as deleteDrawingCloud,
  deleteDrawingsByAuthorLabel,
  deleteProfileCloud,
  fetchDrawingsFeed,
  fetchProfilesForUser,
  upsertProfileCloud,
} from './supabaseApi'

const STORAGE_KEY = 'userMonster'
const USER_NAME_KEY = 'userName'

export default function ProfileHubPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const nameMenuRef = useRef<HTMLDivElement>(null)
  const { isCloud, user, ready } = useAuth()

  const [savedProfiles, setSavedProfiles] = useState<SavedProfileRow[]>([])
  const [viewingName, setViewingName] = useState(() =>
    displayLabel(
      localStorage.getItem(PROFILE_HUB_VIEWING_KEY) || localStorage.getItem(USER_NAME_KEY) || 'Anonymous',
    ),
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [hoveredDrawing, setHoveredDrawing] = useState<string | null>(null)
  const [promptForDrawing, setPromptForDrawing] = useState<Drawing | null>(null)

  useEffect(() => {
    if (!ready) return

    const run = async () => {
      if (isCloud && user) {
        let profiles = await fetchProfilesForUser(user.id)
        if (profiles.length === 0) {
          const n = localStorage.getItem(USER_NAME_KEY) || 'Anonymous'
          const rawM = localStorage.getItem(STORAGE_KEY)
          const p = parseMonsterConfig(rawM)
          if (p) {
            upsertSavedProfile(n, p)
            await upsertProfileCloud(user.id, displayLabel(n), stringifyMonsterConfig(p))
            profiles = await fetchProfilesForUser(user.id)
          }
        }
        setSavedProfiles(profiles)
        setDrawings(await fetchDrawingsFeed(user.id))
      } else {
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
        setDrawings(loadLegacyDrawingsFromStorage())
      }
    }

    void run()
  }, [location.pathname, ready, isCloud, user?.id])

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

  const deleteDrawing = async (drawingId: string) => {
    const sid = String(drawingId)
    setPromptForDrawing((current) => (current?.id === sid ? null : current))
    if (isCloud && user) {
      await deleteDrawingCloud(user.id, sid)
      setDrawings((prev) => prev.filter((d) => d.id !== sid))
    } else {
      const updated = drawings.filter((d) => d.id !== sid)
      setDrawings(updated)
      saveLegacyDrawingsToStorage(updated)
      removeDrawingIdFromLikes(sid)
    }
  }

  const deleteProfileFromList = async (profileName: string, e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const label = displayLabel(profileName)

    if (isCloud && user) {
      await deleteProfileCloud(user.id, label)
      await deleteDrawingsByAuthorLabel(user.id, label)
      const nextProfiles = await fetchProfilesForUser(user.id)
      const nextDrawings = await fetchDrawingsFeed(user.id)
      setSavedProfiles(nextProfiles)
      setDrawings(nextDrawings)

      if (displayLabel(localStorage.getItem(USER_NAME_KEY) || '') === label) {
        localStorage.removeItem(USER_NAME_KEY)
        localStorage.removeItem(STORAGE_KEY)
      }

      if (displayLabel(viewingName) === label) {
        const drawingNames = collectUserNamesFromDrawings(nextDrawings)
        const remaining = mergedUserList(nextProfiles, drawingNames)
        setViewingName(displayLabel(remaining[0] ?? 'Anonymous'))
      }
      return
    }

    const nextProfiles = removeSavedProfileByName(profileName)
    setSavedProfiles(nextProfiles)

    const removedIds = new Set<string>()
    const nextDrawings = drawings.filter((d) => {
      if (displayLabel(d.userName) === label) {
        removedIds.add(String(d.id))
        return false
      }
      return true
    })
    setDrawings(nextDrawings)
    saveLegacyDrawingsToStorage(nextDrawings)
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
              aria-label={scribbldCase('SCRIBBLD — splash')}
            >
              <img src={ASSETS.logo} alt="" className="h-auto w-[210px] object-contain" />
            </button>
          </div>

          <div className="flex w-full flex-col items-center gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-full border-0 bg-transparent p-0 ring-2 ring-transparent transition duration-200 ease-out hover:scale-[1.04] hover:ring-[#0f1027]/25 hover:shadow-[0_10px_28px_-12px_rgba(15,16,39,0.35)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0f1027]/35"
              aria-label={scribbldCase('Edit avatar')}
              onClick={() =>
                navigate('/profile/create', { state: { editProfileName: viewingName } })
              }
            >
              <MonsterAvatar config={avatarConfig} size={120} />
            </button>
            <div
              ref={nameMenuRef}
              className="relative z-50 flex w-full max-w-[min(100%,280px)] flex-col items-center"
            >
              <div className="flex w-full justify-center">
                <div className="inline-flex w-auto max-w-full min-w-0 items-center gap-1.5">
                  <span className="min-w-0 text-center font-sans text-lg font-medium leading-tight text-[#0f1027] break-words">
                    {scribbldCase(viewingName)}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-0.5 transition-transform hover:bg-[#0f1027]/5"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="listbox"
                    aria-label={scribbldCase('Past profiles')}
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
                        {scribbldCase(name)}
                      </button>
                      <button
                        type="button"
                        className="flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-100 transition-opacity [pointer-fine]:opacity-0 [pointer-fine]:group-hover:opacity-100 hover:bg-[#0f1027]/10"
                        aria-label={scribbldCase(`Remove ${name}`)}
                        title={scribbldCase('Remove profile')}
                        onClick={(e) => void deleteProfileFromList(name, e)}
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
                {scribbldCase('Add profile')}
              </button>
            </RectanglePlate>
          </div>
        </div>

        <div className="mt-2">
          <p className="mb-2 text-center text-sm font-medium text-[#0f1027]">
            {scribbldCase('Your drawings')}
          </p>
          <div className="grid grid-cols-3 gap-2 pb-2">
            {filteredDrawings.length === 0 ? (
              <p className="col-span-3 text-center text-sm text-[#0f1027]/60">
                {drawings.length === 0
                  ? scribbldCase('No drawings yet')
                  : scribbldCase('No drawings for this profile yet.')}
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
                    aria-label={scribbldCase('View drawing prompt')}
                    onClick={() => setPromptForDrawing(drawing)}
                  />
                  {hoveredDrawing === drawing.id && (
                    <button
                      type="button"
                      className="absolute right-1 top-1 z-30 size-8 cursor-pointer transition-transform hover:scale-105"
                      onClick={(e) => {
                        e.stopPropagation()
                        void deleteDrawing(drawing.id)
                      }}
                      aria-label={scribbldCase('Delete drawing')}
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
              {scribbldCase('Prompt')}
            </h2>
            <p className="mt-3 font-sans text-lg leading-snug text-[#0f1027]">
              {scribbldCase(
                promptForDrawing.prompt?.trim() || 'No prompt was saved for this drawing.',
              )}
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-xl border-2 border-[#0f1027] bg-[#f9fdff] py-2.5 font-sans text-sm font-medium text-[#0f1027] transition-opacity hover:opacity-90"
              onClick={() => setPromptForDrawing(null)}
            >
              {scribbldCase('Close')}
            </button>
          </div>
        </div>
      )}

      <AppNavFooter />
    </div>
  )
}
