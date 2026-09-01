import type { Dataset } from "../data/dataset";
import { colocatedRows, nearbyRows } from "../lib/schools";

export interface NearbySchoolsProps {
  data: Dataset;
  index: number;
  onSelect: (row: number) => void;
}

const NEARBY = 5;

function name(data: Dataset, i: number): string {
  return String(data.value("Loc_Name", i) ?? data.value("Loc_Code", i) ?? "Unnamed school");
}

function List({
  data,
  rows,
  onSelect,
}: {
  data: Dataset;
  rows: number[];
  onSelect: (row: number) => void;
}) {
  return (
    <ul className="nearby__list">
      {rows.map((i) => (
        <li key={i}>
          <button className="link" onClick={() => onSelect(i)}>
            {name(data, i)}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The other schools this page's numbers also describe, and the ones next door.
 *
 * The two lists are kept apart because they mean different things: a school
 * sharing the building shares every building-level figure on this page, while a
 * nearby school only shares the neighborhood.
 */
export default function NearbySchools({ data, index, onSelect }: NearbySchoolsProps) {
  const shared = colocatedRows(data, index);
  const nearby = nearbyRows(data, index, NEARBY);

  return (
    <article className="cta">
      {shared.length > 0 && (
        <>
          <h3 className="cta__title">Shares this building</h3>
          <p className="cta__muted">
            The building figures above describe {shared.length === 1 ? "this school" : "these schools"} too.
          </p>
          <List data={data} rows={shared} onSelect={onSelect} />
        </>
      )}

      <h3 className="cta__title">Nearby schools</h3>
      <List data={data} rows={nearby} onSelect={onSelect} />
    </article>
  );
}
