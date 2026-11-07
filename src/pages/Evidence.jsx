import { BookLesson } from '../components/BookStory.jsx'
import { useEffect, useState } from 'react'
import Eyebrow from '../components/Eyebrow.jsx'
import DetailFrame from '../components/DetailFrame.jsx'
import Words from '../components/Words.jsx'
import { Reveal } from '../components/Reveal.jsx'
import ColBars from '../charts/ColBars.jsx'
import { DfaChart, MomentumChart, ErasChart, SeasonChart, HeapChart, TreadPaceChart, EvScatter, LongDayChart, KudosChart } from '../charts/EvidenceCharts.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { lenisRef } from '../motion/env.js'

// Chapter 09, The Habit on Trial: twelve things I believe about my habit,
// each tested against the log with more than one method. Every number, chart
// and verdict comes from data/evidence.json, which scripts/build_evidence.py
// writes at each weekly update, so the words follow the results.

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORD[n] || String(n)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const VLABEL = { proven: 'Proven', supported: 'Supported', not: 'Not proven' }

const dt = (iso) => new Date(`${iso}T00:00:00Z`)
const fmtDay = (iso) => `${dt(iso).getUTCDate()} ${MONTH[dt(iso).getUTCMonth()]} ${dt(iso).getUTCFullYear()}`
const fmtShort = (iso) => `${dt(iso).getUTCDate()} ${MON[dt(iso).getUTCMonth()]} ${dt(iso).getUTCFullYear()}`
const fmtDoy = (d) => { const t = new Date(Date.UTC(2023, 0, 1) + (d - 1) * 864e5); return `${t.getUTCDate()} ${MONTH[t.getUTCMonth()]}` }
const daysBetween = (a, b) => Math.round((dt(b) - dt(a)) / 864e5)
const n0 = (v) => Math.round(v).toLocaleString('en-US')
const minus = (s) => String(s).replace(/^-/, '−').replace(/ -/g, ' −')
const f = (v, d = 2) => minus(Number(v).toFixed(d))
const sg = (v, d = 2) => `${v > 0 ? '+' : ''}${f(v, d)}`
const pc = (v, d = 0) => `${(v * 100).toFixed(d)}%`
const mmss = (v) => { const s = Math.round(v * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const sci = (p, d = 0) => { const e = Math.floor(Math.log10(p)); return `${(p / 10 ** e).toFixed(d)}×10${String(e).replace(/./g, (c) => SUP[c])}` }
// a p-value the way the chapter prints it
const fp = (p) => (p < 0.001 ? sci(p) : p < 0.1 ? p.toFixed(3) : p.toFixed(2))
const pEq = (p) => `p = ${fp(p)}`
const list = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)
const tie = (t) => t.replace(/ (\S+)$/, ' $1')

function jump(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: -72 })
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Case({ c }) {
  const id = `ev-c${c.n}`
  return (
    <section className="sgrid ev-case" id={id} aria-labelledby={`${id}-t`}>
      <div className="sgrid__head">
        <div className="ev-side">
          <Eyebrow>Case {String(c.n).padStart(2, '0')}</Eyebrow>
          <p className={`ev-v ev-v--${c.verdict}`}>{VLABEL[c.verdict]}</p>
        </div>
        <h2 id={`${id}-t`} className="section-head__title"><Words>{tie(c.title)}</Words></h2>
      </div>
      <Reveal as="p" className="sgrid__statement">{c.claim}</Reveal>
      <div className="ev-file">
        <div className="ev-file__col">
          <h3 className="ev-k">What I tested</h3>
          <p className="ev-p">{c.tested}</p>
          <h3 className="ev-k">Methods</h3>
          <ol className="ev-methods">{c.methods.map((m) => <li key={m}>{m}</li>)}</ol>
        </div>
        <div className="ev-file__col">
          <h3 className="ev-k">Results</h3>
          <table className="ev-res">
            <tbody>{c.results.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <div className={`ev-show${c.chart.wide ? ' ev-show--wide' : ''}`}>
        <figure className="sgrid__fig ev-fig">
          <figcaption className="sgrid__figtitle">{c.chart.title}</figcaption>
          <div className="sgrid__chart">{c.chart.node}</div>
          <p className="sgrid__note">{c.chart.note}</p>
          <BookLesson of={c.chart.node} />
        </figure>
        <div className="ev-read">
          <h3 className="ev-k">What it shows</h3>
          {c.plain.filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          <p className="ev-limits"><b>Limits.</b> {c.limits}</p>
        </div>
      </div>
    </section>
  )
}

function buildCases(E) {
  const M = E.meta, V = E.verdicts, H = E.holmAdj
  const since = fmtDay(M.comeback)
  const out = []

  // ---- 1. memory ----
  {
    const c = E.c1, lag = (k) => c.lag.find((r) => r[0] === k)
    const week = [6, 7].filter((k) => lag(k)[2] < 0.05)
    const mid = [4, 5].filter((k) => lag(k)[2] >= 0.05)
    out.push({
      n: 1, verdict: V.c1, short: 'Yesterday decides today', key: `odds ×${f(c.or)} · ${pEq(c.lrP)}`,
      title: 'Yesterday decides today.',
      claim: `My days out are not coin flips. Whether I go out today depends on yesterday${week.length ? `, and the day ${week.map(word).join(' or ')} days back still counts after the days in between are taken into account` : ''}.`,
      tested: `The opposite claim: each day since the comeback is an independent draw with the same chance of an outing, ${pc(M.activeShare, 1)}. If that were true, yesterday would tell me nothing about today.`,
      methods: [
        'Logistic regression of today on yesterday.',
        'Likelihood-ratio test of a model with the last seven days against a model with yesterday only.',
        'Wald–Wolfowitz runs test, which counts how often the series switches between active and rest.',
        'Detrended fluctuation analysis (DFA), which measures memory over weeks and months, compared with the same days shuffled 200 times.',
      ],
      results: [
        ['Odds of going out after a day out', `×${f(c.or)} (${f(c.orLo)}–${f(c.orHi)})`],
        ['7 days against 1 day, χ² (df 6)', `${f(c.lr)} · ${pEq(c.lrP)}`],
        ...c.lag.filter((r) => r[0] >= 6).map((r) => [`Day ${r[0]} back, coefficient`, `${f(r[1])} · ${pEq(r[2])}`]),
        ...(mid.length ? [[`Days ${list(mid.map(String))} back`, `p = ${list(mid.map((k) => fp(lag(k)[2])))}`]] : []),
        ['Runs: observed against expected', `${n0(c.runs)} vs ${n0(c.runsExp)} · z = ${f(c.runsZ, 1)}`],
        ['DFA exponent α, real days', f(c.dfa)],
        ['DFA α, shuffled days (95% range)', `${f(c.dfaShuf)} (${f(c.dfaLo)}–${f(c.dfaHi)})`],
      ],
      chart: {
        title: 'Memory over weeks and months',
        node: <DfaChart curve={c.curve} alpha={c.dfa} shuf={c.dfaShuf} aria={`Detrended fluctuation against window length on log scales: my days have a slope of ${f(c.dfa)}, the shuffled days ${f(c.dfaShuf)}.`} />,
        note: `Detrended fluctuation of my active days against the window length, both on log scales. A slope of 0.5 means no memory. My days climb at ${f(c.dfa)}, so windows of weeks and months are more uneven than chance allows: good spells and quiet spells last.`,
      },
      plain: [
        V.c1 === 'proven' ? 'Four methods, four different assumptions, one answer.' : 'The main test holds, and one of the checks is weaker.',
        `After a day out, the odds of going out the next day are ${f(c.or, 1)} times higher. My days come in far fewer and longer runs than chance would give, ${n0(c.runs)} against ${n0(c.runsExp)}, and the memory reaches past a week.`,
        week.length ? `There is a weekly beat inside it: the day ${week.map(word).join(' or ')} days ago still matters.` : '',
      ],
      limits: 'These tests look at whether I went out, and leave out how far. The runs test and DFA treat the series as one piece, so they show that memory exists without showing where it comes from.',
    })
  }

  // ---- 2. momentum and rust ----
  {
    const c = E.c2, on = (k) => c.memOn.find((r) => r[0] === k), off = (k) => c.memOff.find((r) => r[0] === k)
    const tail = c.memOn.filter((r) => r[0] >= 11), th = tail.reduce((s, r) => s + r[1], 0), tn = tail.reduce((s, r) => s + r[2], 0)
    const d1 = on(1), d7 = on(7), r1 = off(1), r5 = off(5)
    out.push({
      n: 2, verdict: V.c2, short: 'A chain gets stronger, a break gets stickier', key: `Weibull shape ${f(c.weibull)} (${f(c.weibullLo)}–${f(c.weibullHi)})`,
      title: 'A chain gets stronger.',
      claim: 'The longer I have gone out day after day, the more likely I am to go out again. The longer I have rested, the less likely I am to start again.',
      tested: 'The opposite claim: the chance of a streak ending is the same on day 2 as on day 20, and the chance of a break ending is the same after one rest day as after five. That is the memoryless (geometric) pattern.',
      methods: [
        'Discrete-time hazard model: a logistic regression of tomorrow on the log of how long the current streak or break has lasted.',
        `Weibull survival fit to the ${n0(c.nStreaks)} streaks since the comeback, with the current streak counted as still running (censored). A shape below 1 means the risk of ending falls with age.`,
        'Life table: the share of streaks and breaks that continue at each length.',
      ],
      results: [
        ['Streak goes on, slope per log-day', `${sg(c.streakSlope)} · ${pEq(c.streakP)}`],
        ['Break ends, slope per log-day', `${sg(c.gapSlope)} · ${pEq(c.gapP)}`],
        ['Weibull shape of streaks', `${f(c.weibull)} (${f(c.weibullLo)}–${f(c.weibullHi)})`],
        ['Out again after day 1 of a streak', `${pc(d1[1] / d1[2])} (${d1[1]}/${d1[2]})`],
        ['Out again after day 7', `${pc(d7[1] / d7[2])} (${d7[1]}/${d7[2]})`],
        [`Out again after days ${tail[0][0]} to ${tail[tail.length - 1][0]}`, `${th} of ${tn}`],
        ['Out after 1 rest day', `${pc(r1[1] / r1[2])} (${r1[1]}/${r1[2]})`],
        ['Out after 5 rest days', `${pc(r5[1] / r5[2])} (${r5[1]}/${r5[2]})`],
      ],
      chart: {
        title: 'Chance of going out tomorrow',
        node: <MomentumChart on={c.memOn} off={c.memOff} aria={`Chance of going out the next day: ${pc(d1[1] / d1[2])} after one day out, ${pc(d7[1] / d7[2])} after seven; ${pc(r1[1] / r1[2])} after one rest day, ${pc(r5[1] / r5[2])} after five.`} />,
        note: 'Orange: after this many days out in a row. Grey: after this many rest days in a row. The dot size is the number of cases behind each point.',
      },
      plain: [
        V.c2 === 'proven' ? 'Momentum and rust are both real and both measurable.' : 'Momentum is clear, and rust is weaker.',
        `The first day back is the easiest one to lose: ${pc(1 - d1[1] / d1[2])} of new streaks end there. By the second week a streak nearly carries itself. Rest works the other way: each extra day off makes the next day off more likely.`,
      ],
      limits: `Only ${word(c.reach14)} streaks reached two weeks, so the right end of the orange line rests on small numbers. The Weibull model is continuous and streaks are counted in whole days, so I treat its shape as a check on the hazard model, which fits the daily counts directly.`,
    })
  }

  // ---- 3. eras ----
  {
    const c = E.c3, S = c.segments
    const brk = (iso) => { const d = daysBetween(M.comeback, iso); return d >= 0 && d <= 31 ? `${Math.round(d / 7)} weeks after the comeback` : fmtShort(iso) }
    const same = c.gapDays.filter((d) => d <= 14).length
    const odd = c.gapDays.map((d, i) => [d, i]).filter(([d]) => d > 14)
    const last = S[S.length - 1], burst = S[1]
    const lenW = (s) => daysBetween(s[0], s[1]) / 7
    out.push({
      n: 3, verdict: V.c3, short: 'My record has four eras, found blind', key: odd.length ? `${word(same)} of ${word(c.gapDays.length)} breaks agree to the week` : 'the methods agree within two weeks',
      title: `My record has ${word(S.length)} eras.`,
      claim: 'My habit did not grow smoothly. It changed in steps, and the steps can be found from the numbers alone, without telling the method any dates.',
      tested: 'The opposite claim: the number of active days per week drifts without clear jumps, so any split into eras is my own story laid on top of the data.',
      methods: [
        `PELT changepoint detection on active days per week, ${n0(c.weeks)} weeks from Sunday to Saturday, with a penalty that grows with the length of the series and a minimum era of 8 weeks.`,
        `Binary segmentation, a different search, asked for the ${word(c.binseg.length)} strongest breaks.`,
        'CUSUM: the lowest point of the running sum of deviations from the overall mean marks where low weeks end and high weeks begin.',
      ],
      results: [
        ['PELT breaks, week of', c.pelt.map(brk).join(' · ')],
        ['Binary segmentation, week of', c.binseg.map(brk).join(' · ')],
        ['CUSUM low point, week of', fmtShort(c.cusumLow)],
        ...S.map((s, i) => [i ? `Era ${i + 1}` : 'Era 1, active days a week', f(s[2])]),
      ],
      chart: {
        title: 'Active days per week', wide: true,
        node: <ErasChart weekly={c.weekly} segments={S} aria={`Active days per week over ${n0(c.weeks)} weeks, with ${word(S.length)} eras at ${list(S.map((s) => f(s[2], 1)))} days a week.`} />,
        note: 'One bar per week, Sunday to Saturday. The orange steps are the eras found by the changepoint test, at their average level.',
      },
      plain: [
        `PELT and binary segmentation work in different ways. ${same === c.gapDays.length ? 'They agree on every break within two weeks' : `They agree on the first ${word(same)} breaks to the week`}: the comeback in the middle of ${M.comeback.slice(0, 4)}, and the first burst settling into a steady rhythm early in ${c.pelt[1].slice(0, 4)}. CUSUM puts the end of the low weeks in the week of ${fmtDay(c.cusumLow)}, ${(() => { const k = Math.round(daysBetween(c.cusumLow, M.comeback) / 7); return k === 0 ? 'the same week as' : `${word(k)} week${k > 1 ? 's' : ''} before` })()} the comeback.`,
        odd.length ? `On the last break they land ${word(Math.round(odd[0][0] / 7))} weeks apart, in the weeks of ${fmtDay(c.pelt[odd[0][1]])} and ${fmtDay(c.binseg[odd[0][1]])}. My current streak of ${n0(c.streak)} days began on ${fmtDay(c.streakFrom)}${c.streakFrom > c.pelt[odd[0][1]] && c.streakFrom < c.binseg[odd[0][1]] ? ', between the two' : ''}. That is why this case is supported: the eras are clear, and the exact week of the last change is not pinned down.` : `The last break is the change that became my current streak of ${n0(c.streak)} days, which began on ${fmtDay(c.streakFrom)}.`,
        last[2] >= burst[2] - 0.3 && lenW(last) > lenW(burst) ? `The last era runs at ${f(last[2], 1)} active days a week, the level of the first burst, and it has already lasted longer.` : '',
      ],
      limits: 'The penalty decides how many breaks a changepoint method reports. The agreement between methods that search in different ways is what makes these breaks stand out.',
    })
  }

  // ---- 4. weekday ----
  {
    const c = E.c4, sh = (d) => { const r = c.days.find((x) => x[0] === d); return r[1] / r[2] }
    const tot = c.days.reduce((s, r) => s + r[1], 0) / c.days.reduce((s, r) => s + r[2], 0)
    const B = c.days.find((x) => x[0] === c.best), Wd = c.days.find((x) => x[0] === c.worst)
    out.push({
      n: 4, verdict: V.c4, short: `${DAY[c.best]} is my surest day, ${DAY[c.worst]} my weakest`, key: `+${f(c.diff * 100, 1)} points (${f(c.diffLo * 100, 1)}–${f(c.diffHi * 100, 1)})`,
      title: `${DAY[c.best]} is my surest day.`,
      claim: `Since the comeback, some days of the week are skipped more than others. ${DAY[c.best]} is the day I skip least, and ${DAY[c.worst]} is the day I skip most.`,
      tested: 'The opposite claim: the chance of a day being active is the same on every day of the week, from Sunday to Saturday.',
      methods: [
        'χ² test of independence on active and rest days by weekday.',
        'Logistic regression with errors clustered by week, because days in the same week are not independent (case 1). This makes the test stricter.',
        `Block bootstrap: whole weeks resampled 2,000 times to get an interval for the ${DAY[c.best]} minus ${DAY[c.worst]} gap.`,
        'A χ² goodness-of-fit test on the number of outings by weekday.',
      ],
      results: [
        [`${DAY[c.best]} active`, `${pc(sh(c.best), 1)} (${B[1]}/${B[2]})`],
        [`${DAY[c.worst]} active`, `${pc(sh(c.worst), 1)} (${Wd[1]}/${Wd[2]})`],
        ['χ² (df 6)', `${f(c.chi2)} · ${pEq(c.chiP)}`],
        ['Clustered Wald test', `${f(c.wald)} · ${pEq(c.waldP)}`],
        [`${DAY[c.best]} − ${DAY[c.worst]}, 95% CI`, `${f(c.diff * 100, 1)} points (${f(c.diffLo * 100, 1)}–${f(c.diffHi * 100, 1)})`],
        ['Outings by weekday, χ²', `${f(c.outChi2)} · ${pEq(c.outP)}`],
      ],
      chart: {
        title: 'Share of days with an outing, by weekday',
        node: (
          <ColBars
            items={c.days.map(([d, a, n]) => ({ label: DAY3[d], short: DAY3[d].slice(0, 2), value: a / n, display: pc(a / n), tone: d === c.best ? 'big' : d === c.worst ? 'mid' : 'quiet' }))}
            max={1} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFmt={(v) => pc(v)} refLine={{ value: tot, label: `all days, ${pc(tot, 1)}`, short: pc(tot, 1) }}
            aria={`Share of days with an outing since the comeback: ${c.days.map(([d, a, n]) => `${DAY[d]} ${pc(a / n, 1)}`).join(', ')}.`}
          />
        ),
        note: `Since the comeback, Sunday first. Orange is ${DAY[c.best]}, black is ${DAY[c.worst]}, and the dashed line is the average of all days.`,
      },
      plain: [
        V.c4 === 'proven' ? 'The weekday pattern survives the strictest version of the test.' : 'The simple test finds the pattern, and the stricter test is weaker.',
        `${DAY[c.best]} is the day I skip least, and ${DAY[c.worst]} is the day I skip most. ${c.outP >= 0.05 ? 'The total number of outings does not differ much by weekday, so the difference is about which days get skipped.' : 'The number of outings also differs by weekday.'}`,
      ],
      limits: `Seven weekdays and one comparison chosen after looking at the data: the ${DAY[c.best]} and ${DAY[c.worst]} gap is the largest of 21 possible pairs, so its interval describes this gap and should not be read as a test planned in advance.`,
    })
  }

  // ---- 5. season ----
  {
    const c = E.c5, low = [...c.lowMonths].sort((a, b) => a - b), lowNames = low.map((m) => MONTH[m - 1])
    const ny = c.years[1] - c.years[0] + 1, ms = (m) => c.months.find((r) => r[0] === m)[1]
    out.push({
      n: 5, verdict: V.c5, short: `${list(lowNames)} are my quiet season`, key: `annual cycle ${pEq(c.waldP)}`,
      title: 'I have a quiet season.',
      claim: `Across the years, I go out least often around ${fmtDoy(c.lowDoy)} and most often around ${fmtDoy(c.peakDoy)}. ${list(lowNames)} are my quietest months.`,
      tested: `The opposite claim: the chance of an active day does not follow the calendar. I used the ${word(ny)} full years ${c.years[0]} to ${c.years[1]}, ${n0(c.nDays)} days, so that partial years do not tilt the result.`,
      methods: [
        'Harmonic logistic regression: a smooth yearly wave (one sine and one cosine), with a separate level for each year, errors clustered by week.',
        'Kruskal–Wallis test of monthly active shares across the 12 months.',
        'Friedman test, the same comparison with each year as its own block.',
      ],
      results: [
        ['Yearly wave, clustered Wald (df 2)', `${f(c.wald)} · ${pEq(c.waldP)}`],
        ['Low point of the wave', `about ${fmtDoy(c.lowDoy)}`],
        ['High point', `about ${fmtDoy(c.peakDoy)}`],
        ['Active share, top to bottom of wave', `${pc(c.hi)} to ${pc(c.lo)}`],
        [`${list(c.lowMonths.map((m) => MONTH[m - 1]))} (lowest months)`, c.lowMonths.map((m) => pc(ms(m), 1)).join(', ')],
        ['Kruskal–Wallis across months', pEq(c.kwP)],
        ['Friedman, years as blocks', pEq(c.friedmanP)],
      ],
      chart: {
        title: `Share of days with an outing, by month, ${c.years[0]} to ${c.years[1]}`,
        node: <SeasonChart months={c.months} curve={c.curve} low={c.lowMonths} aria={`Share of days with an outing by month, ${c.years[0]} to ${c.years[1]}: ${c.months.map(([m, v]) => `${MONTH[m - 1]} ${pc(v)}`).join(', ')}.`} />,
        note: `The ${word(ny)} full years together. The line is the fitted yearly wave, and the orange bars are the two quietest months.`,
      },
      plain: [
        V.c5 === 'not' ? 'The yearly wave does not pass the strict test.' : 'The wave is there, and it is strong enough to pass a strict test that respects the weekly clustering.',
        c.lowInEachYear ? `In each of the ${word(ny)} years, ${low.map((m) => MONTH[m - 1]).join(' or ')} is one of the three quietest months.` : '',
        c.kwP >= 0.05 ? `The month-by-month tests that assume very little do not confirm it, because each month has only ${word(ny)} values, one per year. That is why I call this supported and stop short of proven.` : 'The month-by-month tests that assume very little confirm it.',
      ],
      limits: `One sine wave is a simple shape. A second wave (two peaks a year) ${c.semiP >= 0.05 ? 'did not improve the fit' : 'improved the fit'} (${pEq(c.semiP)}). ${cap(word(ny))} years is a short record for a yearly pattern.`,
    })
  }

  // ---- 6. round numbers ----
  {
    const c = E.c6, hp = (t) => c.heap.find((r) => r[0] === t)
    const held = [5, 10, 15].filter((t) => H[`${t} km on the treadmill`] < 0.05)
    const half = hp(21.1), five = hp(5)
    const halfHeld = H['21.1 km on the treadmill'] < 0.05
    out.push({
      n: 6, verdict: V.c6, short: 'On the treadmill I stop on round numbers', key: `${five[1]} runs at 5 km vs ${n0(five[3])} expected`,
      title: 'I stop on round numbers.',
      claim: `My treadmill runs end at ${list(held.map((t) => `${t}`))} km far more often than a natural spread of distances would allow.`,
      tested: 'The opposite claim: near any distance, runs are spread evenly, so the share that ends within 60 m of a round number should match the width of that window. Inside a window of ±560 m, a ±60 m slice should hold about 10.7% of the runs.',
      methods: [
        'One-sided binomial test at each round distance, against that even spread.',
        'Gaussian mixture model on the log of every foot distance: if distances pile up on exact values, the model keeps adding very narrow components.',
      ],
      results: [
        ...c.heap.map(([t, near, band, exp, p], i) => [i ? `${t} km` : `${t} km: within 60 m, of ${band} near`, `${near}${i ? ` of ${band}` : ''} vs ${f(exp, 1)} expected · ${pEq(p)}`]),
        ['Mixture BIC, 1 to 4 components', `${n0(c.bic[0][1])} → ${n0(c.bic[c.bic.length - 1][1])}`],
        ['Narrowest component', `${f(c.narrow[0])} km, width ${c.narrow[1] < 0.01 ? 'under 1%' : pc(c.narrow[1])}`],
      ],
      chart: {
        title: 'Every treadmill run, by distance', wide: true,
        node: <HeapChart hist={c.hist} aria={`Treadmill runs by distance in 100 m bins: ${five[1]} runs within 60 m of 5 km, ${hp(10)[1]} of 10 km, ${hp(15)[1]} of 15 km.`} />,
        note: `All ${n0(c.nTread)} treadmill runs in 100 m bins. The spikes at 5, 10 and 15 km are the round numbers.`,
      },
      plain: [
        'The pile-up at round numbers is one of the strongest results in this chapter.',
        `At 5 km, ${pc(five[1] / five[2])} of the runs in the window end within 60 m of the mark. The mixture model sees it too: it keeps finding a razor-thin bump at ${f(c.narrow[0])} km, which is what point masses look like to a model that expects smooth hills.`,
      ],
      limits: `${halfHeld ? 'The 21.1 km result also survives the Holm correction.' : `The 21.1 km result does not survive the Holm correction (adjusted ${pEq(H['21.1 km on the treadmill'])}), so I only claim ${list(held.map(String))} km.`} Outdoor runs are not included, since GPS distance adds its own noise.`,
    })
  }

  // ---- 7. treadmill pace ----
  {
    const c = E.c7, Y = (y) => c.byYear.find((r) => r[0] === y)
    const span = c.byYear.filter((r) => r[0] >= c.from && r[0] <= c.prev)
    const mono = span.every((r, i) => !i || r[2] > span[i - 1][2])
    const drop = c.prevMed - c.curMed
    const partial = M.last.slice(5) < '12-31'
    out.push({
      n: 7, verdict: V.c7, short: `My treadmill pace slowed for ${word(c.prev - c.from)} years, then turned`, key: `${sg(c.slope)} min/km a year · ${c.cur} ${minus(f(-drop))}`,
      title: 'My treadmill pace turned.',
      claim: `From ${c.from} to ${c.prev}, my usual treadmill kilometre took longer ${mono ? 'every year' : 'in most years'}. In ${c.cur} it came back down by ${mmss(drop)} per kilometre.`,
      tested: `Two opposite claims: that treadmill pace had no trend from ${c.from} to ${c.prev}, and that ${c.cur} is no different from ${c.prev}. I used treadmill runs of 3 to 25 km, ${n0(c.n)} in all.`,
      methods: [
        'Theil–Sen estimator: the median of all pairwise slopes, a trend line that a few odd runs cannot pull.',
        'Kendall’s τ, a rank test for a steady trend in time.',
        `Mann–Whitney U test of ${c.cur} runs against ${c.prev} runs.`,
      ],
      results: [
        [`Median pace ${c.from} → ${c.prev}`, `${mmss(Y(c.from)[2])} → ${mmss(Y(c.prev)[2])} min/km`],
        [`Theil–Sen slope, ${c.from}–${c.prev}`, `${sg(c.slope)} min/km a year (${f(c.slopeLo)}–${f(c.slopeHi)})`],
        ['Kendall τ', `${f(c.tau)} · ${pEq(c.tauP)}`],
        ['Same trend, distance held fixed', `${sg(c.slopeHeld)} min/km a year · ${pEq(c.slopeHeldP)}`],
        [`Median ${c.cur} against ${c.prev}`, `${mmss(c.curMed)} vs ${mmss(c.prevMed)} min/km`],
        [`Mann–Whitney (${c.nCur} and ${c.nPrev} runs)`, pEq(c.mwuP)],
      ],
      chart: {
        title: 'Treadmill pace by year',
        node: <TreadPaceChart byYear={c.byYear} from={c.from} cur={c.cur} aria={`Median treadmill pace by year: ${c.byYear.map((r) => `${r[0]} ${mmss(r[2])}`).join(', ')} min per km.`} />,
        note: `The dot is the median run and the bar the middle half of runs. Quicker paces sit higher. The years before ${c.from} had few runs and are shown in grey.`,
      },
      plain: [
        V.c7 === 'proven' ? 'Both halves of the claim hold with room to spare.' : 'The trend holds, and the turn is weaker.',
        `The slowdown was steady, about ${Math.round(c.slope * 60)} seconds per kilometre each year, and the ${c.cur} turn is just as clear. Treadmill pace is the belt speed I chose, so this measures the effort I chose to give, year by year.`,
      ],
      limits: `Pace and distance travel together, so I also fitted a model that holds distance fixed. It gives almost the same trend, ${sg(c.slopeHeld)} min/km a year.${partial ? ` The ${c.cur} year is not finished.` : ''}`,
    })
  }

  // ---- 8. climb and walking pace ----
  {
    const c = E.c8, per10 = Math.round(c.slope * 10 * 60)
    out.push({
      n: 8, verdict: V.c8, short: 'Hills slow my walks', key: `+${per10} s/km per 10 m/km climb`,
      title: 'Hills slow my walks.',
      claim: `Each extra 10 m of climb per kilometre adds about ${per10} seconds to every kilometre of a walk.`,
      tested: `The opposite claim: walking pace does not depend on how steep the route is, once the length of the walk and the year are taken into account. I used ${n0(c.n)} outdoor walks and hikes. Walks with more than 250 m of climb per km are left out.`,
      methods: [
        'Linear regression of pace on climb per kilometre, the log of distance and the year, with robust (HC3) standard errors.',
        'Spearman rank correlation between pace and climb, which needs no straight-line assumption.',
        'A plain comparison of medians for flat and steep walks.',
      ],
      results: [
        ['Slope, min/km per m/km of climb', `${f(c.slope, 3)} (${f(c.lo, 3)}–${f(c.hi, 3)})`],
        ['Same, per 10 m/km', `+${per10} s per km`],
        ['p-value', fp(c.p)],
        ['Spearman ρ', `${f(c.rho)} · ${pEq(c.rhoP)}`],
        ['Median pace, under 10 m/km', `${f(c.flatMed, 1)} min/km`],
        [`Median pace, 40 m/km or more (${c.nSteep} walks)`, `${f(c.steepMed, 1)} min/km`],
      ],
      chart: {
        title: 'Walking pace against climb',
        node: (
          <EvScatter
            points={c.pts.map(([x, y]) => ({ x, y, tone: 'is-grey' }))} xDomain={[0, 120]} yDomain={[6, 32]}
            xTicks={[0, 20, 40, 60, 80, 100, 120]} yTicks={[10, 15, 20, 25, 30]} xCap="metres climbed per km" yCap="min per km"
            fit={{ slope: c.slope, intercept: c.intercept }} fitLabel={`+${f(c.slope)} min/km for each m/km`}
            aria={`${n0(c.n)} outdoor walks and hikes, pace against climb per km, with a fitted slope of ${f(c.slope)} min per km for each metre of climb per km.`}
          />
        ),
        note: 'Every outdoor walk and hike: climb per kilometre across, pace up. The line is the fitted effect of climb at the average distance.',
      },
      plain: [
        V.c8 === 'proven' ? 'The model, the rank test and the medians all point the same way.' : 'The tests do not agree on this one.',
        `A steep walk is a slow walk, and the price can be put in seconds: on a route with 40 m of climb per kilometre, each kilometre takes about ${mmss(c.slope * 40)} longer than on flat ground.`,
      ],
      limits: `The model explains ${c.r2 >= 0.24 && c.r2 <= 0.26 ? 'a quarter' : pc(c.r2)} of the spread in walking pace (R² = ${f(c.r2)}). Stops, company and the ground under my feet are not in the log.`,
    })
  }

  // ---- 9. climb and running pace ----
  {
    const c = E.c9
    out.push({
      n: 9, verdict: V.c9, short: 'Hills slow my runs', key: `ρ = ${f(c.rho)} · ${pEq(c.rhoP)}`,
      title: 'Hills slow my runs.',
      claim: V.c9 === 'not' ? 'I expected the same effect on my outdoor runs. The data does not show it.' : 'The same effect shows on my outdoor runs.',
      tested: `The same model as in case 8, on ${n0(c.n)} outdoor runs and trail runs: pace on climb per kilometre, distance and year, with a marker for trail runs. Runs with more than 150 m of climb per km are left out.`,
      methods: ['Linear regression with robust errors.', 'Spearman rank correlation.'],
      results: [
        ['Slope, min/km per m/km', `${f(c.slope, 3)} (${f(c.lo, 3)} to ${f(Math.abs(c.hi) < 0.0005 ? 0 : c.hi, 3)})`],
        ['Spearman ρ', `${f(c.rho)} · ${pEq(c.rhoP)}`],
        ['Trail run marker', `${sg(c.trail)} min/km · ${pEq(c.trailP)}`],
      ],
      chart: {
        title: 'Running pace against climb',
        node: (
          <EvScatter
            points={c.pts.map(([x, y, t]) => ({ x, y, tone: t ? 'is-acc' : 'is-grey' }))} xDomain={[0, 150]} yDomain={[3, 21]}
            xTicks={[0, 25, 50, 75, 100, 125, 150]} yTicks={[4, 8, 12, 16, 20]} xCap="metres climbed per km" yCap="min per km"
            keyItems={[['is-grey', 'run'], ['is-acc', 'trail run']]}
            aria={`${n0(c.n)} outdoor runs and trail runs, pace against climb per km, with no rank correlation (rho ${f(c.rho)}).`}
          />
        ),
        note: 'Every outdoor run, climb per kilometre across, pace up. The cloud has no slope: steep runs are spread over the same paces as flat ones.',
      },
      plain: [
        V.c9 === 'not' ? `The rank test finds no link at all${c.slope < 0 ? ', and the model’s slope points the wrong way' : ''}. I keep this case in on purpose. A chapter that only reports the claims that worked would not be honest about how the testing went.` : 'The rank test and the model agree.',
        V.c9 === 'not' ? `My ${n0(c.n)} outdoor runs mix road runs, trail runs and races, and climb per kilometre does not line up with their pace.` : '',
      ],
      limits: c.slope < 0 ? 'A small negative slope in one model and no rank correlation is a null result. It does not show that hills make me faster.' : 'The runs mix many kinds of outing, so the model carries a lot of spread.',
    })
  }

  // ---- 10. running and walking ----
  {
    const c = E.c10
    const ptsMax = Math.max(...c.pts.map((p) => p[0])), wMax = Math.max(...c.pts.map((p) => p[1]))
    const xm = Math.ceil(ptsMax / 20) * 20, ym = Math.ceil(wMax / 20) * 20
    const trade = V.c10 === 'not'
    out.push({
      n: 10, verdict: V.c10, short: 'Running and walking do not compete for my time', key: trade ? `week to week ρ = ${f(c.rhoDiff)} · ${pEq(c.pDiff)}` : `ρ = ${f(c.rho)} · ${pEq(c.p)}`,
      title: 'Runs and walks do not compete.',
      claim: 'A big running week does not take kilometres away from walking, or the other way round. They behave like two separate habits.',
      tested: `The opposite claim: weekly running and walking distance trade off, which would show as a negative correlation. I used the ${n0(c.weeks)} full weeks since the comeback, Sunday to Saturday.`,
      methods: [
        'Spearman correlation of weekly running and walking kilometres.',
        'The same on week-to-week changes, which removes slow trends.',
        'The same after subtracting a 13-week moving average from each.',
      ],
      results: [
        ['Weekly totals', `ρ = ${f(c.rho)} · ${pEq(c.p)}`],
        ['Week-to-week changes', `ρ = ${f(c.rhoDiff)} · ${pEq(c.pDiff)}`],
        ['Week-to-week, Holm-adjusted', pEq(H['Running and walking, week to week'])],
        ['Detrended', `ρ = ${f(c.rhoTrend)} · ${pEq(c.pTrend)}`],
        ['Smallest correlation this sample could detect', `about ±${f(c.detect)}`],
      ],
      chart: {
        title: 'Running and walking, week by week',
        node: (
          <EvScatter
            points={c.pts.map(([x, y]) => ({ x, y, tone: 'is-acc' }))} xDomain={[0, xm]} yDomain={[0, ym]}
            xTicks={Array.from({ length: xm / 20 + 1 }, (_, i) => i * 20)} yTicks={Array.from({ length: ym / 20 + 1 }, (_, i) => i * 20)}
            xCap="km run in the week" yCap="km walked in the week"
            aria={`${n0(c.weeks)} weeks since the comeback, kilometres run against kilometres walked. Weekly totals have a rank correlation of ${f(c.rho)}.`}
          />
        ),
        note: 'One dot per week since the comeback: kilometres run across, kilometres walked up.',
      },
      plain: trade ? [
        `The weekly totals show no trade-off (ρ = ${f(c.rho)}). The changes do. In a week when I run more than the week before, I usually walk a little less than the week before, and the other way round (ρ = ${f(c.rhoDiff)}). The detrended series agrees (ρ = ${f(c.rhoTrend)}).`,
        `The link is weak: a correlation of ${f(c.rhoDiff)} accounts for about ${pc(c.rhoDiff ** 2)} of the spread in the changes. It still survives the correction for many tests, so the claim that the two never compete does not hold as I wrote it. Over a whole week they mostly live side by side, and at the margin one gives a little way to the other.`,
      ] : [
        `Three versions of the test, and none finds a trade-off. Any link between the two is weaker than about ${f(c.detect)}, which is small. That is a strong hint that running and walking are separate habits, each with its own rhythm.`,
      ],
      limits: trade ? 'These are correlations between weekly totals. They show how the two move together, and they say nothing about why.' : 'No correlation is not the same as proof of no relationship, which is why the verdict stops at supported.',
    })
  }

  // ---- 11. long days ----
  {
    const c = E.c11, a = c.long[0] / c.long[1], b = c.other[0] / c.other[1]
    const outHeld = H['Out the day after a long day'] < 0.05
    out.push({
      n: 11, verdict: V.c11, short: 'A long day does not call for a rest day', key: `${pc(a)} vs ${pc(b)} out next day`,
      title: 'A long day needs no rest day.',
      claim: `After a day of ${c.km} km or more on foot, I am ${a > b ? 'more' : 'less'} likely to go out the next day, and ${c.kmLong > c.kmOther ? 'to go further' : 'to go less far'}.`,
      tested: `The opposite claim: a long day is followed by rest or a short day, as a recovery rule would suggest. I compared the day after ${n0(c.long[1])} long days with the day after the ${n0(c.other[1])} other active days since the comeback.`,
      methods: [
        'Fisher’s exact test on going out the next day.',
        'Mann–Whitney U test on the next day’s distance, when there was one.',
        'Lag-1 autocorrelation of weekly kilometres, and what follows a top-10% week.',
      ],
      results: [
        ['Out next day, after a long day', `${pc(a)} (${c.long[0]}/${c.long[1]})`],
        ['Out next day, after other days', `${pc(b)} (${n0(c.other[0])}/${n0(c.other[1])})`],
        ['Fisher odds ratio', `${f(c.or)} · ${pEq(c.p)} (Holm ${fp(H['Out the day after a long day'])})`],
        ['Next day median distance', `${f(c.kmLong, 1)} vs ${f(c.kmOther, 1)} km · ${pEq(c.kmP)}`],
        ['Weekly km, lag-1 autocorrelation', f(c.ac1)],
        ['Week after a top-10% week', `${pc(c.afterBig)} of its distance (median)`],
      ],
      chart: {
        title: 'The day after',
        node: (
          <LongDayChart
            groups={[
              { title: 'out the next day', max: 1, rows: [{ label: `after a day of ${c.km} km or more`, value: a, display: pc(a), tone: 'is-acc' }, { label: 'after any other day out', value: b, display: pc(b), tone: 'is-grey' }] },
              { title: 'median distance the next day', rows: [{ label: `after a day of ${c.km} km or more`, value: c.kmLong, display: `${f(c.kmLong, 1)} km`, tone: 'is-acc' }, { label: 'after any other day out', value: c.kmOther, display: `${f(c.kmOther, 1)} km`, tone: 'is-grey' }] },
            ]}
            aria={`After a day of ${c.km} km or more: ${pc(a)} out the next day, median ${f(c.kmLong, 1)} km. After any other day out: ${pc(b)}, median ${f(c.kmOther, 1)} km.`}
          />
        ),
        note: 'The share of next days with an outing, and how far the next day went when there was one.',
      },
      plain: [
        `Long days come in blocks. The day after a long one is usually another long one, ${f(c.kmLong, 1)} km against ${f(c.kmOther, 1)} km, and a big week is followed by a week that keeps most of it: weekly kilometres have a lag-1 correlation of ${f(c.ac1)}, and the week after a top-10% week keeps ${pc(c.afterBig)} of its distance.`,
        outHeld ? `Both results survive the correction for many tests, so I call the claim ${VLABEL[V.c11].toLowerCase()}.` : `The distance result is strong. The going-out result is just short of the strict line after correction, so I call the whole claim ${VLABEL[V.c11].toLowerCase()}.`,
      ],
      limits: 'This shows what follows a long day in my record. It does not show that a long day causes the next one.',
    })
  }

  // ---- 12. kudos ----
  {
    const c = E.c12, K = (l) => c.effects.find((e) => e[0] === l)
    const tr = K('Trail run against a walk'), ru = K('Run against a walk'), d2 = K('Twice the distance'), c2 = K('Twice the climb')
    const y0 = +M.first.slice(0, 4)
    out.push({
      n: 12, verdict: V.c12, short: 'Kudos follow the kind of outing', key: `trail run +${n0(tr[1])}% · distance ${sg(d2[1], 0)}%`,
      title: 'Kudos follow the sport.',
      claim: `The people who follow me cheer trail runs and runs more than walks.${d2[4] >= 0.05 && c2[4] >= 0.05 ? ' How far or how high I went adds almost nothing once the kind of outing is known.' : ''}`,
      tested: `The opposite claim: kudos grow with the size of the effort, distance and climb, whatever the sport. I used the ${n0(c.n)} activities from 2022 on.`,
      methods: ['Linear regression of log(1 + kudos) on sport, log distance, log climb, a personal-record marker, weekend and year, with robust errors. Effects are shown as percent change in kudos.'],
      results: [
        ...c.effects.filter((e) => e[0] !== 'Hike against a walk' && e[0] !== 'Others against a walk' && e[0] !== 'On a weekend').map(([l, e, lo, hi, p]) => [l, `${sg(e, 0)}% (${f(lo, 0)} to ${f(hi, 0)}) · ${pEq(p)}`]),
        ['Share of variation explained, R²', f(c.r2, 3)],
      ],
      chart: {
        title: 'Change in kudos for each factor',
        node: <KudosChart effects={c.effects} aria={`Change in kudos: ${c.effects.map((e) => `${e[0]} ${sg(e[1], 0)}%`).join(', ')}.`} />,
        note: 'Each factor with its 95% interval, the others held fixed. Intervals that cross zero are not significant.',
      },
      plain: [
        `Once the sport is known, the size of the outing barely moves the kudos. A trail run earns about ${n0(tr[1])}% more than a walk of the same length and climb, and a run about ${n0(ru[1])}% more.`,
        `The model explains ${pc(c.r2, 1)} of the spread in kudos, so a single outing stays hard to predict, while the pattern across hundreds of outings is clear.`,
      ],
      limits: `Outings before 2022 are left out: their median kudos were ${list(c.medBefore.map((v) => n0(v)))} a year from ${y0} to 2021, against ${n0(c.medFrom[0])} to ${n0(c.medFrom[1])} from 2022 on, so they follow a different pattern.`,
    })
  }
  return out
}

// The methods, each explained at length: what it does, how it works, how to
// read what it gives back, and where this chapter used it. Numbers come from
// the same evidence.json as the cases.
function glossary(E) {
  const c1 = E.c1, c2 = E.c2, c6 = E.c6, c7 = E.c7, c10 = E.c10, c11 = E.c11
  const pc0 = (v) => `${Math.round(v * 100)}%`
  return [
    ['The p-value', [
      'Every test here starts from the opposite of the claim, a world where the pattern does not exist. The p-value is the chance of seeing a pattern at least as strong as mine if that world were real. A small p-value says my data would be very surprising there, which counts as evidence for the claim.',
      'It is not the chance that the claim is true, and a large p-value does not prove the opposite. It only says the data are not strong enough to rule the opposite out. The usual line is 0.05, one chance in twenty. Very small values are written in powers of ten: 7×10⁻¹⁸ means a decimal point followed by seventeen zeros and then a 7.',
    ]],
    ['Holm correction', [
      'When many tests are run, a few small p-values turn up by luck alone. With twenty tests at the 0.05 line, about one would pass even if every claim were false. The Holm method guards against that across the whole set of tests at once.',
      `It sorts the p-values from smallest to largest, multiplies the smallest by the number of tests, the next by one fewer, and so on, keeping the order. A test holds if its adjusted value stays under 0.05. It controls the chance of even one false finding in the whole family, and it gives up less power than the simpler Bonferroni rule, which multiplies every p-value by the full number of tests. This chapter corrects ${E.holm.length} tests together.`,
    ]],
    ['Logistic regression', [
      'A model for outcomes that are yes or no, such as whether I went out on a given day. It does not model the chance directly. It models the log of the odds, and each input moves those log odds up or down by a fixed amount.',
      `Taking the exponent of a coefficient gives an odds ratio. In case 1, ×${c1.or.toFixed(2)} means the odds of going out are ${c1.or.toFixed(1)} times higher after a day out than after a rest day. Odds are not chances: a move from 50% to 82% is an odds ratio of about 4.6. I used it in cases 1, 4 and 5, each time with the day's outing as the outcome. Its standard version treats every day as separate evidence, which is why cases 4 and 5 also cluster the errors by week.`,
    ]],
    ['Likelihood-ratio test', [
      'A way to ask whether extra terms in a model earn their place. I fit a smaller model and a bigger one that contains it, and compare how well each explains the data, measured by the log-likelihood.',
      `If the extra terms add nothing, twice the gain in log-likelihood follows a χ² distribution, with one degree of freedom for each extra term. A large χ² means the bigger model explains the data much better than chance would allow. In case 1 the smaller model knew only yesterday and the bigger one knew the last seven days, so the test had six degrees of freedom, and it gave χ² = ${c1.lr.toFixed(1)}.`,
    ]],
    ['Runs test', [
      'A run is an unbroken stretch of the same value, such as five active days in a row followed by a rest day. The Wald–Wolfowitz runs test counts the runs in a sequence and compares the count with what a random shuffle of the same days would give.',
      `When values cluster, there are fewer and longer runs than expected. The result is a z-score: how many standard deviations the observed count sits from the expected one. My days since the comeback have ${c1.runs} runs where a shuffle would give about ${Math.round(c1.runsExp)}, a z-score of ${c1.runsZ.toFixed(1)}. The test assumes nothing about why days cluster, which makes it a plain check beside the regression in case 1.`,
    ]],
    ['Detrended fluctuation analysis', [
      'DFA measures memory over many time scales at once. The series of active and rest days is first turned into a running total of how far each day sits from the average. That total is cut into windows of a given length, a straight line is fitted inside each window, and the average distance from those lines is the fluctuation for that length.',
      `Repeating this for windows from a week to half a year, and plotting fluctuation against window length on log scales, gives a line whose slope is the exponent α. With no memory α is about 0.5. Above 0.5, good spells and quiet spells last longer than chance allows. Fitting a line inside each window removes slow trends, such as a busier year, so they do not pass as memory. My days give α = ${c1.dfa.toFixed(2)}, against ${c1.dfaShuf.toFixed(2)} for the same days shuffled 200 times.`,
    ]],
    ['Hazard model', [
      'A hazard is the chance that something ends at a given moment, given that it has lasted until then. For a streak it is the chance that tomorrow is a rest day after so many days out. For a break it is the chance that tomorrow I go out again after so many rest days.',
      `A discrete-time hazard model fits that chance with a logistic regression on how long the streak or break has lasted, here on the log of its length. A flat hazard means the past does not matter, the memoryless pattern. In case 2 the slope is ${c2.streakSlope > 0 ? '+' : ''}${c2.streakSlope.toFixed(2)} for streaks and ${c2.gapSlope.toFixed(2)} for breaks: a streak gets more likely to go on the longer it runs, and a break gets less likely to end.`,
    ]],
    ['Weibull shape', [
      'The Weibull distribution is a common model for how long things last, from machine parts to streaks of days. Its shape parameter says how the risk of ending changes with age. A shape of 1 is a constant risk, the memoryless case. Below 1 the risk falls the longer something has lasted, so the survivors get sturdier. Above 1 the risk rises with age, as with wear.',
      `A streak still running at the end of the record is counted as censored: the model knows it lasted at least that long without pretending it ended. My ${c2.nStreaks} streaks have a shape of ${c2.weibull.toFixed(2)}, with a 95% interval of ${c2.weibullLo.toFixed(2)} to ${c2.weibullHi.toFixed(2)}, below 1 all the way.`,
    ]],
    ['Changepoint detection', [
      'These methods split a series into stretches with a steady level and find the points where the level changes. Each possible split is scored by how well flat segments fit the data, plus a penalty for every extra break, so the method cannot explain everything with a hundred tiny segments.',
      'PELT (Pruned Exact Linear Time) finds the best set of breaks for a given penalty exactly, and fast. Binary segmentation works greedily: it takes the single best break, then searches each side again, and so on. Because they search in different ways, agreement between them is a good sign that a break is real. In case 3 both ran on active days per week, Sunday to Saturday, with a minimum era of eight weeks.',
    ]],
    ['CUSUM', [
      'The cumulative sum adds up, week after week, how far each week sits above or below the overall average. While weeks are below average the sum keeps falling. When they move above average it starts to climb.',
      'Its lowest point therefore marks the switch from a low period to a high one. It needs no model and no penalty, which makes it a simple outside check on the changepoint methods in case 3. It finds one switch at a time, so I used it for the biggest one, the comeback.',
    ]],
    ['Clustered errors and block bootstrap', [
      'Days in the same week are not independent: case 1 shows that one active day makes the next more likely. A test that treats every day as separate evidence then looks more certain than it should.',
      'Clustered standard errors fix this by measuring the spread from whole weeks instead of single days, which widens the error bars. The block bootstrap does the same by resampling: it draws whole weeks at random, with replacement, recomputes the result 2,000 times, and reads the 95% interval from the middle of those results. I used both in case 4, and clustered errors again in case 5, so the weekday and season results are not inflated by the habit’s own memory.',
    ]],
    ['χ² tests', [
      'A χ² test compares the counts in a table with the counts expected if there were no pattern. Each cell adds the squared gap between observed and expected, divided by expected, and the total is checked against the χ² distribution.',
      'The test of independence in case 4 used a table of weekday against active or rest. The goodness-of-fit version compares outings per weekday with an even split across the seven days. Both assume every day is a separate piece of evidence, which is why case 4 also has a clustered test.',
    ]],
    ['Harmonic regression', [
      'A way to find a yearly cycle without cutting the year into months. Each day’s place in the year is turned into the sine and the cosine of the same angle, and both enter the model as inputs. Together they can draw any smooth wave with one high point and one low point a year, and the two coefficients give the size of the wave and where its peak falls.',
      'Adding a second pair at twice the frequency allows two peaks a year, and a likelihood-ratio test says whether that helps. In case 5 the wave sat inside a logistic regression with a separate level for each year, so a busier year does not pass as a season.',
    ]],
    ['Kruskal–Wallis and Friedman', [
      'Rank tests replace each value with its rank, so a few extreme values cannot dominate. Kruskal–Wallis asks whether several groups, here the twelve months, come from the same distribution.',
      'Friedman asks the same question when the data come in blocks, here years, and compares the months only within each year, which removes the difference between busy and quiet years. Both assume very little about shape. The price is power: with only four values per month they need a large effect before they show it, which is what happened in case 5.',
    ]],
    ['Binomial test', [
      'A test for a count out of a fixed number of tries. If every treadmill run near 5 km had the same chance of ending anywhere in a window of ±560 m around the mark, the share ending within 60 m of it would be set by the width of that slice, about 10.7%.',
      `The binomial test asks how likely it is to see as many runs in that slice as I did if that were true. At 5 km, ${c6.heap[0][1]} of the ${c6.heap[0][2]} runs in the window end on the mark, against about ${Math.round(c6.heap[0][3])} expected. The test is one-sided: the claim is only about too many runs on the mark.`,
    ]],
    ['Gaussian mixture and BIC', [
      'A Gaussian mixture describes a distribution as a sum of bell curves, each with its own centre, width and weight. It is fitted by the expectation-maximisation algorithm, which goes back and forth between assigning each value to the curves and moving the curves to fit their values.',
      `BIC, the Bayesian information criterion, scores each model by its fit minus a penalty that grows with the number of curves, and the lowest BIC wins. I fitted it to the log of every distance on foot. If distances were smooth, BIC would settle on a few curves. On mine it keeps falling as curves are added, and the narrowest curve sits on ${c6.narrow[0].toFixed(2)} km with a width under 1%, which is how point masses on round numbers look to this model.`,
    ]],
    ['Theil–Sen and Kendall’s τ', [
      'The Theil–Sen estimator draws a trend line from the median of the slopes between every pair of points. One odd run changes a few of those slopes but barely moves their median, so the line resists outliers far better than ordinary least squares.',
      `Kendall’s τ is the matching test. It counts how often a later run is slower than an earlier one against how often it is quicker, and turns the balance into a number from −1 to 1. In case 7, τ = ${c7.tau.toFixed(2)} means that for about ${pc0((1 + c7.tau) / 2)} of pairs of treadmill runs from ${c7.from} to ${c7.prev}, the later run was the slower one.`,
    ]],
    ['Mann–Whitney U', [
      'A test that compares two groups by ranks. All values from both groups are ranked together, and the test asks whether one group’s ranks sit higher than chance would allow. It needs no bell-shaped data and is little moved by outliers.',
      `I used it to compare ${c7.cur} treadmill runs with ${c7.prev} runs in case 7, and in case 11 to compare how far I went the day after a long day (median ${c11.kmLong.toFixed(1)} km) with the day after an ordinary day out (median ${c11.kmOther.toFixed(1)} km).`,
    ]],
    ['Robust (HC3) errors', [
      'Ordinary regression assumes the scatter around the line is the same everywhere. Real outings rarely behave like that, and when the scatter is uneven the usual error bars come out too narrow in some places and too wide in others.',
      'HC3 is a sandwich estimator that measures the scatter point by point instead, with an extra correction for points that pull hard on the line. It changes the error bars and the p-values, never the fitted line itself. I used it for every linear regression in cases 7, 8, 9 and 12.',
    ]],
    ['Spearman ρ', [
      'Spearman’s correlation is the ordinary correlation computed on ranks. It runs from −1 to 1. Positive means the two rise together, negative means one falls as the other rises, and near 0 means no steady link.',
      `Because it uses ranks, it catches any steady rise or fall, straight or curved, and outliers cannot drive it. Its p-value tests the claim that the true value is 0. With ${c10.weeks} weeks, a ρ of about ±${c10.detect.toFixed(2)} is the smallest this record can tell apart from zero, which is the line I gave in case 10.`,
    ]],
    ['Fisher’s exact test', [
      'A test for a two-by-two table, here a long day or not against out the next day or not. It works out the exact probability of every table with the same row and column totals and asks how unusual the observed one is, without the large-sample shortcut of the χ² test.',
      `It also reports an odds ratio. In case 11, ${c11.or.toFixed(2)} means the odds of going out after a day of ${c11.km} km or more were about ${c11.or >= 1.9 && c11.or <= 2.1 ? 'twice' : `${c11.or.toFixed(1)} times`} those after an ordinary day out.`,
    ]],
  ]
}

export default function Evidence() {
  const { prev, next } = useSectionPaging('/on-trial')
  const [E, setE] = useState(null)
  useEffect(() => {
    let live = true
    fetch(`${import.meta.env.BASE_URL}data/evidence.json`).then((r) => r.json()).then((j) => { if (live) setE(j) }).catch(() => {})
    return () => { live = false }
  }, [])

  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'The Habit on Trial' }], number: '09', title: 'The Habit on Trial', prev, next }
  if (!E) return <DetailFrame {...frame} />

  const M = E.meta
  const cases = buildCases(E)
  const count = (v) => cases.filter((c) => c.verdict === v).length
  const P = count('proven'), S = count('supported'), N = count('not')
  const summary = [
    P ? `${word(P)} held up fully` : '',
    S ? `${word(S)} held up with a weaker second check` : '',
    N ? `${word(N)} did not hold up` : '',
  ].filter(Boolean)

  return (
    <DetailFrame {...frame}>
      <section className="sgrid ev-intro" aria-labelledby="ev-intro-t">
        <div className="sgrid__head">
          <Eyebrow>How I tested</Eyebrow>
          <h2 id="ev-intro-t" className="section-head__title"><Words>{tie('Twelve claims, on trial.')}</Words></h2>
        </div>
        <Reveal as="p" className="sgrid__statement">
          <span lang="sw">Haraka haraka haina baraka</span>, hurry hurry has no blessing. The other chapters say what my log shows.
          This one tries to prove it. I took twelve things I believe about my habit and tested each one against the {n0(M.n)} outings
          in my log, with more than one method for each, so that no single test decides. {cap(list(summary))}.
        </Reveal>
        <div className="ev-how">
          <div><h3>The data</h3><p>{n0(M.n)} activities from {fmtShort(M.first)} to {fmtShort(M.last)}. Most tests use the {n0(M.daysSince)} days from the comeback on {fmtDay(M.comeback)}, so the long pause does not decide the result. A day counts as active if it held any outing, and a week runs from Sunday to Saturday.</p></div>
          <div><h3>Triangulation</h3><p>Each claim gets two to four methods that rest on different assumptions: a model, a test that assumes very little, and a resampling check. A claim is only called proven when they agree.</p></div>
          <div><h3>The verdicts</h3><p><span className="ev-v ev-v--proven">Proven</span> every method agrees and the result survives correction. <span className="ev-v ev-v--supported">Supported</span> the main result holds, with a weaker second check. <span className="ev-v ev-v--not">Not proven</span> the data does not back the claim.</p></div>
        </div>
      </section>

      <hr className="rule rule--faint" />
      <section className="sgrid ev-board" aria-labelledby="ev-board-t">
        <div className="sgrid__head">
          <Eyebrow>The verdicts</Eyebrow>
          <h2 id="ev-board-t" className="section-head__title"><Words>{tie('The verdicts at a glance.')}</Words></h2>
        </div>
        <div className="ev-tbl">
          <table className="ev-board__t">
            <thead><tr><th scope="col">#</th><th scope="col">The claim</th><th scope="col">Key result</th><th scope="col">Verdict</th></tr></thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.n}>
                  <td className="ev-n">{String(c.n).padStart(2, '0')}</td>
                  <td><button type="button" className="ev-jump" onClick={() => jump(`ev-c${c.n}`)}>{c.short}</button></td>
                  <td className="ev-num">{c.key}</td>
                  <td><span className={`ev-v ev-v--${c.verdict}`}>{VLABEL[c.verdict]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {cases.map((c) => (
        <div key={c.n}>
          <hr className="rule rule--faint" />
          <Case c={c} />
        </div>
      ))}

      <hr className="rule rule--faint" />
      <section className="sgrid ev-holm" aria-labelledby="ev-holm-t">
        <div className="sgrid__head">
          <Eyebrow>How the tests were run</Eyebrow>
          <h2 id="ev-holm-t" className="section-head__title"><Words>{tie('Correcting for many tests.')}</Words></h2>
        </div>
        <Reveal as="p" className="sgrid__statement">
          These are the {E.holm.length} main tests of this chapter, before and after the Holm correction. Under them, each method I used
          is explained in full.
        </Reveal>
        <div className="ev-tbl">
          <table className="ev-board__t ev-holm__t">
            <thead><tr><th scope="col">Test</th><th scope="col">p</th><th scope="col">Holm-adjusted p</th><th scope="col">Holds at 0.05</th></tr></thead>
            <tbody>
              {E.holm.map(([name, p, pa, ok]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className="ev-num">{p < 0.001 ? sci(p, 1) : p.toFixed(3)}</td>
                  <td className="ev-num">{pa < 0.001 ? sci(pa, 1) : pa.toFixed(3)}</td>
                  <td><span className={`ev-v ev-v--${ok ? 'proven' : 'not'}`}>{ok ? 'Yes' : 'No'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="ev-k ev-gloss__k">The methods</h3>
        <div className="ev-gloss">
          {glossary(E).map(([k, ps]) => <div key={k}><h3>{k}</h3>{ps.map((t, i) => <p key={i}>{t}</p>)}</div>)}
        </div>
        <p className="ev-colophon">
          All results come from my public activity log (activities.csv) and were run in Python with scipy, statsmodels, scikit-learn,
          ruptures and lifelines. Random steps (shuffles, bootstraps, mixtures) use fixed seeds, so every number can be reproduced. The
          script runs again with every weekly update, and the verdicts above follow whatever it finds.
        </p>
      </section>
    </DetailFrame>
  )
}
