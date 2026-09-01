import type { Dataset } from "../data/dataset";
import type { MetricDef } from "../data/fields";
import { type Classification, noDataColor, ramp } from "../lib/color";
import { formatValue, pluralize } from "../lib/format";
import type { Theme } from "../hooks/useTheme";

export interface RankedListProps {
  data: Dataset;
  /** Already sorted by the metric, highest priority first. */
  rows: number[];
  totalFiltered: number;
  metric: MetricDef;
  classification: Classification;
  theme: Theme;
  selected: number | null;
  onSelect: (index: number) => void;
  restrictToViewport: boolean;
  onRestrictChange: (value: boolean) => void;
  onExport: () => void;
}

const LIMIT = 100;

export default function RankedList({
  data,
  rows,
  totalFiltered,
  metric,
  classification,
  theme,
  selected,
  onSelect,
  restrictToViewport,
  onRestrictChange,
  onExport,
}: RankedListProps) {
  const colors = ramp(theme === "dark", classification.bounds.length);
  const gray = noDataColor(theme === "dark");
  const shown = rows.slice(0, LIMIT);

  return (
    <>
      <div className="panel__header">
        <h2 className="panel__title">Priority ranking</h2>
        <div className="header__spacer" />
        <button className="button button--ghost" onClick={onExport} disabled={totalFiltered === 0}>
          Export CSV
        </button>
      </div>

      <div className="panel__body" style={{ paddingBottom: 4 }}>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={restrictToViewport}
            onChange={(e) => onRestrictChange(e.target.checked)}
          />
          <span className="checkbox__label">Only schools in the current map view</span>
        </label>
        <div className="ranked__meta" style={{ marginTop: 4 }}>
          Ranked by {metric.label} ({metric.priority === "high" ? "highest" : "lowest"} first).{" "}
          {pluralize(rows.length, "school")} listed
          {rows.length > LIMIT ? `, showing the top ${LIMIT}` : ""}.
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="empty">No schools match the current filters.</p>
      ) : (
        <table className="ranked">
          <caption className="visually-hidden">
            Schools ranked by {metric.label}, highest priority first
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">School</th>
              <th scope="col">{metric.label}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i, rank) => {
              const klass = classification.classes[i];
              return (
                <tr
                  key={i}
                  aria-selected={selected === i}
                  onClick={() => onSelect(i)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(i);
                    }
                  }}
                >
                  <td className="ranked__rank">{rank + 1}</td>
                  <td>
                    <div className="ranked__name">
                      <span
                        className="ranked__swatch"
                        style={{ background: klass >= 0 ? colors[klass] : gray }}
                      />
                      <span>{String(data.value("Loc_Name", i) ?? "Unnamed school")}</span>
                    </div>
                    <div className="ranked__meta">
                      {[data.value("Borough", i), `District ${data.value("CounDist", i) ?? "—"}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="ranked__value">
                    {formatValue(data.value(metric.key, i), metric.format, metric.unit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
