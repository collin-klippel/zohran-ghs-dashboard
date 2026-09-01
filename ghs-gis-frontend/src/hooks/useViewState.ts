import { useCallback, useEffect, useState } from "react";
import type { Dataset } from "../data/dataset";
import { DEFAULT_METRIC, METRICS } from "../data/fields";
import type { FilterState } from "../lib/filters";
import {
  filtersFromUrl,
  type MapPosition,
  rowForCode,
  type UrlState,
  writeUrlState,
} from "../lib/urlState";

/**
 * The slice of dashboard state a shared link has to carry.
 *
 * `ViewState` and `UrlState` are one contract seen from two sides — in-memory
 * and serialized — so the mapping between them lives here, in `fromUrl` and
 * `toUrl`. Adding a shareable dimension means editing those two functions and
 * the codec in `lib/urlState.ts`, and nothing else; state declared outside
 * this hook is deliberately not shareable.
 */
export interface ViewState {
  metricKey: string;
  filters: FilterState;
  contextId: string | null;
  boundaryId: string | null;
  /** Row index. Serialized as `Loc_Code`, which survives a rebuilt join. */
  selected: number | null;
  view: MapPosition | null;
  /** Whether the ranking is limited to the schools the camera is showing. */
  restrictToViewport: boolean;
}

/**
 * Resolved against the loaded columns, not the raw querystring — a link may
 * name a metric, filter field, or school that this build no longer has.
 */
function fromUrl(data: Dataset, url: UrlState): ViewState {
  return {
    // Checked against the catalog rather than trusted, so a retired metric
    // name doesn't sit in state colouring nothing and get written back out.
    metricKey: METRICS.find((m) => m.key === url.metric)?.key ?? DEFAULT_METRIC,
    filters: filtersFromUrl(data, url),
    contextId: url.contextLayer,
    boundaryId: url.boundaryLayer,
    selected: rowForCode(data, url.selectedCode),
    view: url.view,
    restrictToViewport: url.restrictToViewport,
  };
}

function toUrl(data: Dataset, state: ViewState): UrlState {
  return {
    // The researcher view is the unmarked mode; `useAppMode` owns the param for
    // the other two, and only one of the three is ever mounted.
    mode: null,
    metric: state.metricKey,
    search: state.filters.search,
    facets: state.filters.facets,
    ranges: state.filters.ranges,
    contextLayer: state.contextId,
    boundaryLayer: state.boundaryId,
    selectedCode:
      state.selected === null ? null : (data.value("Loc_Code", state.selected) as string),
    view: state.view,
    restrictToViewport: state.restrictToViewport,
  };
}

/**
 * Dashboard state that round-trips through the querystring.
 *
 * The URL is written with `replaceState` so the back button stays meaningful —
 * panning the map shouldn't build up history. Initial state is read from the
 * link once, at mount; later edits write back but never re-read.
 */
export function useViewState(
  data: Dataset,
  initial: UrlState,
): [ViewState, (patch: Partial<ViewState>) => void] {
  const [state, setState] = useState<ViewState>(() => fromUrl(data, initial));

  useEffect(() => {
    window.history.replaceState(null, "", writeUrlState(toUrl(data, state)));
  }, [data, state]);

  const patch = useCallback(
    (next: Partial<ViewState>) => setState((prev) => ({ ...prev, ...next })),
    [],
  );

  return [state, patch];
}
