# My Strava Journey

Seven years of Strava activity, turned into a website anyone can read.

**Live site:** https://hpgerald.github.io/my-strava-journey/

This is a static, data-driven explainer built from a personal Strava export: **2,000 activities** logged between August 2019 and August 2026, across running, walking, trail running, hiking, cycling and a few other sports, mostly around Tanzania with the occasional trip abroad. Every chart and figure on the site traces back to a CSV in `public/data/`, and the whole thing rebuilds from a fresh export each week.

---

## Contents

- [Highlights](#highlights)
- [What's on the site](#whats-on-the-site)
- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Building and deploying](#building-and-deploying)
- [Updating the data](#updating-the-data)
- [Design and accessibility](#design-and-accessibility)
- [Data and methodology](#data-and-methodology)
- [Contact](#contact)
- [Disclaimer and licence](#disclaimer-and-licence)

---

## Highlights

At the last refresh the record covered:

| Metric | Value |
| --- | --- |
| Activities | 2,000 |
| Distance | 15,674 km |
| Moving time | 2,299 hours |
| Elevation gained | 103,524 m (about 9.4 times Everest, on foot alone) |
| Kudos received | 70,831 |
| Longest active streak | 243 days, still going |
| Countries | 7 |
| Tanzanian regions | 17 |
| Coverage | 2019-08-17 to 2026-08-28 |

## What's on the site

The site is organised as nine numbered sections plus supporting pages. Each section reads on its own and links to the next.

| # | Section | What it shows |
| --- | --- | --- |
| 01 | **The Journey** (home) | The headline totals, an animated count-up, one dot for every activity, and a first look at the patterns. |
| 02 | **By the Numbers** | The debut half-year of 2019 against the latest year, side by side, across volume, effort, terrain and recognition. |
| 03 | **Sports** | What the training is actually made of, plus a deep dive into the foot data: pace and distance spreads, the treadmill-to-road shift, steepness, time of day and weekend trails. |
| 04 | **Records** | The far edges: the longest run, the biggest climb, the streak, the total climb drawn as a stack of Everests, and the road to 10,000 km. |
| 05 | **Where** | Choropleth maps of the countries and Tanzanian regions the activities started in, worked out from each activity's GPS start point. |
| 06 | **Rhythm** | When the training happens: a consistency calendar, a weekday-by-time-of-day heatmap, effort and cadence by year, and training zones. |
| 07 | **Gear** | Eleven pairs of shoes as a rotation timeline, how far each carried, road-versus-trail use, and lifetime odometer against logged distance. |
| 08 | **Timeline** | The story in order: milestones, records and international debuts. |
| 09 | **What It Means** | The numbers read back as an athlete would read them, for different training goals. |

Supporting pages: **About** (method, limits and contact), **Data** (every source table documented), and per-item detail pages for individual sports and places.

## Tech stack

- **[React 18](https://react.dev/)** with **[Vite 5](https://vitejs.dev/)** for the build.
- **[React Router 6](https://reactrouter.com/)** using `HashRouter`, so deep links such as `.../#/where` work on GitHub Pages with no server configuration.
- **[PapaParse](https://www.papaparse.com/)** to read the CSV data at runtime.
- Self-hosted fonts via **[Fontsource](https://fontsource.org/)**: Archivo (display) and Inter (body).
- **No charting library.** Every visualisation is hand-built with inline SVG and HTML/CSS, which keeps the bundle small and the styling consistent.
- Data pipeline scripts in **Python** (pandas-free, standard library plus GeoPandas/Shapely for the geo pass).

## How it works

The site never talks to the Strava API at runtime. Instead there is a one-way pipeline:

```
Strava export (raw CSV)
        │
        ▼
  Python build scripts  ──►  public/data/*.csv   ──►  React app reads CSVs in the browser
        │                     (single source of truth)
        └── geo pass: GPS start points ─► point-in-polygon (Natural Earth) ─► country / region
```

1. A raw activity export (and, for the map, the GPS start points pulled from the Strava API) goes into the build scripts under `scripts/`.
2. Those scripts produce roughly thirty small CSVs in `public/data/`: the full activity log plus pre-aggregated tables (yearly and monthly totals, sport breakdown, records, zones, gear, geography and more).
3. The React app loads those CSVs in the browser and renders every page from them. No figure is hard-coded; change a CSV and the site changes.

This means the site is completely static and hostable anywhere, while every number remains traceable to its source table (documented on the in-site **Data** page).

## Project structure

```
my-strava-journey/
├── index.html              # SEO head: title, meta, Open Graph, JSON-LD
├── public/
│   ├── data/               # ~30 CSVs, the single source of truth
│   ├── *.geojson           # Africa and Tanzania boundaries for the maps
│   ├── og.png, favicon.svg
│   ├── robots.txt, sitemap.xml
├── src/
│   ├── pages/              # one file per section (Home, Sports, Records, Where, ...)
│   ├── charts/             # ~25 hand-built SVG/HTML chart components
│   ├── components/         # Nav, Footer, DetailFrame, Layout, DataTable, StatCard, ...
│   ├── context/            # DataContext: loads and caches the CSVs
│   ├── lib/                # formatting and helper utilities
│   └── styles/             # design tokens and component CSS
├── scripts/                # Python data pipeline + audit scripts (not deployed)
└── .github/workflows/      # GitHub Actions deploy to Pages
```

The custom chart components include an area line, columns, calendar heatmap, weekday matrix, small multiples, choropleth, scatter, dumbbell, ranked bars, proportion bars, radial clock, a stack of Everests, a distance-milestone ladder, a shoe rotation timeline, and more.

## Getting started

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
# install dependencies
npm install

# start the dev server (hot reload)
npm run dev

# build for production into dist/
npm run build

# preview the production build locally
npm run preview
```

Open the URL the dev server prints (usually http://localhost:5173).

## Building and deploying

The repository ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and publishes to GitHub Pages on every push to `main`. There is no need to build locally to deploy.

**One-time setup:** in the repository, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**. After the first push, the Action publishes the site to the URL above.

**To publish an update:**

```bash
git add .
git commit -m "Update"
git push
```

The Action redeploys automatically, usually within a minute or two.

The project is already configured for Pages: Vite uses `base: './'` for relative asset paths, and the app uses `HashRouter` so every route resolves without server rewrites.

## Updating the data

Because the site is data-driven, a refresh is mostly a data swap:

1. Regenerate the CSVs in `public/data/` from a new Strava export using the scripts in `scripts/`.
2. Set `STRAVA_SOURCE` to the private workbook path before running `python scripts/extract_workbook.py`. The geo pass additionally reads `STRAVA_GEO_RAW` and `STRAVA_CITIES`; all scripts default their output to `public/data/` and can be redirected with `STRAVA_OUTPUT`.
3. Run `npm run sanitize:data` to remove activity titles, Strava identifiers, exact timestamps and precise GPS coordinates from the public files.
4. Run `npm run check`, then commit and push. The Action rebuilds and redeploys.

The pipeline is incremental where it matters, so existing figures stay stable and only the rows a new export touches are recomputed.

## Design and accessibility

- **Visual language:** a Swiss neo-grotesque system, Archivo for display and Inter for body, on an off-white ground with a single accent (Strava orange) over a grey scale.
- **Responsive:** a single-row navigation on wide screens that collapses to a hamburger menu on tablets and phones; every chart reflows and no page scrolls sideways at mobile widths.
- **Accessible:** the site is checked against WCAG 2 A and AA with [axe-core](https://github.com/dequelabs/axe-core) and carries zero violations. Every chart is paired with a visually hidden data table, so the content is fully readable as text and to screen readers.

## Data and methodology

- Figures are shown as logged on Strava. Distances, times and elevation come straight from the activities.
- Country and region breakdowns are derived from each activity's GPS start point, using point-in-polygon against Natural Earth boundaries for the country and the nearest Tanzanian city for the region. These are approximate within a couple of kilometres of an international border, and indoor or trainer sessions carry no GPS and are counted separately.
- Gear odometers are Strava's own lifetime totals and may include distance from before this record's earliest pulled activity.
- Full method notes, confidence levels and known gaps are documented on the in-site **Data** page. Public data is deliberately minimised: it contains daily-level activity metrics and country/region assignments, never titles, Strava IDs, city names or coordinates.

## Contact

Built by Gerald.

- **Strava:** https://www.strava.com/athletes/gtesha
- **Email:** hpgerald@gmail.com
- **Phone:** +255 763 453 400
- **LinkedIn:** https://www.linkedin.com/in/gtesha/
- **GitHub:** https://github.com/hpgerald

## Disclaimer and licence

This is a personal project for interest's sake, not coaching, medical or training advice. Strava is a trademark of Strava, Inc.; this site is not affiliated with or endorsed by Strava.

The activity data is personal and is shown for reference rather than offered for reuse. The site code is available for anyone who wants to see how it is put together.
