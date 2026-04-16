import type { MonsterConfig } from '../../imports/monsterConfig'
import { eyeUrl, hornUrl, monsterBodyUrl, mouthUrl } from '../../imports/monsterConfig'

type Props = {
  config: MonsterConfig
  /** Pixel size of the square avatar */
  size?: number
  className?: string
}

/**
 * Layers back→front: horns, body, eyes, mouth (all 70×70 viewBox assets).
 */
export function MonsterAvatar({ config, size = 120, className = '' }: Props) {
  const { shape, color, eye, mouth, horn } = config
  const layer = 'absolute inset-0 size-full object-contain pointer-events-none'

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img src={hornUrl(horn)} alt="" className={`${layer} z-0`} />
      <img src={monsterBodyUrl(shape, color)} alt="" className={`${layer} z-[1]`} />
      <img src={eyeUrl(eye)} alt="" className={`${layer} z-[2]`} />
      <img src={mouthUrl(mouth)} alt="" className={`${layer} z-[3]`} />
    </div>
  )
}
