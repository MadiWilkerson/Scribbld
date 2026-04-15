import { useNavigate } from 'react-router'
import { useRef, useState, useEffect } from 'react'
import { ASSETS } from './assets'

function Header({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="absolute contents left-0 top-[-10px]" data-name="Header">
      <div className="absolute flex h-[118px] items-center justify-center left-0 top-0 w-[393px]">
        <div className="flex-none rotate-180">
          <div className="bg-[#f9fdff] h-[118px] w-[393px] relative" data-name="HeaderRectangle">
            <img src={ASSETS.line} alt="" className="absolute top-0 left-0 w-full h-[3px] object-cover" />
          </div>
        </div>
      </div>
      <div
        className="absolute h-[142px] left-[81px] top-[-10px] w-[230px] cursor-pointer hover:scale-105 transition-transform"
        data-name="scribbld-01 1"
        onClick={() => navigate('/splash')}
      >
        <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.logo} />
      </div>
    </div>
  )
}

function Drawing({
  canvasRef,
  drawingMode,
  setDrawingMode,
  saveDrawing,
  startDrawing,
  draw,
  stopDrawing,
  colors,
  selectedColor,
  setSelectedColor,
  penSize,
  setPenSize,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  drawingMode: 'pen' | 'eraser'
  setDrawingMode: (mode: 'pen' | 'eraser') => void
  saveDrawing: () => void
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void
  draw: (e: React.MouseEvent<HTMLCanvasElement>) => void
  stopDrawing: () => void
  colors: Array<{ name: string; hex: string }>
  selectedColor: string
  setSelectedColor: (color: string) => void
  penSize: number
  setPenSize: (size: number) => void
}) {
  return (
    <div className="absolute contents left-[30px] top-[170px]" data-name="Drawing">
      <div className="absolute bg-white left-[20px] rounded-[31px] w-[352px] h-[352px] top-[200px] overflow-hidden" data-name="drawingbox">
        <canvas
          ref={canvasRef}
          width={332}
          height={332}
          className="absolute left-[10px] top-[10px] size-[332px] rounded-[22px] cursor-crosshair z-0"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        <img
          src={ASSETS.square}
          alt=""
          className="absolute inset-0 size-full object-fill pointer-events-none z-10 rounded-[31px]"
        />
      </div>
      <div
        className="absolute flex items-center justify-center left-[10px] size-[90.522px] top-[645px] cursor-pointer hover:scale-105 transition-transform"
        style={{ '--transform-inner-width': '1200', '--transform-inner-height': '19' } as React.CSSProperties}
        onClick={() => setDrawingMode('eraser')}
      >
        <div className="flex-none rotate-[-29.73deg]">
          <div
            className={`relative size-[66.353px] transition-transform ${drawingMode === 'eraser' ? 'scale-125' : ''}`}
            data-name="scribbld_Eraser 1"
          >
            <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.eraser} />
          </div>
        </div>
      </div>
      <div
        className={`absolute left-[308px] size-[64px] top-[658px] cursor-pointer hover:scale-105 transition-transform ${drawingMode === 'pen' ? 'scale-125' : ''}`}
        data-name="scribbld_Pencil 1"
        onClick={() => setDrawingMode('pen')}
      >
        <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.pencil} />
      </div>
      <div
        className="absolute left-[264px] size-[94px] top-[180px] cursor-pointer hover:scale-105 transition-transform"
        data-name="scribbld_Check 1"
        onClick={saveDrawing}
      >
        <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.check} />
      </div>
      <div className="absolute left-[48px] top-[585px] flex gap-2" data-name="color-palette">
        {colors.map((color) => (
          <div
            key={color.hex}
            className={`size-[30px] rounded-full border-[3px] border-[#0f1027] cursor-pointer hover:scale-110 transition-transform ${selectedColor === color.hex ? 'scale-125' : ''}`}
            style={{ backgroundColor: color.hex }}
            onClick={() => setSelectedColor(color.hex)}
          />
        ))}
      </div>
      <div className="absolute left-[150px] top-[610px] flex items-center gap-2" data-name="size-control">
        <input
          type="range"
          min="1"
          max="10"
          value={penSize}
          onChange={(e) => setPenSize(Number(e.target.value))}
          className="w-[70px] h-2 bg-white border-2 border-[#0f1027] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0f1027] [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
    </div>
  )
}

function Footer({ navigate, clearCanvas }: { navigate: ReturnType<typeof useNavigate>; clearCanvas: () => void }) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[393px] z-50" data-name="Footer">
      <div className="bg-[#f9fdff] h-[93px] w-full relative" data-name="FooterRectangle">
        <img src={ASSETS.line} alt="" className="absolute top-0 left-0 w-full h-[3px] object-cover" />
        <div
          className="absolute left-[159px] size-[64px] top-[15px] cursor-pointer hover:scale-105 transition-transform"
          data-name="scribbld_Exit 1"
          onClick={clearCanvas}
        >
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.exit} />
        </div>
        <div
          className="absolute left-[43px] size-[64px] top-[15px] cursor-pointer hover:scale-105 transition-transform"
          data-name="scribbld_Home 2"
          onClick={() => navigate('/home')}
        >
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.home} />
        </div>
        <div
          className="absolute left-[275px] size-[64px] top-[15px] cursor-pointer hover:scale-105 transition-transform"
          data-name="scribbld_Profile 2"
          onClick={() => navigate('/profile')}
        >
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={ASSETS.profile} />
        </div>
      </div>
    </div>
  )
}

export default function ScribblCreator() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingMode, setDrawingMode] = useState<'pen' | 'eraser'>('pen')
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [penSize, setPenSize] = useState(3)

  const colors = [
    { name: 'Black', hex: '#000000' },
    { name: 'Red', hex: '#FF0000' },
    { name: 'Orange', hex: '#FF8800' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Green', hex: '#00FF00' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Purple', hex: '#8800FF' },
    { name: 'Pink', hex: '#FF00FF' },
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (drawingMode === 'pen') {
      ctx.strokeStyle = selectedColor
      ctx.lineWidth = penSize
      ctx.globalCompositeOperation = 'source-over'
    } else {
      ctx.strokeStyle = 'white'
      ctx.lineWidth = penSize * 5
      ctx.globalCompositeOperation = 'destination-out'
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const saveDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const drawingData = canvas.toDataURL('image/png')
    const userName = localStorage.getItem('userName') || 'Anonymous'
    const userMonster = localStorage.getItem('userMonster') || ''

    const existingDrawings = localStorage.getItem('drawings')
    const drawings = existingDrawings ? JSON.parse(existingDrawings) : []

    drawings.unshift({
      id: Date.now(),
      image: drawingData,
      timestamp: new Date().toISOString(),
      userName: userName,
      userMonster: userMonster,
    })

    localStorage.setItem('drawings', JSON.stringify(drawings))

    navigate('/home')
  }

  return (
    <div className="bg-[#f9fdff] relative w-full min-h-screen flex items-start justify-center overflow-hidden" data-name="ScribblCreator">
      <div className="relative w-[393px] min-h-screen">
        <Header navigate={navigate} />
        <Drawing
          canvasRef={canvasRef}
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
          saveDrawing={saveDrawing}
          startDrawing={startDrawing}
          draw={draw}
          stopDrawing={stopDrawing}
          colors={colors}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          penSize={penSize}
          setPenSize={setPenSize}
        />
        <Footer navigate={navigate} clearCanvas={clearCanvas} />
      </div>
    </div>
  )
}
