import { useNavigate } from 'react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppNavFooter } from '../app/components/AppNavFooter'
import { ASSETS } from './assets'
import {
  formatScribblePromptTimeLeft,
  getActivePromptSession,
} from './drawingPrompts'
import { parseMonsterConfig, stringifyMonsterConfig } from './monsterConfig'
import { getActiveUserForLikes } from './likeStorage'
import { loadSavedProfiles, resolveMonsterForUser, upsertSavedProfile } from './savedProfiles'

/** Persisted until the user clears the canvas or posts (see ScribblCreator). */
const SCRIBBL_DRAFT_KEY = 'scribblCanvasDraft'

const COLOR_WHEEL_PX = 210

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  if (s <= 0.001) {
    const x = Math.round(v * 255)
    return [x, x, x]
  }
  const hh = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = v - c
  let rp = 0
  let gp = 0
  let bp = 0
  if (hh < 60) [rp, gp, bp] = [c, x, 0]
  else if (hh < 120) [rp, gp, bp] = [x, c, 0]
  else if (hh < 180) [rp, gp, bp] = [0, c, x]
  else if (hh < 240) [rp, gp, bp] = [0, x, c]
  else if (hh < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]
  return [Math.round((rp + m) * 255), Math.round((gp + m) * 255), Math.round((bp + m) * 255)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
    .join('')}`
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const v = max
  const s = max === 0 ? 0 : d / max
  let h = 0
  if (d > 1e-9) {
    if (max === rn) {
      h = ((((gn - bn) / d) % 6) + 6) % 6
      h *= 60
    } else if (max === gn) {
      h = ((bn - rn) / d + 2) * 60
    } else {
      h = ((rn - gn) / d + 4) * 60
    }
    if (h < 0) h += 360
  }
  return { h, s, v }
}

function hexFromHsv(h: number, s: number, v: number): string {
  const [r, g, b] = hsvToRgb(h, s, v)
  return rgbToHex(r, g, b)
}

function eyeDropperSupported(): boolean {
  return typeof globalThis !== 'undefined' && 'EyeDropper' in globalThis
}

async function openEyeDropper(): Promise<string | null> {
  if (!eyeDropperSupported()) return null
  type EyeDropperResult = { sRGBHex: string }
  type EyeDropperCtor = new () => { open: () => Promise<EyeDropperResult> }
  const Ctor = (globalThis as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper
  const dropper = new Ctor()
  const result = await dropper.open()
  return result.sRGBHex ?? null
}

/** Flood-fill contiguous region matching the start pixel color (4-connected). */
function floodFillAtPixel(
  canvas: HTMLCanvasElement,
  px: number,
  py: number,
  fillHex: string,
): boolean {
  const rgb = hexToRgb(fillHex)
  if (!rgb) return false
  const [fr, fg, fb] = rgb
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return false
  const w = canvas.width
  const h = canvas.height
  const x0 = Math.floor(px)
  const y0 = Math.floor(py)
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return false

  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data
  const start = (y0 * w + x0) * 4
  const tr = d[start]
  const tg = d[start + 1]
  const tb = d[start + 2]
  const ta = d[start + 3]

  if (tr === fr && tg === fg && tb === fb && ta === 255) return false

  const match = (p: number) =>
    d[p] === tr && d[p + 1] === tg && d[p + 2] === tb && d[p + 3] === ta

  const stack: [number, number][] = [[x0, y0]]
  const seen = new Uint8Array(w * h)

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    if (x < 0 || y < 0 || x >= w || y >= h) continue
    const si = y * w + x
    if (seen[si]) continue
    const p = si * 4
    if (!match(p)) continue
    seen[si] = 1
    d[p] = fr
    d[p + 1] = fg
    d[p + 2] = fb
    d[p + 3] = 255
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }

  ctx.putImageData(imageData, 0, 0)
  return true
}

/** Hue + saturation from wheel; value (brightness) comes from the separate strip. */
function hsFromWheelPixel(
  px: number,
  py: number,
  size: number,
  radius: number,
): { h: number; s: number } | null {
  const cx = size / 2
  const cy = size / 2
  const dx = px - cx
  const dy = py - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > radius) return null
  if (dist < 1.5) return { h: 0, s: 0 }
  const hue = (((Math.atan2(dy, dx) * 180) / Math.PI) + 360) % 360
  const sat = Math.min(dist / radius, 1)
  return { h: hue, s: sat }
}

function paintColorWheel(ctx: CanvasRenderingContext2D, size: number) {
  const radius = size / 2 - 2
  const cx = size / 2
  const cy = size / 2
  const img = ctx.createImageData(size, size)
  const d = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5
      const dy = y - cy + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      const i = (y * size + x) * 4
      if (dist > radius) {
        d[i + 3] = 0
        continue
      }
      const hue = (((Math.atan2(dy, dx) * 180) / Math.PI) + 360) % 360
      const sat = dist < 1.5 ? 0 : Math.min(dist / radius, 1)
      const [r, g, b] = hsvToRgb(hue, sat, 1)
      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

function Header({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="absolute contents left-0 top-[-10px]" data-name="Header">
      <div className="absolute flex h-[118px] items-center justify-center left-0 top-0 w-[393px]">
        <div className="bg-[#f9fdff] h-[118px] w-[393px] relative overflow-hidden" data-name="HeaderRectangle">
          <img
            src={ASSETS.line}
            alt=""
            className="absolute bottom-0 left-0 right-0 z-[2] h-[14px] w-full object-cover object-bottom pointer-events-none select-none"
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

function Drawing({
  canvasRef,
  drawingMode,
  setDrawingMode,
  saveDrawing,
  startDrawing,
  draw,
  stopDrawing,
  undo,
  redo,
  canUndo,
  canRedo,
  selectedColor,
  setSelectedColor,
  penSize,
  setPenSize,
  onArmFill,
  fillArmed,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  drawingMode: 'pen' | 'eraser'
  setDrawingMode: (mode: 'pen' | 'eraser') => void
  saveDrawing: () => void
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void
  draw: (e: React.MouseEvent<HTMLCanvasElement>) => void
  stopDrawing: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  selectedColor: string
  setSelectedColor: (color: string) => void
  penSize: number
  setPenSize: (size: number) => void
  onArmFill: () => void
  fillArmed: boolean
}) {
  const [spectrumOpen, setSpectrumOpen] = useState(false)
  const [pickerHsv, setPickerHsv] = useState({ h: 0, s: 0, v: 1 })
  const wheelRef = useRef<HTMLCanvasElement>(null)
  const valueStripRef = useRef<HTMLDivElement>(null)
  const colorUiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!spectrumOpen) return
    const canvas = wheelRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    paintColorWheel(ctx, COLOR_WHEEL_PX)
  }, [spectrumOpen])

  useEffect(() => {
    if (!spectrumOpen) return
    const rgb = hexToRgb(selectedColor)
    if (rgb) {
      const p = rgbToHsv(rgb[0], rgb[1], rgb[2])
      setPickerHsv({ h: p.h, s: p.s, v: p.v })
    } else {
      setPickerHsv({ h: 0, s: 0, v: 0 })
    }
  }, [spectrumOpen])

  useEffect(() => {
    if (!spectrumOpen) return
    const close = (e: MouseEvent) => {
      if (!colorUiRef.current?.contains(e.target as Node)) {
        setSpectrumOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [spectrumOpen])

  const pickFromWheel = (clientX: number, clientY: number) => {
    const canvas = wheelRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    const r = canvas.width / 2 - 2
    const hs = hsFromWheelPixel(x, y, COLOR_WHEEL_PX, r)
    if (!hs) return
    setPickerHsv((prev) => {
      const next = { h: hs.h, s: hs.s, v: prev.v }
      setSelectedColor(hexFromHsv(next.h, next.s, next.v))
      return next
    })
    setDrawingMode('pen')
  }

  /** Horizontal strip: left = bright (v=1), right = dark (v=0). */
  const pickFromValueStrip = useCallback(
    (clientX: number) => {
      const el = valueStripRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const t = (clientX - rect.left) / rect.width
      const v = Math.max(0, Math.min(1, 1 - t))
      setPickerHsv((prev) => {
        const next = { ...prev, v }
        setSelectedColor(hexFromHsv(next.h, next.s, next.v))
        return next
      })
      setDrawingMode('pen')
    },
    [setDrawingMode, setSelectedColor],
  )

  const pickFromScreen = useCallback(async () => {
    try {
      const hexRaw = await openEyeDropper()
      if (!hexRaw) return
      const normalized = hexRaw.startsWith('#') ? hexRaw : `#${hexRaw}`
      const rgb = hexToRgb(normalized.slice(0, 7))
      if (!rgb) return
      const p = rgbToHsv(rgb[0], rgb[1], rgb[2])
      setPickerHsv({ h: p.h, s: p.s, v: p.v })
      setSelectedColor(hexFromHsv(p.h, p.s, p.v))
      setDrawingMode('pen')
    } catch {
      /* user dismissed eyedropper */
    }
  }, [setDrawingMode, setSelectedColor])

  const valueStripGradient = useMemo(
    () =>
      `linear-gradient(to right, ${hexFromHsv(pickerHsv.h, pickerHsv.s, 1)}, #000000)`,
    [pickerHsv.h, pickerHsv.s],
  )

  const sizeTrackRef = useRef<HTMLDivElement>(null)
  const sizeDragRef = useRef(false)

  const setPenFromClientX = useCallback(
    (clientX: number) => {
      const el = sizeTrackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const t = (clientX - rect.left) / rect.width
      const v = Math.max(1, Math.min(10, Math.round(1 + t * 9)))
      setPenSize(v)
    },
    [setPenSize],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!sizeDragRef.current) return
      let clientX: number | null = null
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX
      } else if ('clientX' in e) {
        clientX = e.clientX
      }
      if (clientX != null) setPenFromClientX(clientX)
    }
    const onUp = () => {
      sizeDragRef.current = false
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchend', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchend', onUp)
    }
  }, [setPenFromClientX])

  return (
    <div className="absolute contents left-[30px] top-[170px]" data-name="Drawing">
      <div className="absolute bg-white left-[20px] rounded-[31px] w-[352px] h-[352px] top-[200px] overflow-hidden" data-name="drawingbox">
        <canvas
          ref={canvasRef}
          width={332}
          height={332}
          className={`absolute left-[10px] top-[10px] size-[332px] rounded-[22px] z-0 ${
            fillArmed ? 'cursor-cell' : 'cursor-crosshair'
          }`}
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
        className="absolute left-[20px] top-[528px] z-[15] h-[40px] w-[352px]"
        data-name="post-actions"
      >
        <div
          className="absolute left-5 top-0 z-20 flex translate-y-1 items-center gap-2"
          ref={colorUiRef}
        >
          <button
            type="button"
            className="relative size-7 shrink-0 overflow-visible outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#0f1027]/35"
            aria-expanded={spectrumOpen}
            aria-haspopup="dialog"
            aria-label="Choose color"
            onClick={(e) => {
              e.stopPropagation()
              setSpectrumOpen((o) => !o)
            }}
          >
            <span
              className="absolute inset-px rounded-full"
              style={{ backgroundColor: selectedColor }}
              aria-hidden
            />
            <img
              src={ASSETS.emptyCircle}
              alt=""
              className="pointer-events-none absolute inset-0 size-full object-contain"
              aria-hidden
            />
          </button>
          {drawingMode === 'pen' ? (
            <button
              type="button"
              className="-ml-1 relative -left-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-transform hover:scale-105 active:scale-95"
              aria-label="Switch to eraser"
              data-name="tool-eraser"
              onClick={() => setDrawingMode('eraser')}
            >
              <span className="flex-none rotate-[-29.73deg]">
                <img alt="" className="size-10 max-w-none object-contain" src={ASSETS.eraser} />
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="-ml-1 relative -left-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-transform hover:scale-105 active:scale-95"
              aria-label="Switch to pencil"
              data-name="tool-pencil"
              onClick={() => setDrawingMode('pen')}
            >
              <img alt="" className="size-10 max-w-none object-contain" src={ASSETS.pencil} />
            </button>
          )}
          <button
            type="button"
            className="-ml-1 relative -left-1.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-transform hover:scale-105 active:scale-95"
            aria-label="Fill enclosed area with selected color — then tap the drawing"
            data-name="tool-fill"
            onClick={(e) => {
              e.stopPropagation()
              onArmFill()
            }}
          >
            <img alt="" className="size-5 max-w-none object-contain" src={ASSETS.paintFillBucket} />
          </button>
          {spectrumOpen && (
            <div
              className="absolute bottom-[calc(100%+8px)] left-0 z-[100] flex w-[min(210px,calc(100vw-2rem))] flex-col items-center gap-2 rounded-2xl border border-[#0f1027]/15 bg-[#f9fdff] p-2 shadow-xl"
              role="dialog"
              aria-label="Color spectrum"
            >
              <canvas
                ref={wheelRef}
                width={COLOR_WHEEL_PX}
                height={COLOR_WHEEL_PX}
                className="block h-[min(210px,70vw)] w-[min(210px,70vw)] shrink-0 cursor-crosshair touch-none rounded-full"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pickFromWheel(e.clientX, e.clientY)
                }}
                onMouseMove={(e) => {
                  if (e.buttons !== 1) return
                  e.preventDefault()
                  pickFromWheel(e.clientX, e.clientY)
                }}
                onTouchStart={(e) => {
                  e.preventDefault()
                  const t = e.touches[0]
                  if (t) pickFromWheel(t.clientX, t.clientY)
                }}
                onTouchMove={(e) => {
                  e.preventDefault()
                  const t = e.touches[0]
                  if (t) pickFromWheel(t.clientX, t.clientY)
                }}
              />
              <div
                ref={valueStripRef}
                className="relative h-[26px] w-full max-w-[210px] shrink-0 cursor-ew-resize touch-none rounded-lg border border-[#0f1027]/20"
                style={{ background: valueStripGradient }}
                role="slider"
                aria-label="Brightness"
                aria-orientation="horizontal"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pickerHsv.v * 100)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pickFromValueStrip(e.clientX)
                }}
                onMouseMove={(e) => {
                  if (e.buttons !== 1) return
                  e.preventDefault()
                  pickFromValueStrip(e.clientX)
                }}
                onTouchStart={(e) => {
                  e.preventDefault()
                  const t = e.touches[0]
                  if (t) pickFromValueStrip(t.clientX)
                }}
                onTouchMove={(e) => {
                  e.preventDefault()
                  const t = e.touches[0]
                  if (t) pickFromValueStrip(t.clientX)
                }}
              />
              {eyeDropperSupported() ? (
                <button
                  type="button"
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#0f1027]/20 bg-white text-[#0f1027] shadow-sm transition-transform hover:scale-105 hover:border-[#0f1027]/35 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f1027]/40"
                  aria-label="Pick color from screen"
                  title="Eyedropper — sample a color from anywhere on screen"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void pickFromScreen()
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                    aria-hidden
                  >
                    <path d="M2.586 15.408a2 2 0 0 0 0 2.828l.81.81a2 2 0 0 0 2.828 0l8.716-8.716-3.637-3.637-8.717 8.715z" />
                    <path d="m16.13 5.698.762-.762a2.828 2.828 0 0 1 4 4l-.894.894" />
                    <path d="M14.828 7 21 13.172" />
                  </svg>
                </button>
              ) : null}
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 flex translate-y-1.5 items-center justify-center">
          <div
            className="pointer-events-auto flex translate-x-2 items-center gap-0 -space-x-2.5"
            data-name="undo-redo"
          >
            <button
              type="button"
              className={`flex size-11 shrink-0 items-center justify-center rounded-lg transition-opacity ${
                canUndo ? 'cursor-pointer hover:opacity-80 active:opacity-70' : 'cursor-not-allowed opacity-35'
              }`}
              aria-label="Undo last stroke"
              disabled={!canUndo}
              onClick={undo}
            >
              <img alt="" className="size-9 max-h-full max-w-full object-contain" src={ASSETS.undoArrow} />
            </button>
            <button
              type="button"
              className={`relative left-1 flex size-11 shrink-0 items-center justify-center rounded-lg transition-opacity ${
                canRedo ? 'cursor-pointer hover:opacity-80 active:opacity-70' : 'cursor-not-allowed opacity-35'
              }`}
              aria-label="Redo"
              disabled={!canRedo}
              onClick={redo}
            >
              <img alt="" className="size-9 max-h-full max-w-full object-contain" src={ASSETS.redoArrow} />
            </button>
          </div>
        </div>
        <button
          type="button"
          className="absolute right-0 top-0 z-10 h-[40px] w-[120px] -translate-x-1 translate-y-2.5 cursor-pointer border-0 bg-transparent p-0 transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f1027]/40"
          data-name="post-drawing"
          onClick={saveDrawing}
        >
          <img
            src={ASSETS.postRectangle}
            alt=""
            className="pointer-events-none absolute inset-0 z-0 size-full object-fill select-none"
            aria-hidden
          />
          <span className="relative z-10 flex h-full w-full translate-y-px items-center justify-center font-sans text-sm font-semibold text-[#0f1027]">
            Post
          </span>
        </button>
      </div>
      <div
        className="absolute left-[20px] top-[606px] flex w-[352px] justify-center"
        data-name="size-control"
      >
        <div
          ref={sizeTrackRef}
          className="relative flex h-10 w-[300px] max-w-full shrink-0 cursor-pointer touch-manipulation select-none items-center"
          role="slider"
          aria-label="Brush size"
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={penSize}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault()
              setPenSize(Math.max(1, penSize - 1))
            }
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault()
              setPenSize(Math.min(10, penSize + 1))
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            sizeDragRef.current = true
            setPenFromClientX(e.clientX)
          }}
          onTouchStart={(e) => {
            sizeDragRef.current = true
            const t = e.touches[0]
            if (t) setPenFromClientX(t.clientX)
          }}
        >
          <img
            src={ASSETS.bigLine}
            alt=""
            className="pointer-events-none absolute left-0 right-0 top-1/2 max-h-[16px] w-full -translate-y-1/2 object-fill"
            draggable={false}
          />
          <div
            className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${((penSize - 1) / 9) * 100}%` }}
          >
            <img
              src={ASSETS.filledCircle}
              alt=""
              className="size-5 max-w-none object-contain"
              draggable={false}
            />
          </div>
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
  const [session, setSession] = useState(() => getActivePromptSession())
  const [now, setNow] = useState(() => Date.now())
  const fillArmedRef = useRef(false)
  const [fillArmed, setFillArmed] = useState(false)

  const armFill = useCallback(() => {
    fillArmedRef.current = true
    setFillArmed(true)
    setDrawingMode('pen')
  }, [])

  useEffect(() => {
    if (drawingMode === 'eraser') {
      fillArmedRef.current = false
      setFillArmed(false)
    }
  }, [drawingMode])

  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(0)
  const [historyStamp, setHistoryStamp] = useState(0)

  const bumpHistory = useCallback(() => setHistoryStamp((n) => n + 1), [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const initCanvasHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    historyRef.current = [canvas.toDataURL('image/png')]
    historyIndexRef.current = 0
    bumpHistory()
  }, [bumpHistory])

  const persistDraft = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      localStorage.setItem(SCRIBBL_DRAFT_KEY, canvas.toDataURL('image/png'))
    } catch {
      // quota / private mode
    }
  }, [])

  const commitAfterStroke = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = canvas.toDataURL('image/png')
    const i = historyIndexRef.current
    historyRef.current = historyRef.current.slice(0, i + 1)
    historyRef.current.push(data)
    historyIndexRef.current = historyRef.current.length - 1
    bumpHistory()
    persistDraft()
  }, [bumpHistory, persistDraft])

  const restoreSnapshot = useCallback((dataUrl: string, onComplete?: () => void) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      onComplete?.()
    }
    img.onerror = () => {
      try {
        localStorage.removeItem(SCRIBBL_DRAFT_KEY)
      } catch {
        /* ignore */
      }
      clearCanvas()
      initCanvasHistory()
    }
    img.src = dataUrl
  }, [clearCanvas, initCanvasHistory])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const url = historyRef.current[historyIndexRef.current]
    if (url) restoreSnapshot(url, persistDraft)
    bumpHistory()
  }, [restoreSnapshot, bumpHistory, persistDraft])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const url = historyRef.current[historyIndexRef.current]
    if (url) restoreSnapshot(url, persistDraft)
    bumpHistory()
  }, [restoreSnapshot, bumpHistory, persistDraft])

  const clearCanvasAndHistory = useCallback(() => {
    try {
      localStorage.removeItem(SCRIBBL_DRAFT_KEY)
    } catch {
      /* ignore */
    }
    clearCanvas()
    initCanvasHistory()
  }, [clearCanvas, initCanvasHistory])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const raw = localStorage.getItem(SCRIBBL_DRAFT_KEY)
    if (raw?.startsWith('data:image')) {
      restoreSnapshot(raw, () => {
        initCanvasHistory()
      })
    } else {
      clearCanvas()
      initCanvasHistory()
    }
  }, [clearCanvas, initCanvasHistory, restoreSnapshot])

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      setSession(() => getActivePromptSession(t))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (fillArmedRef.current) {
      fillArmedRef.current = false
      setFillArmed(false)
      floodFillAtPixel(canvas, x, y, selectedColor)
      commitAfterStroke()
      return
    }

    setIsDrawing(true)

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
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

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
    if (!isDrawing) return
    setIsDrawing(false)
    commitAfterStroke()
  }

  const saveDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const drawingData = canvas.toDataURL('image/png')
    const userName = getActiveUserForLikes()
    const existingDrawings = localStorage.getItem('drawings')
    const priorDrawings = existingDrawings ? JSON.parse(existingDrawings) : []
    const savedProfiles = loadSavedProfiles()
    const monsterConfig = resolveMonsterForUser(userName, savedProfiles, priorDrawings)
    const userMonster = stringifyMonsterConfig(monsterConfig)

    const drawings = [...priorDrawings]

    drawings.unshift({
      id: Date.now(),
      image: drawingData,
      timestamp: new Date().toISOString(),
      userName: userName,
      userMonster: userMonster,
      prompt: session.text,
    })

    localStorage.setItem('drawings', JSON.stringify(drawings))

    try {
      localStorage.removeItem(SCRIBBL_DRAFT_KEY)
    } catch {
      /* ignore */
    }

    const mc = parseMonsterConfig(userMonster)
    if (mc) {
      upsertSavedProfile(userName, mc)
    }

    navigate('/home')
  }

  const canUndo = useMemo(() => historyIndexRef.current > 0, [historyStamp])
  const canRedo = useMemo(
    () => historyIndexRef.current < historyRef.current.length - 1,
    [historyStamp],
  )

  return (
    <div className="bg-[#f9fdff] relative flex min-h-screen w-full items-start justify-center overflow-x-hidden" data-name="ScribblCreator">
      <div className="relative w-[393px] min-h-screen">
        <Header navigate={navigate} />
        <div
          className="absolute left-5 right-5 top-[118px] z-[5] flex flex-col items-center gap-1 text-center"
          data-name="prompt-block"
        >
          <p
            className="font-sans text-sm font-medium tabular-nums text-[#0f1027]/65"
            aria-live="polite"
            data-name="prompt-countdown"
          >
            {formatScribblePromptTimeLeft(session.expiresAt - now)}
          </p>
          <p
            className="font-sans text-xl font-medium leading-snug text-[#0f1027]"
            data-name="drawing-prompt"
          >
            {session.text}
          </p>
        </div>
        <Drawing
          canvasRef={canvasRef}
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
          saveDrawing={saveDrawing}
          startDrawing={startDrawing}
          draw={draw}
          stopDrawing={stopDrawing}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          penSize={penSize}
          setPenSize={setPenSize}
          onArmFill={armFill}
          fillArmed={fillArmed}
        />
        <AppNavFooter onPlusClick={clearCanvasAndHistory} />
      </div>
    </div>
  )
}
