import { useNavigate } from 'react-router'
import { ASSETS } from './assets'

export default function Splash() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f9fdff]" data-name="Splash">
      <div
        className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-10 px-6"
        onClick={() => navigate('/welcome')}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/welcome')}
        role="button"
        tabIndex={0}
      >
        <img src={ASSETS.logo} alt="SCRIBBLD" className="h-auto w-[280px] max-w-[90vw] object-contain" />
        <p className="text-center text-lg text-[#0f1027]/80">Tap anywhere to continue</p>
      </div>
    </div>
  )
}
