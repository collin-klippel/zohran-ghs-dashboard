import type { MetricDef } from "../data/fields";
import { CONTEXT_RAMP_DARK, CONTEXT_RAMP_LIGHT, type ContextLayer } from "../data/layers";
import { type Classification, noDataColor, ramp } from "../lib/color";
import { formatNumber } from "../lib/format";
import type { Theme } from "../hooks/useTheme";

export interface LegendProps {
  metric: MetricDef;
  classification: Classification;
  theme: Theme;
  contextLayer: ContextLayer | null;
}

export default function Legend({ metric, classification, theme, contextLayer }: LegendProps) {
  const { bounds, missing } = classification;
  if (bounds.length === 0 && !contextLayer) return null;

  const colors = ramp(theme === "dark", bounds.length);
  const fmt = (v: number) => formatNumber(v, metric.format, metric.unit);

  return (
    <div className="legend">
      {bounds.length > 0 && (
        <>
          <div className="legend__title">Schools · {metric.label}</div>
          <div className="legend__caption">
            {/* The ramp runs light→dark on the light basemap and dark→light on
                the dark one, so the caption names the strongest step. */}
            Quintiles across all schools · {theme === "dark" ? "brightest" : "darkest"} ={" "}
            {metric.priority === "high" ? "highest" : "lowest"} value = highest priority
          </div>
          {/* Reversed so the highest-priority class reads first. */}
          {bounds
            .map((range, index) => ({ range, index }))
            .reverse()
            .map(({ range, index }) => (
              <div className="legend__row" key={index}>
                <span className="legend__swatch" style={{ background: colors[index] }} />
                <span className="legend__range">
                  {fmt(range[0])} – {fmt(range[1])}
                </span>
              </div>
            ))}
          {missing > 0 && (
            <div className="legend__row">
              <span
                className="legend__swatch"
                style={{ background: noDataColor(theme === "dark") }}
              />
              <span className="legend__range">No data ({missing})</span>
            </div>
          )}
        </>
      )}

      {contextLayer && <ContextLegend layer={contextLayer} theme={theme} />}
    </div>
  );
}

/**
 * The context fill is a second sequential encoding on screen at the same time
 * as the school points, so it takes its own hue (blue) rather than reusing the
 * schools' green.
 */
function ContextLegend({ layer, theme }: { layer: ContextLayer; theme: Theme }) {
  const colors = theme === "dark" ? CONTEXT_RAMP_DARK : CONTEXT_RAMP_LIGHT;

  // Stops are the interior breaks; render one row per class, highest first.
  const rows = colors.map((color, index) => {
    const lower = index === 0 ? null : layer.stops[index - 1];
    const upper = index === colors.length - 1 ? null : layer.stops[index];
    const label =
      lower === null
        ? `under ${layer.format(upper as number)}`
        : upper === null
          ? `${layer.format(lower)} and up`
          : `${layer.format(lower)} – ${layer.format(upper)}`;
    return { color, label };
  });

  return (
    <div className="legend__section">
      <div className="legend__title">{layer.label}</div>
      <div className="legend__caption">{layer.legendCaption}</div>
      {rows.reverse().map((row) => (
        <div className="legend__row" key={row.label}>
          <span className="legend__swatch legend__swatch--area" style={{ background: row.color }} />
          <span className="legend__range">{row.label}</span>
        </div>
      ))}
    </div>
  );
}
