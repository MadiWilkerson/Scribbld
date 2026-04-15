import { useNavigate } from 'react-router'
import { ASSETS } from './assets'

export default function Splash() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen bg-[#f9fdff] flex flex-col items-center justify-center gap-10 px-6 cursor-pointer"
      data-name="Splash"
      onClick={() => navigate('/home')}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/home')}
      role="button"
      tabIndex={0}
    >
      <img src={ASSETS.logo} alt="SCRIBBLD" className="w-[280px] max-w-[90vw] h-auto object-contain" />
      <p className="text-[#0f1027]/80 text-center text-lg">Tap anywhere to continue</p>
    </div>
  )
}
