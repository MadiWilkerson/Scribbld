import { ASSETS } from '../../imports/assets'

export function HeartIcon({
  filled,
  onClick,
}: {
  filled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1 rounded-md hover:bg-black/5 transition-colors"
      aria-label={filled ? 'Unlike' : 'Like'}
    >
      <img
        src={filled ? ASSETS.heartFilled : ASSETS.heart}
        alt=""
        width={28}
        height={28}
        className="size-7 object-contain"
      />
    </button>
  )
}
