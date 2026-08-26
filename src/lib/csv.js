import Papa from 'papaparse'

const cache = new Map()

// BASE_URL is './' (see vite.config base). With HashRouter the document path stays
// at the deploy root, so a relative data/ path resolves correctly for every deep link.
export function dataUrl(name) {
  return `${import.meta.env.BASE_URL}data/${name}.csv`
}

export async function loadCsv(name) {
  if (cache.has(name)) return cache.get(name)
  const res = await fetch(dataUrl(name))
  if (!res.ok) throw new Error(`Could not load ${name}.csv (HTTP ${res.status})`)
  const text = await res.text()
  const parsed = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // keep everything as strings; numeric coercion is explicit per field
  })
  if (parsed.errors && parsed.errors.length) {
    // surface the first parse error but still return whatever parsed
    console.warn(`Parse warnings in ${name}.csv:`, parsed.errors.slice(0, 3))
  }
  const rows = parsed.data
  cache.set(name, rows)
  return rows
}

export async function loadAll(names) {
  const entries = await Promise.all(names.map(async (n) => [n, await loadCsv(n)]))
  return Object.fromEntries(entries)
}

// Small numeric helper used throughout the app.
export function num(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}
