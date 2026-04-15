import { useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { ASSETS } from './assets'

export default function Profile() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [monster, setMonster] = useState('')

  useEffect(() => {
    setName(localStorage.getItem('userName') || 'Anonymous')
    setMonster(localStorage.getItem('userMonster') || '')
  }, [])

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const data = reader.result as string
      localStorage.setItem('userMonster', data)
      setMonster(data)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-screen bg-[#f9fdff] flex flex-col items-center px-6 pt-12 pb-24 text-[#0f1027]" data-name="Profile">
      <img src={ASSETS.logo} alt="SCRIBBLD" className="w-[200px] h-auto mb-8 object-contain cursor-pointer" onClick={() => navigate('/splash')} />
      <div className="flex flex-col items-center gap-4 max-w-[320px] w-full">
        <div
          className="size-[120px] rounded-full bg-white border-4 border-[#0f1027] overflow-hidden flex items-center justify-center text-sm text-center p-2"
          style={{ backgroundImage: monster ? `url(${monster})` : undefined, backgroundSize: 'cover' }}
        >
          {!monster && 'No avatar'}
        </div>
        <label className="cursor-pointer rounded-full border-2 border-[#0f1027] px-4 py-2 text-sm hover:bg-black/5">
          Upload avatar
          <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
        </label>
        <p className="text-xl font-medium">{name}</p>
      </div>
      <div className="fixed bottom-8 flex gap-4">
        <button
          type="button"
          className="rounded-full border-2 border-[#0f1027] px-6 py-2"
          onClick={() => navigate('/home')}
        >
          Home
        </button>
        <button
          type="button"
          className="rounded-full bg-[#0f1027] text-[#f9fdff] px-6 py-2"
          onClick={() => navigate('/create')}
        >
          Create
        </button>
      </div>
    </div>
  )
}
