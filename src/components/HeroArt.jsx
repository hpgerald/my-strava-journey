// The objects around the big "Showing up." on the home page. All decoration
// for the eye (the hero is hidden from screen readers; the same record is told
// in words below it):
//  - a turning seal that reads "Siku kwa siku · Day by day", with an orange
//    square at its centre that beats with the full stop
//  - the whole record as a strip of months: one bar per month, as tall as the
//    outings in it, the months of the current streak in orange. The bars rise
//    one after another, then a light runs along them from the first month to
//    the last, again and again
//  - registration marks in the four corners, as on a printed poster
// months: [{ k: 'YYYY-MM', n }], streakFrom: 'YYYY-MM'
export default function HeroArt({ months, streakFrom }) {
  const top = Math.max(1, ...months.map((m) => m.n))
  const seal = 'SIKU KWA SIKU · DAY BY DAY · SIKU KWA SIKU · DAY BY DAY · '
  return (
    <>
      <div className="shart__seal">
        <svg viewBox="0 0 200 200">
          <defs><path id="shart-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs>
          <g className="shart__spin">
            <text className="shart__sealt"><textPath href="#shart-ring" textLength="486" lengthAdjust="spacing">{seal}</textPath></text>
          </g>
          <circle cx="100" cy="100" r="58" className="shart__sealr" />
          <rect x="88" y="88" width="24" height="24" className="shart__sealdot" />
        </svg>
      </div>
      {months.length ? (
        <div className="shart__strip" style={{ '--n': months.length }}>
          {months.map((m, i) => (
            <i key={m.k} className={m.k >= streakFrom ? 'is-now' : m.n ? '' : 'is-empty'}
              style={{ '--h': `${Math.max(m.n ? 6 : 2, (m.n / top) * 100).toFixed(1)}%`, '--j': i }} />
          ))}
        </div>
      ) : null}
      <span className="shart__mark shart__mark--tl" />
      <span className="shart__mark shart__mark--tr" />
      <span className="shart__mark shart__mark--bl" />
      <span className="shart__mark shart__mark--br" />
    </>
  )
}
