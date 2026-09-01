import type { Dataset } from "../data/dataset";
import { NO_DATA } from "../lib/format";
import type { SearchIndex } from "../lib/searchIndex";
import type { Theme } from "../hooks/useTheme";
import CopyLinkButton from "./CopyLinkButton";
import CouncilCard from "./CouncilCard";
import LocatorMap from "./LocatorMap";
import MapErrorBoundary from "./MapErrorBoundary";
import NearbySchools from "./NearbySchools";
import SchoolFields from "./SchoolFields";
import SchoolSearch from "./SchoolSearch";
import Scorecard from "./Scorecard";
import Shortfalls from "./Shortfalls";

export interface SchoolPageProps {
  data: Dataset;
  index: number;
  search: SearchIndex;
  theme: Theme;
  onToggleTheme: () => void;
  onSelect: (row: number) => void;
  onFindSchool: () => void;
  onExploreMap: (index?: number) => void;
}

/**
 * One school, laid out to be read rather than queried.
 *
 * The order is deliberate: the shortfall band answers the question most
 * visitors came with — what is wrong here — the scorecard qualifies each answer
 * with its figure and its caveat, the full field list is there for anyone who
 * wants to check the summary against the record, and the things worth doing
 * about it come last.
 */
export default function SchoolPage({
  data,
  index,
  search,
  theme,
  onToggleTheme,
  onSelect,
  onFindSchool,
  onExploreMap,
}: SchoolPageProps) {
  const name = String(data.value("Loc_Name", index) ?? "Unnamed school");
  const where = [data.value("full_addr", index), data.value("Borough", index)]
    .filter(Boolean)
    .join(" · ");
  const level = [data.value("Loc_Cat_D", index), data.value("Grades_Fin", index)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="page">
      <header className="page__bar">
        <button className="link page__home" onClick={onFindSchool}>
          Green Healthy Schools
        </button>
        <SchoolSearch
          index={search}
          onSelect={onSelect}
          variant="inline"
          label="Look up another school"
          placeholder="Look up another school"
        />
        <button
          className="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </header>

      <main className="page__main">
        <section className="hero">
          <div className="hero__text">
            <h1 className="hero__name">{name}</h1>
            <p className="hero__where">{where || NO_DATA}</p>
            {level && <p className="hero__level">{level}</p>}
          </div>
          <MapErrorBoundary note="The rest of this page still works.">
            <LocatorMap data={data} index={index} theme={theme} />
          </MapErrorBoundary>
        </section>

        <Shortfalls data={data} index={index} />

        <Scorecard data={data} index={index} />

        <section className="section">
          <h2 className="section__title">Everything we have on this school</h2>
          <p className="section__note">
            The full record from the city's own datasets. Figures marked “Whole building” above
            come from these fields. Values that fall below the thresholds this page grades against
            are marked, and groups holding one open on their own.
          </p>
          <SchoolFields data={data} index={index} layout="wide" />
        </section>

        <section className="section section--cards" aria-label="What you can do">
          <CouncilCard data={data} index={index} />

          <article className="cta">
            <h3 className="cta__title">Share this school</h3>
            <p className="cta__muted">
              The link opens straight to this page — nothing else needs explaining.
            </p>
            <CopyLinkButton label="Copy link to this school" />
          </article>

          <NearbySchools data={data} index={index} onSelect={onSelect} />
        </section>
      </main>

      <footer className="page__foot">
        <button className="link" onClick={() => onExploreMap(index)}>
          Explore the full map
        </button>{" "}
        — compare every school, with filters and rankings.
      </footer>
    </div>
  );
}
