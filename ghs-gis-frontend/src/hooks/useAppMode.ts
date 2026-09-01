import { useCallback, useEffect, useState } from "react";
import type { Dataset } from "../data/dataset";
import {
  type AppMode,
  BLANK_URL,
  initialMode,
  readUrlState,
  rowForCode,
  type UrlState,
  writeUrlState,
} from "../lib/urlState";

/**
 * Which of the app's faces is showing, and the URL that goes with it.
 *
 * The researcher view's URL is owned by `useViewState`, which writes on every
 * commit; this hook returns early for that mode rather than competing with it.
 * Exactly one mode is mounted at a time, so the two writers can never race.
 *
 * The split matters: `useViewState`'s effect always writes the selected metric,
 * so mounting it on the search screen would turn a bare URL into `?m=pctl_comb`
 * and a refresh would land the visitor in the researcher view instead.
 */
export interface AppModeApi {
  mode: AppMode;
  /** Row index of the school page's subject. Non-null exactly when mode is "school". */
  schoolIndex: number | null;
  openSchool: (index: number) => void;
  openFind: () => void;
  /** Into the researcher view, optionally selecting a school. */
  openMap: (index?: number) => void;
  /**
   * What `Dashboard` should mount with — the view the visitor left, so a round
   * trip through a school page doesn't drop their filters and camera.
   */
  mapEntry: UrlState;
}

interface ModeState {
  mode: AppMode;
  schoolIndex: number | null;
  mapEntry: UrlState;
}

function schoolUrl(data: Dataset, index: number): UrlState {
  return { ...BLANK_URL, mode: "school", selectedCode: data.value("Loc_Code", index) as string };
}

function resolve(data: Dataset, url: UrlState, mapEntry: UrlState): ModeState {
  const mode = initialMode(url);
  if (mode === "map") return { mode, schoolIndex: null, mapEntry: url };
  if (mode === "find") return { mode, schoolIndex: null, mapEntry };

  const schoolIndex = rowForCode(data, url.selectedCode);
  // A stale `?mode=school&sel=K999` must not render a school named `undefined`;
  // send it to the search screen instead.
  return schoolIndex === null
    ? { mode: "find", schoolIndex: null, mapEntry }
    : { mode: "school", schoolIndex, mapEntry };
}

export function useAppMode(data: Dataset, initial: UrlState): AppModeApi {
  const [state, setState] = useState<ModeState>(() => resolve(data, initial, BLANK_URL));

  useEffect(() => {
    // `useViewState` owns the URL while the researcher view is mounted.
    if (state.mode === "map") return;
    // The search screen writes a bare URL rather than `?mode=find`: it is the
    // default entry, `initialMode` already resolves a bare link to it, and a
    // clean address is worth something on the page most visitors land on.
    const url = state.schoolIndex === null ? BLANK_URL : schoolUrl(data, state.schoolIndex);
    window.history.replaceState(null, "", writeUrlState(url));
  }, [data, state]);

  useEffect(() => {
    const onPop = () =>
      setState((prev) => resolve(data, readUrlState(window.location.search), prev.mapEntry));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [data]);

  /**
   * A visitor who reaches a school page from a shared link and presses Back
   * expects the search screen, not to leave the site — so a mode change is the
   * one thing here that adds a history entry. Everything within a mode keeps
   * `replaceState`, so panning the map still doesn't build history.
   */
  const go = useCallback((next: ModeState, url: UrlState) => {
    window.history.pushState(null, "", writeUrlState(url));
    setState(next);
  }, []);

  // Leaving the researcher view, its URL is the snapshot: whichever hook owns
  // the current mode wrote it on the previous commit, so the codec doubles as
  // the serialization format and nothing new has to be threaded through.
  const leaving = useCallback(
    () => (state.mode === "map" ? readUrlState(window.location.search) : state.mapEntry),
    [state],
  );

  const openSchool = useCallback(
    (index: number) =>
      go(
        { mode: "school", schoolIndex: index, mapEntry: leaving() },
        schoolUrl(data, index),
      ),
    [data, go, leaving],
  );

  const openFind = useCallback(
    () => go({ mode: "find", schoolIndex: null, mapEntry: leaving() }, BLANK_URL),
    [go, leaving],
  );

  const openMap = useCallback(
    (index?: number) => {
      const base = state.mapEntry;
      const url: UrlState = {
        ...base,
        mode: null,
        selectedCode:
          index === undefined ? base.selectedCode : (data.value("Loc_Code", index) as string),
      };
      go({ mode: "map", schoolIndex: null, mapEntry: url }, url);
    },
    [data, go, state.mapEntry],
  );

  return {
    mode: state.mode,
    schoolIndex: state.schoolIndex,
    openSchool,
    openFind,
    openMap,
    mapEntry: state.mapEntry,
  };
}
