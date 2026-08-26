// Accessible, horizontally-scrollable data table. Numeric cells use the mono
// font. Header is a real <thead>; the whole thing scrolls inside its own box so
// the page never scrolls sideways.
export default function DataTable({ columns, rows, caption, fit = false }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        className="dtable"
        style={{
          borderCollapse: 'collapse',
          width: fit ? 'auto' : '100%',
          minWidth: fit ? 0 : 'min(100%, 34rem)',
        }}
      >
        {caption ? <caption className="visually-hidden">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={{
                  textAlign: c.align || 'left',
                  padding: 'var(--sp-3) var(--sp-3)',
                  borderBottom: '2px solid var(--ink)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--fs-2xs)',
                  letterSpacing: 'var(--tr-caps)',
                  textTransform: 'uppercase',
                  color: 'var(--fg-muted)',
                  whiteSpace: 'nowrap',
                  width: c.width || 'auto',
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={c.mono ? 'mono' : undefined}
                  style={{
                    textAlign: c.align || 'left',
                    padding: 'var(--sp-3) var(--sp-3)',
                    borderBottom: '1px solid var(--rule-faint)',
                    fontSize: 'var(--fs-sm)',
                    whiteSpace: c.wrap ? 'normal' : 'nowrap',
                    width: c.width || 'auto',
                  }}
                >
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
