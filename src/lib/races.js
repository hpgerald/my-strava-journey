// The races I have taken part in, by the day of the race. The log has no field
// for a race, so they are listed here by hand. `sport` picks the race itself
// out of the outings of that day (the longest of that sport), and `virtual`
// marks a race I ran on my own route, away from the course.
export const RACES = [
  { date: '2021-11-07', name: 'NBC Dodoma Marathon', sport: 'Run' },
  { date: '2021-12-04', name: 'UDSM Marathon', sport: 'Run' },
  { date: '2022-05-18', name: 'A virtual half marathon', sport: 'Run', virtual: true },
  { date: '2022-07-31', name: 'NBC Marathon', sport: 'Walk' },
  { date: '2022-08-14', name: 'CRDB Marathon', sport: 'Walk' },
  { date: '2022-08-20', name: 'Selous Trail Marathon', sport: 'TrailRun' },
  { date: '2023-02-26', name: 'Kilimanjaro Half Marathon', sport: 'Run' },
  { date: '2023-06-25', name: 'JKT Marathon', sport: 'Run' },
  { date: '2023-07-23', name: 'NBC Marathon', sport: 'Run' },
  { date: '2023-08-13', name: 'CRDB Marathon', sport: 'Run' },
  { date: '2023-08-19', name: 'Selous Trail Marathon', sport: 'TrailRun' },
  { date: '2023-08-26', name: 'Dar Night Run', sport: 'Run' },
  { date: '2024-02-25', name: 'Kilimanjaro Half Marathon', sport: 'Run' },
  { date: '2024-05-05', name: 'Dar City Marathon', sport: 'Walk' },
  { date: '2024-07-28', name: 'NBC Dodoma Marathon', sport: 'Walk' },
  { date: '2025-02-23', name: 'Kilimanjaro Half Marathon', sport: 'Run' },
  { date: '2025-05-31', name: 'Hanang Adventure Race', sport: 'Hike' },
  { date: '2025-07-27', name: 'NBC Dodoma Half Marathon', sport: 'Run' },
  { date: '2025-08-23', name: 'Selous Trail', sport: 'TrailRun' },
  { date: '2025-09-28', name: 'Saifee Hospital Half Marathon', sport: 'Walk' },
  { date: '2026-02-14', name: 'Kalambo Falls festival race', sport: 'TrailRun' },
  { date: '2026-03-22', name: 'Kilimanjaro Half Marathon', sport: 'Run' },
  { date: '2026-04-15', name: "Pope's Africa Marathon", sport: 'Run', virtual: true },
  { date: '2026-05-09', name: 'A virtual half marathon', sport: 'Run', virtual: true },
  { date: '2026-07-12', name: 'Hanang Adventure Race', sport: 'TrailRun' },
  { date: '2026-08-29', name: 'Dar Night Run', sport: 'Run' },
]

// the races of year Y, each with the outing that was the race
export function racesOf(Y, acts) {
  return RACES.filter((r) => r.date.startsWith(String(Y))).map((r) => {
    const a = acts.filter((x) => (x.date || '').slice(0, 10) === r.date && x.sport_type === r.sport)
      .sort((p, q) => (Number(q.distance_km) || 0) - (Number(p.distance_km) || 0))[0]
    return a ? { ...r, act: a, km: Number(a.distance_km) || 0, min: Number(a.moving_time_min) || 0, elev: Number(a.elevation_gain_m) || 0, kudos: Number(a.kudos) || 0, prs: Number(a.prs) || 0, indoor: a.trainer === 'Yes' } : null
  }).filter(Boolean)
}
