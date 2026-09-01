import { Dataset } from "../data/dataset";
import type { Column, RawDataset } from "../data/types";

/**
 * A six-school dataset using the real column names from `master_schools.geojson`,
 * because the catalog in `data/fields.ts` — which the filters, search, and CSV
 * export all read — is keyed by those names.
 *
 * Shape worth knowing when reading the assertions:
 *
 * - rows 0 and 3 share building `K001`, the many-schools-to-one-building case
 * - row 5 has no name and no building code
 * - `pctl_comb` is null at row 2, so the no-data paths are exercised
 * - `Managed_By` has a single category, so `availableFacets` must drop it
 * - `CounDist` is numeric with values 2, 9, 10, 33 — sorts numerically, not
 *   lexically, in `categories()`
 */
export const FIXTURE: RawDataset = {
  n: 6,
  lon: [-73.99, -73.97, -73.79, -74.15, -73.89, -73.95],
  lat: [40.69, 40.78, 40.72, 40.58, 40.85, 40.7],
  columns: {
    Loc_Name: {
      t: "s",
      v: ["Alpha School", "Beta Academy, Inc", "Gamma High", "Delta Prep", "Epsilon Middle", null],
    },
    Loc_Code: { t: "s", v: ["K001", "M002", "Q003", "K004", "X005", "K006"] },
    Bldg_Code: { t: "s", v: ["K001", "M002", "Q003", "K001", "X005", null] },
    ATS: { t: "s", v: ["01K001", "02M002", "03Q003", "04K004", "05X005", "06K006"] },
    full_addr: {
      t: "s",
      v: [
        "1 Adams St, Brooklyn",
        "2 Broadway, Manhattan",
        "3 Cedar Ave, Queens",
        "4 Dock Rd, Staten Island",
        "5 Elm Pl, Bronx",
        "6 Front St, Brooklyn",
      ],
    },
    Princ_Name: { t: "s", v: ["Ada Lovelace", "Bo Diaz", null, "Dee Ng", "Eve Ruiz", "Fay Oh"] },
    Borough: {
      t: "c",
      d: ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"],
      v: [1, 2, 3, 4, 0, 1],
    },
    Loc_Cat_D: { t: "c", d: ["Elementary", "High school"], v: [0, 1, 0, 1, 0, -1] },
    Managed_By: { t: "c", d: ["DOE"], v: [0, 0, 0, 0, 0, 0] },
    in_dac: { t: "b", v: [1, 0, 1, null, 1, 0] },
    pctl_comb: { t: "n", v: [0.1, 0.4, null, 0.8, 0.95, 0.5] },
    Bldg_Enrl: { t: "n", v: [100, 200, 300, 100, null, 500] },
    CounDist: { t: "n", v: [9, 10, 2, 9, 33, 10] },
  },
};

export function makeDataset(overrides: Record<string, Column> = {}): Dataset {
  return new Dataset({ ...FIXTURE, columns: { ...FIXTURE.columns, ...overrides } });
}
