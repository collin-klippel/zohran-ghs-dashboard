import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { Dataset } from "../data/dataset";
import { assertWebgl, BASEMAP } from "../lib/basemap";
import type { Theme } from "../hooks/useTheme";

export interface LocatorMapProps {
  data: Dataset;
  index: number;
  theme: Theme;
}

const ZOOM = 15;

/**
 * Where the school is, so a visitor can confirm they picked the right one.
 *
 * Deliberately not `MapView`: that component is filters, quintile colouring,
 * overlay caching across style swaps, and viewport reporting, none of which a
 * single pin needs. A "mini" flag would put conditionals into the most delicate
 * code in the app to save eighty lines here.
 */
export default function LocatorMap({ data, index, theme }: LocatorMapProps) {
  assertWebgl();

  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!container.current) return;

    const m = new maplibregl.Map({
      container: container.current,
      style: BASEMAP[theme],
      center: [data.lon[index], data.lat[index]],
      zoom: ZOOM,
      // The page scrolls, and a map that swallows the wheel is the classic
      // embedded-map failure. Dragging still works, and so does the zoom control.
      scrollZoom: false,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = m;

    // A marker is a DOM overlay rather than a layer, so unlike a source it
    // survives `setStyle` on a theme change with no re-attachment dance.
    marker.current = new maplibregl.Marker({ color: "#0a8708" })
      .setLngLat([data.lon[index], data.lat[index]])
      .addTo(m);

    return () => {
      marker.current?.remove();
      marker.current = null;
      m.remove();
      map.current = null;
    };
    // Theme is applied by the effect below; rebuilding the map for it would
    // throw away the visitor's pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, index]);

  useEffect(() => {
    map.current?.setStyle(BASEMAP[theme]);
  }, [theme]);

  return <div className="locator" ref={container} role="img" aria-label="Map of the school's location" />;
}
