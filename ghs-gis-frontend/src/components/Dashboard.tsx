import { useCallback, useMemo, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import type { Dataset } from "../data/dataset";
import { METRICS } from "../data/fields";
import { classify } from "../lib/color";
import { downloadCsv, toCsv } from "../lib/csv";
import { applyFilters, availableFacets, availableRanges, EMPTY_FILTERS } from "../lib/filters";
import { colocatedRows, rankRows } from "../lib/schools";
import type { UrlState } from "../lib/urlState";
import { useIntroSeen } from "../hooks/useIntroSeen";
import { useLayerCatalog } from "../hooks/useLayerCatalog";
import type { Theme } from "../hooks/useTheme";
import { useViewState } from "../hooks/useViewState";
import AppHeader from "./AppHeader";
import FilterPanel from "./FilterPanel";
import IntroModal from "./IntroModal";
import LayerControl from "./LayerControl";
import Legend from "./Legend";
import MapErrorBoundary from "./MapErrorBoundary";
import MapView from "./MapView";
import RankedList from "./RankedList";
import SchoolDetail from "./SchoolDetail";
import StatTiles from "./StatTiles";

export interface DashboardProps {
  data: Dataset;
  /** The link this session was opened with, resolved once at mount. */
  initialUrl: UrlState;
  /** Overlay manifest, in flight since import time. */
  manifest: Promise<Set<string>>;
  baseUrl: string;
  /** Owned by `AppShell`, since the search and school pages need it too. */
  theme: Theme;
  onToggleTheme: () => void;
  /** Back out to the school search. */
  onFindSchool: () => void;
}

/**
 * Layout and wiring for the loaded dashboard.
 *
 * Shareable state lives in `useViewState`; everything declared here is
 * session-local by design — the measured map bounds and the fly-to trigger are
 * consequences of the camera, which the link already carries.
 */
export default function Dashboard({
  data,
  initialUrl,
  manifest,
  baseUrl,
  theme,
  onToggleTheme,
  onFindSchool,
}: DashboardProps) {
  const [state, patch] = useViewState(data, initialUrl);
  const { contextLayers, boundaryLayers, contextLayer, boundaryLayer } = useLayerCatalog(
    manifest,
    state.contextId,
    state.boundaryId,
  );

  const { open: introOpen, dismiss: dismissIntro, reopen: showIntro } = useIntroSeen();

  const [bounds, setBounds] = useState<maplibregl.LngLatBounds | null>(null);
  const [flyTo, setFlyTo] = useState<{ index: number; nonce: number } | null>(null);
  const flyNonce = useRef(0);

  const metric = useMemo(
    () => METRICS.find((m) => m.key === state.metricKey) ?? METRICS[0],
    [state.metricKey],
  );
  const metrics = useMemo(() => METRICS.filter((m) => data.extent(m.key) !== null), [data]);
  const facets = useMemo(() => availableFacets(data), [data]);
  const ranges = useMemo(() => availableRanges(data), [data]);

  // Classified over the full dataset, so a filter never repaints the survivors.
  const classification = useMemo(() => classify(data.numeric(metric.key)), [data, metric.key]);

  const filtered = useMemo(() => applyFilters(data, state.filters), [data, state.filters]);
  const ranked = useMemo(
    () => rankRows(data, filtered, metric, state.restrictToViewport ? bounds : null),
    [data, filtered, metric, state.restrictToViewport, bounds],
  );
  const colocated = useMemo(
    () => (state.selected === null ? [] : colocatedRows(data, state.selected)),
    [data, state.selected],
  );

  const select = useCallback(
    (index: number | null) => {
      patch({ selected: index });
      if (index !== null) {
        flyNonce.current += 1;
        setFlyTo({ index, nonce: flyNonce.current });
      }
    },
    [patch],
  );

  const handleExport = useCallback(
    () => downloadCsv("ghs-schools-filtered.csv", toCsv(data, filtered)),
    [data, filtered],
  );

  return (
    <div className="app">
      <AppHeader
        schoolCount={data.n}
        metric={metric}
        metrics={metrics}
        onMetricChange={(metricKey) => patch({ metricKey })}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onShowIntro={showIntro}
        onFindSchool={onFindSchool}
      />

      <div className="app__body">
        <FilterPanel
          data={data}
          facets={facets}
          ranges={ranges}
          filters={state.filters}
          onChange={(filters) => patch({ filters })}
          onReset={() => patch({ filters: EMPTY_FILTERS })}
        />

        <div className="app__center">
          <MapErrorBoundary>
            <MapView
              data={data}
              rows={filtered}
              classification={classification}
              metric={metric}
              theme={theme}
              selected={state.selected}
              onSelect={select}
              onBoundsChange={setBounds}
              onViewChange={(view) => patch({ view })}
              flyTo={flyTo}
              initialView={initialUrl.view}
              contextLayer={contextLayer}
              boundaryLayer={boundaryLayer}
              baseUrl={baseUrl}
            />
            <LayerControl
              contextLayers={contextLayers}
              boundaryLayers={boundaryLayers}
              contextId={state.contextId}
              boundaryId={state.boundaryId}
              onContextChange={(contextId) => patch({ contextId })}
              onBoundaryChange={(boundaryId) => patch({ boundaryId })}
            />
            <Legend
              metric={metric}
              classification={classification}
              theme={theme}
              contextLayer={contextLayer}
            />
          </MapErrorBoundary>
        </div>

        <aside className="panel" aria-label="Results">
          {state.selected !== null ? (
            <SchoolDetail
              data={data}
              index={state.selected}
              colocated={colocated}
              onSelect={select}
              onClose={() => patch({ selected: null })}
            />
          ) : (
            <RankedList
              data={data}
              rows={ranked}
              totalFiltered={filtered.length}
              metric={metric}
              classification={classification}
              theme={theme}
              selected={state.selected}
              onSelect={select}
              restrictToViewport={state.restrictToViewport}
              onRestrictChange={(restrictToViewport) => patch({ restrictToViewport })}
              onExport={handleExport}
            />
          )}
        </aside>
      </div>

      <StatTiles data={data} rows={filtered} metric={metric} />

      <IntroModal open={introOpen} onClose={dismissIntro} schoolCount={data.n} />
    </div>
  );
}
