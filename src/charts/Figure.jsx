// A chart frame with a consistent editorial masthead: an optional figure number,
// a title, a hairline rule, an optional note, the plot, a source line, and a
// visually-hidden data table so every chart is fully readable as text and to a
// screen reader (a brief non-negotiable).
export default function Figure({ n, title, note, source, tableCaption, columns, rows, children }) {
  return (
    <figure className="fig">
      {title ? (
        <div className="fig__head">
          <figcaption className="fig__title">
            {n ? <span className="fig__num mono" aria-hidden="true">{n}</span> : null}
            <span>{title}</span>
          </figcaption>
        </div>
      ) : null}
      {note ? <p className="fig__note">{note}</p> : null}

      <div className="chart">{children}</div>

      {columns && rows ? (
        <div className="visually-hidden">
          <table>
            <caption>{tableCaption || title}</caption>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {source ? <div className="source fig__source">Source: {source}</div> : null}
    </figure>
  )
}
