import { useState } from 'react'
import { useWidth } from './useWidth.js'

// Energy burned made tangible: total calories drawn as plates of ugali, one glyph
// per hundred plates, in the spirit of the Everest stack. props: { kcal,
// kcalPerPlate }.
export default function CaloriePlates({ kcal, kcalPerPlate = 600 }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(false)
  if (!kcal) return <div ref={ref} />
  const plates = kcal / kcalPerPlate
  const perGlyph = 100
  const glyphs = Math.round(plates / perGlyph)

  const W = Math.max(320, width)
  const cols = W < 440 ? 7 : 10
  const rows = Math.ceil(glyphs / cols)
  const gap = W / (cols + 1)
  const r = Math.min(gap * 0.32, 14)
  const H = (rows + 1) * (r * 2 + 12) + 8

  return (
    <div ref={ref} className="plates">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${Math.round(plates).toLocaleString('en-US')} plates of ugali, each glyph a hundred plates.`}
        style={{ display: 'block' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {Array.from({ length: glyphs }).map((_, i) => {
          const c = i % cols
          const rr = Math.floor(i / cols)
          const cx = gap * (c + 1)
          const cy = (rr + 0.7) * (r * 2 + 12)
          return (
            <g key={i} opacity={hover ? 1 : 0.92}>
              {/* plate */}
              <ellipse cx={cx} cy={cy + r * 0.5} rx={r} ry={r * 0.6} fill="var(--accent-mute)" stroke="var(--accent)" strokeWidth="1.2" />
              {/* mound of ugali */}
              <path d={`M ${cx - r * 0.62} ${cy + r * 0.5} A ${r * 0.62} ${r * 0.7} 0 0 1 ${cx + r * 0.62} ${cy + r * 0.5} Z`} fill="var(--accent)" />
            </g>
          )
        })}
      </svg>
      <p className="plates__cap">
        <span className="mono plates__big">{Math.round(plates).toLocaleString('en-US')}</span> plates of ugali &middot; {(kcal / 1e6).toFixed(2)} million kcal &middot; each glyph = {perGlyph} plates
      </p>
    </div>
  )
}
