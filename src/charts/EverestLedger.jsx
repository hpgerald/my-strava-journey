// The signature climb stat: total metres gained on foot, drawn as a row of
// Everests. Each triangle is one Everest-from-sea-level (8,849 m); the last one
// fills only as far as the leftover metres reach.
export default function EverestLedger({ meters, everest = 8849 }) {
  const times = meters / everest
  const full = Math.floor(times)
  const frac = times - full
  const n = Math.ceil(times)
  const peaks = Array.from({ length: n }, (_, i) => (i < full ? 1 : frac))

  return (
    <div className="everest">
      <div className="everest__peaks" aria-hidden="true">
        {peaks.map((f, i) => {
          const clipY = 34 * (1 - f)
          return (
            <span className="everest__peak" key={i}>
              <svg viewBox="0 0 40 34" preserveAspectRatio="xMidYMax meet">
                <defs>
                  <clipPath id={`ev-clip-${i}`}>
                    <rect x="0" y={clipY} width="40" height={34 - clipY} />
                  </clipPath>
                </defs>
                <polygon points="20,1 39,33 1,33" className="everest__ghost" />
                <polygon points="20,1 39,33 1,33" className="everest__fill" clipPath={`url(#ev-clip-${i})`} />
              </svg>
            </span>
          )
        })}
      </div>
      <p className="everest__cap">
        <strong className="mono">{times.toFixed(1)}&times;</strong> the height of Everest, climbed one step at a time.
      </p>
    </div>
  )
}
