# DATA_NOTES.md

Provenance, confidence and known gaps for every CSV in `/public/data`.
The CSVs are the single source of truth for the site. No figure was invented; where a
value was unavailable it was left blank and logged here.

Generated for Phase 1 of the "my-strava-journey" build.
Coverage: 2019-08-17 through 2026-08-24 (1,996 activities). Workbook last refreshed 2026-08-25.

---

## 1. Sources

- **Workbook**: `strava_deep_dive.xlsx` (9 sheets). All per-sheet figures were read directly
  with `openpyxl`. `source_page` on each row names the sheet the value came from.
- **Strava API (GPS)**: activity start coordinates, pulled via the connected Strava MCP
  (`list_activities`, `include_polyline=true`, 20 pages of 100, cursor-paginated). Used only
  for the geographic files. `source_page` = "Strava GPS ...".
- **Authored** (my text, not from the source): glossary definitions and the site navigation
  structure. Marked `source_page = authored`. No numeric claims are authored.

Reproduce with: `scripts/extract_workbook.py` → `scripts/build_geo.py` →
`scripts/build_derived.py` → `scripts/validate.py`.

---

## 2. File inventory & confidence

| File | Source | Confidence | Notes |
|---|---|---|---|
| activities.csv | Activity Log | High | Full 1,996-row log, verbatim. `None` cells blanked. |
| lifetime_totals.csv | Overview | High | 10 headline figures. |
| sport_breakdown.csv | Overview | High | 15 sports; sums to 1,996 activities. |
| yearly_totals.csv | Yearly Trends | High | 2019 & 2026 are partial years (see §4). |
| yearly_by_sport.csv | Yearly Trends | High | Long format; zero-distance cells dropped. |
| monthly_totals.csv | Monthly Trends | High | Only months with activity appear. |
| pr_longest / pr_elevation.csv | Personal Records | High | Top-10 tables. |
| pr_activities.csv | Personal Records | High | 120 activities with PR count > 0. |
| hr_zones / power_zones / pace_zones.csv | Zones & Effort | High | Zone **boundaries** only (see §3). |
| relative_effort_by_year.csv | Zones & Effort | High | |
| gear.csv | Gear | High | Two distance columns differ by design (see §3). |
| fun_journey / weekday / time_of_day / indoor_outdoor / streaks / kudos_leaderboard / most_repeated_titles.csv | Fun Stats | High | |
| meta.csv | Notes | High | Coverage, units, refresh cadence. |
| comparisons.csv | Yearly Trends, Zones & Effort | High (derived) | 2019→2026 then/now; every value traces to a sheet. |
| timeline.csv | Activity Log, Personal Records, Fun Stats, Strava GPS | Mixed | Milestone dates computed from the ordered log; travel dates from GPS (see §5). |
| activity_geo.csv | Strava GPS + geocoding | Medium–High | Per-activity country/region; 880 have no GPS (see §5). |
| countries.csv | Strava GPS + point-in-polygon | Medium–High | 7 countries; border caveats in §5. |
| tanzania_regions.csv | Strava GPS + nearest TZ city | Medium–High | 17 regions; see §5. |
| nav_index.csv | authored | n/a | Site structure, no figures. |
| glossary.csv | authored | n/a | Standard Strava term definitions. |

---

## 3. Known gaps (value genuinely unavailable — left blank, not invented)

- **Time-in-zone**: the workbook gives only the **boundaries** of HR, power and pace zones,
  not how much time was spent in each. A "time per zone" chart is therefore not possible from
  this data and is not attempted.
- **Calories = 0**: some sports carry zero calories in the source (Sail, Canoeing, and the
  distance-less Workout / PhysicalTherapy / Crossfit entries). Strava did not record them;
  shown as 0 / blank, not estimated.
- **Cadence**: absent (`None`) on many early-2019/2020 activities and non-foot sports; blanked.
- **Gear distance**: `strava_total_km` is Strava's lifetime odometer for the item and can
  exceed `distance_in_log_km` (this account's logged distance) because it may include
  activities from before the earliest pulled activity or from unlinked sources. Both kept.

---

## 4. Ambiguities & framing

- **Partial years**: 2019 covers Aug–Dec (a 27-activity debut) and 2026 covers Jan–Aug
  (ongoing). `comparisons.csv` labels both explicitly ("2019 (Aug-Dec)", "2026 (Jan-Aug)")
  so the then/now bars are not read as full-year-to-full-year.
- **Static vs live tabs**: per the workbook's own Notes, the Personal Records list, streaks
  and top-title counts are static extracts recomputed on each weekly rebuild; everything else
  is formula-driven. Extracted as-is at the 2026-08-25 refresh.

---

## 5. Geographic method & its limits (read before trusting country/region counts)

**How it was built.** Each activity's GPS **start point** was decoded from its Strava route
polyline. Country was assigned by **point-in-polygon** against Natural Earth admin-0
boundaries (offline). For points inside Tanzania, region (admin-1) was assigned by the
**nearest Tanzanian town** in the GeoNames cities1000 dataset. An activity is attributed
wholly to the region/country of its start point (a route crossing a boundary counts where it
began — standard practice, stated here).

**Result.** 7 countries — Tanzania 1,043, Kenya 32, Malawi 23, South Africa 13,
Saudi Arabia 2, Rwanda 2, United Kingdom 1 — and 17 Tanzanian regions
(Dodoma, Kilimanjaro, Dar es Salaam, Morogoro, Iringa, Arusha, Pwani, Zanzibar,
Manyara, Mbeya, Mara, Mwanza, Njombe, Tanga, Rukwa, Singida).

**Limits, logged honestly:**
- **880 of 1,996 activities have no GPS** (indoor/trainer sessions, or GPS off). They cannot
  be placed and are bucketed as **"Indoor / no GPS"** in `countries.csv`; they are excluded
  from `tanzania_regions.csv`. So the geographic totals describe the **1,116 GPS activities**,
  not all 1,996.
- **Border precision**: Natural Earth admin-0 is 110 m resolution and the Tanzanian countryside
  is sparsely represented in the cities dataset, so activities that start within ~2 km of an
  international border can be attributed to the neighbouring country. `activity_geo.csv` carries
  an `interior` flag (1 = confidently inland, 0 = within 2 km of another country). 161 GPS
  activities are border-margin; of the foreign ones, 8 are the coastal Kenya/Tanzania border
  cluster (~-3.97, 39.75).
- **One notable edge case**: the 2020-07-07 121 km ride starts near the Amboseli/Longido
  border. Both the polygon test and the nearest-town test place it in Kenya, so it is counted
  there and listed as the first Kenya activity, but at this resolution a Tanzania start cannot
  be ruled out. Flagged for your eye.
- Every other foreign country resolves to a clearly interior city (Nairobi/Mombasa/Maasai Mara,
  Lilongwe, Johannesburg/Sandton, Kigali, Riyadh, Oxford) and is high-confidence.

---

## 6. Validation performed (Phase 1 DoD)

- All 28 CSVs parse; every row has the header's column count (no ragged rows); cells with
  commas are quoted (Python `csv` writer).
- Every numeric/data file carries `source_page` on **every** row (0 blanks).
- Totals reconcile: `activities.csv` rows, and the activity sums of sport_breakdown,
  yearly_totals, countries, weekday, time-of-day and indoor/outdoor all equal **1,996**.
- 10 values spot-checked against the workbook (Walk 831; Run 8,083.4 km; 2026 = 258
  activities; longest ride 121.344 km; highest climb 1,979.1 m; lifetime 1,996; longest streak
  239 days; top kudos 125; top title "Evening Walk"; 11.69 Everests) — all match.

Run `scripts/validate.py` to re-check.
