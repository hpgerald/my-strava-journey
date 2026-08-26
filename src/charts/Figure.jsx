// A chart frame: eyebrow title, optional note, the plot, a source line, and a
// visually-hidden data table so every chart is fully readable as text and to a
// screen reader (a brief non-negotiable).
export default function Figure({ title, note, source, tableCaption, columns, rows, children }) {
  return (
    <figure style={{ margin: 0 }}>
      {title ? (
        <figcaption className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>
          {title}
        </figcaption>
      ) : null}
      {note ? (
        <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>
          {note}
        </p>
      ) : null}

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

      {source ? (
        <div className="source" style={{ marginTop: 'var(--sp-3)' }}>
          Source: {source}
        </div>
      ) : null}
    </figure>
  )
}
