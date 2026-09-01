import { useEffect, useRef } from "react";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";
import type { Dataset } from "../data/dataset";
import type { MetricDef } from "../data/fields";
import {
  type BoundaryLayer,
  CONTEXT_RAMP_DARK,
  CONTEXT_RAMP_LIGHT,
  type ContextLayer,
} from "../data/layers";
import { assertWebgl, BASEMAP, INITIAL_BOUNDS } from "../lib/basemap";
import { type Classification, noDataColor, ramp } from "../lib/color";
import { formatValue } from "../lib/format";
import type { Theme } from "../hooks/useTheme";

const SOURCE = "schools";
const LAYER = "schools-circles";
const LAYER_SELECTED = "schools-selected";

const SOURCE_CONTEXT = "context";
const LAYER_CONTEXT = "context-fill";
const SOURCE_BOUNDARY = "boundary";
const LAYER_BOUNDARY = "boundary-line";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export interface MapViewProps {
  data: Dataset;
  /** Row indices passing the current filters. */
  rows: number[];
  classification: Classification;
  metric: MetricDef;
  theme: Theme;
  selected: number | null;
  onSelect: (index: number | null) => void;
  /** Fires on every move so the ranked list can follow the viewport. */
  onBoundsChange: (bounds: maplibregl.LngLatBounds) => void;
  /** Fires on every move so the view can be written to the URL. */
  onViewChange: (view: { lng: number; lat: number; zoom: number }) => void;
  /** Bumping the nonce flies the map to the given row. */
  flyTo: { index: number; nonce: number } | null;
  /** Initial camera, when restored from the URL. */
  initialView: { lng: number; lat: number; zoom: number } | null;
  contextLayer: ContextLayer | null;
  boundaryLayer: BoundaryLayer | null;
  baseUrl: string;
}

function toGeoJSON(
  data: Dataset,
  rows: number[],
  classes: Int8Array,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: rows.map((i) => ({
      type: "Feature",
      id: i,
      geometry: { type: "Point", coordinates: [data.lon[i], data.lat[i]] },
      // `c` is the quintile class; `i` is the row index the UI selects by.
      properties: { i, c: classes[i] },
    })),
  };
}

/**
 * `match` on the quintile class, falling through to the no-data gray. Built
 * imperatively because the arity varies with the class count, which MapLibre's
 * tuple-typed `ExpressionSpecification` can't express.
 */
function colorExpression(classCount: number, theme: Theme): ExpressionSpecification {
  const expression: unknown[] = ["match", ["get", "c"]];
  ramp(theme === "dark", classCount).forEach((color, index) => expression.push(index, color));
  expression.push(noDataColor(theme === "dark"));
  return expression as unknown as ExpressionSpecification;
}

/** `step` over the context layer's own value stops. */
function contextColorExpression(layer: ContextLayer, theme: Theme): ExpressionSpecification {
  const colors = theme === "dark" ? CONTEXT_RAMP_DARK : CONTEXT_RAMP_LIGHT;
  const expression: unknown[] = ["step", ["coalesce", ["get", layer.valueKey], 0], colors[0]];
  layer.stops.forEach((stop, index) => expression.push(stop, colors[index + 1]));
  return expression as unknown as ExpressionSpecification;
}

const RADIUS: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  9,
  2.4,
  12,
  4.5,
  15,
  8,
  18,
  14,
];

// The selection ring sits outside the dot. It has to be its own interpolate
// expression rather than `["+", RADIUS, 5]` — a `zoom` expression is only
// valid as the direct input to a top-level step/interpolate, and wrapping it
// makes MapLibre reject the whole layer.
const RADIUS_SELECTED: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  9,
  7.4,
  12,
  9.5,
  15,
  13,
  18,
  19,
];

export default function MapView({
  data,
  rows,
  classification,
  metric,
  theme,
  selected,
  onSelect,
  onBoundsChange,
  onViewChange,
  flyTo,
  initialView,
  contextLayer,
  boundaryLayer,
  baseUrl,
}: MapViewProps) {
  assertWebgl();

  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);

  /** Fetched overlay GeoJSON, kept so re-selecting a layer is instant. */
  const overlayCache = useRef(new Map<string, GeoJSON.FeatureCollection>());

  /**
   * What each overlay source should currently hold. The fetch effect and the
   * style-load path both write through this rather than calling `setData`
   * directly: the fetch can resolve before the sources exist (on first load)
   * or after a `setStyle` has discarded them (on a theme switch), and in both
   * cases the data would otherwise be dropped on the floor.
   */
  const overlayData = useRef<{
    context: GeoJSON.FeatureCollection | null;
    boundary: GeoJSON.FeatureCollection | null;
  }>({ context: null, boundary: null });

  const syncOverlays = useRef((instance: maplibregl.Map) => {
    const context = instance.getSource<maplibregl.GeoJSONSource>(SOURCE_CONTEXT);
    context?.setData(overlayData.current.context ?? EMPTY);
    const boundary = instance.getSource<maplibregl.GeoJSONSource>(SOURCE_BOUNDARY);
    boundary?.setData(overlayData.current.boundary ?? EMPTY);
  });

  // Handlers and data change on nearly every render; the map listeners are
  // attached once, so they read the current values through refs.
  const latest = useRef({
    data,
    rows,
    classification,
    metric,
    theme,
    onSelect,
    onBoundsChange,
    onViewChange,
    contextLayer,
    boundaryLayer,
  });

  // Written in an effect rather than during render: render has to stay pure,
  // and a concurrent render that React throws away would otherwise leave the
  // ref pointing at props that were never committed. Declared before the
  // mount effect below, so effect order guarantees it is current by the time
  // the map is built.
  useEffect(() => {
    latest.current = {
      data,
      rows,
      classification,
      metric,
      theme,
      onSelect,
      onBoundsChange,
      onViewChange,
      contextLayer,
      boundaryLayer,
    };
  });

  useEffect(() => {
    if (!container.current || map.current) return;

    const instance = new maplibregl.Map({
      container: container.current,
      style: BASEMAP[latest.current.theme],
      ...(initialView
        ? { center: [initialView.lng, initialView.lat], zoom: initialView.zoom }
        : { bounds: INITIAL_BOUNDS, fitBoundsOptions: { padding: 24 } }),
      attributionControl: { compact: true },
    });
    map.current = instance;

    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    instance.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-right");

    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
      className: "map-tip",
    });

    /**
     * Re-added after every style load, since setStyle drops custom layers.
     * Order matters: context fill, then boundaries, then schools on top.
     */
    const addLayers = () => {
      const { data: d, rows: r, classification: c, theme: t } = latest.current;
      const surface = t === "dark" ? "#1a1a19" : "#fcfcfb";

      if (!instance.getSource(SOURCE_CONTEXT)) {
        instance.addSource(SOURCE_CONTEXT, { type: "geojson", data: EMPTY });
      }
      if (!instance.getLayer(LAYER_CONTEXT)) {
        instance.addLayer({
          id: LAYER_CONTEXT,
          type: "fill",
          source: SOURCE_CONTEXT,
          paint: { "fill-color": "#00000000", "fill-opacity": 0 },
        });
      }

      if (!instance.getSource(SOURCE_BOUNDARY)) {
        instance.addSource(SOURCE_BOUNDARY, { type: "geojson", data: EMPTY });
      }
      if (!instance.getLayer(LAYER_BOUNDARY)) {
        instance.addLayer({
          id: LAYER_BOUNDARY,
          type: "line",
          source: SOURCE_BOUNDARY,
          paint: {
            "line-color": t === "dark" ? "#c3c2b7" : "#52514e",
            "line-width": 1.2,
            "line-opacity": 0.75,
          },
        });
      }

      if (!instance.getSource(SOURCE)) {
        instance.addSource(SOURCE, { type: "geojson", data: toGeoJSON(d, r, c.classes) });
      }
      if (!instance.getLayer(LAYER)) {
        instance.addLayer({
          id: LAYER,
          type: "circle",
          source: SOURCE,
          paint: {
            "circle-color": colorExpression(c.bounds.length, t),
            "circle-radius": RADIUS,
            // A ring in the surface color, so overlapping points stay legible.
            "circle-stroke-width": 1.25,
            "circle-stroke-color": surface,
            "circle-opacity": 0.95,
          },
          layout: {
            // Higher classes paint last, so the priority schools stay visible
            // where points pile up.
            "circle-sort-key": ["get", "c"],
          },
        });
      }
      if (!instance.getLayer(LAYER_SELECTED)) {
        instance.addLayer({
          id: LAYER_SELECTED,
          type: "circle",
          source: SOURCE,
          filter: ["==", ["get", "i"], -1],
          paint: {
            "circle-color": "rgba(0,0,0,0)",
            "circle-radius": RADIUS_SELECTED,
            "circle-stroke-width": 2.5,
            "circle-stroke-color": t === "dark" ? "#ffffff" : "#0b0b0b",
          },
        });
      }

      applyOverlayPaint(instance, latest.current.contextLayer, latest.current.theme);
      syncOverlays.current(instance);
    };

    // `styledata` fires as soon as the style JSON is parsed, which is all
    // `addSource` needs. Deliberately NOT gated on `isStyleLoaded()` — that
    // stays false while basemap tiles, sprites, and glyphs are still in
    // flight, so gating on it means the school points wait on (or are lost
    // to) the basemap. They are local data and should draw immediately.
    // Repeat calls are cheap: the guards inside addLayers make them no-ops.
    instance.on("styledata", addLayers);
    instance.on("load", addLayers);

    // MapLibre reports bad layer specs and failed tile fetches through this
    // event rather than throwing, so without a listener they are silent.
    instance.on("error", (e) => console.error("MapLibre:", e.error ?? e));

    const emitView = () => {
      latest.current.onBoundsChange(instance.getBounds());
      const center = instance.getCenter();
      latest.current.onViewChange({
        lng: center.lng,
        lat: center.lat,
        zoom: instance.getZoom(),
      });
    };
    instance.on("moveend", emitView);
    instance.on("load", emitView);

    /**
     * One hover handler for the whole map. Schools win over polygons — the
     * points are the subject and sit on top, so a school tooltip must not be
     * pre-empted by the district underneath it.
     */
    instance.on("mousemove", (e) => {
      const canvas = instance.getCanvas();
      const { data: d, metric: m, contextLayer: ctx, boundaryLayer: bnd } = latest.current;

      const schoolHits = instance.getLayer(LAYER)
        ? instance.queryRenderedFeatures(e.point, { layers: [LAYER] })
        : [];

      if (schoolHits.length > 0) {
        const index = schoolHits[0].properties?.i as number;
        canvas.style.cursor = "pointer";
        const value = formatValue(d.value(m.key, index), m.format, m.unit);
        popup.current
          ?.setLngLat([d.lon[index], d.lat[index]])
          .setHTML(
            `<div class="map-tip__name">${escapeHtml(String(d.value("Loc_Name", index) ?? ""))}</div>` +
              `<div class="map-tip__value">${escapeHtml(m.label)}: ${escapeHtml(value)}</div>`,
          )
          .addTo(instance);
        return;
      }

      canvas.style.cursor = "";

      // Boundaries read before context fills: if both are on, the district
      // outline is the more specific thing under the cursor.
      const overlayLayers = [
        bnd && instance.getLayer(LAYER_BOUNDARY) ? ([LAYER_BOUNDARY, bnd] as const) : null,
        ctx && instance.getLayer(LAYER_CONTEXT) ? ([LAYER_CONTEXT, ctx] as const) : null,
      ].filter(Boolean) as [string, ContextLayer | BoundaryLayer][];

      for (const [layerId, definition] of overlayLayers) {
        const hits = instance.queryRenderedFeatures(e.point, { layers: [layerId] });
        if (hits.length === 0) continue;
        const text = definition.describe(hits[0].properties ?? {});
        popup.current
          ?.setLngLat(e.lngLat)
          .setHTML(`<div class="map-tip__value">${escapeHtml(text)}</div>`)
          .addTo(instance);
        return;
      }

      popup.current?.remove();
    });

    instance.on("mouseout", () => {
      instance.getCanvas().style.cursor = "";
      popup.current?.remove();
    });

    instance.on("click", (e) => {
      const hits = instance.getLayer(LAYER)
        ? instance.queryRenderedFeatures(e.point, { layers: [LAYER] })
        : [];
      const index: unknown = hits[0]?.properties?.i;
      latest.current.onSelect(typeof index === "number" ? index : null);
    });

    return () => {
      popup.current?.remove();
      instance.remove();
      map.current = null;
    };
    // Mount-only: `initialView` is an initial camera, not a live binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered rows or a new metric classification -> replace the source data.
  useEffect(() => {
    const source = map.current?.getSource<maplibregl.GeoJSONSource>(SOURCE);
    source?.setData(toGeoJSON(data, rows, classification.classes));
  }, [data, rows, classification]);

  // A different metric can produce a different number of classes (ties collapse
  // quintiles), so the color expression is rebuilt rather than reused.
  useEffect(() => {
    if (map.current?.getLayer(LAYER)) {
      map.current.setPaintProperty(
        LAYER,
        "circle-color",
        colorExpression(classification.bounds.length, theme),
      );
    }
  }, [classification, theme]);

  useEffect(() => {
    if (map.current?.getLayer(LAYER_SELECTED)) {
      map.current.setFilter(LAYER_SELECTED, ["==", ["get", "i"], selected ?? -1]);
    }
  }, [selected]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    instance.setStyle(BASEMAP[theme]);
  }, [theme]);

  // Overlay data is fetched on demand — most sessions never open one, and
  // together they are larger than the school payload.
  useEffect(() => {
    let cancelled = false;
    const instance = map.current;
    if (!instance) return;

    const load = async (
      slot: "context" | "boundary",
      layer: ContextLayer | BoundaryLayer | null,
    ): Promise<void> => {
      if (!layer) {
        overlayData.current[slot] = null;
        syncOverlays.current(instance);
        return;
      }

      let geojson = overlayCache.current.get(layer.id);
      if (!geojson) {
        try {
          const res = await fetch(`${baseUrl}data/layers/${layer.id}.geojson`);
          if (!res.ok) throw new Error(`${res.status}`);
          geojson = (await res.json()) as GeoJSON.FeatureCollection;
          overlayCache.current.set(layer.id, geojson);
        } catch (e) {
          console.error(`Could not load the ${layer.id} layer`, e);
          return;
        }
      }
      if (cancelled) return;
      overlayData.current[slot] = geojson;
      syncOverlays.current(instance);
    };

    void load("context", contextLayer);
    void load("boundary", boundaryLayer);

    return () => {
      cancelled = true;
    };
  }, [contextLayer, boundaryLayer, baseUrl, theme]);

  useEffect(() => {
    if (map.current) applyOverlayPaint(map.current, contextLayer, theme);
  }, [contextLayer, theme]);

  useEffect(() => {
    if (!flyTo || !map.current) return;
    map.current.easeTo({
      center: [data.lon[flyTo.index], data.lat[flyTo.index]],
      zoom: Math.max(map.current.getZoom(), 14),
      duration: 600,
    });
  }, [flyTo, data]);

  return <div ref={container} className="map" role="application" aria-label="Map of NYC schools" />;
}

/** Fill paint depends on which context layer is active, so it is set separately. */
function applyOverlayPaint(
  instance: maplibregl.Map,
  contextLayer: ContextLayer | null,
  theme: Theme,
): void {
  if (!instance.getLayer(LAYER_CONTEXT)) return;

  if (!contextLayer) {
    instance.setPaintProperty(LAYER_CONTEXT, "fill-opacity", 0);
    return;
  }
  instance.setPaintProperty(
    LAYER_CONTEXT,
    "fill-color",
    contextColorExpression(contextLayer, theme),
  );
  // Polygons with no value stay unpainted rather than being shaded as zero.
  instance.setPaintProperty(LAYER_CONTEXT, "fill-opacity", [
    "case",
    ["==", ["get", contextLayer.valueKey], null],
    0,
    0.55,
  ] as unknown);

  if (instance.getLayer(LAYER_BOUNDARY)) {
    instance.setPaintProperty(
      LAYER_BOUNDARY,
      "line-color",
      theme === "dark" ? "#c3c2b7" : "#52514e",
    );
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
