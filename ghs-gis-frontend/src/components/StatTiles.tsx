import { useMemo } from "react";
import type { Dataset } from "../data/dataset";
import type { MetricDef } from "../data/fields";
import { formatCompact, formatNumber, formatValue, NO_DATA } from "../lib/format";

export interface StatTilesProps {
  data: Dataset;
  /** Rows passing the filters — the scope every tile describes. */
  rows: number[];
  metric: MetricDef;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function StatTiles({ data, rows, metric }: StatTilesProps) {
  const stats = useMemo(() => {
    const metricValues: number[] = [];
    const zohran: number[] = [];
    const buildings = new Set<string>();
    let inDac = 0;
    let dacKnown = 0;
    let enrollment = 0;
    let enrollmentKnown = false;
    const countedBuildings = new Set<string>();

    for (const i of rows) {
      const m = data.numeric(metric.key)[i];
      if (m !== null) metricValues.push(m);

      const z = data.numeric("ZohrPrimR1")[i];
      if (z !== null) zohran.push(z);

      const dac = data.value("in_dac", i);
      if (typeof dac === "boolean") {
        dacKnown++;
        if (dac) inDac++;
      }

      const bldg = data.value("Bldg_Code", i);
      if (typeof bldg === "string") {
        buildings.add(bldg);
        // Enrollment is a building-level figure, so co-located schools would
        // double-count it.
        if (!countedBuildings.has(bldg)) {
          countedBuildings.add(bldg);
          const enrl = data.numeric("Bldg_Enrl")[i];
          if (enrl !== null) {
            enrollment += enrl;
            enrollmentKnown = true;
          }
        }
      }
    }

    return {
      buildings: buildings.size,
      metricMedian: median(metricValues),
      metricKnown: metricValues.length,
      zohranMedian: median(zohran),
      dacShare: dacKnown > 0 ? inDac / dacKnown : null,
      inDac,
      enrollment: enrollmentKnown ? enrollment : null,
    };
  }, [data, rows, metric.key]);

  return (
    <div className="stats">
      <Tile
        label="Schools shown"
        value={formatCompact(rows.length)}
        note={`in ${formatCompact(stats.buildings)} buildings`}
      />
      <Tile
        label="Students in those buildings"
        value={stats.enrollment === null ? NO_DATA : formatCompact(stats.enrollment)}
        note="building enrollment, deduplicated"
      />
      <Tile
        label="In a Disadvantaged Community"
        value={stats.dacShare === null ? NO_DATA : `${Math.round(stats.dacShare * 100)}%`}
        note={`${formatCompact(stats.inDac)} schools`}
      />
      <Tile
        label={`Median ${metric.label}`}
        value={
          stats.metricMedian === null
            ? NO_DATA
            : formatNumber(stats.metricMedian, metric.format, metric.unit)
        }
        note={`${formatCompact(stats.metricKnown)} with data`}
      />
      {/* Skipped when Zohran share is itself the selected metric — the tile
          above already shows it, and two identical figures read as an error. */}
      {metric.key !== "ZohrPrimR1" && (
        <Tile
          label="Median Zohran first-round share"
          value={
            stats.zohranMedian === null ? NO_DATA : formatValue(stats.zohranMedian, "percent01")
          }
          note="June 2025 mayoral primary"
        />
      )}
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat">
      <div className="stat__label" title={label}>
        {label}
      </div>
      <div className="stat__value">{value}</div>
      <div className="stat__note">{note}</div>
    </div>
  );
}
