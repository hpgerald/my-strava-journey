import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import { CSV_FILES } from '../data/registry.js'

// Loads every CSV via the data layer and reports row/column counts.
// This is the Phase 2 Definition-of-Done proof that the data layer works.
export default function Debug() {
  const { loading, error, data } = useData()

  return (
    <main style={{ padding: '2rem', maxWidth: 900, fontFamily: 'ui-monospace, Menlo, monospace' }}>
      <p style={{ marginBottom: 4 }}>
        <Link to="/">← home</Link>
      </p>
      <h1 style={{ fontSize: 24, marginTop: 0 }}>Data debug</h1>

      {loading && <p>Loading {CSV_FILES.length} CSVs…</p>}
      {error && <p style={{ color: '#b00' }}>Error: {error}</p>}

      {data && (
        <>
          <p>
            {Object.keys(data).length} / {CSV_FILES.length} tables loaded ·{' '}
            {Object.values(data).reduce((a, r) => a + r.length, 0).toLocaleString()} total rows
          </p>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #111' }}>
                <th style={{ padding: '6px 8px' }}>#</th>
                <th style={{ padding: '6px 8px' }}>table</th>
                <th style={{ padding: '6px 8px' }}>rows</th>
                <th style={{ padding: '6px 8px' }}>cols</th>
                <th style={{ padding: '6px 8px' }}>columns</th>
              </tr>
            </thead>
            <tbody>
              {CSV_FILES.map((name, i) => {
                const rows = data[name] || []
                const cols = rows.length ? Object.keys(rows[0]) : []
                return (
                  <tr key={name} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '6px 8px', color: '#888' }}>{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ padding: '6px 8px' }}>{name}</td>
                    <td style={{ padding: '6px 8px' }}>{rows.length}</td>
                    <td style={{ padding: '6px 8px' }}>{cols.length}</td>
                    <td style={{ padding: '6px 8px', color: '#555' }}>{cols.join(', ')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </main>
  )
}
