import { useNavigate } from 'react-router'
import { useState } from 'react'
import { ASSETS } from './assets'

export default function ProfileInputPage() {
  const navigate = useNavigate()
  const [name, setName] = useState(() => localStorage.getItem('userName') || '')

  const saveAndContinue = () => {
    localStorage.setItem('userName', name.trim() || 'Anonymous')
    navigate('/home')
  }

  return (
    <div className="min-h-screen bg-[#f9fdff] flex flex-col items-center pt-24 px-6 text-[#0f1027]" data-name="ProfileInputPage">
      <img src={ASSETS.logo} alt="SCRIBBLD" className="w-[220px] h-auto mb-10 object-contain" />
      <label className="w-full max-w-[320px] text-sm font-medium mb-2">Display name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full max-w-[320px] rounded-2xl border-2 border-[#0f1027] bg-white px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-[#0f1027]/30"
      />
      <p className="w-full max-w-[320px] text-sm text-[#0f1027]/70 mt-6 mb-8">
        Optional: set a profile picture from the Profile tab after you enter the app.
      </p>
      <button
        type="button"
        onClick={saveAndContinue}
        className="rounded-full bg-[#0f1027] text-[#f9fdff] px-10 py-3 text-lg font-medium hover:opacity-90 transition-opacity"
      >
        Continue
      </button>
    </div>
  )
}
