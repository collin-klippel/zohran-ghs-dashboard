import { useEffect, useState } from "react";
import { type Dataset, loadDataset } from "./data/dataset";
import { loadManifest } from "./data/layers";
import { readUrlState } from "./lib/urlState";
import AppShell from "./components/AppShell";

const BASE_URL = import.meta.env.BASE_URL;
const DATA_URL = `${BASE_URL}data/schools.json`;

/** Parsed once at startup; later edits write back but never re-read. */
const INITIAL_URL = readUrlState(window.location.search);

/** Kicked off at import time so the overlay manifest and the dataset load in parallel. */
const MANIFEST = loadManifest(BASE_URL);

/**
 * Loads the dataset, then hands it to the app.
 *
 * The split is what keeps everything below free of null checks: nothing renders
 * — or holds state — until the columns are known, so a link naming a metric,
 * filter, or school can be resolved against real data on the first render
 * rather than patched in afterwards.
 */
export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDataset(DATA_URL)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div className="status">
        <div>
          <strong>Could not load school data.</strong>
          <pre>{error}</pre>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="status">
        <p>Loading schools…</p>
      </div>
    );
  }

  return (
    <AppShell data={data} initialUrl={INITIAL_URL} manifest={MANIFEST} baseUrl={BASE_URL} />
  );
}
