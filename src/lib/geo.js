// Only five countries are ever named across the site. Everywhere activities are
// listed or labelled by country, anything outside this set folds into a single
// neutral "Other" bucket, counted but not broken out (the choropleth is the one
// exception, since a map shows real geography).
export const NAMED_COUNTRIES = new Set(['Tanzania', 'Kenya', 'South Africa', 'Malawi', 'Rwanda'])
export const OTHER_COUNTRY = 'Other'
export const INDOOR_COUNTRY = 'Indoor / no GPS'

export function prettyCountry(c) {
  return NAMED_COUNTRIES.has(c) ? c : OTHER_COUNTRY
}

// Fold an array of {country, ...} rows into named rows plus one aggregated
// "Other", summing the numeric fields named in `sum`. Keeps named order by the
// first `sum` field, Other last. The true distinct-country count is returned too.
export function foldCountryRows(rows, sum = ['activities'], { keepIndoor = false } = {}) {
  const N = (x) => Number(x) || 0
  const src = rows.filter((r) => r.country && (keepIndoor || r.country !== INDOOR_COUNTRY))
  const named = []
  let other = null
  for (const r of src) {
    if (NAMED_COUNTRIES.has(r.country)) {
      named.push({ ...r })
    } else {
      if (!other) other = { country: OTHER_COUNTRY, ...Object.fromEntries(sum.map((k) => [k, 0])), _isOther: true, _n: 0 }
      for (const k of sum) other[k] = N(other[k]) + N(r[k])
      other._n += 1
    }
  }
  named.sort((a, b) => N(b[sum[0]]) - N(a[sum[0]]))
  const out = other ? [...named, other] : named
  return { rows: out, distinct: src.length }
}
