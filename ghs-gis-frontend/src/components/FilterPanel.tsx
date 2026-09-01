import { useMemo } from "react";
import type { Dataset } from "../data/dataset";
import type { FacetDef, RangeDef } from "../data/fields";
import { applyFilters, countActive, type FilterState, type RangeFilter } from "../lib/filters";
import { formatNumber } from "../lib/format";

export interface FilterPanelProps {
  data: Dataset;
  facets: FacetDef[];
  ranges: RangeDef[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

export default function FilterPanel({
  data,
  facets,
  ranges,
  filters,
  onChange,
  onReset,
}: FilterPanelProps) {
  const active = countActive(filters);

  const setFacet = (key: string, value: string, checked: boolean) => {
    const next = new Set(filters.facets[key] ?? []);
    if (checked) next.add(value);
    else next.delete(value);

    const facetsNext = { ...filters.facets };
    if (next.size === 0) delete facetsNext[key];
    else facetsNext[key] = next;
    onChange({ ...filters, facets: facetsNext });
  };

  const clearFacet = (key: string) => {
    const facetsNext = { ...filters.facets };
    delete facetsNext[key];
    onChange({ ...filters, facets: facetsNext });
  };

  const setRange = (key: string, range: RangeFilter | null) => {
    const rangesNext = { ...filters.ranges };
    if (range) rangesNext[key] = range;
    else delete rangesNext[key];
    onChange({ ...filters, ranges: rangesNext });
  };

  return (
    <aside className="panel" aria-label="Filters">
      <div className="panel__header">
        <h2 className="panel__title">Filters</h2>
        {active > 0 && <span className="badge">{active}</span>}
        <div className="header__spacer" />
        <button className="button button--ghost" onClick={onReset} disabled={active === 0}>
          Reset
        </button>
      </div>

      <div className="panel__body">
        <label className="visually-hidden" htmlFor="school-search">
          Search schools
        </label>
        <input
          id="school-search"
          className="control"
          type="search"
          placeholder="Search name, code, address…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />

        {/* Primary controls first — the ones the campaign reaches for every
            session. Everything else sits behind one disclosure so the panel
            opens short enough to scan without scrolling. */}
        {facets
          .filter((f) => f.primary)
          .map((facet) => (
            <FacetGroup
              key={facet.key}
              data={data}
              def={facet}
              filters={filters}
              selected={filters.facets[facet.key]}
              onToggle={(value, checked) => setFacet(facet.key, value, checked)}
              onClear={() => clearFacet(facet.key)}
            />
          ))}

        {ranges
          .filter((r) => r.primary)
          .map((range) => (
            <RangeFilterRow
              key={range.key}
              data={data}
              def={range}
              value={filters.ranges[range.key]}
              onChange={(next) => setRange(range.key, next)}
            />
          ))}

        <details className="filter-group" open={hasSecondaryActive(filters, facets, ranges)}>
          <summary className="filter-group__summary">More filters</summary>
          <div style={{ paddingLeft: 4 }}>
            {facets
              .filter((f) => !f.primary)
              .map((facet) => (
                <FacetGroup
                  key={facet.key}
                  data={data}
                  def={facet}
                  filters={filters}
                  selected={filters.facets[facet.key]}
                  onToggle={(value, checked) => setFacet(facet.key, value, checked)}
                  onClear={() => clearFacet(facet.key)}
                />
              ))}
            {ranges
              .filter((r) => !r.primary)
              .map((range) => (
                <RangeFilterRow
                  key={range.key}
                  data={data}
                  def={range}
                  value={filters.ranges[range.key]}
                  onChange={(next) => setRange(range.key, next)}
                />
              ))}
          </div>
        </details>
      </div>
    </aside>
  );
}

/** Keeps "More filters" open when something inside it is already filtering. */
function hasSecondaryActive(
  filters: FilterState,
  facets: FacetDef[],
  ranges: RangeDef[],
): boolean {
  return (
    facets.some((f) => !f.primary && (filters.facets[f.key]?.size ?? 0) > 0) ||
    ranges.some((r) => !r.primary && filters.ranges[r.key] !== undefined)
  );
}

interface FacetGroupProps {
  data: Dataset;
  def: FacetDef;
  filters: FilterState;
  selected: Set<string> | undefined;
  onToggle: (value: string, checked: boolean) => void;
  onClear: () => void;
}

function FacetGroup({ data, def, filters, selected, onToggle, onClear }: FacetGroupProps) {
  const values = data.categories(def.key);

  /**
   * Counts reflect every filter *except* this facet's own, so checking one box
   * doesn't zero out its siblings — the standard faceted-search behaviour.
   */
  const counts = useMemo(() => {
    const others: FilterState = { ...filters, facets: { ...filters.facets } };
    delete others.facets[def.key];

    const tally = new Map<string, number>();
    for (const i of applyFilters(data, others)) {
      const v = data.categoryAt(def.key, i);
      if (v !== null) tally.set(v, (tally.get(v) ?? 0) + 1);
    }
    return tally;
  }, [data, def.key, filters]);

  return (
    <details className="filter-group" open={def.primary || (selected?.size ?? 0) > 0}>
      <summary className="filter-group__summary">
        {def.label}
        <span className="filter-group__count">
          {selected?.size ? `${selected.size} selected` : `${values.length}`}
        </span>
      </summary>
      <div className="filter-group__options">
        {values.map((value) => (
          <label className="checkbox" key={value}>
            <input
              type="checkbox"
              checked={selected?.has(value) ?? false}
              onChange={(e) => onToggle(value, e.target.checked)}
            />
            <span className="checkbox__label" title={value}>
              {value}
            </span>
            <span className="checkbox__count">{counts.get(value) ?? 0}</span>
          </label>
        ))}
        {(selected?.size ?? 0) > 0 && (
          <button className="button button--ghost" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    </details>
  );
}

interface RangeFilterRowProps {
  data: Dataset;
  def: RangeDef;
  value: RangeFilter | undefined;
  onChange: (next: RangeFilter | null) => void;
}

function RangeFilterRow({ data, def, value, onChange }: RangeFilterRowProps) {
  const missing = useMemo(
    () => data.numeric(def.key).filter((v) => v === null).length,
    [data, def.key],
  );

  const extent = data.extent(def.key);
  if (!extent) return null;
  const [lo, hi] = extent;

  const current = value ?? { min: lo, max: hi, includeMissing: true };
  // Percentiles and shares need finer steps than enrollment counts.
  const step = hi - lo <= 2 ? 0.01 : hi - lo <= 200 ? 1 : 10;

  const update = (patch: Partial<RangeFilter>) => {
    const merged = { ...current, ...patch };
    // Dragging the max handle below the min (or vice versa) swaps them rather
    // than collapsing the range — clamping in sequence would discard the
    // handle the user just moved.
    const next = {
      ...merged,
      min: Math.min(merged.min, merged.max),
      max: Math.max(merged.min, merged.max),
    };
    const untouched = next.min <= lo && next.max >= hi && next.includeMissing;
    onChange(untouched ? null : next);
  };

  const fmt = (v: number) => formatNumber(v, def.format);

  return (
    <div className="range">
      <div className="range__head">
        <span className="range__label">{def.label}</span>
        <span className="range__value">
          {fmt(current.min)} – {fmt(current.max)}
        </span>
      </div>
      <div className="range__inputs">
        <input
          type="range"
          aria-label={`${def.label} minimum`}
          min={lo}
          max={hi}
          step={step}
          value={current.min}
          onChange={(e) => update({ min: Number(e.target.value) })}
        />
        <input
          type="range"
          aria-label={`${def.label} maximum`}
          min={lo}
          max={hi}
          step={step}
          value={current.max}
          onChange={(e) => update({ max: Number(e.target.value) })}
        />
      </div>
      {missing > 0 && (
        <label className="checkbox range__missing">
          <input
            type="checkbox"
            checked={current.includeMissing}
            onChange={(e) => update({ includeMissing: e.target.checked })}
          />
          <span className="checkbox__label">Include {missing} with no data</span>
        </label>
      )}
    </div>
  );
}
