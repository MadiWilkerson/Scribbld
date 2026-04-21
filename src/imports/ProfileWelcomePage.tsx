import { useNavigate } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { MonsterAvatar } from '../app/components/MonsterAvatar'
import { RectanglePlate } from '../app/components/RectanglePlate'
import { ASSETS } from './assets'
import { useAuth } from './authContext'
import type { Drawing } from './drawingRecord'
import { loadLegacyDrawingsFromStorage } from './legacyDrawings'
import { stringifyMonsterConfig } from './monsterConfig'
import {
  collectUserNamesFromDrawings,
  displayLabel,
  loadSavedProfiles,
  mergedUserList,
  PROFILE_HUB_VIEWING_KEY,
  resolveMonsterForUser,
  type SavedProfileRow,
} from './savedProfiles'
import { scribbldCase } from './scribbldType'
import { fetchDrawingsFeed, fetchProfilesForUser } from './supabaseApi'

const USER_NAME_KEY = 'userName'
const STORAGE_KEY = 'userMonster'

function signInAs(name: string, profiles: SavedProfileRow[], drawings: Drawing[]) {
  const label = scribbldCase(displayLabel(name))
  const fromSaved = profiles.find((p) => displayLabel(p.name) === label)
  localStorage.setItem(USER_NAME_KEY, label)
  if (fromSaved) {
    localStorage.setItem(STORAGE_KEY, fromSaved.monster)
  } else {
    const cfg = resolveMonsterForUser(label, profiles, drawings)
    localStorage.setItem(STORAGE_KEY, stringifyMonsterConfig(cfg))
  }
  localStorage.setItem(PROFILE_HUB_VIEWING_KEY, label)
}

export default function ProfileWelcomePage() {
  const navigate = useNavigate()
  const { isCloud, user, ready } = useAuth()
  const [savedProfiles, setSavedProfiles] = useState<SavedProfileRow[]>([])
  const [drawings, setDrawings] = useState<Drawing[]>([])

  useEffect(() => {
    if (!ready) return

    const run = async () => {
      if (isCloud && user) {
        const [profiles, feed] = await Promise.all([
          fetchProfilesForUser(user.id),
          fetchDrawingsFeed(user.id),
        ])
        setSavedProfiles(profiles)
        setDrawings(feed)
      } else {
        setSavedProfiles(loadSavedProfiles())
        setDrawings(loadLegacyDrawingsFromStorage())
      }
    }

    void run()
  }, [ready, isCloud, user?.id])

  const profileNames = useMemo(
    () => mergedUserList(savedProfiles, collectUserNamesFromDrawings(drawings)),
    [savedProfiles, drawings],
  )

  const chooseProfile = (name: string) => {
    signInAs(name, savedProfiles, drawings)
    navigate('/home')
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-[#f9fdff] text-[#0f1027]"
      data-name="ProfileWelcomePage"
    >
      <div
        className="flex flex-1 flex-col items-center px-6 pb-4 pt-[max(2rem,env(safe-area-inset-top))]"
      >
        <button
          type="button"
          onClick={() => navigate('/splash')}
          className="mb-6 cursor-pointer transition-opacity hover:opacity-90"
          aria-label={scribbldCase('Back to splash')}
        >
          <img src={ASSETS.logo} alt={scribbldCase('SCRIBBLD')} className="h-auto w-[200px] object-contain" />
        </button>

        <h1 className="mb-1 text-center font-sans text-xl font-semibold text-[#0f1027]">
          {scribbldCase("Who's scribbling?")}
        </h1>
        <p className="mb-8 max-w-[320px] text-center text-sm text-[#0f1027]/70">
          {scribbldCase("Sign in with a profile you've used before, or create a new one.")}
        </p>

        {profileNames.length === 0 ? (
          <div className="flex w-full max-w-[320px] flex-col items-center gap-6">
            <p className="text-center text-sm text-[#0f1027]/65">{scribbldCase('No saved profiles yet.')}</p>
            <RectanglePlate>
              <button
                type="button"
                className="w-full min-h-0 cursor-pointer border-0 bg-transparent py-1 text-center font-sans text-lg font-medium text-[#0f1027] outline-none transition-opacity hover:opacity-90 active:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0f1027]/35 focus-visible:ring-offset-0"
                onClick={() => navigate('/profile/create', { state: { blankSlate: true } })}
              >
                {scribbldCase('Create a profile')}
              </button>
            </RectanglePlate>
          </div>
        ) : (
          <div className="flex w-full max-w-[320px] flex-col gap-3">
            <p className="text-xs font-medium tracking-wide text-[#0f1027]/50">
              {scribbldCase('Your profiles')}
            </p>
            <ul className="flex flex-col gap-2" role="list">
              {profileNames.map((name) => {
                const cfg = resolveMonsterForUser(name, savedProfiles, drawings)
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => chooseProfile(name)}
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-[#0f1027]/15 bg-white px-3 py-2.5 text-left transition-colors hover:border-[#0f1027]/35 hover:bg-[#f9fdff]"
                    >
                      <MonsterAvatar config={cfg} size={48} />
                      <span className="min-w-0 flex-1 font-sans text-lg font-medium text-[#0f1027]">
                        {scribbldCase(name)}
                      </span>
                      <span className="shrink-0 text-sm font-medium text-[#0f1027]/50">→</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-4 w-full">
              <RectanglePlate>
                <button
                  type="button"
                  className="w-full min-h-0 cursor-pointer border-0 bg-transparent py-1 text-center font-sans text-lg font-medium text-[#0f1027] outline-none transition-opacity hover:opacity-90 active:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0f1027]/35 focus-visible:ring-offset-0"
                  onClick={() => navigate('/profile/create', { state: { blankSlate: true } })}
                >
                  {scribbldCase('Create new profile')}
                </button>
              </RectanglePlate>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
