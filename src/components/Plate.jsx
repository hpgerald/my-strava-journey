import { PHOTOS } from '../lib/photos.js'

// A photograph in the story, full width of its column, with a caption line.
// While the picture has not arrived the plate holds its place and says what
// belongs there, so the page keeps its rhythm and the slot is easy to fill.
export default function Plate({ slot, caption, ratio = '3 / 2' }) {
  const p = PHOTOS[slot] || {}
  return (
    <figure className={`plate${p.file ? '' : ' plate--empty'}${p.bw ? ' plate--bw' : ''}`} style={{ '--ratio': ratio }}>
      {p.file ? (
        <img className="plate__img" src={`./photos/${p.file}`} alt={p.alt || ''} loading="lazy" decoding="async" />
      ) : (
        <div className="plate__hold" role="img" aria-label={`Photograph to come: ${p.want || slot}`}>
          <span className="plate__k" aria-hidden="true">Photograph to come</span>
          <span className="plate__w" aria-hidden="true">{p.want || slot}</span>
          <span className="plate__f" aria-hidden="true">{slot}</span>
        </div>
      )}
      {caption ? <figcaption className="plate__cap">{caption}</figcaption> : null}
    </figure>
  )
}
