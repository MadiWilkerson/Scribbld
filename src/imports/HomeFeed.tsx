import { useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { HeartIcon } from '../app/components/HeartIcon'
import { ASSETS } from './assets'

function Header({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="absolute contents left-0 top-[-10px]" data-name="Header">
      <div className="absolute flex h-[118px] items-center justify-center left-0 top-0 w-[393px]">
        <div className="bg-[#f9fdff] h-[118px] w-[393px] relative overflow-hidden" data-name="HeaderRectangle">
          <img
            src={ASSETS.rectangle}
            alt=""
            className="absolute inset-0 size-full object-fill pointer-events-none z-[1]"
            aria-hidden
          />
          <img
            src={ASSETS.line}
            alt=""
            className="absolute left-0 right-0 top-0 z-[2] h-[14px] w-full object-cover object-top pointer-events-none select-none"
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

function Footer({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[393px] z-50" data-name="Footer">
      <div className="bg-[#f9fdff] h-[93px] w-full relative overflow-hidden" data-name="FooterRectangle">
        <img
          src={ASSETS.rectangle}
          alt=""
          className="absolute inset-0 size-full object-fill pointer-events-none z-[1]"
          aria-hidden
        />
        <img
          src={ASSETS.line}
          alt=""
          className="absolute left-0 right-0 top-0 z-[2] h-[14px] w-full object-cover object-top pointer-events-none select-none"
          aria-hidden
        />
        <div
          className="absolute left-[164px] size-[64px] top-[15px] z-10 cursor-pointer hover:scale-105 transition-transform"
          data-name="scribbld_Plus 1"
          onClick={() => navigate('/create')}
        >
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.plus} />
        </div>
        <div
          className="absolute left-[280px] size-[64px] top-[15px] z-10 cursor-pointer hover:scale-105 transition-transform"
          data-name="scribbld_Profile 1"
          onClick={() => navigate('/profile')}
        >
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.profile} />
        </div>
        <div className="absolute left-[49px] size-[63px] top-[16px] z-10" data-name="scribbld_HomeFilled 1">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={ASSETS.homeFilled} />
        </div>
      </div>
    </div>
  )
}

interface Drawing {
  id: number
  image: string
  timestamp: string
  userName?: string
  userMonster?: string
}

export default function HomeFeed() {
  const navigate = useNavigate()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [hoveredDrawing, setHoveredDrawing] = useState<number | null>(null)
  const [likedDrawings, setLikedDrawings] = useState<Set<number>>(new Set())

  useEffect(() => {
    const savedDrawings = localStorage.getItem('drawings')
    if (savedDrawings) {
      setDrawings(JSON.parse(savedDrawings))
    }

    const savedLikes = localStorage.getItem('likedDrawings')
    if (savedLikes) {
      setLikedDrawings(new Set(JSON.parse(savedLikes)))
    }
  }, [])

  const deleteDrawing = (drawingId: number) => {
    const updatedDrawings = drawings.filter((d) => d.id !== drawingId)
    setDrawings(updatedDrawings)
    localStorage.setItem('drawings', JSON.stringify(updatedDrawings))
  }

  const toggleLike = (drawingId: number) => {
    const newLikes = new Set(likedDrawings)
    if (newLikes.has(drawingId)) {
      newLikes.delete(drawingId)
    } else {
      newLikes.add(drawingId)
    }
    setLikedDrawings(newLikes)
    localStorage.setItem('likedDrawings', JSON.stringify(Array.from(newLikes)))
  }

  return (
    <div className="bg-[#f9fdff] relative w-full min-h-screen flex items-start justify-center overflow-y-auto" data-name="HomeFeed">
      <div className="relative w-[393px] min-h-full">
        <Header navigate={navigate} />
        <div className="absolute left-[41px] top-[156px] w-[312px] space-y-8 pb-[120px]">
          {drawings.map((drawing) => (
            <div
              key={drawing.id}
              className="relative"
              data-name="post"
              onMouseEnter={() => setHoveredDrawing(drawing.id)}
              onMouseLeave={() => setHoveredDrawing(null)}
            >
              <div className="relative bg-white rounded-[31px] size-[312px] overflow-hidden" data-name="postbox">
                <img
                  src={drawing.image}
                  alt="Drawing"
                  className="absolute inset-[10px] size-[calc(100%-20px)] object-contain rounded-[22px] z-0"
                />
                <img
                  src={ASSETS.rectangle}
                  alt=""
                  className="absolute inset-0 size-full object-fill pointer-events-none z-10 rounded-[31px]"
                />
                {hoveredDrawing === drawing.id && (
                  <div
                    className="absolute top-2 right-2 size-[64px] cursor-pointer hover:scale-105 transition-transform z-20"
                    onClick={() => deleteDrawing(drawing.id)}
                  >
                    <img alt="Delete" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.exit} />
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {drawing.userMonster && (
                    <img src={drawing.userMonster} alt="" className="size-[40px] object-cover rounded-full" />
                  )}
                  <span className="text-[#0f1027] text-lg">{drawing.userName || 'Anonymous'}</span>
                </div>
                <HeartIcon filled={likedDrawings.has(drawing.id)} onClick={() => toggleLike(drawing.id)} />
              </div>
            </div>
          ))}
        </div>
        <Footer navigate={navigate} />
      </div>
    </div>
  )
}
