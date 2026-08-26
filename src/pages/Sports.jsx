import DetailFrame from '../components/DetailFrame.jsx'
import Figure from '../charts/Figure.jsx'
import SmallMultiples from '../charts/SmallMultiples.jsx'
import ProportionBar from '../charts/ProportionBar.jsx'
import BarChart from '../charts/BarChart.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { slugify, prettySport } from '../lib/slug.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

// Fold a sorted list to top-N named slices plus a single "Other" remainder.
function topWithOther(rows, valueOf, labelOf, n = 5) {
  const top = rows.slice(0, n)
  const rest = rows.slice(n)
  const segs = top.map((r) => ({ label: labelOf(r), value: valueOf(r) }))
  if (rest.length) {
    segs.push({ label: `Other (${rest.length} sports)`, value: rest.reduce((a, r) => a + valueOf(r), 0) })
  }
  return segs
}

export default function Sports() {
  const sports = useTable('sport_breakdown')
  const activities = useTable('activities')
  const { prev, next } = useSectionPaging('/sports')

  const years = [...new Set(activities.map((a) => a.year).filter(Boolean))].sort()
  const topSports = [...sports]
    .filter((s) => toNum(s.distance_km) > 0)
    .sort((a, b) => toNum(b.distance_km) - toNum(a.distance_km))
    .slice(0, 6)
  const series = topSports.map((s) => {
    const byYear = Object.fromEntries(years.map((y) => [y, 0]))
    for (const a of activities) {
      if (a.sport_type === s.sport && a.year) byYear[a.year] += toNum(a.distance_km) || 0
    }
    return {
      name: prettySport(s.sport),
      sub: `${fmtNum(s.distance_km, 0)} km total`,
      points: years.map((y) => ({ x: Number(y), y: byYear[y] })),
    }
  })

  const topSport = sports[0] || {}

  const distSorted = [...sports]
    .filter((s) => toNum(s.distance_km) > 0)
    .sort((a, b) => toNum(b.distance_km) - toNum(a.distance_km))
  const actSorted = [...sports].sort((a, b) => toNum(b.activities) - toNum(a.activities))

  // composition (mix) segments
  const distMix = topWithOther(distSorted, (s) => toNum(s.distance_km), (s) => prettySport(s.sport))
    .map((s) => ({ ...s, display: fmtNum(s.value, 0) }))
  const actMix = topWithOther(actSorted, (s) => toNum(s.activities), (s) => prettySport(s.sport))
    .map((s) => ({ ...s, display: fmtInt(s.value) }))

  // ranked detail (top 8 each; the long tail lives on each sport's own page)
  const byDistance = distSorted.slice(0, 8).map((s) => ({
    label: prettySport(s.sport),
    value: toNum(s.distance_km),
    display: fmtNum(s.distance_km, 0),
    unit: 'km',
    sub: `· ${fmtInt(s.activities)} acts`,
    to: `/sports/${slugify(s.sport)}`,
  }))
  const byActivities = actSorted.slice(0, 8).map((s) => ({
    label: prettySport(s.sport),
    value: toNum(s.activities),
    display: fmtInt(s.activities),
    to: `/sports/${slugify(s.sport)}`,
  }))

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Sports' }]}
      number="03"
      title="Sports"
      subtitle="What the training is actually made of"
      lede={`${sports.length} sport types in all, but it leans heavily on foot: ${prettySport(
        topSport.sport
      ).toLowerCase()} is the single biggest chunk. Pick any sport for its own totals, trend and best days.`}
      prev={prev}
      next={next}
    >
      {/* The mix, in one glance */}
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--2">
          <Figure
            title="Share of distance"
            note="Where the kilometres come from. Walking and running dominate the ground covered."
            source="Overview"
            columns={['Sport', 'km']}
            rows={distMix.map((s) => [s.label, s.display])}
          >
            <ProportionBar segments={distMix} unit="km" />
          </Figure>
          <Figure
            title="Share of activities"
            note="Where the sessions go. By count the order shifts: short walks and workouts add up."
            source="Overview"
            columns={['Sport', 'activities']}
            rows={actMix.map((s) => [s.label, s.display])}
          >
            <ProportionBar segments={actMix} unit="acts" />
          </Figure>
        </div>
      </section>

      {/* Trend per sport */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="Distance by year, top six sports"
          note="Every panel is on the same scale, so you can compare them directly: plenty of road riding early on, then walking and running take over, and trail running shows up later."
          source="Activity Log"
          tableCaption="Distance in km by sport and year"
          columns={['Sport', ...years]}
          rows={series.map((s) => [s.name, ...s.points.map((p) => String(Math.round(p.y)))])}
        >
          <SmallMultiples series={series} />
        </Figure>
      </section>

      {/* Ranked detail, side by side */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <Figure
            title="Most distance"
            note="Top eight sports by kilometres. Tap any for its own page."
            source="Overview"
            columns={['Sport', 'km', 'Activities']}
            rows={byDistance.map((d) => [d.label, d.display, ''])}
          >
            <BarChart data={byDistance} showRank />
          </Figure>
          <Figure
            title="Most activities"
            note="Top eight sports by number of sessions logged."
            source="Overview"
            columns={['Sport', 'Activities']}
            rows={byActivities.map((d) => [d.label, d.display])}
          >
            <BarChart data={byActivities} showRank />
          </Figure>
        </div>
      </section>
    </DetailFrame>
  )
}
