import { useEffect, useMemo, useState } from "react";
import {
  BOUNDARY_LAYERS,
  type BoundaryLayer,
  CONTEXT_LAYERS,
  type ContextLayer,
} from "../data/layers";

const NONE: ReadonlySet<string> = new Set();

export interface LayerCatalog {
  /** Overlays present in this build, for the toggles. */
  contextLayers: ContextLayer[];
  boundaryLayers: BoundaryLayer[];
  /** The currently selected overlay of each kind, or null. */
  contextLayer: ContextLayer | null;
  boundaryLayer: BoundaryLayer | null;
}

/**
 * The catalog in `data/layers.ts` narrowed to the overlays whose source file
 * was actually present at build time, plus the current selection resolved
 * against it.
 *
 * `manifest` is a promise rather than a URL so the caller can start the fetch
 * at import time, in parallel with the dataset, instead of on first render.
 */
export function useLayerCatalog(
  manifest: Promise<Set<string>>,
  contextId: string | null,
  boundaryId: string | null,
): LayerCatalog {
  const [built, setBuilt] = useState<ReadonlySet<string>>(NONE);

  useEffect(() => {
    let live = true;
    void manifest.then((ids) => {
      if (live) setBuilt(ids);
    });
    return () => {
      live = false;
    };
  }, [manifest]);

  const contextLayers = useMemo(
    () => CONTEXT_LAYERS.filter((l) => built.has(l.id)),
    [built],
  );
  const boundaryLayers = useMemo(
    () => BOUNDARY_LAYERS.filter((l) => built.has(l.id)),
    [built],
  );
  const contextLayer = useMemo(
    () => contextLayers.find((l) => l.id === contextId) ?? null,
    [contextLayers, contextId],
  );
  const boundaryLayer = useMemo(
    () => boundaryLayers.find((l) => l.id === boundaryId) ?? null,
    [boundaryLayers, boundaryId],
  );

  return { contextLayers, boundaryLayers, contextLayer, boundaryLayer };
}
