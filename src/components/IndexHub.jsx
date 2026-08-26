import { Link } from 'react-router-dom'
import { useTable } from '../context/DataContext.jsx'

// The primary navigation: a large NUMBERED INDEX (01, 02, ...) that inverts on
// hover/focus. Driven entirely by nav_index.csv.
export default function IndexHub({ items, compact = false }) {
  const rows = useTable('nav_index')
  const list = items || rows

  return (
    <nav aria-label="Sections">
      <ul className={`index${compact ? ' index--compact' : ''}`}>
        {list.map((item) => (
          <li className="index__item" key={item.number}>
            <Link className="index__link" to={item.route}>
              <span className="index__num mono" aria-hidden="true">
                {item.number}
              </span>
              <span>
                <span className="index__title">{item.title}</span>
                <span className="index__sub">{item.subtitle}</span>
              </span>
              <span className="index__arrow mono" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
