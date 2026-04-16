import { useLocation, useNavigate } from 'react-router'
import { ASSETS } from '../../imports/assets'

/** Bottom bar height excluding safe area (matches design footer strip). */
export const APP_NAV_FOOTER_HEIGHT_PX = 93

type Props = {
  /** Optional: on Create screen, center control clears the canvas instead of navigating. */
  onPlusClick?: () => void
}

/**
 * Fixed bottom nav: Home (left), Plus / exit on create (center), Profile (right).
 * Active route uses filled home/profile icons or exit on `/create`.
 */
export function AppNavFooter({ onPlusClick }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const onHome = pathname === '/home'
  const onProfile = pathname === '/profile' || pathname.startsWith('/profile/')
  const onCreate = pathname === '/create'

  const homeIcon = onHome ? ASSETS.homeFilled : ASSETS.home
  const profileIcon = onProfile ? ASSETS.profileFilled : ASSETS.profile
  const centerIcon = onCreate ? ASSETS.exit : ASSETS.plus

  const handlePlus = () => {
    if (onPlusClick) {
      onPlusClick()
      return
    }
    navigate('/create')
  }

  return (
    <div
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[393px] -translate-x-1/2 pb-[env(safe-area-inset-bottom)]"
      data-name="AppNavFooter"
    >
      <div className="relative h-[93px] w-full overflow-hidden bg-[#f9fdff]">
        <img
          src={ASSETS.line}
          alt=""
          className="pointer-events-none absolute left-0 right-0 top-[12px] z-[2] h-[14px] w-full object-cover object-bottom select-none"
          aria-hidden
        />
        <button
          type="button"
          className="absolute left-[49px] top-[27px] z-10 size-[63px] cursor-pointer transition-transform hover:scale-105"
          aria-label="Home feed"
          onClick={() => navigate('/home')}
        >
          <img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={homeIcon} />
        </button>
        <button
          type="button"
          className="absolute left-[164px] top-[26px] z-10 size-[64px] cursor-pointer transition-transform hover:scale-105"
          aria-label={onPlusClick ? 'Clear canvas' : 'New scribble'}
          onClick={handlePlus}
        >
          <img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={centerIcon} />
        </button>
        <button
          type="button"
          className="absolute left-[280px] top-[26px] z-10 size-[64px] cursor-pointer transition-transform hover:scale-105"
          aria-label="Profile"
          onClick={() => navigate('/profile')}
        >
          <img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={profileIcon} />
        </button>
      </div>
    </div>
  )
}
