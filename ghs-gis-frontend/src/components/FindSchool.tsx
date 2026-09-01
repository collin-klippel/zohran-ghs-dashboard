import type { SearchIndex } from "../lib/searchIndex";
import type { Theme } from "../hooks/useTheme";
import SchoolSearch from "./SchoolSearch";

export interface FindSchoolProps {
  search: SearchIndex;
  schoolCount: number;
  theme: Theme;
  onToggleTheme: () => void;
  onSelect: (row: number) => void;
  onExploreMap: () => void;
}

/**
 * The app's front door.
 *
 * One field, because the visitor this page is for has exactly one question —
 * what does the city know about my school — and every control that isn't the
 * search box is a reason to leave. The researcher map keeps a link out, below
 * the fold of attention rather than beside the input.
 */
export default function FindSchool({
  search,
  schoolCount,
  theme,
  onToggleTheme,
  onSelect,
  onExploreMap,
}: FindSchoolProps) {
  return (
    <div className="find">
      <button
        className="button find__theme"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      <main className="find__hero">
        <h1 className="find__title">Green Healthy Schools</h1>
        <p className="find__lede">
          Every NYC public school building, and what the city reports about its air
          conditioning, ventilation, crowding, energy use, and pollution burden. Find yours.
        </p>

        <SchoolSearch
          index={search}
          onSelect={onSelect}
          label="Find your school"
          placeholder="School name, address, or code — try PS 24"
          autoFocus
        />

        <p className="find__alt">
          <button className="link" onClick={onExploreMap}>
            Explore the full map
          </button>{" "}
          — all {schoolCount.toLocaleString()} schools, with filters and rankings.
        </p>
      </main>
    </div>
  );
}
