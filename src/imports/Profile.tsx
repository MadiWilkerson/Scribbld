import { useNavigate, useLocation } from 'react-router'
import { useCallback, useEffect, useState } from 'react'
import { AppNavFooter } from '../app/components/AppNavFooter'
import { MonsterAvatar } from '../app/components/MonsterAvatar'
import { RectanglePlate } from '../app/components/RectanglePlate'
import { ASSETS } from './assets'
import {
  DEFAULT_MONSTER,
  MONSTER_COLORS,
  MONSTER_SHAPES,
  type MonsterConfig,
  type MonsterFeature,
  eyeUrl,
  hornUrl,
  monsterBodyUrl,
  mouthUrl,
  parseMonsterConfig,
  stringifyMonsterConfig,
} from './monsterConfig'
import {
  displayLabel,
  loadSavedProfiles,
  PROFILE_HUB_VIEWING_KEY,
  resolveMonsterForUser,
  upsertSavedProfile,
} from './savedProfiles'
import { scribbldCase } from './scribbldType'

const STORAGE_KEY = 'userMonster'
const USER_NAME_KEY = 'userName'
const DRAWINGS_KEY = 'drawings'

type ProfileLocationState = { blankSlate?: boolean; editProfileName?: string }

/** When editing another profile’s avatar, don’t overwrite the signed-in user’s localStorage until Done (and only if they’re the same person). */
function shouldSyncActiveSession(editProfileName: string | undefined): boolean {
  if (editProfileName === undefined) return true
  return displayLabel(editProfileName) === displayLabel(localStorage.getItem(USER_NAME_KEY) || '')
}

/** 3 columns, compact tiles for mobile — 3×44px + 2×6px gaps */
const PICKER_COL_WIDTH = 'w-[144px] max-w-[90vw]'

const pickerBtn =
  'size-[44px] rounded-xl border-2 border-[#0f1027]/25 bg-white p-0.5 transition-transform active:scale-95 hover:scale-105 shrink-0'

function FeatureRow({
  label,
  value,
  onChange,
  options,
  src,
}: {
  label: string
  value: MonsterFeature
  onChange: (n: MonsterFeature) => void
  options: MonsterFeature[]
  src: (n: MonsterFeature) => string
}) {
  return (
    <div>
      <p className="text-sm font-medium text-[#0f1027] mb-2">{scribbldCase(label)}</p>
      <div className="grid grid-cols-3 gap-1.5 place-items-center">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`${pickerBtn} ${
              value === n ? 'border-[#0f1027] ring-2 ring-[#0f1027]/30' : 'border-[#0f1027]/25'
            }`}
            aria-pressed={value === n}
          >
            <img src={src(n)} alt="" className="size-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as ProfileLocationState | null
  const blankSlate = Boolean(state?.blankSlate)
  const editProfileName = state?.editProfileName

  const [name, setName] = useState('')
  const [config, setConfig] = useState<MonsterConfig>(DEFAULT_MONSTER)

  useEffect(() => {
    const s = location.state as ProfileLocationState | null
    if (s?.blankSlate) {
      setName('')
      setConfig(DEFAULT_MONSTER)
      return
    }
    if (s?.editProfileName) {
      const label = displayLabel(s.editProfileName)
      setName(label)
      const profiles = loadSavedProfiles()
      const rawD = localStorage.getItem(DRAWINGS_KEY)
      const drawingsList = rawD ? JSON.parse(rawD) : []
      setConfig(resolveMonsterForUser(label, profiles, drawingsList))
      return
    }
    setName(localStorage.getItem(USER_NAME_KEY) || 'Anonymous')
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = parseMonsterConfig(raw)
    if (parsed) {
      setConfig(parsed)
    } else if (raw && (raw.startsWith('data:') || raw.startsWith('http'))) {
      setConfig(DEFAULT_MONSTER)
    }
  }, [location.key, location.state])

  const persist = useCallback(
    (next: MonsterConfig) => {
      setConfig(next)
      if (blankSlate) return
      if (shouldSyncActiveSession(editProfileName)) {
        localStorage.setItem(STORAGE_KEY, stringifyMonsterConfig(next))
      }
    },
    [blankSlate, editProfileName],
  )

  const setShape = (shape: MonsterConfig['shape']) => persist({ ...config, shape })
  const setColor = (color: MonsterConfig['color']) => persist({ ...config, color })
  const setEye = (eye: MonsterFeature) => persist({ ...config, eye })
  const setMouth = (mouth: MonsterFeature) => persist({ ...config, mouth })
  const setHorn = (horn: MonsterFeature) => persist({ ...config, horn })

  const commitName = useCallback(() => {
    const trimmed = scribbldCase(name.trim() || 'Anonymous')
    setName(trimmed)
    if (blankSlate) return
    if (shouldSyncActiveSession(editProfileName)) {
      localStorage.setItem(USER_NAME_KEY, trimmed)
    }
  }, [name, blankSlate, editProfileName])

  return (
    <div
      className="flex h-[100dvh] min-h-0 flex-col bg-[#f9fdff] text-[#0f1027]"
      data-name="ProfileCreator"
    >
      {/* Top: logo + profile — does not scroll */}
      <header
        className="shrink-0 border-b border-[#0f1027]/10 bg-[#f9fdff] px-4 pb-0 shadow-[0_6px_16px_-8px_rgba(15,16,39,0.12)]"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-3">
          <img
            src={ASSETS.logo}
            alt={scribbldCase('SCRIBBLD')}
            className="h-auto w-[180px] shrink-0 cursor-pointer object-contain"
            onClick={() => navigate('/splash')}
          />
          <div className="flex w-full flex-col items-center gap-0">
            <MonsterAvatar config={config} size={152} />
            <label className="sr-only" htmlFor="profile-display-name">
              {scribbldCase('Display name')}
            </label>
            <RectanglePlate className="-mt-14">
              <input
                id="profile-display-name"
                type="text"
                name="displayName"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                placeholder={scribbldCase('Your name')}
                className="w-full min-h-0 border-0 bg-transparent text-center font-sans text-xl font-medium leading-tight text-[#0f1027] outline-none placeholder:text-[#0f1027]/40 focus-visible:ring-2 focus-visible:ring-[#0f1027]/35 focus-visible:ring-offset-0"
              />
            </RectanglePlate>
          </div>
        </div>
      </header>

      {/* Only the option pickers scroll */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-[calc(93px+max(1.25rem,env(safe-area-inset-bottom)))] [scrollbar-gutter:stable]">
        <div className={`mx-auto mt-3 flex w-full flex-col gap-6 ${PICKER_COL_WIDTH}`}>
          <div>
            <p className="text-sm font-medium mb-2">{scribbldCase('Body shape')}</p>
            <div className="grid grid-cols-3 gap-1.5 place-items-center">
              {MONSTER_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setShape(shape)}
                  className={`${pickerBtn} ${
                    config.shape === shape ? 'border-[#0f1027] ring-2 ring-[#0f1027]/30' : 'border-[#0f1027]/25'
                  }`}
                  aria-pressed={config.shape === shape}
                >
                  <img
                    src={monsterBodyUrl(shape, config.color)}
                    alt=""
                    className="size-full object-contain"
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">{scribbldCase('Color')}</p>
            <div className="grid grid-cols-3 gap-1.5 place-items-center">
              {MONSTER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColor(color)}
                  className={`${pickerBtn} ${
                    config.color === color ? 'border-[#0f1027] ring-2 ring-[#0f1027]/30' : 'border-[#0f1027]/25'
                  }`}
                  aria-pressed={config.color === color}
                  title={scribbldCase(color)}
                >
                  <img
                    src={monsterBodyUrl(config.shape, color)}
                    alt=""
                    className="size-full object-contain"
                  />
                </button>
              ))}
            </div>
          </div>

          <FeatureRow label="Eyes" value={config.eye} onChange={setEye} options={[1, 2, 3]} src={eyeUrl} />
          <FeatureRow label="Mouth" value={config.mouth} onChange={setMouth} options={[1, 2, 3]} src={mouthUrl} />
          <FeatureRow label="Horns" value={config.horn} onChange={setHorn} options={[1, 2, 3]} src={hornUrl} />
        </div>

        <div className="mx-auto mt-3 w-full max-w-[400px] pb-4">
          <RectanglePlate>
            <button
              type="button"
              className="w-full min-h-0 cursor-pointer border-0 bg-transparent text-center font-sans text-xl font-medium leading-tight text-[#0f1027] outline-none transition-opacity hover:opacity-90 active:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0f1027]/35 focus-visible:ring-offset-0"
              onClick={() => {
                const trimmed = scribbldCase(name.trim() || 'Anonymous')
                setName(trimmed)
                upsertSavedProfile(trimmed, config)
                localStorage.setItem(PROFILE_HUB_VIEWING_KEY, displayLabel(trimmed))
                if (blankSlate || shouldSyncActiveSession(editProfileName)) {
                  localStorage.setItem(USER_NAME_KEY, trimmed)
                  localStorage.setItem(STORAGE_KEY, stringifyMonsterConfig(config))
                }
                navigate('/profile')
              }}
            >
              {scribbldCase('Done')}
            </button>
          </RectanglePlate>
        </div>
      </div>
      <AppNavFooter />
    </div>
  )
}
