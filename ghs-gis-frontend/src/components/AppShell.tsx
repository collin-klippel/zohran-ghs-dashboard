import { useMemo } from "react";
import type { Dataset } from "../data/dataset";
import { buildSearchIndex } from "../lib/searchIndex";
import type { UrlState } from "../lib/urlState";
import { useAppMode } from "../hooks/useAppMode";
import { useTheme } from "../hooks/useTheme";
import Dashboard from "./Dashboard";
import FindSchool from "./FindSchool";
import SchoolPage from "./SchoolPage";

export interface AppShellProps {
  data: Dataset;
  initialUrl: UrlState;
  manifest: Promise<Set<string>>;
  baseUrl: string;
}

/**
 * The app's two front doors.
 *
 * Most visitors are looking up one school, so the search screen is the default
 * entry and the researcher map — the three-pane tool this project started as —
 * is a click away. Which one a link opens is decided by `initialMode`, and the
 * rule is that any link carrying view state goes to the map, so every URL
 * already shared into the researcher view keeps working.
 *
 * `useTheme` lives here rather than in `Dashboard` because all three faces need
 * it, and two copies stamping `data-theme` on <html> would drift.
 */
export default function AppShell({ data, initialUrl, manifest, baseUrl }: AppShellProps) {
  const [theme, toggleTheme] = useTheme();
  const search = useMemo(() => buildSearchIndex(data), [data]);
  const { mode, schoolIndex, openSchool, openFind, openMap, mapEntry } = useAppMode(
    data,
    initialUrl,
  );

  if (mode === "find") {
    return (
      <FindSchool
        search={search}
        schoolCount={data.n}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelect={openSchool}
        onExploreMap={() => openMap()}
      />
    );
  }

  if (mode === "school" && schoolIndex !== null) {
    return (
      <SchoolPage
        data={data}
        index={schoolIndex}
        search={search}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelect={openSchool}
        onFindSchool={openFind}
        onExploreMap={openMap}
      />
    );
  }

  return (
    <Dashboard
      data={data}
      initialUrl={mapEntry}
      manifest={manifest}
      baseUrl={baseUrl}
      theme={theme}
      onToggleTheme={toggleTheme}
      onFindSchool={openFind}
    />
  );
}
