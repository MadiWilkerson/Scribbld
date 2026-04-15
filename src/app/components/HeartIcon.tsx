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
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill={filled ? '#e11d48' : 'none'}
        stroke="#0f1027"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
