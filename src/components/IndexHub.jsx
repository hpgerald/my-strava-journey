import { Link } from 'react-router-dom'
import { useTable } from '../context/DataContext.jsx'

// The chapter index, set like a studio's list of work: one tall row per chapter
// with its number, its name in condensed capitals and its line, filling with
// orange from below on hover. Driven entirely by nav_index.csv.
export default function IndexHub({ items }) {
  const rows = useTable('nav_index')
  const list = items || rows
  return (
    <nav aria-label="Sections">
      <ol className="slist">
        {list.map((item) => (
          <li className="slist__item" key={item.number}>
            <Link className="slist__link" to={item.route} data-cursor="Open">
              <span className="slist__num">{item.number}</span>
              <span className="slist__t">{item.title}</span>
              <span className="slist__s">{item.subtitle}</span>
              <span className="slist__arrow" aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
