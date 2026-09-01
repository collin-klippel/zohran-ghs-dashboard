# ghs-gis-frontend

A static map dashboard over NYC school data — the ArcGIS Dashboards replacement for the
Green Healthy Schools prioritization work.

No API key, no server, no per-seat licence. It builds to plain files that any static host
can serve.

## Quick start

```bash
npm install
npm run dev          # serves on :5173
```

That is the whole setup. The data payload is committed under `public/data/`, so this repo
builds standalone — nothing outside it is needed to run, build, or deploy.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck, emit `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run check` | Typecheck, lint, and test — what CI runs |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`lint:fix` to autofix) |
| `npm run test` | Vitest once (`test:watch` to stay open) |

## Checks

`npm run check` is the one to run before pushing; `.github/workflows/ci.yml` runs the same
three steps plus a build on every pull request. Netlify deploys on push but fails nothing,
so CI is what actually guards `main`.

**Tests** cover the pure layer — classification, filtering, ranking, the URL codec, the CSV
writer, and the formatters. That is deliberate rather than partial: those modules hold the
domain rules, they are where a regression is silent, and they need no DOM, so the suite
runs in well under a second. `src/test/fixture.ts` is a six-school dataset using the real
column names; read its header before adding assertions, since the co-located pair and the
deliberate gaps in it are what most tests turn on.

**Lint** is type-aware (`recommendedTypeChecked` plus `react-hooks`), which is what makes it
worth having on top of `tsc`: it can tell the deliberate `void`-prefixed fetches from
accidentally floating promises, and it catches ref writes during render.

## Deploying

`netlify.toml` runs `npm run build` in CI and publishes `dist/`. Any static host works —
`vite.config.ts` sets `base: "./"`, so `dist/` is servable from a subpath without a rebuild.

Cache headers matter here: `assets/*` is content-hashed and cached for a year, while
`data/*` keeps stable filenames and must revalidate, or a data refresh never reaches
browsers.

## How data gets in

`public/data/` is **committed, not generated at build time**. It is produced by the upstream
data repo (`zohran-ghs-dashboard`) from `data/processed_data/`, by two scripts under
`pipelines/frontend_export/`, run there on demand:

```bash
just export-frontend-data      # from the data repo, writes into ../ghs-gis-frontend
```

Refreshing the dashboard is then a commit in this repo and a redeploy. The sections below
describe what those scripts do and why the payload looks the way it does — useful when
reading the data, and required reading before regenerating it.

### School points — `build-data.mjs` → `public/data/schools.json`

Reads the GeoJSON and writes a columnar JSON payload:

```
data/processed_data/master_schools.geojson   5.35 MB
  -> public/data/schools.json                1.33 MB   (0.32 MB gzipped)
```

The source repeats all 118 property names once per feature, which is most of its size. The
export flips it column-wise, dictionary-encodes low-cardinality strings, rounds floats to
four decimals, and drops the five columns that are null for every school (`FO1_kBtu`,
`FO56_kBtu`, `Propane`, `Kerosene`, `DistChill`).

It also derives a `Borough` column from the `Loc_Code` prefix (`K`/`M`/`Q`/`R`/`X`). The
source `City` column can't do that job — it has 67 nulls and typos like `BROOKLN`.

Because the payload is committed rather than regenerated per build, it can drift from the
join output — the trade for a repo that deploys on its own. Re-export whenever the join
changes. Even so, this is what makes automated delivery possible: one export rewrites the
whole dashboard, with none of the per-column uploads ArcGIS Online forces.

### Map overlays — `build-layers.mjs` → `public/data/layers/`

The six polygon layers total ~28 MB across 605k coordinates. They are display context, not
analysis inputs, so each is stripped to the properties the UI reads, simplified with
Douglas-Peucker, and rounded to ~1 m:

| Layer | Features | Source | Built |
| --- | --- | --- | --- |
| `dac` | 958 | 1.13 MB | 0.31 MB |
| `zohran` | 4,036 | 8.54 MB | 1.49 MB |
| `council` | 51 | 4.71 MB | 0.16 MB |
| `schooldist` | 33 | 4.04 MB | 0.15 MB |
| `assembly` | 65 | 4.87 MB | 0.18 MB |
| `senate` | 28 | 4.01 MB | 0.16 MB |

Overlays are fetched **on demand** — most sessions never open one — and the UI only offers
a layer whose source file was present at export time, per `layers/index.json`.

**Two sources are in the wrong CRS.** `city_council_districts.geojson` and
`ny_assembly_district.geojson` are still in EPSG:2263 (NAD83 / NY Long Island, US survey
feet) rather than lat/lng, with coordinates like `[1022227, 152028]`. `reproject.mjs`
converts them during the export. That implementation is checked against pyproj over an
81-point grid covering the boroughs — worst deviation 5.5e-9 m, run from the data repo:

```bash
uv run python pipelines/frontend_export/verify-reprojection.py
```

Fixing the CRS upstream in the pipeline would let that code be deleted.

## Adding a column

When the join adds a field, the export picks it up automatically — nothing to configure.
To surface it in the UI, edit [`src/data/fields.ts`](src/data/fields.ts), which is the only
place that knows what the truncated ArcGIS column names mean:

- `METRICS` — colorable/rankable numeric fields. `priority: "high" | "low"` says which end
  means "higher priority", which drives the ranked list's sort order and the legend caption.
- `FACETS` — categorical checkbox filters. `primary: true` shows it above the fold.
- `RANGES` — numeric min/max filters.
- `DETAIL_GROUPS` — the grouped field list in the detail panel, and the CSV export's columns.

If the new column is one a school can be *bad* at, add a threshold to
[`src/data/severity.ts`](src/data/severity.ts) as well — that is what marks the value in the
field list and counts it on the group header. Columns with no rule there render unmarked,
which is the right default for anything that is context rather than a shortfall.

## What it does

- **Map** — all 1,967 schools, colored by the selected metric. Click a point for the full
  record; hover for a tooltip.
- **Filters** — text search, categorical facets with live counts, numeric ranges. Facet
  counts reflect every filter *except* that facet's own, so checking one box doesn't zero
  out its siblings.
- **Priority ranking** — top 100 by the selected metric, following both the filters and
  (optionally) the current map viewport.
- **Stat tiles** — the filtered set summarised. Enrollment is deduplicated by building code,
  since schools-to-buildings is many-to-one and enrollment is a building-level figure.
- **CSV export** — the filtered set with raw (not display-formatted) values, for
  spreadsheets and VAN.
- **Overlays** — one context choropleth (DAC score, or Zohran first-round share) and one
  district boundary layer at a time. Both single-select on purpose: stacked translucent
  fills can't be read, and several outlines at once turn the map into a mesh.
- **Shareable links** — the metric, filters, overlays, selected school, and camera all live
  in the querystring, so "Copy link" reproduces exactly what's on screen. The selection is
  keyed by `Loc_Code` rather than row index, so a link survives a data rebuild.

## Design notes

- **Grading is separate from reporting, and thresholds are argued in one file.** The school
  page leads with what the building lacks, worst first, and every threshold behind that
  lives in `src/data/severity.ts` with the quantile that justifies it. Two rules there are
  worth knowing: no-A/C is graded against the citywide norm of zero (1,249 of the 1,759
  buildings with records have every classroom cooled), while ventilation is graded against
  the standard rather than the norm, because the median building has 88% of classrooms
  without both a supply and an exhaust fan. Building age, peaker-plant distance, and the raw
  DAC scores are deliberately ungraded — they describe a building's situation, not a failing
  of it — and unreported is kept visually distinct from bad, because "the DOE has not
  published this" is a finding about the city rather than about the school.

- **Basemap**: CARTO Positron / Dark Matter vector tiles via MapLibre GL JS. Both are free
  and keyless. Everything else is local.
- **Color**: a single-hue sequential ramp in five quintile classes, with mode-specific
  steps validated against the ordinal-ramp checks (monotone lightness, adjacent ΔL ≥ 0.06,
  light-end contrast ≥ 2:1). Classes are computed over the **whole** dataset, not the
  filtered subset, so a filter never repaints the schools that survive it. Schools with no
  value for the metric get a reserved gray and are never part of the ramp.
- **The hue is green**, for Green Healthy Schools — the school ramp and the UI accent run
  on the same green so the chrome and the data encoding read as one system. The context
  fills, a second sequential encoding on screen at the same time, take **blue**: green
  against orange collapses to ΔE 1.0 under protanopia, while green against blue holds at
  13.7 dark / 16.8 light. Shape carries the distinction too — round keys for school
  points, square for area fills.
- **School layers do not wait on the basemap.** They attach on `styledata` rather than
  `load`, because `isStyleLoaded()` stays false while basemap tiles are in flight — the
  school data is local and should draw immediately regardless of CARTO's latency.
- **A map failure stays in the map pane.** MapLibre throws when it can't get a WebGL
  context; an error boundary keeps the filters, ranking, and export working without it.

## Known gaps

- **15 fields that are live in ArcGIS are missing from `master_schools.geojson`**, so the
  frontend can't show them: `subway_dist`, `on_open_street`, `hurricane_evacZone`, `OHEI`,
  `evacCenters_distance_mi`, `cooling_centers_distance_mi`, `is_evac_center`, `pm25_2022`,
  `no2_2022`, `Stormwater_Flood_Risk`, `Flood_Scenario`, `Flood_Category`,
  `NY_State_Assembly_District`, `NY_State_Senate_District`, `SCHOOLDIST`. These are the
  Phase 1 parity items in the data repo's `docs/plan.md`; they need the pipeline, not the
  frontend.
- **The LL84 energy block differs numerically from ArcGIS**, not just by name. On K001,
  `eng_star` is 75 here vs `ENERGY_STAR_Score` 71 live; `water_use` is 206.6 vs 907.4.
  Different vintages, most likely. Worth resolving before the two are compared.
- Stormwater flood risk, heat exposure, subway walk-sheds, and peaker plants are processed
  in the data repo but not offered as overlays. Adding one is a row in `build-layers.mjs`
  plus a row in `src/data/layers.ts` — except stormwater, which is 49 MB and needs a harder
  simplification pass first.
- There is no composite "GHS priority score" — ranking is by whichever single metric is
  selected. Defining a weighted score is a methodology decision, not a frontend one.
- Widget-level parity with the live dashboard is unverified — this was designed from the
  data, not from a screenshot of what the campaign actually uses.
- **Components are untested.** The suite stops at the pure layer; nothing exercises the map,
  the panels, or the hooks, so a rendering regression would ship silently. That needs a DOM
  environment and a MapLibre stub.
- The bundle is ~984 KB (276 KB gzipped), nearly all MapLibre. Code-splitting would help if
  first paint on slow connections becomes a concern.
