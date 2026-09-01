import type { MetricDef } from "../data/fields";
import type { Theme } from "../hooks/useTheme";
import CopyLinkButton from "./CopyLinkButton";

export interface AppHeaderProps {
  schoolCount: number;
  metric: MetricDef;
  /** Metrics the loaded data actually has values for. */
  metrics: MetricDef[];
  onMetricChange: (key: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  /** Reopens the intro, which most visitors have already dismissed for good. */
  onShowIntro: () => void;
  /** Back to the school search. */
  onFindSchool: () => void;
}

export default function AppHeader({
  schoolCount,
  metric,
  metrics,
  onMetricChange,
  theme,
  onToggleTheme,
  onShowIntro,
  onFindSchool,
}: AppHeaderProps) {
  return (
    <header className="header">
      <div>
        <h1 className="header__title">Green Healthy Schools</h1>
        <p className="header__subtitle">
          NYC school prioritization &amp; canvassing map · {schoolCount.toLocaleString()} schools
        </p>
      </div>

      <div className="header__spacer" />

      <div className="header__metric">
        <label htmlFor="metric">Color &amp; rank by</label>
        <select
          id="metric"
          className="control"
          value={metric.key}
          onChange={(e) => onMetricChange(e.target.value)}
        >
          {metrics.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <button className="button" onClick={onFindSchool}>
        Find a school
      </button>

      <button className="button" onClick={onShowIntro}>
        About
      </button>

      <CopyLinkButton />

      <button
        className="button"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>
    </header>
  );
}
