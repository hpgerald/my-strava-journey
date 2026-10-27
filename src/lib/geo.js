// Only African countries are ever named on the site. The public data already
// folds every country outside Africa into one "Other" row (see
// scripts/sanitize_public_data.py); this keeps the code honest if one slips in.
// Counts of countries only ever count the named ones.
export const NAMED_COUNTRIES = new Set(['Tanzania', 'Kenya', 'South Africa', 'Malawi', 'Rwanda', 'Uganda', 'Zambia', 'Mozambique', 'Burundi', 'Ethiopia', 'Zimbabwe', 'Botswana', 'Namibia'])
export const OTHER_COUNTRY = 'Other'
export const OTHER_LABEL = 'Others'
export const INDOOR_COUNTRY = 'Indoor / no GPS'

export const isNamedCountry = (c) => NAMED_COUNTRIES.has(c)

export function prettyCountry(c) {
  return NAMED_COUNTRIES.has(c) ? c : OTHER_LABEL
}

// Fold an array of {country, ...} rows into named rows plus one aggregated
// "Other", summing the numeric fields named in `sum`. Keeps named order by the
// first `sum` field, Other last. `distinct` counts the named countries only.
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
  return { rows: out, distinct: named.length }
}
