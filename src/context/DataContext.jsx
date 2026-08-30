import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadAll } from '../lib/csv'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [data, setData] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState({})
  const pending = useRef(new Map())

  const loadTable = useCallback((name) => {
    if (pending.current.has(name)) return pending.current.get(name)
    const job = loadAll([name])
      .then((result) => {
        setData((current) => ({ ...current, ...result }))
        return result[name]
      })
      .catch((error) => {
        setErrors((current) => ({ ...current, [name]: error.message }))
        throw error
      })
      .finally(() => {
        pending.current.delete(name)
        setLoading((current) => ({ ...current, [name]: false }))
      })
    pending.current.set(name, job)
    setLoading((current) => ({ ...current, [name]: true }))
    return job
  }, [])

  const state = useMemo(
    () => ({ data, errors, loading, loadTable }),
    [data, errors, loading, loadTable],
  )
  return <DataContext.Provider value={state}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}

// Convenience: one table by name (empty array until loaded).
export function useTable(name) {
  const { data, loadTable } = useData()
  useEffect(() => {
    void loadTable(name).catch(() => {})
  }, [loadTable, name])
  return data[name] || []
}

// Opt in to a group only on pages that genuinely need the full catalogue.
export function useTables(names) {
  const { loadTable } = useData()
  useEffect(() => {
    names.forEach((name) => { void loadTable(name).catch(() => {}) })
  }, [loadTable, names])
}

// Convenience: a key/value CSV (meta, lifetime_totals-style) as a lookup object.
export function useKeyed(name, keyField, valueField) {
  const rows = useTable(name)
  const out = {}
  for (const r of rows) out[r[keyField]] = r[valueField]
  return out
}
