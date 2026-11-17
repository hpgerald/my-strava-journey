import TwoLines from '../charts/TwoLines.jsx'
import RasKilomoni from '../charts/RasKilomoni.jsx'
import BondwaClimbs from '../charts/BondwaClimbs.jsx'
import { RaceCountdown } from '../charts/KiliHalf.jsx'
import { BestDay } from '../charts/YearSet.jsx'
import { YearMoments, Ladder, StreakCal, SlopeCards, DayStack, KitBars, Profile, SilenceBand, DotRows, dayLabel } from '../charts/YearKit.jsx'
import { buildCountdown } from './countdown.js'
import { streakGoal } from './streakTarget.js'
import { isNamedCountry } from './geo.js'
import { YEAR_OPEN as OPEN, YEAR_EVENTS as EVENTS } from './yearNotes.js'

// The Year in Sport, year by year. Each year has its own opening words, its
// own moments on the band across the year and its own chapters, each with a
// picture made for it. The words are mine, from my own answers; the numbers
// come from the log when the page loads, so a running year keeps up.
//   yearChapters(ctx) -> { open, events [{ iso, label }], chapters [...] }
//   a chapter: { id, k, t, p [..], facts [{ l, v, hot }], cap, wide, node, more { to, label } }

const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY = 864e5
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const pc = (v) => Math.round((v || 0) * 100)
const d10 = (a) => (a.date || '').slice(0, 10)
const kmOf = (a) => Number(a.distance_km) || 0
const elOf = (a) => Number(a.elevation_gain_m) || 0
const minOf = (a) => Number(a.moving_time_min) || 0
const isFoot = (a) => FOOT.has(a.sport_type)
const tOf = (iso) => Date.parse(iso + 'T00:00:00Z')
const isoOf = (t) => new Date(t).toISOString().slice(0, 10)
const addDays = (iso, k) => isoOf(tOf(iso) + k * DAY)
const hmin = (min) => { const t = Math.round(min); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
const pace = (minPerKm) => `${Math.floor(minPerKm)}:${String(Math.round((minPerKm % 1) * 60)).padStart(2, '0')}`
const sumKm = (xs) => xs.filter(isFoot).reduce((t, a) => t + kmOf(a), 0)
const sumEl = (xs) => xs.filter(isFoot).reduce((t, a) => t + elOf(a), 0)
const daysOut = (xs) => new Set(xs.map(d10)).size
const inRange = (xs, a, b) => xs.filter((x) => { const d = d10(x); return d >= a && d <= b })
const onDay = (xs, iso) => xs.filter((x) => d10(x) === iso)
const tread = (a) => a.trainer === 'Yes'
const sundayOf = (iso) => addDays(iso, -new Date(tOf(iso)).getUTCDay())

// one value a week, Sunday to Saturday
function perWeek(acts, fromISO, toISO, f) {
  const out = []
  for (let w = sundayOf(fromISO); w <= toISO; w = addDays(w, 7)) out.push({ iso: w, v: f(inRange(acts, w, addDays(w, 6))) })
  return out
}
// one value a month of year Y
function perMonth(acts, Y, f, from = 0, to = 11) {
  const out = []
  for (let i = from; i <= to; i++) { const k = `${Y}-${String(i + 1).padStart(2, '0')}`; out.push({ i, v: f(acts.filter((a) => d10(a).slice(0, 7) === k)) }) }
  return out
}
// the runs of days in a row inside a window, longest first
function streaksIn(all, fromISO, toISO) {
  const set = new Set(all.map(d10))
  const out = []
  let s = null
  for (let d = fromISO; d <= toISO; d = addDays(d, 1)) {
    if (set.has(d)) { if (!s) s = { from: d, to: d, len: 0 }; s.to = d; s.len += 1 } else if (s) { out.push(s); s = null }
  }
  if (s) out.push(s)
  // a run that touches the window's edge carries on outside it
  for (const x of out) {
    let a = x.from, b = x.to
    while (set.has(addDays(a, -1))) a = addDays(a, -1)
    while (set.has(addDays(b, 1))) b = addDays(b, 1)
    x.fullFrom = a; x.fullTo = b; x.fullLen = Math.round((tOf(b) - tOf(a)) / DAY) + 1
  }
  return out.sort((p, q) => q.len - p.len)
}
const ticksTo = (max, step) => { const t = []; for (let v = 0; v <= max * 1.05; v += step) t.push(v); return t }
const longestFoot = (xs) => xs.filter(isFoot).reduce((b, a) => (!b || kmOf(a) > kmOf(b) ? a : b), null)
const act = (xs, iso, sport, by = kmOf) => onDay(xs, iso).filter((a) => (sport ? a.sport_type === sport : isFoot(a))).sort((p, q) => by(q) - by(p))[0]
const slope = (a, title, extra = {}) => (a ? { iso: d10(a), title, km: kmOf(a), elev: elOf(a), ...extra } : null)
const more = (to, label) => ({ to, label })

// ---- the hand-written opening and the moments of each year ----

export function yearChapters(ctx) {
  const { Y, acts, all, geo } = ctx
  const has = new Set(all.map(d10))
  const events = (EVENTS[Y] || []).filter(([iso]) => has.has(iso)).map(([iso, label]) => ({ iso, label }))
  const build = BUILD[Y]
  return { open: OPEN[Y] || null, events, chapters: build ? build({ ...ctx, has }).filter(Boolean) : [] }
}

const BUILD = {
  // ================================================================ 2019
  2019: ({ Y, acts, all }) => {
    const foot = acts.filter(isFoot)
    const first = foot.length ? d10(foot[0]) : `${Y}-08-18`
    const month1 = inRange(acts, first, addDays(first, 29))
    // each new longest outing on foot
    const steps = []
    let best = 0
    for (const a of foot) if (kmOf(a) > best + 0.05) { best = kmOf(a); steps.push({ iso: d10(a), km: kmOf(a) }) }
    steps.forEach((s, i) => { if (i === steps.length - 1) s.hot = true })
    // keep one step a day: the longest of that day
    const ladder = steps.filter((s, i) => !steps[i + 1] || steps[i + 1].iso !== s.iso)
    const runs = acts.filter((a) => a.sport_type === 'Run'), indoor = runs.filter(tread)
    const walks = acts.filter((a) => a.sport_type === 'Walk')
    return [
      {
        id: 'watch', k: 'Learning the watch', t: 'A new watch, and a lot to learn.',
        p: ['Before 2019 I went out here and there, with nothing to record it. When I decided to start properly I got a Samsung Gear S3 Frontier, and the first runs were indoors, testing the watch and learning Strava as I went.', 'On my second day I already ran 10 km. The first month was the busiest of the year, while everything was still new.'],
        facts: [{ l: 'outings in the first 30 days', v: n0(month1.length), hot: true }, { l: 'km on foot in those days', v: n0(sumKm(month1)) }],
        cap: 'Each bar is a day, taller for more kilometres.', wide: true,
        node: <YearMoments acts={all} fromISO={first} toISO={addDays(first, 29)} events={[{ iso: first, label: 'First runs' }, { iso: addDays(first, 1), label: 'First 10 km' }]} aria={`My first 30 days with the watch: ${month1.length} outings and ${n0(sumKm(month1))} km on foot.`} />,
      },
      ladder.length >= 3 ? {
        id: 'ladder', k: 'The ladder', t: `From ${k1(ladder[0].km)} km to a half marathon in four months.`,
        p: ['Every few weeks I went a little further than before. Indoors there was no terrain and no weather to fight, so I pushed more to make each session count.', `In December the ladder reached ${k1(ladder[ladder.length - 1].km)} km, my first half marathon, on a loop indoors.`],
        facts: [{ l: 'new longest runs', v: n0(ladder.length - 1) }, { l: 'km, the top step', v: k1(ladder[ladder.length - 1].km), hot: true }],
        cap: 'Each step is a new longest run, with its date.',
        node: <Ladder steps={ladder} aria={`Each new longest run of ${Y}: ${ladder.map((s) => `${dayLabel(s.iso)} ${k1(s.km)} km`).join(', ')}.`} />,
      } : null,
      runs.length ? {
        id: 'indoors', k: 'Indoors, by choice', t: `${n0(indoor.length)} of ${n0(runs.length)} runs were indoors.`,
        p: ['Most of my running that first year was indoors, on a loop. The walks came later in the year, and there were only a few.'],
        facts: [{ l: 'runs indoors', v: n0(indoor.length), hot: true }, { l: 'walks', v: n0(walks.length) }],
        cap: 'One dot is one outing, bigger for a longer one, in the order they came.',
        node: <DotRows rows={[{ label: 'runs indoors', acts: indoor, hot: true }, { label: 'other runs', acts: runs.filter((a) => !tread(a)) }, { label: 'walks', acts: walks }]} aria={`${indoor.length} runs indoors, ${runs.length - indoor.length} other runs and ${walks.length} walks in ${Y}.`} />,
      } : null,
      walks.length ? {
        id: 'outside', k: 'First steps outside', t: 'Two walks in Dar es Salaam.',
        p: ['In October I went for two walks in Dar es Salaam, two days in a row. They were the first outings on foot in my log with a place on the map.'],
        facts: [{ l: 'km, the longer walk', v: k1(Math.max(...walks.map(kmOf))) }, { l: 'm climbed on those two days', v: n0(sumEl(walks)) }],
        cap: 'The walks of the year, with their distance and climb.',
        node: <SlopeCards items={walks.map((a, i) => slope(a, i ? 'The second walk' : 'The first walk outside'))} aria={`The walks of ${Y}.`} />,
      } : null,
    ]
  },

  // ================================================================ 2020
  2020: ({ Y, acts, all }) => {
    const foot = all.filter(isFoot)
    const steps = []
    let best = 0
    for (const a of foot) { if (d10(a) > `${Y}-12-31`) break; if (kmOf(a) > best + 0.05) { best = kmOf(a); steps.push({ iso: d10(a), km: kmOf(a), year: true }) } }
    const ladder = steps.filter((x, i) => !steps[i + 1] || steps[i + 1].iso !== x.iso)
    ladder.forEach((x) => { if (x.iso.startsWith(String(Y))) x.hot = true })
    const top = ladder[ladder.length - 1]
    const beaten = top ? foot.find((a) => d10(a) > top.iso && kmOf(a) > top.km) : null
    const lastRun = acts.filter(isFoot).slice(-1)[0]
    const lastAny = acts.slice(-1)[0]
    const back = all.find((a) => d10(a) > d10(lastAny))
    const gapFrom = addDays(d10(lastAny), 1), gapTo = back ? addDays(d10(back), -1) : `${Y}-12-31`
    const gapLen = Math.round((tOf(gapTo) - tOf(gapFrom)) / DAY) + 1
    const wk = perWeek(acts, `${Y}-01-01`, d10(lastRun || lastAny), (xs) => sumKm(xs))
    const jun = acts.filter((a) => d10(a).slice(5, 7) === '06')
    const wkMax = Math.max(...wk.map((w) => w.v))
    return [
      top && top.hot ? {
        id: 'past21', k: 'Past 21 km', t: `${k1(top.km)} km, one step past the half.`,
        p: [`In March I ran ${k1(top.km)} km indoors, further than the half marathon of December.${beaten ? ` It stayed my longest run until ${MONF[parseInt(d10(beaten).slice(5, 7), 10) - 1]} ${d10(beaten).slice(0, 4)}, after the comeback.` : ''}`],
        facts: [{ l: 'km, the new longest run', v: k1(top.km), hot: true }],
        cap: 'Each step is a new longest run since my first day. The orange step is this year.',
        node: <Ladder steps={ladder} aria={`Each new longest run since 2019: ${ladder.map((x) => `${dayLabel(x.iso)} ${x.iso.slice(0, 4)} ${k1(x.km)} km`).join(', ')}.`} />,
      } : null,
      {
        id: 'june', k: 'June, the last good month', t: `June: ${n0(jun.length)} outings.`,
        p: ['The outings picked up in May and June, most of them short runs indoors before work. June was my busiest month of the year.', 'Then July came, and after the first week the log stops.'],
        facts: [{ l: 'outings in June', v: n0(jun.length), hot: true }, { l: 'km on foot in June', v: n0(sumKm(jun)) }],
        cap: 'Each bar is a week, Sunday to Saturday, as tall as its kilometres on foot.', wide: true,
        node: <KitBars items={wk.map((w) => ({ label: w.iso.slice(8) <= '07' ? MON[parseInt(w.iso.slice(5, 7), 10) - 1] : '', force: true, value: w.v, tone: w.iso.slice(5, 7) === '06' || (w.iso.slice(5, 7) === '05' && w.iso.slice(8) > '27') ? 'big' : 'mid', display: w.v === wkMax ? `${n0(w.v)} km` : '' }))} ticks={ticksTo(wkMax, wkMax > 40 ? 20 : 10)} yCap="km on foot a week" aria={`Kilometres on foot each week of ${Y} until July: the biggest week ${n0(wkMax)} km.`} />,
      },
      {
        id: 'silence', k: 'The silence', t: `${n0(gapLen)} days with nothing.`,
        p: ['Then life moved: a new job, a new town and COVID-19.', `There is not one outing in my log from the second week of July ${Y} until the end of June ${Y + 1}.`],
        cap: 'The empty band runs from the day after my last outing to the day before my comeback.', wide: true,
        more: back ? more(`/numbers/${d10(back).slice(0, 4)}`, `How I came back, in ${d10(back).slice(0, 4)} →`) : null,
        node: <SilenceBand fromISO={gapFrom} toISO={gapTo} aria={`${gapLen} days without an outing, from ${dayLabel(gapFrom)} ${gapFrom.slice(0, 4)} to ${dayLabel(gapTo)} ${gapTo.slice(0, 4)}.`} />,
      },
    ]
  },

  // ================================================================ 2021
  2021: ({ Y, acts, all }) => {
    const first = acts.length ? d10(acts[0]) : `${Y}-06-27`
    const wk = perWeek(all, addDays(first, -7), addDays(first, 62), (xs) => daysOut(xs))
    const firstWeeks = wk.filter((w) => w.iso >= sundayOf(first))
    const full = firstWeeks.find((w) => w.v === 7)
    const mo = perMonth(acts, Y, (xs) => { const byD = {}; xs.forEach((a) => { byD[d10(a)] = (byD[d10(a)] || 0) + 1 }); const d = Object.values(byD); return d.length ? d.filter((n) => n >= 2).length / d.length : 0 }, 5, 11)
    const aug = acts.filter((a) => d10(a).slice(5, 7) === '08')
    const augDays = {}; aug.forEach((a) => { augDays[d10(a)] = (augDays[d10(a)] || 0) + 1 })
    const augDoubles = Object.values(augDays).filter((n) => n >= 2).length
    const st = streaksIn(all, first, `${Y}-12-31`)
    const big = st[0], second = st.filter((x) => x.to < big.from).sort((p, q) => q.len - p.len)[0]
    const kud = perMonth(acts, Y, (xs) => (xs.length ? xs.reduce((t, a) => t + (Number(a.kudos) || 0), 0) / xs.length : 0), 5, 11)
    const nov = acts.filter((a) => d10(a).slice(5, 7) === '11').map((a) => Number(a.kudos) || 0).sort((p, q) => q - p)
    const thirty = acts.filter((a) => a.sport_type === 'Run' && kmOf(a) >= 29.9 && d10(a).slice(5, 7) === '12')
    const climb = act(acts, `${Y}-09-26`, 'Walk'), trail = act(acts, `${Y}-12-19`, 'TrailRun')
    const kudMax = Math.max(...kud.map((m) => m.v))
    return [
      {
        id: 'comeback', k: 'The comeback', t: 'Back, and out every day.',
        p: ['A medical check-up told me to move about 30 minutes a day. I came back at the end of June with a 10 km run.', full ? `Within ${['', 'one', 'two', 'three', 'four', 'five', 'six'][Math.round((tOf(full.iso) - tOf(sundayOf(first))) / (7 * DAY)) + 1] || 'a few'} weeks I was out on all seven days of the week, and I kept it that way through the summer.` : ''],
        facts: [{ l: 'days out in July', v: n0(daysOut(acts.filter((a) => d10(a).slice(5, 7) === '07'))), hot: true }, { l: 'outings in July', v: n0(acts.filter((a) => d10(a).slice(5, 7) === '07').length) }],
        cap: 'Each bar is a week, Sunday to Saturday: how many of its seven days had an outing.',
        node: <KitBars items={wk.map((w) => ({ label: w.iso.slice(8) <= '07' ? MON[parseInt(w.iso.slice(5, 7), 10) - 1] : '', force: true, value: w.v, display: String(w.v), tone: w.v === 7 ? 'big' : w.v ? 'mid' : 'quiet' }))} ticks={[0, 7]} yCap="days out of seven" aria={`Days out each week around the comeback: ${wk.map((w) => `week of ${dayLabel(w.iso)} ${w.v}`).join(', ')}.`} />,
      },
      {
        id: 'doubles', k: 'Two is one, and one is none', t: 'Two outings a day.',
        p: ['Thirty minutes a day was the advice. I chose two outings, because two is one and one is none.', 'I was very aggressive at the beginning. I saw quick improvements in my well-being, I was more efficient at work, and after many years of ignoring my health I made it a priority.'],
        facts: [{ l: 'of days out in August had two outings or more', v: `${pc(mo.find((m) => m.i === 7)?.v)}%`, hot: true }, { l: 'in July', v: `${pc(mo.find((m) => m.i === 6)?.v)}%` }],
        cap: 'Each bar is a month: the share of its days out with two outings or more.',
        node: <KitBars items={mo.map((m) => ({ label: MON[m.i], value: m.v, display: `${pc(m.v)}%`, tone: m.v === Math.max(...mo.map((x) => x.v)) ? 'big' : 'mid' }))} ticks={[0, 0.5, 1]} tickFmt={(v) => `${pc(v)}%`} yCap="days with two outings or more" aria={`Share of days out with two outings or more, by month of ${Y}: ${mo.map((m) => `${MONF[m.i]} ${pc(m.v)}%`).join(', ')}.`} />,
      },
      {
        id: 'august', k: `August, ${n0(sumKm(aug))} km`, t: 'My biggest month ever.',
        p: ['I still had the drive to do as many kilometres a day as I could, to see quick results. That month I also took on a big one, the Athletic Brewing 70.3 challenge.', `Morning and evening sessions, and a push here and there: ${n0(augDoubles)} days of the month had two outings or more.`],
        facts: [{ l: 'km on foot in August', v: n0(sumKm(aug)), hot: true }, { l: 'outings', v: n0(aug.length) }, { l: 'km, the longest day', v: k1(Math.max(...aug.filter(isFoot).map(kmOf))) }],
        cap: 'Each bar is a day of August, taller for more kilometres.', wide: true,
        node: <YearMoments acts={all} fromISO={`${Y}-08-01`} toISO={`${Y}-08-31`} events={[{ iso: `${Y}-08-14`, label: 'First 30 km, indoors' }, ...(big ? [{ iso: big.from, label: `The ${big.len}-day streak begins` }] : [])].filter((e) => e.iso.slice(5, 7) === '08')} aria={`Every day of August ${Y}: ${n0(sumKm(aug))} km on foot in ${aug.length} outings.`} />,
      },
      big ? {
        id: 'streak', k: 'One hundred and nine days', t: `${n0(big.len)} days in a row.`,
        p: [`From the end of ${MONF[parseInt(big.from.slice(5, 7), 10) - 1]} to the middle of ${MONF[parseInt(big.to.slice(5, 7), 10) - 1]} I did not miss a day.${second ? ` The streak before it had run ${n0(second.len)} days.` : ''}`, 'I do not remember what ended them, maybe a busy day here and there and no target to hold me. I remember it was painful to miss a day.'],
        facts: [{ l: 'days in a row, the long one', v: n0(big.len), hot: true }, second ? { l: 'days, the one before', v: n0(second.len) } : null],
        cap: 'Weeks run Sunday to Saturday. The orange line under the calendar is the long streak.', wide: true,
        node: <StreakCal acts={all} fromISO={first} toISO={`${Y}-12-31`} streak={{ fromISO: big.from, toISO: big.to, label: `${big.len} days in a row` }} aria={`Every day from my comeback to the end of ${Y}, with the ${big.len}-day streak from ${dayLabel(big.from)} to ${dayLabel(big.to)}.`} />,
      } : null,
      {
        id: 'group', k: 'The Dodoma group', t: 'Friends to go out with.',
        p: ['In Dodoma I had a group of friends, and we worked out together almost every day.', nov.length ? `People began to cheer too. My most cheered runs of the year came in November, with up to ${n0(nov[0])} kudos each.` : ''],
        facts: [{ l: 'kudos an outing in the best month', v: n0(kudMax), hot: true }],
        cap: 'Each bar is a month: the average kudos on one outing.',
        node: <KitBars items={kud.map((m) => ({ label: MON[m.i], value: m.v, display: n0(m.v), tone: m.v === kudMax ? 'big' : 'mid' }))} ticks={ticksTo(kudMax, kudMax > 40 ? 20 : 10)} yCap="kudos an outing" aria={`Average kudos an outing, by month of ${Y}: ${kud.map((m) => `${MONF[m.i]} ${n0(m.v)}`).join(', ')}.`} />,
      },
      thirty.length >= 4 ? {
        id: 'thirty', k: 'Thirty, twice in a row', t: 'Two days of 30 km, twice.',
        p: ['Twice in December I ran 30 km indoors on two days in a row: in the middle of the month, and again on the last two days of the year.'],
        facts: [{ l: 'km in those four days', v: n0(thirty.reduce((t, a) => t + kmOf(a), 0)), hot: true }],
        cap: 'The four days of 30 km, two pairs.',
        node: <KitBars items={thirty.map((a) => ({ label: dayLabel(d10(a)), value: kmOf(a), display: `${k1(kmOf(a))} km`, tone: 'big' }))} ticks={[0, 10, 20, 30]} yCap="km" aria={`Four runs of 30 km in December ${Y}: ${thirty.map((a) => dayLabel(d10(a))).join(', ')}.`} />,
      } : null,
      climb || trail ? {
        id: 'outside', k: 'Out of the room', t: 'The first climb, and the first trail.',
        p: [climb ? `In September I walked in Morogoro and climbed ${n0(elOf(climb))} m, my first big climb.` : '', trail ? 'In December came my first trail run, the OLADRUN Trail at Lake Duluti in Arusha, around the lake and through its forest. The group had decided to get into adventure and travel outdoors, and it was a perfect start.' : ''],
        cap: 'Each shape is one outing: wider for more distance, taller for more climb.',
        more: more('/where', 'Every place I have been out →'),
        node: <SlopeCards items={[slope(climb, 'A walk in Morogoro, my first big climb'), slope(trail, 'First trail run, Lake Duluti', { hot: true })].filter(Boolean)} aria="My first big climb and my first trail run." />,
      } : null,
    ]
  },

  // ================================================================ 2022
  2022: ({ Y, acts, all, allStats, s, geo }) => {
    const rankN = 1 + allStats.filter((x) => x.n > s.n).length
    const rankKm = 1 + allStats.filter((x) => x.footKm > s.footKm).length
    const d90 = (() => { const m = {}; acts.forEach((a) => { m[d10(a)] = (m[d10(a)] || 0) + minOf(a) }); return Object.values(m).filter((v) => v >= 90).length })()
    const wk = perWeek(all, `${Y}-01-02`, `${Y}-04-02`, (xs) => daysOut(xs))
    const low = wk.reduce((b, w) => (w.v < b.v ? w : b), wk[0])
    const mara = longestFoot(acts)
    const elMo = perMonth(acts, Y, sumEl)
    const elMax = Math.max(...elMo.map((m) => m.v))
    const named = { 4: 'Morogoro', 5: 'Bondwa', 7: 'Morogoro', 9: 'Mbeya' }
    const cum = (sp) => { let t = 0; return perMonth(acts, Y, (xs) => xs.filter((a) => a.sport_type === sp).length).map((m) => (t += m.v)) }
    const W = cum('Walk'), R = cum('Run')
    const cross = W.findIndex((v, i) => W.slice(i).every((w, j) => w > R[i + j]))
    const nW = W[11], nR = R[11]
    const zan = acts.filter((a) => /Zanzibar|Unguja|Pemba/.test((geo[a.activity_key] || {}).region || ''))
    const ken = acts.filter((a) => (geo[a.activity_key] || {}).country === 'Kenya')
    const hikes = [act(acts, `${Y}-05-14`, null, elOf), act(acts, `${Y}-06-23`, null, elOf), act(acts, `${Y}-08-20`, null, elOf)].filter(Boolean)
    return [
      {
        id: 'fullest', k: 'The fullest year', t: rankN === 1 ? 'More outings than any other year.' : `${n0(s.n)} outings.`,
        p: [`${n0(s.n)} outings in one year${rankKm === 1 ? ', and my best year for distance on foot too, by a few kilometres' : ''}. On ${n0(d90)} days I was on the move for 90 minutes or more.`],
        facts: [{ l: 'outings', v: n0(s.n), hot: true }, { l: 'days out', v: n0(s.activeDays) }],
        cap: 'Weeks run Sunday to Saturday. A darker day is a longer time on the move.', wide: true,
        node: <StreakCal acts={all} fromISO={`${Y}-01-01`} toISO={`${Y}-12-31`} colorBy="time" aria={`Every day of ${Y}, shaded by time on the move: ${s.activeDays} days out.`} />,
      },
      {
        id: 'drift', k: 'When the group drifted', t: 'February, and the gaps.',
        p: ['In January I was out six or seven days a week with the group. Then our schedules began to clash, and we went out together less often.', `In the week of ${dayLabel(low.iso)} I went out on ${low.v === 1 ? 'one day' : `${low.v} days`}.`],
        facts: [{ l: 'days out, the lowest week', v: n0(low.v), hot: true }, { l: 'km on foot in January', v: n0(sumKm(acts.filter((a) => d10(a).slice(5, 7) === '01'))) }],
        cap: 'Each bar is a week, Sunday to Saturday: how many of its seven days had an outing.',
        node: <KitBars items={wk.map((w) => ({ label: w.iso.slice(8) <= '07' ? MON[parseInt(w.iso.slice(5, 7), 10) - 1] : '', force: true, value: w.v, display: String(w.v), tone: w === low ? 'big' : 'mid' }))} ticks={[0, 7]} yCap="days out of seven" aria={`Days out each week from January to March ${Y}: ${wk.map((w) => `week of ${dayLabel(w.iso)} ${w.v}`).join(', ')}.`} />,
      },
      mara ? {
        id: 'marathon', k: 'The marathon', t: `${k1(kmOf(mara))} km, indoors.`,
        p: ['It was raining outside and I wanted to break the marathon barrier, so I ran a loop indoors and took a few pauses on the way.'],
        facts: [{ l: 'km', v: k1(kmOf(mara)), hot: true }, { l: 'moving', v: hmin(minOf(mara)) }],
        cap: 'The orange dot is the marathon. The small dots are all my other outings of the year.', wide: true,
        more: more('/records', 'The marathon among my records →'),
        node: <BestDay acts={acts} aria={`The marathon, ${k1(kmOf(mara))} km, against every other outing of ${Y}.`} />,
      } : null,
      {
        id: 'hills', k: 'Into the hills', t: 'The first mountains.',
        p: ['In May I climbed in Morogoro, and in June came my first hike and my first trip to Bondwa Peak, training for Kilimanjaro.', 'In August a trail run in Morogoro became my most cheered outing of the year.'],
        facts: hikes.map((a, i) => ({ l: `m up, ${dayLabel(d10(a))}`, v: n0(elOf(a)), hot: i === 1 })),
        cap: 'Each bar is a month, as tall as its climbing on foot. The named months had a mountain day.',
        node: <KitBars items={elMo.map((m) => ({ label: MON[m.i], value: m.v, display: named[m.i] && m.v >= 300 ? (m.v >= elMax * 0.99 ? `${n0(m.v)} m` : '') : '', tone: named[m.i] ? 'big' : 'mid' }))} ticks={ticksTo(elMax, elMax > 2000 ? 1000 : 500)} yCap="m climbed" keys={[{ tone: 'big', label: 'a month with a mountain day' }, { tone: 'mid', label: 'other months' }]} aria={`Climbing on foot each month of ${Y}: ${elMo.map((m) => `${MONF[m.i]} ${n0(m.v)} m`).join(', ')}.`} />,
      },
      {
        id: 'walks', k: 'Walking passes running', t: nW > nR ? 'More walks than runs.' : 'Walks and runs, side by side.',
        p: [`${n0(nW)} walks against ${n0(nR)} runs${nW > nR ? ': the first year my walks outnumbered my runs' : ''}.`, cross > 0 ? `The lead changed hands during the year, and the walks only went ahead for good in ${MONF[cross]}.` : cross === 0 ? 'The walks were ahead all year.' : ''],
        facts: [{ l: 'walks', v: n0(nW), hot: true }, { l: 'runs', v: n0(nR) }],
        cap: 'Both lines add up through the year. Where the orange line passes the grey one, the walks took the lead.',
        node: <TwoLines years={MON} xLabels={MON} xCap="month" yCap="outings so far" a={{ label: 'Runs', values: R }} b={{ label: 'Walks', values: W }} cross={cross} crossLabel={cross >= 0 ? `walks ahead for good` : undefined} aria={`Walks and runs adding up through ${Y}: ${nW} walks and ${nR} runs by the end of the year.`} />,
      },
      zan.length || ken.length ? {
        id: 'away', k: 'Across the water and the border', t: 'Zanzibar, and a first trip to Kenya.',
        p: [zan.length ? 'In March I went out in Zanzibar for the first time, and I came back to the islands during the year.' : '', ken.length ? 'In December I went with a group to Naivasha and the Masai Mara, my first outings in Kenya.' : ''],
        cap: 'The trips of the year, with the date of the first outing there.',
        node: <SlopeCards flat items={[zan.length ? { iso: d10(zan[0]), title: 'Zanzibar', v: n0(zan.length), u: 'outings', note: `${n0(sumKm(zan))} km on foot` } : null, ken.length ? { iso: d10(ken[0]), title: 'Kenya, Naivasha and the Masai Mara', v: n0(ken.length), u: 'outings', hot: true } : null].filter(Boolean)} aria="The trips of the year." />,
      } : null,
    ]
  },

  // ================================================================ 2023
  2023: ({ Y, acts, all, kili, course }) => {
    const wk = perWeek(acts, `${Y}-01-01`, `${Y}-03-11`, sumEl)
    const wkMax = Math.max(...wk.map((w) => w.v))
    const jan = inRange(acts, `${Y}-01-21`, `${Y}-01-22`).filter(isFoot)
    const half = (kili || []).find((k) => String(k.year) === String(Y))
    const elapsed = half ? hmin(Number(half.moving_min)) : null
    const km = perMonth(acts, Y, sumKm)
    const kmMax = Math.max(...km.map((m) => m.v))
    const spring = km.filter((m) => m.i <= 3), rest = km.filter((m) => m.i >= 4)
    const light = rest.slice().sort((a, b) => a.v - b.v).slice(0, 2).sort((a, b) => a.i - b.i)
    const sel = onDay(acts, `${Y}-08-19`).sort((p, q) => (p.date < q.date ? -1 : 1))
    const nextDay = sumEl(onDay(acts, `${Y}-08-20`))
    const prs = perMonth(acts, Y, (xs) => xs.reduce((t, a) => t + (Number(a.prs) || 0), 0))
    const prTot = prs.reduce((t, m) => t + m.v, 0), prMax = Math.max(...prs.map((m) => m.v))
    const lastPr = [...prs].reverse().find((m) => m.v > 0)
    const SELL = (a, i) => (i === 0 && kmOf(a) < 3 ? 'Warm-up' : kmOf(a) < 3 ? 'Cool-down' : a.sport_type === 'TrailRun' ? 'The race, on the trail' : `A ${a.sport_type === 'Hike' ? 'hike' : 'walk'} begun two minutes later`)
    return [
      {
        id: 'ready', k: 'Getting ready', t: 'Weekends in the mountains.',
        p: [jan.length ? `In January I spent two days on the trails in Morogoro, ${k1(sumKm(jan))} km on foot and ${n0(sumEl(jan))} m up over the two days.` : '', 'In February I went back to Bondwa Peak, training for Kilimanjaro, and the weeks of climbing grew toward the mountain.'],
        facts: [{ l: 'm up, the biggest week', v: n0(wkMax), hot: true }],
        cap: 'Each bar is a week, Sunday to Saturday, as tall as its climbing on foot.',
        node: <KitBars items={wk.map((w) => ({ label: w.iso.slice(8) <= '07' ? MON[parseInt(w.iso.slice(5, 7), 10) - 1] : '', force: true, value: w.v, display: w.v === wkMax ? `${n0(w.v)} m` : '', tone: w.v >= 900 ? 'big' : 'mid' }))} ticks={ticksTo(wkMax, wkMax > 2000 ? 1000 : 500)} yCap="m climbed a week" aria={`Climbing on foot each week from January to early March ${Y}.`} />,
      },
      half ? {
        id: 'half', k: 'The first Kilimanjaro Half', t: `${n0(Number(half.kudos))} kudos, my most cheered outing.`,
        p: ['By then I had a big following on Strava, because I gave my friends kudos on their activities almost every day. This was a major race I ran outside, so it drew a lot of attention, from the people I ran with and from the online crowd.', `I finished in ${elapsed} of moving time.`],
        facts: [{ l: 'kudos', v: n0(Number(half.kudos)), hot: true }, { l: 'moving time', v: elapsed }, { l: 'm up', v: n0(Number(half.elevation_m)) }],
        cap: 'The height along the course, from the start to the finish.',
        more: more('/goals', 'Every edition of the Half →'),
        node: <Profile pts={(course || []).map((c) => ({ d: Number(c.d_km), alt: Number(c.alt_m) }))} label={`${Y} · ${elapsed}`} aria={`The Kilimanjaro Half course, which I finished in ${elapsed} in ${Y}.`} />,
      } : null,
      {
        id: 'tenweeks', k: 'Ten weeks', t: 'The Half, Kilimanjaro, the challenge and Hanang.',
        p: ['Between the end of February and the end of April came the Kilimanjaro Half, Kilimanjaro itself to Uhuru Peak, a challenge from the Activate Uganda team, 25 km a day for four days on dates I chose, and Mount Hanang.', 'The challenge was hard in its own way. Running indoors back to back is tiring and boring, and the hardest part was pushing through when I kept putting the sessions off to the evening.'],
        facts: [{ l: 'km on foot in those ten weeks', v: n0(sumKm(inRange(acts, `${Y}-02-20`, `${Y}-04-30`))), hot: true }, { l: 'm climbed', v: n0(sumEl(inRange(acts, `${Y}-02-20`, `${Y}-04-30`))) }],
        cap: 'Each bar is a day, taller for more kilometres.', wide: true,
        more: more('/kilimanjaro', 'The Kilimanjaro chapter →'),
        node: <YearMoments acts={all} fromISO={`${Y}-02-20`} toISO={`${Y}-04-30`} events={[{ iso: `${Y}-02-26`, label: 'The Kilimanjaro Half' }, { iso: `${Y}-03-06`, label: 'Kilimanjaro, four days' }, { iso: `${Y}-03-24`, label: 'The challenge, four days of 25 km' }, { iso: `${Y}-04-30`, label: 'Mount Hanang' }]} aria={`Every day from late February to the end of April ${Y}.`} />,
      },
      {
        id: 'breather', k: 'The breather', t: 'After the spring, a breather.',
        p: [`After so much in the spring, the rest of the year went quieter. ${MONF[light[0].i]} and ${MONF[light[1].i]} were my lightest months. Quiet months like these come naturally for me, a breather after the fatigue of the months before, and then I kick it back again.`],
        facts: [{ l: 'km on foot from January to April', v: n0(spring.reduce((t, m) => t + m.v, 0)), hot: true }, { l: 'km in the eight months after', v: n0(rest.reduce((t, m) => t + m.v, 0)) }],
        cap: 'Each bar is a month, as tall as its kilometres on foot. The grey months came after the spring.',
        node: <KitBars items={km.map((m) => ({ label: MON[m.i], value: m.v, display: m.v === kmMax ? `${n0(m.v)} km` : '', tone: m.i >= 4 ? 'quiet' : m.v === kmMax ? 'big' : 'mid' }))} ticks={ticksTo(kmMax, 100)} yCap="km on foot" aria={`Kilometres on foot each month of ${Y}: ${km.map((m) => `${MONF[m.i]} ${n0(m.v)} km`).join(', ')}.`} />,
      },
      sel.length >= 2 ? {
        id: 'selous', k: 'The Selous day', t: `${n0(sumEl(sel))} m up in one day.`,
        p: ['It was the Selous Trail Marathon in Morogoro, on the halfway route to Bondwa. I did a warm-up, the main event on the trail and later a cool-down.', nextDay ? `The next day I was back on the trails for another ${n0(nextDay)} m.` : ''],
        cap: 'The bar is the climb of the day, cut by outing, in the order I logged them.',
        more: more('/uluguru', 'The Uluguru chapter →'),
        node: <DayStack items={sel.map((a, i) => ({ label: SELL(a, i), km: kmOf(a), elev: elOf(a), sport: a.sport_type }))} aria={`The outings of 19 August ${Y}, ${n0(sumEl(sel))} m climbed in all.`} />,
      } : null,
      prTot ? {
        id: 'prs', k: 'The PR year', t: `${n0(prTot)} PRs.`,
        p: [`${MONF[prs.find((m) => m.v === prMax).i]} alone brought ${n0(prMax)}.${lastPr && lastPr.i < 11 ? ` Every one of them came by the end of ${MONF[lastPr.i]}.` : ''}`],
        facts: [{ l: 'PRs on Strava segments', v: n0(prTot), hot: true }],
        cap: 'Each bar is a month: the best times I set on Strava segments.',
        node: <KitBars items={prs.map((m) => ({ label: MON[m.i], value: m.v, display: m.v ? n0(m.v) : '', tone: m.v === prMax ? 'big' : 'mid' }))} ticks={ticksTo(prMax, 10)} yCap="PRs" aria={`PRs by month of ${Y}: ${prs.map((m) => `${MONF[m.i]} ${m.v}`).join(', ')}.`} />,
      } : null,
    ]
  },

  // ================================================================ 2024
  2024: ({ Y, acts, all, geo }) => {
    const jan = [act(acts, `${Y}-01-02`, 'TrailRun'), act(acts, `${Y}-01-06`, 'TrailRun'), act(acts, `${Y}-01-13`, 'TrailRun')].filter(Boolean)
    const countries = [...new Set(acts.map((a) => (geo[a.activity_key] || {}).country).filter((c) => c && isNamedCountry(c)))]
    const mo = perMonth(acts, Y, (xs) => xs.length)
    const sep = acts.filter((a) => d10(a).slice(5, 7) === '09')
    const moMin = mo.reduce((b, m) => (m.v < b.v ? m : b), mo[0])
    const st = streaksIn(all, `${Y}-10-01`, `${Y}-12-31`)[0]
    const mw = acts.filter((a) => (geo[a.activity_key] || {}).country === 'Malawi')
    const walksMw = mw.filter((a) => a.sport_type === 'Walk')
    const cards = [walksMw[0] && slope(walksMw[0], 'The first walk in Lilongwe'), act(acts, `${Y}-12-14`, 'Walk') && slope(act(acts, `${Y}-12-14`, 'Walk'), 'A golf tournament, walked with the players', { hot: true }), act(acts, `${Y}-12-15`, 'Walk') && slope(act(acts, `${Y}-12-15`, 'Walk'), 'A forest walk at the Lilongwe Wildlife Centre')].filter(Boolean)
    const named = countries.filter((c) => c !== 'Tanzania')
    return [
      jan.length ? {
        id: 'january', k: 'January on Kilimanjaro', t: 'Three trail days, the last one to Mweka Gate.',
        p: ['The last of them was a challenge on the Sabbath, up to Mweka Gate through the coffee farms. My watch was set to miles, so I only learned the distance in kilometres when I got back.', 'The Mweka route is mostly used for coming down the mountain. Going up it is a good test of the legs and of endurance, and the views are epic.'],
        cap: 'Each shape is one outing: wider for more distance, taller for more climb.',
        more: more('/kilimanjaro', 'The Kilimanjaro chapter →'),
        node: <SlopeCards items={jan.map((a, i) => slope(a, i === jan.length - 1 ? 'Up to Mweka Gate' : 'Trail run on Kilimanjaro', { hot: i === jan.length - 1 }))} aria="Three trail runs on Kilimanjaro in January." />,
      } : null,
      named.length ? {
        id: 'countries', k: `${countries.length === 5 ? 'Five' : countries.length} countries`, t: `The habit came with me to ${countries.length === 5 ? 'five' : countries.length} countries.`,
        p: [`That year I switched to a remote job, and consultancies took me to ${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}. In South Africa I toured Pilanesberg National Park and took a morning walk to Waterfall City in Sandton.`, 'Wherever the work was, I found time to go out, even when a day only had room for a short outing.'],
        facts: [{ l: 'outings outside Tanzania', v: n0(acts.filter((a) => { const c = (geo[a.activity_key] || {}).country; return c && c !== 'Tanzania' }).length), hot: true }],
        cap: 'Each bar is a day, taller for more kilometres, in the colour of its country. The palest bars have no place on the map, mostly indoors.', wide: true,
        node: <YearMoments acts={all} fromISO={`${Y}-01-01`} toISO={`${Y}-12-31`} colorBy="country" geoByKey={geo} events={[{ iso: `${Y}-04-27`, label: 'South Africa' }, { iso: `${Y}-05-28`, label: 'Kenya' }, { iso: `${Y}-08-18`, label: 'Rwanda' }, { iso: `${Y}-10-20`, label: 'Malawi' }]} aria={`Every day of ${Y}, in the colour of the country: ${countries.join(', ')}.`} />,
      } : null,
      {
        id: 'september', k: 'The quiet September', t: `${MONF[moMin.i]}, the quietest month.`,
        p: ['I was juggling several jobs: the remote job, travel for a retreat and preparing for a consultancy in Malawi, and at the same time a camping trip to Mikumi. The busy schedule left me little room to log anything.'],
        facts: [{ l: 'outings in September', v: n0(sep.length), hot: true }, { l: 'km on foot', v: n0(sumKm(sep)) }],
        cap: 'Each bar is a month, as tall as its number of outings.',
        node: <KitBars items={mo.map((m) => ({ label: MON[m.i], value: m.v, display: m.i === moMin.i || m.v === Math.max(...mo.map((x) => x.v)) ? n0(m.v) : '', tone: m.i === moMin.i ? 'big' : 'mid' }))} ticks={ticksTo(Math.max(...mo.map((m) => m.v)), 10)} yCap="outings" aria={`Outings each month of ${Y}: ${mo.map((m) => `${MONF[m.i]} ${m.v}`).join(', ')}.`} />,
      },
      st && st.fullLen >= 30 ? {
        id: 'streak', k: `${st.fullLen === 67 ? 'Sixty-seven' : n0(st.fullLen)} days`, t: `${n0(st.fullLen)} days in a row, into the new year.`,
        p: [`From the last day of ${MONF[parseInt(st.from.slice(5, 7), 10) - 1]} I went out every day, much of it in Malawi, and the run of days carried on into ${Y + 1}.`],
        facts: [{ l: 'days in a row', v: n0(st.fullLen), hot: true }, { l: `km on foot in ${MONF[10]}`, v: n0(sumKm(acts.filter((a) => d10(a).slice(5, 7) === '11'))) }],
        cap: 'Weeks run Sunday to Saturday, each day in the colour of its country; the palest days have no place on the map. The orange line is the streak.', wide: true,
        node: <StreakCal acts={all} fromISO={`${Y}-10-01`} toISO={st.fullTo > `${Y + 1}-01-31` ? st.fullTo : `${Y + 1}-01-31`} colorBy="country" geoByKey={geo} streak={{ fromISO: st.fullFrom, toISO: st.fullTo, label: `${st.fullLen} days in a row` }} aria={`Every day from October ${Y} to January ${Y + 1}, with the ${st.fullLen}-day streak.`} />,
      } : null,
      cards.length ? {
        id: 'lilongwe', k: 'Lilongwe on foot', t: 'Two months in Malawi.',
        p: [`I was there for a consultancy, commuting to work, and I went out ${n0(mw.length)} times in two months.`, 'Two days I remember best: a golf tournament at Lilongwe Golf Club, where I walked the course with a group of friends while they played, and the next morning a forest walk on my own at the Lilongwe Wildlife Centre.'],
        cap: 'Three walks in Lilongwe.',
        node: <SlopeCards flat items={cards} aria="Three walks in Lilongwe." />,
      } : null,
    ]
  },

  // ================================================================ 2025
  2025: ({ Y, acts, all, kili, ulu }) => {
    const mo = perMonth(acts, Y, daysOut)
    const moMax = Math.max(...mo.map((m) => m.v))
    const half = (kili || []).find((k) => String(k.year) === String(Y)), halfPrev = (kili || []).find((k) => String(k.year) === String(Y - 1))
    const raceISO = half ? String(half.date).slice(0, 10) : `${Y}-02-23`
    const feb = acts.filter((a) => d10(a).slice(5, 7) === '02')
    const febPr = feb.reduce((t, a) => t + (Number(a.prs) || 0), 0)
    const trip = ulu && ulu.trips.find((t) => t.date.startsWith(String(Y)))
    const han = ['2023-04-30', `${Y}-05-31`, '2026-07-12'].map((iso, i) => act(all, iso, i === 0 ? 'Hike' : null)).filter(Boolean)
    const runs = perMonth(acts, Y, (xs) => { const r = xs.filter((a) => a.sport_type === 'Run'); return [r.filter(tread).reduce((t, a) => t + kmOf(a), 0), r.filter((a) => !tread(a)).reduce((t, a) => t + kmOf(a), 0)] })
    const outY = acts.filter((a) => a.sport_type === 'Run' && !tread(a)), prevOut = all.filter((a) => a.year === String(Y - 1) && a.sport_type === 'Run' && !tread(a))
    const runMax = Math.max(...runs.map((m) => m.v[0] + m.v[1]))
    const st = streaksIn(all, `${Y}-12-01`, `${Y}-12-31`).find((x) => x.to === `${Y}-12-31`)
    return [
      {
        id: 'hard', k: 'A hard year', t: 'The job ended, and the days held.',
        p: ['USAID funding was cut, the job ended, and I spent the bulk of the year without a job.', `I still went out on ${n0(daysOut(acts))} days. Some were short, and they kept the habit alive.`],
        facts: [{ l: 'days out', v: n0(daysOut(acts)), hot: true }, { l: 'outings', v: n0(acts.length) }],
        cap: 'Each bar is a month: how many of its days had an outing.',
        node: <KitBars items={mo.map((m) => ({ label: MON[m.i], value: m.v, display: n0(m.v), tone: m.v === moMax ? 'big' : 'mid' }))} ticks={[0, 10, 20, 30]} yCap="days out" aria={`Days out each month of ${Y}: ${mo.map((m) => `${MONF[m.i]} ${m.v}`).join(', ')}.`} />,
      },
      half ? {
        id: 'prep', k: 'Getting ready for the Half', t: `Long days, then ${hmin(Number(half.moving_min))}.`,
        p: ['With friends I got ready for the Kilimanjaro Half on the long routes of the mountain. The third outing of that preparation went up the Mweka Gate route and came back down to Kibosho, 30 km on foot.', halfPrev ? `Four days later I ran the Half in ${hmin(Number(half.moving_min))} of moving time, quicker than the ${hmin(Number(halfPrev.moving_min))} of the year before. February brought ${n0(febPr)} PRs.` : ''],
        facts: [{ l: 'moving time, the Half', v: hmin(Number(half.moving_min)), hot: true }, { l: 'PRs in February', v: n0(febPr) }],
        cap: 'Each bar is a day, taller for more kilometres.', wide: true,
        more: more('/goals', 'Every edition of the Half →'),
        node: <YearMoments acts={all} fromISO={`${Y}-01-01`} toISO={raceISO} events={[{ iso: `${Y}-01-11`, label: 'A long run, 27.2 km' }, { iso: `${Y}-02-19`, label: 'Mweka Gate and down to Kibosho' }, { iso: raceISO, label: 'The Kilimanjaro Half' }]} aria={`Every day of ${Y} up to the Kilimanjaro Half.`} />,
      } : null,
      trip ? {
        id: 'bondwa', k: 'Bondwa in the rain', t: 'My biggest climb, in the rain.',
        p: [`At the end of March I went back to Bondwa Peak. The rain was so heavy that everything was slippery, and I climbed ${n0(trip.climb)} m, more than on any other outing I have done.`],
        facts: [{ l: 'm climbed', v: n0(trip.climb), hot: true }, { l: 'km', v: k1(trip.km) }],
        cap: 'Every trip to Bondwa Peak: height against the distance walked. The orange line is this one.',
        more: more('/uluguru', 'The Uluguru chapter →'),
        node: <BondwaClimbs trips={ulu.trips} feature={trip.trip} aria={`Every trip to Bondwa Peak, with ${Y} in orange: ${n0(trip.climb)} m climbed.`} />,
      } : null,
      han.length >= 2 ? {
        id: 'hanang', k: 'The Hanang race', t: 'Back on Hanang, for a race.',
        p: ['At the end of May I went back to Hanang for the adventure race, out to Little Ngorongoro. With the camping, it gave me a few days away from the busy city.'],
        cap: 'My days on Hanang. Each shape is one outing: wider for more distance, taller for more climb.',
        more: more('/hanang', 'The Hanang chapter →'),
        node: <SlopeCards items={han.map((a) => slope(a, d10(a).startsWith(String(Y)) ? 'The adventure race' : d10(a) < `${Y}` ? 'The first day on Hanang' : 'The race again', { hot: d10(a).startsWith(String(Y)) }))} aria="My days on Hanang." />,
      } : null,
      {
        id: 'outside', k: 'Running goes outside', t: 'My running moved outside.',
        p: [`${n0(outY.length)} runs outside and ${n0(outY.reduce((t, a) => t + kmOf(a), 0))} km in ${Y}, against ${n0(prevOut.length)} runs and ${n0(prevOut.reduce((t, a) => t + kmOf(a), 0))} km the year before.`],
        facts: [{ l: 'km run outside', v: n0(outY.reduce((t, a) => t + kmOf(a), 0)), hot: true }, { l: `km in ${Y - 1}`, v: n0(prevOut.reduce((t, a) => t + kmOf(a), 0)) }],
        cap: 'Each bar is a month of running: grey indoors, orange outside.',
        node: <KitBars items={runs.map((m) => ({ label: MON[m.i], parts: [{ v: m.v[0], tone: 'quiet' }, { v: m.v[1], tone: 'big' }] }))} ticks={ticksTo(runMax, runMax > 100 ? 50 : 25)} yCap="km run" keys={[{ tone: 'quiet', label: 'indoors' }, { tone: 'big', label: 'outside' }]} aria={`Kilometres run each month of ${Y}, indoors and outside.`} />,
      },
      st ? {
        id: 'decision', k: 'The decision', t: 'Stop missing days.',
        p: ['In the last days of December I decided to stop missing days.', `The streak began on the ${parseInt(st.from.slice(8), 10)}th, and it ${st.fullTo >= ctxLast(all) ? 'has not stopped since' : `ran ${n0(st.fullLen)} days`}.`],
        facts: [{ l: st.fullTo >= ctxLast(all) ? 'days in a row, still going' : 'days in a row', v: n0(st.fullLen), hot: true }],
        cap: 'Weeks run Sunday to Saturday. The orange line is the streak, carrying on into the new year.', wide: true,
        more: more(`/numbers/${Y + 1}`, `The streak in ${Y + 1} →`),
        node: <StreakCal acts={all} fromISO={`${Y}-11-01`} toISO={`${Y + 1}-01-31`} streak={{ fromISO: st.fullFrom, toISO: `${Y + 1}-01-31`, label: 'the streak begins' }} aria={`Every day from November ${Y} to January ${Y + 1}, with the streak that began on ${dayLabel(st.from)}.`} />,
      } : null,
    ]
  },

  // ================================================================ 2026
  2026: ({ Y, acts, all, s, kili, rk }) => {
    const last = ctxLast(all)
    const goal = streakGoal(new Set(all.map(d10)))
    const SO = last < `${Y}-12-31` ? ' so far' : ''
    const st = streaksIn(all, `${Y}-01-01`, last)[0]
    const half = (kili || []).find((k) => String(k.year) === String(Y))
    const cd = half ? buildCountdown(all, String(half.date).slice(0, 10)) : null
    const eds = (kili || []).map((k) => ({ y: String(k.year), t: Number(k.moving_min) }))
    const quick = eds.reduce((b, e) => (!b || e.t < b.t ? e : b), null)
    const mandara = act(acts, `${Y}-03-24`)
    const trails = [[`${Y}-02-14`, 'The Kalambo Falls festival race'], [`${Y}-04-11`, 'The Ngong Hills'], [`${Y}-05-30`, 'Bondwa Peak'], [`${Y}-06-21`, 'The trails of Kitulo'], [`${Y}-07-12`, 'The Hanang adventure race']].map(([iso, t]) => slope(act(acts, iso, 'TrailRun'), t)).filter(Boolean)
    const trailDays = daysOut(acts.filter((a) => a.sport_type === 'TrailRun' || a.sport_type === 'Hike'))
    const runs = acts.filter((a) => a.sport_type === 'Run' || a.sport_type === 'TrailRun')
    const longRun = runs.reduce((b, a) => (!b || kmOf(a) > kmOf(b) ? a : b), null)
    const lastMo = parseInt(last.slice(5, 7), 10) - 1
    const prs = perMonth(acts, Y, (xs) => xs.reduce((t, a) => t + (Number(a.prs) || 0), 0), 0, lastMo)
    const prTot = prs.reduce((t, m) => t + m.v, 0), prMax = Math.max(...prs.map((m) => m.v))
    const tp = perMonth(acts, Y, (xs) => { const r = xs.filter((a) => a.sport_type === 'Run' && tread(a) && kmOf(a) > 0); const k = r.reduce((t, a) => t + kmOf(a), 0); return k ? r.reduce((t, a) => t + minOf(a), 0) / k : null }, 0, lastMo)
    const cum = (f) => { let t = 0; return perMonth(acts, Y, f, 0, lastMo).map((m) => (t += m.v)) }
    const Wk = cum((xs) => xs.filter((a) => a.sport_type === 'Walk').reduce((t, a) => t + kmOf(a), 0))
    const Rk = cum((xs) => xs.filter((a) => a.sport_type === 'Run').reduce((t, a) => t + kmOf(a), 0))
    const trailKm = acts.filter((a) => a.sport_type === 'TrailRun').reduce((t, a) => t + kmOf(a), 0)
    const cross = Wk.findIndex((v, i) => v > Rk[i] && Wk.slice(i).every((w, j) => w > Rk[i + j]))
    const yrsBefore = [...new Set(all.map((a) => Number(a.year)))].filter((y) => y < Y)
    const firstTime = yrsBefore.every((y) => { const xs = all.filter((a) => Number(a.year) === y); return xs.filter((a) => a.sport_type === 'Walk').reduce((t, a) => t + kmOf(a), 0) <= xs.filter((a) => a.sport_type === 'Run').reduce((t, a) => t + kmOf(a), 0) })
    const wLead = Wk[Wk.length - 1] > Rk[Rk.length - 1]
    const rkLast = rk && rk.length ? rk[rk.length - 1] : null
    return [
      st ? {
        id: 'everyday', k: 'Every day', t: goal.met ? 'The finish line.' : s.activeDays === Math.round((tOf(last) - tOf(`${Y}-01-01`)) / DAY) + 1 ? 'Every day, on purpose.' : `${n0(st.len)} days in a row.`,
        p: [goal.met ? 'I started this streak to stop missing days, and the first target was 31 December. I reached it. The next is 31 December 2028, three calendar years, and after that five.' : 'I started this streak to stop missing days. The first target is 31 December, and after that three years, then five.', 'Goals and targets get me out of the door on a tired evening, and so does the pain of missing a day. Once I get the rhythm, a missed day feels like a debt I have to repay.'],
        facts: [{ l: 'days in a row, still going', v: n0(st.fullLen), hot: true }, { l: 'days this year', v: n0(s.activeDays) }],
        cap: 'Weeks run Sunday to Saturday, each day in the colour of its longest outing. The orange line is the streak.', wide: true,
        node: <StreakCal acts={all} fromISO={`${Y}-01-01`} toISO={last} streak={{ fromISO: st.fullFrom, toISO: last, label: `${n0(st.fullLen)} days in a row` }} aria={`Every day of ${Y}${SO}, all of them with an outing.`} />,
      } : null,
      cd ? {
        id: 'countdown', k: 'The countdown', t: '21 days to race day.',
        p: [`The Kilimanjaro Half usually happens in February. This year it moved to ${parseInt(cd.raceISO.slice(8), 10)} March to make room for the fasting before Eid, so on the first of March I began a countdown: on the day 21 days out I covered 21 km, and so on down, never under 5 km. Along with it I had a walking challenge with a friend in Addis Ababa, so I did even extra to catch up and win it.`, `${quick && quick.y === String(Y) ? 'Then I ran my quickest edition' : 'Then came the race'}${mandara ? `, and two days later I walked up to Mandara Hut, ${n0(elOf(mandara))} m up` : ''}.`],
        facts: [{ l: 'days of 21 on target', v: `${cd.hits}`, hot: true }, { l: 'km on foot in those three weeks', v: n0(cd.total) }],
        cap: 'Each column is a day before the race. The black steps are the countdown; the coloured part is the longest outing of the day.', wide: true,
        more: more('/goals', 'The countdown on Goals →'),
        node: (
          <>
            <RaceCountdown days={cd.days} race={{ km: cd.raceKm }} aria={`The 21 days before the ${Y} Kilimanjaro Half: on target on ${cd.hits} of 21 days, ${n0(cd.total)} km on foot.`} />
            <ul className="ycd__eds" aria-label="Moving time in each edition of the Kilimanjaro Half">
              {eds.map((e) => <li key={e.y} className={e.y === String(Y) ? 'is-hot' : ''}><b>{hmin(e.t)}</b>{e.y}</li>)}
            </ul>
          </>
        ),
      } : null,
      rk && rk.length ? {
        id: 'fifty', k: 'Fifty trips', t: rk.length >= 50 ? 'Trip L, and 2,000 on Strava.' : `${rk.length} trips to Ras Kilomoni.`,
        p: ['Going to Ras Kilomoni 50 times is no joke, given its terrain and the weather. I knew trip L would also be my 2,000th activity on Strava, and I had been waiting patiently for the badge it gives.', 'It was a beautiful day, and it is what pushed me to start this site and tell my story.'],
        facts: [{ l: 'trips', v: n0(rk.length), hot: true }, { l: 'km on those trips', v: n0(rk.reduce((t, r) => t + r.km, 0)) }],
        cap: 'One tile is one trip, numbered in Roman numerals.', wide: true,
        more: more('/goals', 'Ras Kilomoni on Goals →'),
        node: <RasKilomoni rows={rk} mark={rkLast && rk.length >= 50 ? { n: 50, note: 'trip L, my 2,000th on Strava' } : null} aria={`${rk.length} tiles, one for each trip to Ras Kilomoni.`} />,
      } : null,
      trails.length ? {
        id: 'trails', k: 'Trails, trails and more trails', t: `${n0(trailDays)} days on trails and hills.`,
        p: ['Beyond the streak, the dream is trails: as many as I can, for the beauty of raw nature, especially in the rainy season.', 'In Rukwa I ran the Kalambo Falls festival race, 15 km that came to 17 km on my watch. In Njombe I finally went to Kitulo National Park, on my bucket list for years, and I will be back to spend more time on its trails.'],
        cap: 'Five trail days of the year. Each shape is one outing: wider for more distance, taller for more climb.', wide: true,
        node: <SlopeCards items={trails.map((t) => ({ ...t, hot: t.elev === Math.max(...trails.map((x) => x.elev)) }))} aria="Five trail days of the year." />,
      } : null,
      longRun ? {
        id: 'long', k: 'The long run', t: `${k1(kmOf(longRun))} km, my longest run outside.`,
        p: ['A friend and I set out to try 30 km as a long run for the weekend, out to Mbweni and Ras Kilomoni and back. Morning showers kept us cool, and it was one of my best days out, and a good test of endurance.'],
        facts: [{ l: 'km', v: k1(kmOf(longRun)), hot: true }, { l: 'moving', v: hmin(minOf(longRun)) }],
        cap: 'The orange dot is the long run. The small dots are all my other runs of the year.', wide: true,
        node: <BestDay acts={runs} aria={`The long run, ${k1(kmOf(longRun))} km, against every other run of ${Y}.`} />,
      } : null,
      prTot ? {
        id: 'quicker', k: 'Quicker, and outside', t: `${n0(prTot)} PRs.`,
        p: ['Indoor running the way I do it is tiring and boring, so I really have to push myself. This year I set goals, and I wanted to see improvement after the disappointments of 2024 and 2025.', 'I do not run with music. When life hits you, there is no background music to pamper you.'],
        facts: [{ l: 'PRs on Strava segments', v: n0(prTot), hot: true }],
        cap: 'Each bar is a month of PRs. The line under it is my indoor pace that month: higher is quicker.',
        node: <KitBars items={prs.map((m) => ({ label: MON[m.i], value: m.v, display: m.v === prMax ? n0(m.v) : '', tone: m.v === prMax ? 'big' : 'mid' }))} ticks={ticksTo(prMax, prMax > 30 ? 10 : 5)} yCap="PRs" line={{ values: tp.map((m) => m.v), fmt: (v) => `${pace(v)}/km`, label: 'indoor pace', invert: false }} aria={`PRs by month of ${Y}, with my indoor pace each month.`} />,
      } : null,
      wLead ? {
        id: 'walking', k: 'Walking takes the lead', t: 'The walks went further.',
        p: [`${firstTime ? 'For the first time my walks went further than my runs on the road and indoors' : 'My walks went further than my runs on the road and indoors'}${cross >= 0 ? `, and they have been ahead since ${MONF[cross]}` : ''}. With the ${n0(trailKm)} km of trail runs added, running is still a little ahead.`],
        facts: [{ l: `km walked${SO}`, v: n0(Wk[Wk.length - 1]), hot: true }, { l: 'km run, road and indoors', v: n0(Rk[Rk.length - 1]) }, { l: 'km on trails', v: n0(trailKm) }],
        cap: 'Both lines add up through the year: walks in orange, runs on the road and indoors in grey.',
        node: <TwoLines years={MON.slice(0, lastMo + 1)} xLabels={MON.slice(0, lastMo + 1)} xCap="month" yCap={`km${SO}`} a={{ label: 'Runs', values: Rk }} b={{ label: 'Walks', values: Wk }} cross={cross} aria={`Kilometres walked and run adding up through ${Y}: ${n0(Wk[Wk.length - 1])} km walked and ${n0(Rk[Rk.length - 1])} km run on the road and indoors.`} />,
      } : null,
    ]
  },
}

// the last day in the log
function ctxLast(all) { return all.reduce((m, a) => (d10(a) > m ? d10(a) : m), '') }
