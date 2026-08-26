import { createContext, useContext, useEffect, useState } from 'react'
import { CSV_FILES } from '../data/registry'
import { loadAll } from '../lib/csv'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let alive = true
    loadAll(CSV_FILES)
      .then((data) => alive && setState({ loading: false, error: null, data }))
      .catch((e) => alive && setState({ loading: false, error: e.message, data: null }))
    return () => {
      alive = false
    }
  }, [])

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}

// Convenience: one table by name (empty array until loaded).
export function useTable(name) {
  const { data } = useData()
  return (data && data[name]) || []
}

// Convenience: a key/value CSV (meta, lifetime_totals-style) as a lookup object.
export function useKeyed(name, keyField, valueField) {
  const rows = useTable(name)
  const out = {}
  for (const r of rows) out[r[keyField]] = r[valueField]
  return out
}
