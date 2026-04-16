import type { ReactNode } from 'react'
import { ASSETS } from '../../imports/assets'

/** Same SVG frame + inset as the profile name field (chinchilla inherits from `html`). */
export function RectanglePlate({
  children,
  className = '',
  compact = false,
}: {
  children: ReactNode
  className?: string
  /** Smaller frame + label (e.g. profile hub “Add profile”). */
  compact?: boolean
}) {
  return (
    <div
      className={
        compact
          ? `relative h-[120px] w-full max-w-[300px] ${className}`
          : `relative h-[200px] w-full max-w-[400px] ${className}`
      }
    >
      <img
        src={ASSETS.rectangle}
        alt=""
        className="pointer-events-none absolute inset-0 z-0 size-full object-fill select-none"
        aria-hidden
      />
      <div
        className={
          compact
            ? 'absolute inset-x-[11%] inset-y-[18%] z-10 flex translate-y-2.5 items-center justify-center'
            : 'absolute inset-x-[11%] inset-y-[20%] z-10 flex translate-y-5 items-center justify-center'
        }
      >
        {children}
      </div>
    </div>
  )
}
